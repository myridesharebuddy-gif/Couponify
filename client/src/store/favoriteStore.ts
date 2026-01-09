import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { DealItem } from '../types/coupon';

const STORAGE_KEY = 'couponify_favorites';

interface FavoriteState {
  favorites: DealItem[];
  loadFavorites: () => Promise<void>;
  toggleFavorite: (item: DealItem) => Promise<void>;
  isFavorite: (id: string) => boolean;
}

export const useFavoriteStore = create<FavoriteState>((set) => ({
  favorites: [],
  loadFavorites: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        set({ favorites: JSON.parse(stored) });
      }
    } catch {
      // ignore
    }
  },
  toggleFavorite: async (item) => {
    set((state) => {
      const exists = state.favorites.find((fav) => fav.id === item.id);
      const updated = exists
        ? state.favorites.filter((fav) => fav.id !== item.id)
        : [...state.favorites, item];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return { favorites: updated };
    });
  },
  isFavorite: (id) => {
    const { favorites } = useFavoriteStore.getState();
    return favorites.some((item) => item.id === id);
  }
}));
