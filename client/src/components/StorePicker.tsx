import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchStores } from '../services/api';
import { useTheme } from '../theme';
import { scaleFont } from '../theme/fontScale';
import AddStoreSuggestionModal from './AddStoreSuggestionModal';
import type { StoreRecord } from '../types/store';

type StorePickerProps = {
  onSelect: (store: StoreRecord) => void;
  selectedStoreId?: string;
  initialQuery?: string;
};

const StorePicker = ({ onSelect, selectedStoreId, initialQuery = '' }: StorePickerProps) => {
  const [query, setQuery] = useState(initialQuery);
  const [addStoreModalVisible, setAddStoreModalVisible] = useState(false);
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data, isFetching } = useQuery(['stores', 'picker'], fetchStores, {
    staleTime: Infinity
  });

  const normalizedFilter = query.trim().toLowerCase();
  const filteredStores = useMemo(() => {
    const items = data?.items ?? [];
    if (!normalizedFilter) {
      return items;
    }
    return items.filter((store) => {
      const haystack = [store.name, store.domain, ...(store.aliases ?? [])]
        .filter(Boolean)
        .map((value) => value.toLowerCase());
      return haystack.some((value) => value.includes(normalizedFilter));
    });
  }, [data?.items, normalizedFilter]);

  return (
    <>
      <View>
        <TextInput
          placeholder="Search stores"
          placeholderTextColor={theme.subtext}
          style={styles.input}
          value={query}
          onChangeText={setQuery}
        />
        {isFetching && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.accent} />
          </View>
        )}
        <FlatList
          data={filteredStores}
          keyExtractor={(item) => item.id}
          style={styles.list}
          ListEmptyComponent={
            !isFetching ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No stores found.</Text>
                {query.trim().length > 0 ? (
                  <Pressable onPress={() => setAddStoreModalVisible(true)}>
                    <Text style={styles.addLink}>Add this store</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.storeRow,
                selectedStoreId === item.id && { borderColor: theme.accent, borderWidth: 1 }
              ]}
              onPress={() => onSelect(item)}
            >
              <View>
                <Text style={styles.storeName}>{item.name}</Text>
                <Text style={styles.storeMeta}>{item.website}</Text>
              </View>
              <Text style={styles.storeBadge}>{item.aliases?.[0] ?? item.domain}</Text>
            </Pressable>
          )}
        />
      </View>
      <AddStoreSuggestionModal
        visible={addStoreModalVisible}
        onClose={() => setAddStoreModalVisible(false)}
        defaultName={query}
        defaultWebsite={query.trim().startsWith('http') ? query.trim() : undefined}
        onSuccess={() => setAddStoreModalVisible(false)}
      />
    </>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    input: {
      backgroundColor: theme.inputBackground,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      color: '#000',
      borderWidth: 1,
      borderColor: theme.border,
      fontFamily: theme.typography.body,
      fontSize: scaleFont(15)
    },
    loadingRow: {
      paddingVertical: 10,
      alignItems: 'center'
    },
    list: {
      maxHeight: 300
    },
    storeRow: {
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 8,
      backgroundColor: theme.surface,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    storeName: {
      color: theme.text,
      fontFamily: theme.typography.heading
    },
    storeMeta: {
      color: theme.subtext,
      fontSize: scaleFont(12),
      marginTop: 4,
      fontFamily: theme.typography.body
    },
    storeBadge: {
      color: theme.accent,
      fontSize: scaleFont(11),
      fontFamily: theme.typography.bodySemiBold
    },
    empty: {
      padding: 12,
      alignItems: 'center'
    },
    emptyText: {
      color: theme.muted,
      fontFamily: theme.typography.body
    },
    addLink: {
      color: theme.accent,
      marginTop: 6,
      fontFamily: theme.typography.bodySemiBold
    }
  });

export default StorePicker;
