import React, { useEffect, useMemo } from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { useFavoriteStore } from '../store/favoriteStore';
import DealCard from '../components/DealCard';
import { useTheme, Theme } from '../theme';
import Header from '../components/Header';
import { useNavigation } from '@react-navigation/native';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background
    },
    empty: {
      padding: 40,
      alignItems: 'center'
    },
    emptyText: {
      color: theme.subtext,
      fontFamily: theme.typography.body
    }
  });

const FavoritesScreen = () => {
  const loadFavorites = useFavoriteStore((state) => state.loadFavorites);
  const favorites = useFavoriteStore((state) => state.favorites);
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <Header title="Saved" />
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DealCard coupon={item} onPress={() => navigation.navigate('Detail', { coupon: item })} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Tap Save on any coupon to add it here.</Text>
          </View>
        }
      />
    </View>
  );
};

export default FavoritesScreen;
