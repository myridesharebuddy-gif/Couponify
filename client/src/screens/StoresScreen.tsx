import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchStores } from '../services/api';
import { useTheme, Theme } from '../theme';
import { scaleFont } from '../theme/fontScale';
import type { StoreRecord } from '../types/store';
import { useFocusEffect } from '@react-navigation/native';
import {
  dedupeStores,
  ensureCustomStore,
  loadCustomStores,
  normalizeStoreName,
  slugifyStoreId
} from '../utils/storeHelpers';
import { CATEGORY_TITLES, STORE_CATEGORIES } from '../constants/storeCategories';

type CategoryView = {
  title: string;
  stores: StoreRecord[];
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background
    },
    content: {
      paddingBottom: 24
    },
    searchWrapper: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8
    },
    rewardWrapper: {
      paddingHorizontal: 16,
      paddingTop: 16
    },
    rewardButton: {
      backgroundColor: theme.accent,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center'
    },
    rewardButtonText: {
      color: theme.background,
      fontFamily: theme.typography.bodySemiBold
    },
    searchInput: {
      backgroundColor: theme.inputBackground,
      borderRadius: 12,
      padding: 12,
      fontFamily: theme.typography.body,
      color: '#000',
      borderWidth: 1,
      borderColor: theme.border
    },
    sectionHeader: {
      marginTop: 24,
      marginBottom: 10,
      color: theme.subtext,
      fontFamily: theme.typography.bodySemiBold,
      fontSize: scaleFont(12),
      letterSpacing: 1.2
    },
    categoryTile: {
      flex: 1,
      margin: 8,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      justifyContent: 'space-between',
      minHeight: 120
    },
    categoryTitle: {
      color: theme.text,
      fontFamily: theme.typography.bodySemiBold,
      fontSize: scaleFont(14),
      marginBottom: 8
    },
    categoryCount: {
      color: theme.subtext,
      fontFamily: theme.typography.body,
      fontSize: scaleFont(12)
    },
    storeRow: {
      padding: 16,
      borderRadius: 14,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 10
    },
    storeName: {
      color: theme.text,
      fontSize: scaleFont(17),
      fontFamily: theme.typography.heading
    },
    loading: {
      marginTop: 16,
      alignItems: 'center'
    },
    empty: {
      marginTop: 24,
      alignItems: 'center'
    },
    emptyText: {
      color: theme.subtext,
      fontFamily: theme.typography.body
    },
    addButtonWrapper: {
      paddingHorizontal: 16,
      paddingBottom: 8
    },
    addStoreButton: {
      borderWidth: 1,
      borderColor: theme.accent,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center'
    },
    addStoreButtonText: {
      color: theme.accent,
      fontFamily: theme.typography.bodySemiBold
    },
    addModalInput: {
      marginBottom: 12
    },
    categoryOption: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border
    },
    categoryOptionActive: {
      backgroundColor: theme.accent
    },
    categoryOptionText: {
      color: theme.text,
      fontFamily: theme.typography.body
    },
    categoryOptionTextActive: {
      color: theme.background
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      paddingHorizontal: 24
    },
    modalContent: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      maxHeight: '80%'
    },
    modalTitle: {
      color: theme.text,
      fontFamily: theme.typography.heading,
      fontSize: scaleFont(18),
      marginBottom: 12
    },
    modalList: {
      flexGrow: 0
    },
    modalStoreRow: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border
    },
    modalStoreName: {
      color: theme.text,
      fontFamily: theme.typography.bodySemiBold
    },
    modalFooter: {
      marginTop: 12,
      alignItems: 'flex-end'
    },
    modalCloseButton: {
      paddingVertical: 8,
      paddingHorizontal: 16
    },
    modalCloseText: {
      color: theme.accent,
      fontFamily: theme.typography.bodySemiBold
    }
  });

