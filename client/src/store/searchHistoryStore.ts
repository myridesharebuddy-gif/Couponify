import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const SEARCH_KEY = 'couponify_search_history';

export const useSearchHistoryStore = create<{
  history: string[];
  load: () => Promise<void>;
  add: (value: string) => Promise<void>;
}>((set) => ({
  history: [],
  load: async () => {
    try {
      const stored = await AsyncStorage.getItem(SEARCH_KEY);
      if (stored) {
        set({ history: JSON.parse(stored) });
      }
    } catch {
      // ignore
    }
  },
  add: async (value) => {
    set((state) => {
      const trimmed = value.trim();
      if (!trimmed) return { history: state.history };
      const next = [trimmed, ...state.history.filter((item) => item !== trimmed)].slice(0, 10);
      AsyncStorage.setItem(SEARCH_KEY, JSON.stringify(next)).catch(() => {});
      return { history: next };
    });
  }
}));
