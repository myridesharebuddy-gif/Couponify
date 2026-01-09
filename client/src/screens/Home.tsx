import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import Header from '../components/Header';
import GoldButton from '../components/GoldButton';
import { useTheme, Theme } from '../theme';
import { scaleFont } from '../theme/fontScale';
import { normalizeStoreKey, slugifyStoreKey } from '../lib/normalize';
import { getHotCoupons, getNewCoupons, getStores, submitCoupon, CouponRecord, StoreRecord } from '../lib/couponsRepo';
import { logCouponViewOnce, logEvent } from '../lib/analytics';
import { formatRelativeTime } from '../utils/timeUtils';
import { STORE_CATEGORIES } from '../constants/storeCategories';

const PAGE_SIZE = 50;

type SortMode = 'new' | 'hot';

type LoadOptions = {
  reset?: boolean;
  append?: boolean;
};

const buildFallbackStoreGroups = () =>
  STORE_CATEGORIES.map((category) => ({
    title: category.title,
    stores: category.storeNames.map((name) => {
      const slug = slugifyStoreKey(name) || `${category.title}-${name}`;
      return {
        id: slug,
        name,
        slug,
        category: category.title
      };
    })
  }));

const sortStoreGroups = (groups: { title: string; stores: StoreRecord[] }[]) =>
  groups.map((group) => ({
    ...group,
    stores: [...group.stores].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }));

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background
    },
    body: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16
    },
    ctaWrapper: {
      marginBottom: 12
    },
    statusMessage: {
      textAlign: 'center',
      marginBottom: 12,
      color: theme.success,
      fontFamily: theme.typography.bodySemiBold
    },
    tabs: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 12
    },
    tabButton: {
      paddingVertical: 10,
      paddingHorizontal: 22,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border,
      marginHorizontal: 6
    },
    tabButtonActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent
    },
    tabText: {
      fontFamily: theme.typography.bodySemiBold,
      color: theme.subtext
    },
    tabTextActive: {
      color: theme.background
    },
    list: {
      flex: 1
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 12
    },
    storeName: {
      color: theme.text,
      fontFamily: theme.typography.heading,
      fontSize: scaleFont(16)
    },
    codeText: {
      marginTop: 6,
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
      borderWidth: 1,
      borderColor: theme.accent,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 8
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
    },
    footerSpinner: {
      marginVertical: 12
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      padding: 24
    },
    modalCard: {
      backgroundColor: theme.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 18
    },
    modalTitle: {
      fontFamily: theme.typography.heading,
      color: theme.text,
      fontSize: scaleFont(20),
      marginBottom: 12
    },
    input: {
      backgroundColor: theme.inputBackground,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 12,
      fontFamily: theme.typography.body,
      fontSize: scaleFont(16),
      marginBottom: 12,
      color: '#000'
    },
    warningText: {
      color: theme.danger,
      fontFamily: theme.typography.bodySemiBold,
      marginBottom: 8
    },
    descriptionInput: {
      height: 48
    },
    storeSelector: {
      borderWidth: 2,
      borderColor: theme.accent,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      backgroundColor: theme.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    storeSelectorOpen: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderBottomWidth: 0,
      marginBottom: 0
    },
    storeSelectorTextWrap: {
      flex: 1
    },
    storeSelectorText: {
      fontFamily: theme.typography.body,
      color: theme.text
    },
    storeSelectorChevron: {
      marginLeft: 10,
      color: theme.text,
      fontFamily: theme.typography.bodySemiBold,
      fontSize: scaleFont(18)
    },
    storePlaceholder: {
      color: theme.subtext
    },
    expiryLabel: {
      color: theme.subtext,
      fontFamily: theme.typography.bodySemiBold,
      marginBottom: 6
    },
    errorText: {
      color: theme.danger,
      fontFamily: theme.typography.bodySemiBold,
      marginBottom: 8
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    actionButton: {
      flex: 1,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingVertical: 10,
      marginHorizontal: 4
    },
    actionText: {
      fontFamily: theme.typography.bodySemiBold,
      color: theme.text
    },
    hidden: {
      opacity: 0.4
    },
    dropdownWrapper: {
      borderWidth: 2,
      borderColor: theme.accent,
      borderTopWidth: 0,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      backgroundColor: theme.surface,
      maxHeight: 320,
      paddingHorizontal: 12,
      paddingBottom: 12,
      marginBottom: 12
    },
    dropdownHeader: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginBottom: 6
    },
    dropdownTitle: {
      color: theme.text,
      fontFamily: theme.typography.bodySemiBold
    },
    modalCloseText: {
      color: theme.text,
      fontFamily: theme.typography.bodySemiBold
    },
    dropdownList: {
      maxHeight: 220,
      paddingTop: 6
    },
    dropdownEmpty: {
      paddingVertical: 16,
      alignItems: 'center'
    },
    storeCategory: {
      color: theme.subtext,
      fontFamily: theme.typography.bodySemiBold,
      marginBottom: 6,
      letterSpacing: 0.5
    },
    storeOption: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 6
    },
    storeOptionText: {
      color: theme.text,
      fontFamily: theme.typography.body
    }
  });

