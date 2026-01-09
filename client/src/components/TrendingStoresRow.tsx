import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import CardPanel from './CardPanel';
import SectionTitle from './SectionTitle';
import { useTheme } from '../theme';

type TrendingStore = {
  id: string;
  name: string;
};

type TrendingStoresRowProps = {
  stores: TrendingStore[];
  onSelect: (storeId: string, storeName: string) => void;
  title?: string;
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      marginBottom: 12,
      paddingHorizontal: 10,
      paddingVertical: 12
    },
    titleRow: {
      alignItems: 'center'
    },
    list: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'nowrap'
    },
    tag: {
      marginRight: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 8,
      paddingHorizontal: 14,
      backgroundColor: theme.surface
    },
    tagText: {
      color: theme.text,
      fontFamily: theme.typography.bodySemiBold
    }
  });

const TrendingStoresRow = ({ stores, onSelect, title = 'Trending stores' }: TrendingStoresRowProps) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (!stores.length) {
    return null;
  }
  return (
    <CardPanel style={styles.container}>
      <View style={styles.titleRow}>
        <SectionTitle smallCaps>{title}</SectionTitle>
      </View>
      <FlatList
        data={stores}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.tag} onPress={() => onSelect(item.id, item.name)}>
            <Text style={styles.tagText}>{item.name}</Text>
          </Pressable>
        )}
      />
    </CardPanel>
  );
};

export default TrendingStoresRow;
