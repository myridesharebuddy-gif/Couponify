import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import { useTheme, Theme } from '../theme';
import { scaleFont } from '../theme/fontScale';
import { getCoupons, CouponRecord } from '../lib/couponsRepo';
import { logCouponViewOnce, logEvent } from '../lib/analytics';
import { formatRelativeTime } from '../utils/timeUtils';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background
    },
    content: {
      flex: 1,
      padding: 16
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 10
    },
    storeText: {
      color: theme.text,
      fontFamily: theme.typography.heading,
      fontSize: scaleFont(18)
    },
    codeText: {
      marginTop: 8,
      color: theme.accent,
      fontFamily: theme.typography.heading,
      fontSize: scaleFont(20)
    },
    expiryText: {
      marginTop: 4,
      color: theme.subtext,
      fontFamily: theme.typography.body
    },
    metaRow: {
      marginTop: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    metaText: {
      color: theme.subtext,
      fontFamily: theme.typography.body,
      fontSize: scaleFont(12)
    },
    copyButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.accent
    },
    copyText: {
      color: theme.accent,
      fontSize: scaleFont(12),
      fontFamily: theme.typography.bodySemiBold
    },
    copiedText: {
      marginTop: 6,
      color: theme.success,
      fontFamily: theme.typography.bodySemiBold,
      fontSize: scaleFont(12)
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 40
    },
    emptyText: {
      color: theme.subtext,
      fontFamily: theme.typography.body
    }
  });

const StoreDetailScreen = ({ route }: { route: any }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const storeName = route.params?.storeName ?? 'Store';
  const storeId = route.params?.storeId;
  const storeSlug = route.params?.storeSlug;
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storeOpenLoggedRef = useRef(false);

  const loadCoupons = useCallback(async () => {
    if (!storeSlug) {
      setCoupons([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getCoupons({ sort: 'new', limit: 20, storeSlug });
      setCoupons(data);
    } catch (error) {
      console.error('Failed to load store coupons', error);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, [storeSlug]);

  useFocusEffect(
    useCallback(() => {
      loadCoupons();
    }, [loadCoupons])
  );

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (storeOpenLoggedRef.current) return;
    if (!coupons.length) return;
    storeOpenLoggedRef.current = true;
    logEvent({
      couponId: coupons[0].id,
      eventType: 'store_open',
      meta: {
        storeId,
        storeName
      }
    });
  }, [coupons, storeId, storeName]);

  const handleRefresh = useCallback(async () => {
    if (!storeSlug) {
      return;
    }
    setRefreshing(true);
    try {
      const data = await getCoupons({ sort: 'new', limit: 20, storeSlug });
      setCoupons(data);
    } catch (error) {
      console.error('Failed to refresh store coupons', error);
    } finally {
      setRefreshing(false);
    }
  }, [storeSlug]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: CouponRecord }> }) => {
      viewableItems.forEach(({ item }) => {
        if (!item?.id) return;
        logCouponViewOnce(item.id);
      });
    }
  );

  const handleCopy = useCallback(async (code: string, id: string) => {
    if (!code) return;
    try {
      await Clipboard.setStringAsync(code);
      logEvent({ couponId: id, eventType: 'coupon_copy' });
      setCopiedId(id);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  }, []);

  const renderCoupon = ({ item }: { item: CouponRecord }) => (
    <View style={styles.card}>
      <Text style={styles.storeText}>{item.store?.name ?? storeName}</Text>
      <Text style={styles.codeText}>{item.code}</Text>
      {item.expires_at ? <Text style={styles.expiryText}>Expires {new Date(item.expires_at).toLocaleDateString()}</Text> : null}
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{formatRelativeTime(item.created_at)}</Text>
        <Pressable style={styles.copyButton} onPress={() => handleCopy(item.code, item.id)}>
          <Text style={styles.copyText}>Copy</Text>
        </Pressable>
      </View>
      {copiedId === item.id ? <Text style={styles.copiedText}>Copied!</Text> : null}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      {loading ? (
        <ActivityIndicator color={theme.accent} />
      ) : (
        <Text style={styles.emptyText}>No coupons available.</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title={storeName} />
      <View style={styles.content}>
        <FlatList
          data={coupons}
          keyExtractor={(item) => item.id}
          renderItem={renderCoupon}
          ListEmptyComponent={renderEmpty}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />
          }
        />
      </View>
    </View>
  );
};

export default StoreDetailScreen;
