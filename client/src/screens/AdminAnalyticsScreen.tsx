import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Header from '../components/Header';
import { supabase } from '../lib/supabase';
import { useTheme, Theme } from '../theme';
import { scaleFont } from '../theme/fontScale';

type HotCouponRow = {
  coupon_id: string;
  store_name: string | null;
  code: string;
  created_at: string;
  copies: number;
  opens: number;
  views: number;
  hot_score: number;
};

type CopyCountRow = {
  coupon_id: string;
  store_name: string | null;
  code: string;
  count: number;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background
    },
    content: {
      padding: 16
    },
    sectionTitle: {
      fontFamily: theme.typography.heading,
      color: theme.text,
      fontSize: scaleFont(18),
      marginBottom: 10
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border
    },
    statLabel: {
      color: theme.subtext,
      fontFamily: theme.typography.body
    },
    statValue: {
      color: theme.text,
      fontFamily: theme.typography.bodySemiBold
    },
    card: {
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      marginBottom: 10
    },
    cardTitle: {
      color: theme.text,
      fontFamily: theme.typography.heading,
      fontSize: scaleFont(16)
    },
    cardMeta: {
      marginTop: 6,
      color: theme.subtext,
      fontFamily: theme.typography.body
    },
    errorText: {
      color: theme.danger,
      fontFamily: theme.typography.bodySemiBold,
      marginBottom: 12
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 12,
      fontFamily: theme.typography.body,
      color: theme.text,
      backgroundColor: theme.inputBackground
    },
    button: {
      marginTop: 12,
      backgroundColor: theme.accent,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center'
    },
    buttonText: {
      color: theme.background,
      fontFamily: theme.typography.bodySemiBold
    },
    signOutButton: {
      marginBottom: 8,
      alignItems: 'center'
    },
    signOutText: {
      color: theme.accent,
      fontFamily: theme.typography.bodySemiBold
    }
  });

const AdminAnalyticsScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [hotCoupons, setHotCoupons] = useState<HotCouponRow[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [topCopies24h, setTopCopies24h] = useState<CopyCountRow[]>([]);
  const [topCopies7d, setTopCopies7d] = useState<CopyCountRow[]>([]);
  const [copyCounts, setCopyCounts] = useState<CopyCountRow[]>([]);
  const [totalEventsToday, setTotalEventsToday] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const fetchCouponsByIds = useCallback(async (couponIds: string[]) => {
    if (!couponIds.length) return [];
    const { data, error } = await supabase
      .from('coupons')
      .select('id,code,stores(name)')
      .in('id', couponIds);
    if (error) {
      throw error;
    }
    return data ?? [];
  }, []);

  const buildCopyCounts = useCallback(
    async (since?: string) => {
      let query = supabase
        .from('coupon_events')
        .select('coupon_id')
        .eq('event_type', 'coupon_copy');
      if (since) {
        query = query.gte('created_at', since);
      }
      const { data, error } = await query;
      if (error) {
        throw error;
      }
      const counts: Record<string, number> = {};
      (data ?? []).forEach((row: { coupon_id: string }) => {
        counts[row.coupon_id] = (counts[row.coupon_id] ?? 0) + 1;
      });
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      const couponIds = sorted.map(([couponId]) => couponId);
      const coupons = await fetchCouponsByIds(couponIds);
      const couponMap = new Map<string, { code: string; store_name: string | null }>();
      coupons.forEach((coupon: { id: string; code: string; stores?: { name?: string } | null }) => {
        couponMap.set(coupon.id, {
          code: coupon.code,
          store_name: coupon.stores?.name ?? null
        });
      });
      return sorted.map(([couponId, count]) => ({
        coupon_id: couponId,
        count,
        code: couponMap.get(couponId)?.code ?? '',
        store_name: couponMap.get(couponId)?.store_name ?? null
      }));
    },
    [fetchCouponsByIds]
  );

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const since72h = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [hotResult, eventsResult, totalToday] = await Promise.all([
        supabase.rpc('get_hot_coupons', { p_limit: 50, p_hours: 72 }),
        supabase.from('coupon_events').select('event_type').gte('created_at', since72h),
        supabase
          .from('coupon_events')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startOfDay)
      ]);

      if (hotResult.error) {
        throw hotResult.error;
      }
      if (eventsResult.error) {
        throw eventsResult.error;
      }
      if (totalToday.error) {
        throw totalToday.error;
      }

      setHotCoupons((hotResult.data ?? []) as HotCouponRow[]);

      const counts: Record<string, number> = {};
      (eventsResult.data ?? []).forEach((row: { event_type: string }) => {
        counts[row.event_type] = (counts[row.event_type] ?? 0) + 1;
      });
      setEventCounts(counts);
      setTotalEventsToday(totalToday.count ?? 0);

      const [top24h, top7d, allCopies] = await Promise.all([
        buildCopyCounts(since24h),
        buildCopyCounts(since7d),
        buildCopyCounts()
      ]);
      setTopCopies24h(top24h);
      setTopCopies7d(top7d);
      setCopyCounts(allCopies);
    } catch (error) {
      setLoadError('Unable to load analytics right now.');
    } finally {
      setLoading(false);
    }
  }, [buildCopyCounts]);

  useEffect(() => {
    if (!session?.user) return;
    loadAnalytics();
  }, [loadAnalytics, session?.user]);

  const handleSignIn = async () => {
    setAuthError(null);
    // After creating the owner account in Supabase Auth, insert its user_id into public.owners.
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) {
      setAuthError(error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setEmail('');
    setPassword('');
    setHotCoupons([]);
    setEventCounts({});
    setTopCopies24h([]);
    setTopCopies7d([]);
    setCopyCounts([]);
    setTotalEventsToday(0);
  };

  return (
    <View style={styles.container}>
      <Header title="Admin Analytics" />
      <ScrollView style={styles.content}>
        {!session?.user ? (
          <View>
            <Text style={styles.sectionTitle}>Owner sign in</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={theme.subtext}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              autoComplete="off"
              textContentType="emailAddress"
            />
            <View style={{ height: 10 }} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={theme.subtext}
              secureTextEntry
              autoCorrect={false}
              autoComplete="off"
              textContentType="password"
            />
            {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
            <Pressable style={styles.button} onPress={handleSignIn}>
              <Text style={styles.buttonText}>Sign In</Text>
            </Pressable>
            <Text style={styles.cardMeta}>
              Add the owner user_id to the public.owners table after creating the account.
            </Text>
          </View>
        ) : (
          <View>
            <Pressable style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
            {loading ? <ActivityIndicator color={theme.accent} /> : null}
            {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
            <Text style={styles.sectionTitle}>Total events today</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Events</Text>
              <Text style={styles.statValue}>{totalEventsToday}</Text>
            </View>
            <View style={{ height: 20 }} />
            <Text style={styles.sectionTitle}>Event counts (72h)</Text>
            {Object.keys(eventCounts).length ? (
              Object.entries(eventCounts).map(([eventType, count]) => (
                <View key={eventType} style={styles.statRow}>
                  <Text style={styles.statLabel}>{eventType}</Text>
                  <Text style={styles.statValue}>{count}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.cardMeta}>No events recorded yet.</Text>
            )}
            <View style={{ height: 20 }} />
            <Text style={styles.sectionTitle}>Top copied (24h)</Text>
            {topCopies24h.length ? (
              topCopies24h.map((row) => (
                <View key={row.coupon_id} style={styles.card}>
                  <Text style={styles.cardTitle}>{row.store_name ?? 'Store'}</Text>
                  <Text style={styles.cardMeta}>Code {row.code} · Copies {row.count}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.cardMeta}>No copy activity yet.</Text>
            )}
            <View style={{ height: 20 }} />
            <Text style={styles.sectionTitle}>Top copied (7d)</Text>
            {topCopies7d.length ? (
              topCopies7d.map((row) => (
                <View key={row.coupon_id} style={styles.card}>
                  <Text style={styles.cardTitle}>{row.store_name ?? 'Store'}</Text>
                  <Text style={styles.cardMeta}>Code {row.code} · Copies {row.count}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.cardMeta}>No copy activity yet.</Text>
            )}
            <View style={{ height: 20 }} />
            <Text style={styles.sectionTitle}>Per-coupon copy counts</Text>
            {copyCounts.length ? (
              copyCounts.map((row) => (
                <View key={row.coupon_id} style={styles.card}>
                  <Text style={styles.cardTitle}>{row.store_name ?? 'Store'}</Text>
                  <Text style={styles.cardMeta}>Code {row.code} · Copies {row.count}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.cardMeta}>No copy activity yet.</Text>
            )}
            <View style={{ height: 20 }} />
            <Text style={styles.sectionTitle}>Hot coupons</Text>
            {hotCoupons.length ? (
              hotCoupons.map((coupon) => (
                <View key={coupon.coupon_id} style={styles.card}>
                  <Text style={styles.cardTitle}>{coupon.store_name ?? 'Store'}</Text>
                  <Text style={styles.cardMeta}>
                    Code {coupon.code} · Score {coupon.hot_score.toFixed(1)}
                  </Text>
                  <Text style={styles.cardMeta}>
                    Copies {coupon.copies} · Opens {coupon.opens} · Views {coupon.views}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.cardMeta}>No hot coupons yet.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default AdminAnalyticsScreen;
