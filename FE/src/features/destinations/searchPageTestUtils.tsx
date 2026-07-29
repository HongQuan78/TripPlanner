import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Attraction } from '@/shared/api/models/destination/attraction';
import type { LocationSearchResult } from '@/shared/api/models/destination/locationSearchResult';
import SearchPage from './SearchPage';

export const parisCity: LocationSearchResult = {
  name: 'Paris',
  countryCode: 'FR',
  locationType: 'City',
  latitude: 48.8566,
  longitude: 2.3522,
  isPartialMatch: false,
};

export const tokyoCity: LocationSearchResult = {
  name: 'Tokyo',
  countryCode: 'JP',
  locationType: 'City',
  latitude: 35.6762,
  longitude: 139.6503,
  isPartialMatch: false,
};

export const franceCountry: LocationSearchResult = {
  name: 'France',
  countryCode: 'FR',
  locationType: 'Country',
  latitude: 46.2276,
  longitude: 2.2137,
  isPartialMatch: false,
};

export const louvre: Attraction = {
  xid: 'W123',
  name: 'Louvre Museum',
  kinds: ['museums', 'interesting_places', 'cultural', 'urban_environment'],
  rating: '3h',
  imageUrl: 'https://example.com/louvre.jpg',
  distanceMeters: 250,
};

export const barePlace: Attraction = {
  xid: 'N456',
  name: 'Hidden Garden',
  kinds: [],
  rating: null,
  imageUrl: null,
  distanceMeters: null,
};

export function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

export function searchbox() {
  return screen.getByRole('searchbox', { name: /search/i });
}

export function typeInput(value: string) {
  fireEvent.change(searchbox(), { target: { value } });
}

export function submitSearch(query: string) {
  typeInput(query);
  fireEvent.click(screen.getByRole('button', { name: /^search$/i }));
}

export function queryDropdown() {
  return screen.queryByRole('listbox', { name: /location suggestions/i });
}

export function findDropdown() {
  return screen.findByRole('listbox', { name: /location suggestions/i });
}

export async function chooseSuggestion(query: string, optionName: RegExp) {
  typeInput(query);
  let option: HTMLElement | null = null;
  await waitFor(() => {
    const listbox = screen.getByRole('listbox', { name: /location suggestions/i });
    option = within(listbox).getByRole('option', { name: optionName });
  });
  fireEvent.mouseDown(option!);
}

export function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