const HomeScreen = ({ navigation }: { navigation: any }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('new');
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [expiryInput, setExpiryInput] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const offsetRef = useRef(0);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [storeGroups, setStoreGroups] = useState<{ title: string; stores: StoreRecord[] }[]>(() =>
    sortStoreGroups(buildFallbackStoreGroups())
  );
  const [storePickerVisible, setStorePickerVisible] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreRecord | null>(null);
  const [customStore, setCustomStore] = useState('');
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [descriptionInput, setDescriptionInput] = useState('');
  const [storeWarning, setStoreWarning] = useState<string | null>(null);

  const loadCoupons = useCallback(
    async ({ reset, append }: LoadOptions = {}) => {
      if (reset) {
        offsetRef.current = 0;
      }
      if (reset) {
        setRefreshing(true);
      } else if (append) {
        setLoadingMore(true);
      } else {
        setInitialLoading(true);
      }

      try {
        const data =
          sortMode === 'hot'
            ? await getHotCoupons({ limit: PAGE_SIZE })
            : await getNewCoupons({ limit: PAGE_SIZE });
        setCoupons((prev) => {
          return reset || !append ? data : [...prev, ...data];
        });
        offsetRef.current = data.length;
        setHasMore(false);
      } catch (error) {
        console.error('Failed to load coupons', error);
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [sortMode]
  );

  const normalizedStoreKeys = useMemo(() => {
    const normalized = new Set<string>();
    storeGroups.forEach((group) => {
      group.stores.forEach((store) => {
        const key = normalizeStoreKey(store.name);
        if (key) {
          normalized.add(key);
        }
      });
    });
    return normalized;
  }, [storeGroups]);

  const flatStoreList = useMemo(() => {
    const stores = storeGroups.flatMap((group) => group.stores);
    return [...stores].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [storeGroups]);

  const loadStores = useCallback(async () => {
    try {
      const groups = await getStores();
      const nextGroups = groups.length ? groups : buildFallbackStoreGroups();
      setStoreGroups(sortStoreGroups(nextGroups));
    } catch (error) {
      console.error('Failed to load store list', error);
      setStoreGroups(sortStoreGroups(buildFallbackStoreGroups()));
    }
  }, []);

  const handleStoreSelect = useCallback((store: StoreRecord) => {
    setSelectedStore(store);
    setCustomStore('');
    setStorePickerVisible(false);
    if (STORE_CATEGORIES.some((category) => category.title === store.category)) {
      setSelectedCategory(store.category);
    }
    setStoreWarning(null);
    setModalError(null);
  }, []);

  useEffect(() => {
    loadCoupons({ reset: true });
  }, [loadCoupons]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  useFocusEffect(
    useCallback(() => {
      loadCoupons({ reset: true });
    }, [loadCoupons])
  );

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 1800);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleRefresh = () => loadCoupons({ reset: true });

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || refreshing || initialLoading) {
      return;
    }
    loadCoupons({ append: true });
  };

  const formatExpiryValue = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    if (!digits) {
      return '';
    }
    const parts = [];
    if (digits.length <= 2) {
      parts.push(digits);
    } else if (digits.length <= 4) {
      parts.push(digits.slice(0, 2), digits.slice(2));
    } else {
      parts.push(digits.slice(0, 2), digits.slice(2, 4), digits.slice(4));
    }
    return parts.filter(Boolean).join('-');
  };

  const parseExpiryInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 6) {
      return null;
    }
    const month = Number(digits.slice(0, 2));
    const day = Number(digits.slice(2, 4));
    const yearSuffix = Number(digits.slice(4));
    if (Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(yearSuffix)) {
      return null;
    }
    const fullYear = 2000 + yearSuffix;
    const date = new Date(fullYear, month - 1, day);
    if (date.getMonth() + 1 !== month || date.getDate() !== day) {
      return null;
    }
    return date;
  };

  const handleExpiryChange = (value: string) => {
    setExpiryInput(formatExpiryValue(value));
  };

  const validateExpiry = (value: string) => {
    if (!value.trim()) return { valid: true };
    const parsed = parseExpiryInput(value);
    if (!parsed) {
      return { valid: false, message: 'Expiry must be MM-DD-YY.' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsed < today) {
      return { valid: false, message: 'Expiry cannot be in the past.' };
    }
    return { valid: true, value: parsed.toISOString() };
  };

  const handleSubmit = async () => {
    const storeName = customStore.trim() || selectedStore?.name || '';
    const code = codeInput.trim();
    if (!storeName) {
      setModalError('Select or enter a store name.');
      return;
    }
    if (storeWarning) {
      setModalError('That store already exists. Choose it from the list.');
      return;
    }
    const description = descriptionInput.trim();
    if (!description) {
      setModalError('Describe the coupon offer.');
      return;
    }
    if (code.length < 3) {
      setModalError('Code must be at least 3 characters.');
      return;
    }
    const expiryResult = validateExpiry(expiryInput);
    if (!expiryResult.valid) {
      setModalError(expiryResult.message);
      return;
    }
    setModalError(null);
    setSubmitting(true);
    try {
      const coupon = await submitCoupon({
        storeName,
        code,
        expiresAt: expiryResult.value
      });
      setCoupons((prev) => [coupon, ...prev]);
      offsetRef.current += 1;
      setStatusMessage('Coupon shared!');
      setModalVisible(false);
      setSelectedStore(null);
      setCustomStore('');
      setCodeInput('');
      setExpiryInput('');
      setDescriptionInput('');
      setStoreWarning(null);
    } catch (error) {
      console.error('Failed to submit coupon', error);
      setModalError('Couldn’t share coupon. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = useCallback(
    async (code: string, id: string) => {
      if (!code) return;
      try {
        await Clipboard.setStringAsync(code);
        logEvent({ couponId: id, eventType: 'coupon_copy' });
        setCopiedId(id);
        if (copyTimeoutRef.current) {
          clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
      } catch (error) {
        console.error('Failed to copy code', error);
      }
    },
    []
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: CouponRecord }> }) => {
      viewableItems.forEach(({ item }) => {
        if (!item?.id) return;
        logCouponViewOnce(item.id);
      });
    }
  );

  const renderCoupon = ({ item }: { item: CouponRecord }) => (
    <Pressable
      style={styles.card}
      onPress={() => logEvent({ couponId: item.id, eventType: 'coupon_open' })}
    >
      <Text style={styles.storeName}>{item.store?.name ?? 'Store'}</Text>
      <Text style={styles.codeText}>{item.code}</Text>
      {item.expires_at ? (
        <Text style={styles.expiryText}>Expires {new Date(item.expires_at).toLocaleDateString()}</Text>
      ) : null}
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{formatRelativeTime(item.created_at)}</Text>
        <Pressable style={styles.copyButton} onPress={() => handleCopy(item.code, item.id)}>
          <Text style={styles.copyText}>Copy</Text>
        </Pressable>
      </View>
      {copiedId === item.id ? <Text style={styles.copiedText}>Copied!</Text> : null}
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      {initialLoading ? (
        <ActivityIndicator color={theme.accent} />
      ) : (
        <Text style={styles.emptyText}>No coupons yet. Be the first to share one.</Text>
      )}
    </View>
  );

  const renderFooter = () =>
    loadingMore ? <ActivityIndicator style={styles.footerSpinner} color={theme.accent} /> : null;

  const categoryTitles = useMemo(
    () => STORE_CATEGORIES.map((category) => category.title).sort((a, b) => a.localeCompare(b)),
    []
  );

  return (
    <View style={styles.container}>
      <Header title="Couponify" />
      <View style={styles.body}>
        {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}
        <View style={styles.ctaWrapper}>
          <GoldButton title="Have A Coupon? Click Here To Share" onPress={() => setModalVisible(true)} />
        </View>
        <View style={styles.tabs}>
          {(['new', 'hot'] as SortMode[]).map((mode) => (
            <Pressable
              key={mode}
              style={[styles.tabButton, sortMode === mode && styles.tabButtonActive]}
              onPress={() => {
                if (mode === sortMode) return;
                setSortMode(mode);
              }}
            >
              <Text style={[styles.tabText, sortMode === mode && styles.tabTextActive]}>
                {mode === 'new' ? 'New' : 'Hot'}
              </Text>
            </Pressable>
          ))}
        </View>
        <FlatList
          data={coupons}
          keyExtractor={(item) => item.id}
          renderItem={renderCoupon}
          style={styles.list}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />
          }
        />
      </View>
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false);
          setStorePickerVisible(false);
          setCategoryPickerVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Share a coupon</Text>
            <Pressable
              style={[styles.storeSelector, storePickerVisible ? styles.storeSelectorOpen : undefined]}
              onPress={() => {
                setStorePickerVisible((prev) => !prev);
                setCategoryPickerVisible(false);
              }}
              disabled={submitting}
            >
              <View style={styles.storeSelectorTextWrap}>
                <Text
                  style={[
                    styles.storeSelectorText,
                    !selectedStore && !customStore ? styles.storePlaceholder : undefined
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {selectedStore?.name ?? (customStore ? `${customStore} (custom)` : 'Select a store')}
                </Text>
              </View>
              <Text style={styles.storeSelectorChevron}>{storePickerVisible ? '^' : 'v'}</Text>
            </Pressable>
            {storePickerVisible && (
              <View style={styles.dropdownWrapper}>
                <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                  {flatStoreList.length === 0 ? (
                    <View style={styles.dropdownEmpty}>
                      <ActivityIndicator color={theme.accent} />
                    </View>
                  ) : (
                    flatStoreList.map((store) => (
                      <Pressable
                        key={store.id}
                        style={styles.storeOption}
                        onPress={() => {
                          handleStoreSelect(store);
                          setStorePickerVisible(false);
                        }}
                      >
                        <Text style={styles.storeOptionText}>{store.name}</Text>
                      </Pressable>
                    ))
                  )}
                </ScrollView>
              </View>
            )}
            <Pressable
              style={[styles.storeSelector, categoryPickerVisible ? styles.storeSelectorOpen : undefined]}
              onPress={() => {
                setCategoryPickerVisible((prev) => !prev);
                setStorePickerVisible(false);
              }}
              disabled={submitting}
            >
              <View style={styles.storeSelectorTextWrap}>
                <Text
                  style={[styles.storeSelectorText, !selectedCategory ? styles.storePlaceholder : undefined]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {selectedCategory ?? 'Select a category'}
                </Text>
              </View>
              <Text style={styles.storeSelectorChevron}>{categoryPickerVisible ? '^' : 'v'}</Text>
            </Pressable>
            {categoryPickerVisible && (
              <View style={styles.dropdownWrapper}>
                <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                  {categoryTitles.map((title) => (
                    <Pressable
                      key={title}
                      style={styles.storeOption}
                      onPress={() => {
                        setSelectedCategory(title);
                        setCategoryPickerVisible(false);
                      }}
                    >
                      <Text style={styles.storeOptionText}>{title}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            <TextInput
              style={styles.input}
              placeholder="Can’t find your store? Type it here"
              placeholderTextColor={theme.subtext}
              value={customStore}
              onChangeText={(value) => {
                const normalized = normalizeStoreKey(value);
                if (normalized && normalizedStoreKeys.has(normalized)) {
                  setStoreWarning('That store is already listed. Please select it from the list.');
                } else {
                  setStoreWarning(null);
                }
                setCustomStore(value);
                if (value) {
                  setSelectedStore(null);
                }
              }}
              editable={!submitting}
              autoCorrect={false}
              autoComplete="off"
              autoCompleteType="off"
              textContentType="none"
              importantForAutofill="no"
            />
            {storeWarning ? <Text style={styles.warningText}>{storeWarning}</Text> : null}
            <TextInput
              style={styles.input}
              placeholder="Coupon code"
              placeholderTextColor={theme.subtext}
              value={codeInput}
              onChangeText={setCodeInput}
              autoCapitalize="characters"
              editable={!submitting}
              autoCorrect={false}
              autoComplete="off"
              autoCompleteType="off"
              textContentType="none"
              spellCheck={false}
              importantForAutofill="no"
            />
            {modalError ? <Text style={styles.errorText}>{modalError}</Text> : null}
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Describe The Coupon Offer"
              placeholderTextColor={theme.subtext}
              value={descriptionInput}
              onChangeText={setDescriptionInput}
              editable={!submitting}
              multiline={false}
              autoCorrect={false}
              autoComplete="off"
              autoCompleteType="off"
              textContentType="none"
              importantForAutofill="no"
            />
            <Text style={styles.expiryLabel}>Expiration date</Text>
            <TextInput
              style={styles.input}
              placeholder="MM - DD - YY"
              placeholderTextColor={theme.subtext}
              value={expiryInput}
              onChangeText={handleExpiryChange}
              editable={!submitting}
              keyboardType="number-pad"
              maxLength={8}
              autoCorrect={false}
              autoComplete="off"
              autoCompleteType="off"
              textContentType="none"
              importantForAutofill="no"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.actionButton, submitting && styles.hidden]}
                onPress={() => {
                  setModalVisible(false);
                  setStorePickerVisible(false);
                  setModalError(null);
                  setStoreWarning(null);
                }}
              >
                <Text style={styles.actionText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.actionButton}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={theme.accent} />
                ) : (
                  <Text style={styles.actionText}>Submit</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={storePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStorePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.storePickerCard]}>
            <View style={styles.storePickerHeader}>
              <Text style={styles.modalTitle}>Select a store</Text>
              <Pressable onPress={() => setStorePickerVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.storeList}>
              {flatStoreList.length === 0 ? (
                <View style={{ paddingTop: 20, alignItems: 'center' }}>
                  <ActivityIndicator color={theme.accent} />
                </View>
              ) : (
                flatStoreList.map((store) => (
                  <Pressable
                    key={store.id}
                    style={styles.storeOption}
                    onPress={() => handleStoreSelect(store)}
                  >
                    <Text style={styles.storeOptionText}>{store.name}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default HomeScreen;
