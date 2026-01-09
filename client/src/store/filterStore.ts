import { create } from 'zustand';

export type SortOption = 'hot' | 'new' | 'expiring' | 'verified';

interface FilterState {
  query: string;
  storeId?: string;
  storeName?: string;
  category?: string;
  source?: string;
  sort: SortOption;
  setQuery: (value: string) => void;
  setStoreFilter: (storeId?: string, storeName?: string) => void;
  setCategory: (value?: string) => void;
  setSource: (value?: string) => void;
  setSort: (value: SortOption) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  query: '',
  storeId: undefined,
  storeName: undefined,
  sort: 'hot',
  setQuery: (value) => set({ query: value }),
  setStoreFilter: (storeId, storeName) => set({ storeId, storeName }),
  setCategory: (value) => set({ category: value }),
  setSource: (value) => set({ source: value }),
  setSort: (value) => set({ sort: value })
}));
