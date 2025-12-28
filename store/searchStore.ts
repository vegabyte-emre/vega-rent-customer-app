import { create } from 'zustand';
import { SearchParams, FilterParams } from '../types';

interface SearchState {
  searchParams: SearchParams;
  filterParams: FilterParams;
  
  setSearchParams: (params: Partial<SearchParams>) => void;
  setFilterParams: (params: Partial<FilterParams>) => void;
  resetSearch: () => void;
  resetFilters: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchParams: {},
  filterParams: {},

  setSearchParams: (params) => {
    set((state) => ({
      searchParams: { ...state.searchParams, ...params },
    }));
  },

  setFilterParams: (params) => {
    set((state) => ({
      filterParams: { ...state.filterParams, ...params },
    }));
  },

  resetSearch: () => {
    set({ searchParams: {} });
  },

  resetFilters: () => {
    set({ filterParams: {} });
  },
}));