const StoresScreen = ({ navigation }: { navigation: any }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data, isFetching, refetch } = useQuery(['stores', 'list'], fetchStores, {
    staleTime: 5 * 60 * 1000
  });

  const apiStores = useMemo(() => dedupeStores(data?.items ?? []), [data?.items]);

  const [query, setQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategoryTitle, setSelectedCategoryTitle] = useState('All');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addStoreName, setAddStoreName] = useState('');
  const [addCategory, setAddCategory] = useState(STORE_CATEGORIES[0].title);
  const [addError, setAddError] = useState<string | null>(null);
  const [customStores, setCustomStores] = useState<StoreRecord[]>([]);

  const normalizedQuery = normalizeStoreName(query);

  const combinedStores = useMemo(
    () => dedupeStores([...apiStores, ...customStores]),
    [apiStores, customStores]
  );

  const loadCustomStoreData = useCallback(async () => {
    const stores = await loadCustomStores();
    setCustomStores(stores);
  }, []);

  const storeMap = useMemo(() => {
    const map = new Map<string, StoreRecord>();
    combinedStores.forEach((store) => {
      map.set(normalizeStoreName(store.name), store);
    });
    return map;
  }, [combinedStores]);

  const matchesQuery = useCallback(
    (store: StoreRecord) => !normalizedQuery || normalizeStoreName(store.name).includes(normalizedQuery),
    [normalizedQuery]
  );

  const categories = useMemo<CategoryView[]>(() => {
    const localMap = new Map(storeMap);
    const ensureStore = (name: string, categoryTitle: string) => {
      const normalized = normalizeStoreName(name);
      if (localMap.has(normalized)) {
        const existing = localMap.get(normalized)!;
        if (!existing.categories?.includes(categoryTitle)) {
          existing.categories = [...(existing.categories ?? []), categoryTitle];
        }
        return existing;
      }
      const newStore: StoreRecord = {
        id: slugifyStoreId(name) || `custom-${Date.now().toString(36)}`,
        name,
        website: '',
        domain: '',
        domains: [],
        country: 'US',
        popularityWeight: 0,
        categories: [categoryTitle],
        aliases: [normalized],
        createdAt: new Date().toISOString()
      };
      localMap.set(normalized, newStore);
      return newStore;
    };

    const categorySections = STORE_CATEGORIES.map((category) => {
      const additionalNames = customStores
        .filter((store) => store.categories?.includes(category.title))
        .map((store) => store.name)
        .filter(
          (name) =>
            !category.storeNames.some(
              (existing) => normalizeStoreName(existing) === normalizeStoreName(name)
            )
        );
      const combinedNames = [...category.storeNames, ...additionalNames];
      const matchingStores = combinedNames
        .map((name) => ensureStore(name, category.title))
        .filter(matchesQuery)
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        title: category.title,
        stores: matchingStores
      };
    });

    const aggregatedMap = new Map<string, StoreRecord>();
    categorySections.forEach((section) => {
      section.stores.forEach((store) => {
        aggregatedMap.set(normalizeStoreName(store.name), store);
      });
    });

    const otherStores = combinedStores
      .filter((store) => !aggregatedMap.has(normalizeStoreName(store.name)))
      .filter(matchesQuery)
      .sort((a, b) => a.name.localeCompare(b.name));

    const allStores = [...aggregatedMap.values(), ...otherStores].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return [
      {
        title: 'All',
        stores: allStores
      },
      ...categorySections
    ];
  }, [storeMap, combinedStores, matchesQuery, customStores]);

  const hasAnyStores = categories.some((category) => category.stores.length > 0);
  const showEmpty = !isFetching && !hasAnyStores;

  useFocusEffect(
    useCallback(() => {
      refetch();
      loadCustomStoreData();
    }, [refetch, loadCustomStoreData])
  );

  const openCategoryModal = (title: string) => {
    setSelectedCategoryTitle(title);
    setModalVisible(true);
  };

  const modalStores =
    categories.find((category) => category.title === selectedCategoryTitle)?.stores ?? [];

  const handleStorePress = (store: StoreRecord) => {
    setModalVisible(false);
    navigation.navigate('StoreDetail', {
      storeId: store.id,
      storeName: store.name,
      storeSlug: store.slug
    });
  };

  const handleAddStore = async () => {
    const trimmed = addStoreName.trim();
    if (trimmed.length < 2) {
      setAddError('Store name must be at least 2 characters.');
      return;
    }
    const normalized = normalizeStoreName(trimmed);
    if (!normalized) {
      setAddError('Provide a valid store name.');
      return;
    }
    if (combinedStores.some((store) => normalizeStoreName(store.name) === normalized)) {
      setAddError('That store already exists.');
      return;
    }
    try {
      const stored = await ensureCustomStore(trimmed, addCategory);
      if (stored) {
        const deduped = dedupeStores([
          ...customStores.filter((item) => normalizeStoreName(item.name) !== normalized),
          stored
        ]);
        setCustomStores(deduped);
      }
      setAddModalVisible(false);
      setAddStoreName('');
      setAddCategory(CATEGORY_TITLES[0]);
      setAddError(null);
    } catch {
      setAddError('Couldn’t save store. Try again.');
    }
  };

  const renderCategoryItem = ({ item }: { item: CategoryView }) => (
    <Pressable style={styles.categoryTile} onPress={() => openCategoryModal(item.title)}>
      <Text style={styles.categoryTitle}>{item.title}</Text>
      <Text style={styles.categoryCount}>{item.stores.length} stores</Text>
    </Pressable>
  );

  const renderEmpty = () =>
    showEmpty ? (
      <View style={styles.empty}>
        {isFetching ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <Text style={styles.emptyText}>No stores available.</Text>
        )}
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      <View style={styles.rewardWrapper}>
        <Pressable
          style={styles.rewardButton}
          onPress={() => Linking.openURL('http://www.rakuten.com/r/STERLI1762?eeid=28187')}
        >
          <Text style={styles.rewardButtonText}>Smart Shoppers Use Rakuten</Text>
        </Pressable>
      </View>
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search stores"
          placeholderTextColor={theme.subtext}
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <View style={styles.addButtonWrapper}>
        <Pressable style={styles.addStoreButton} onPress={() => setAddModalVisible(true)}>
          <Text style={styles.addStoreButtonText}>+ Add Store</Text>
        </Pressable>
      </View>
      {renderEmpty()}
      <FlatList
        data={categories}
        keyExtractor={(item) => item.title}
        renderItem={renderCategoryItem}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        contentContainerStyle={[styles.content, hasAnyStores ? undefined : { paddingTop: 0 }]}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={theme.accent} />
        }
        ListFooterComponent={<View style={{ height: 60 }} />}
      />
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedCategoryTitle}</Text>
            <FlatList
              data={modalStores}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable style={styles.modalStoreRow} onPress={() => handleStorePress(item)}>
                  <Text style={styles.modalStoreName}>{item.name}</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No stores match this category.</Text>
                </View>
              }
              style={styles.modalList}
            />
            <View style={styles.modalFooter}>
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setAddModalVisible(false);
          setAddError(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add a store</Text>
            <TextInput
              style={[styles.searchInput, styles.addModalInput]}
              placeholder="Store name"
              placeholderTextColor={theme.subtext}
              value={addStoreName}
              onChangeText={setAddStoreName}
            />
            <Text style={styles.modalTitle}>Choose a category</Text>
            <FlatList
              data={CATEGORY_TITLES}
              keyExtractor={(item) => item}
              style={styles.modalList}
              renderItem={({ item }) => {
                const isActive = item === addCategory;
                return (
                  <Pressable
                    style={[
                      styles.categoryOption,
                      isActive && styles.categoryOptionActive
                    ]}
                    onPress={() => setAddCategory(item)}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        isActive && styles.categoryOptionTextActive
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              }}
            />
            {addError ? <Text style={styles.emptyText}>{addError}</Text> : null}
            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => {
                  setAddModalVisible(false);
                  setAddError(null);
                }}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleAddStore} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default StoresScreen;
