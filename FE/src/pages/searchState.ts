import type { LocationSearchResult } from '../api/types';

export interface SearchState {
  input: string;
  submittedQuery: string;
  selected: LocationSearchResult | null;
}

const defaultState: SearchState = {
  input: '',
  submittedQuery: '',
  selected: null,
};

let current: SearchState = { ...defaultState };

export function getSearchState(): SearchState {
  return current;
}

export function saveSearchState(next: SearchState): void {
  current = next;
}

export function resetSearchState(): void {
  current = { ...defaultState };
}
