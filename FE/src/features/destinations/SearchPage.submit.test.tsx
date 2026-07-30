import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/apiError';
import type { LocationSearchResult } from '@/shared/api/models/destination/locationSearchResult';
import { resetSearchState } from './searchState';
import { clearRecentSearches } from './recentSearches';

vi.mock('./destinationService', () => ({
  destinationService: {
    searchLocations: vi.fn(),
    getAttractions: vi.fn(),
  },
}));

vi.mock('@/features/trips/useAddToTrip', () => ({
  useAddToTrip: () => ({ requestAdd: vi.fn() }),
}));

import { destinationService } from './destinationService';
import {
  chooseSuggestion,
  findDropdown,
  franceCountry,
  louvre,
  parisCity,
  queryDropdown,
  renderPage,
  searchbox,
  sleep,
  submitSearch,
  typeInput,
} from './searchPageTestUtils';

const searchLocationsMock = vi.mocked(destinationService.searchLocations);
const getAttractionsMock = vi.mocked(destinationService.getAttractions);

beforeEach(() => {
  searchLocationsMock.mockReset();
  getAttractionsMock.mockReset();
  resetSearchState();
  clearRecentSearches();
});
describe('SearchPage', () => {
  describe('typed submit', () => {
    it('renders submitted matches as dropdown options and nothing in the page body', async () => {
      searchLocationsMock.mockResolvedValue([parisCity, franceCountry]);
      renderPage();

      submitSearch('paris');

      const listbox = await findDropdown();
      const options = within(listbox).getAllByRole('option');
      expect(options).toHaveLength(2);
      expect(within(options[0]).getByText('Paris')).toBeInTheDocument();
      expect(within(options[0]).getByText('FR')).toBeInTheDocument();
      expect(within(options[0]).getByText('City')).toBeInTheDocument();
      expect(within(options[1]).getByText('France')).toBeInTheDocument();
      expect(within(options[1]).getByText('Country')).toBeInTheDocument();
      expect(searchLocationsMock).toHaveBeenCalledWith('paris');
      expect(screen.getAllByRole('listbox')).toHaveLength(1);
    });

    it('shows at most 5 options', async () => {
      const many = Array.from({ length: 7 }, (_, index) => ({
        ...parisCity,
        name: `City ${index + 1}`,
        latitude: index,
      }));
      searchLocationsMock.mockResolvedValue(many);
      renderPage();

      submitSearch('city');

      const listbox = await findDropdown();
      expect(within(listbox).getAllByRole('option')).toHaveLength(5);
      expect(screen.queryByText('City 6')).not.toBeInTheDocument();
    });

    it('keeps the dropdown open showing "No matching locations found." when nothing matches', async () => {
      searchLocationsMock.mockResolvedValue([]);
      renderPage();

      submitSearch('xyzzy');

      await waitFor(() => {
        expect(screen.getByText('No matching locations found.')).toBeInTheDocument();
      });
      expect(searchbox()).toHaveValue('xyzzy');
      expect(screen.getByText('Popular searches')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tokyo' })).toBeInTheDocument();
    });

    it('does not submit a whitespace-only query', () => {
      renderPage();

      typeInput('   ');
      fireEvent.submit(screen.getByRole('search'));

      expect(searchLocationsMock).not.toHaveBeenCalled();
    });

    it('refuses a one-character submit instead of issuing a dead-end request', () => {
      renderPage();

      typeInput('A');

      expect(screen.getByRole('button', { name: /^search$/i })).toBeDisabled();

      fireEvent.submit(screen.getByRole('search'));

      expect(searchLocationsMock).not.toHaveBeenCalled();
      expect(screen.queryByText(/searching/i)).not.toBeInTheDocument();
      expect(queryDropdown()).not.toBeInTheDocument();
    });

    it('drops the stale search-status band once the field diverges from the submitted query', async () => {
      searchLocationsMock.mockRejectedValueOnce(new ApiError(503, 'Service unavailable.'));
      searchLocationsMock.mockResolvedValue([parisCity]);
      renderPage();

      submitSearch('paris');
      await waitFor(() => {
        expect(screen.getByText(/service unavailable/i)).toBeInTheDocument();
      });

      typeInput('parisx');

      expect(screen.queryByText(/service unavailable/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('shows a loading indicator while the search is in flight', async () => {
      let resolveSearch: (value: LocationSearchResult[]) => void = () => {};
      searchLocationsMock.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSearch = resolve;
          }),
      );
      renderPage();

      submitSearch('paris');

      expect(screen.getByText(/searching/i)).toBeInTheDocument();
      resolveSearch([parisCity]);
      await findDropdown();
    });

    it('shows a service unavailable state with retry when the search returns 503', async () => {
      searchLocationsMock.mockRejectedValueOnce(new ApiError(503, 'Service unavailable.'));
      searchLocationsMock.mockResolvedValueOnce([parisCity]);
      renderPage();

      submitSearch('paris');

      await waitFor(() => {
        expect(screen.getByText(/service unavailable/i)).toBeInTheDocument();
      });
      expect(queryDropdown()).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      await findDropdown();
      expect(searchLocationsMock).toHaveBeenCalledTimes(2);
    });

    it('clears the previous selection when a new search is submitted', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      getAttractionsMock.mockResolvedValue([louvre]);
      renderPage();

      await chooseSuggestion('pa', /Paris/);
      await waitFor(() => {
        expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      });

      searchLocationsMock.mockResolvedValue([franceCountry]);
      submitSearch('france');

      await findDropdown();
      expect(screen.queryByText(/attractions near paris/i)).not.toBeInTheDocument();
      expect(screen.queryByText('Louvre Museum')).not.toBeInTheDocument();
    });
  });

  describe('dropdown dismissal', () => {
    it('closes on an outside click and keeps the field value', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      renderPage();

      typeInput('pa');
      await findDropdown();

      fireEvent.pointerDown(document.body);

      expect(queryDropdown()).not.toBeInTheDocument();
      expect(searchbox()).toHaveValue('pa');
    });

    it('closes when the input loses focus', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      renderPage();

      typeInput('pa');
      await findDropdown();

      fireEvent.blur(searchbox());

      expect(queryDropdown()).not.toBeInTheDocument();
      expect(searchbox()).toHaveValue('pa');
    });

    it('registers a pointer choice without blur pre-empting it', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      getAttractionsMock.mockResolvedValue([louvre]);
      renderPage();

      typeInput('pa');
      const listbox = await findDropdown();
      fireEvent.click(within(listbox).getByRole('option'));

      expect(queryDropdown()).not.toBeInTheDocument();
      expect(searchbox()).toHaveValue('Paris');
      await waitFor(() => {
        expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      });
    });

    it('closes on Escape without changing the input, and reopens when typing resumes', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      renderPage();

      typeInput('pa');
      await findDropdown();

      fireEvent.keyDown(searchbox(), { key: 'Escape' });

      expect(queryDropdown()).not.toBeInTheDocument();
      expect(searchbox()).toHaveValue('pa');

      typeInput('par');
      await findDropdown();
    });

    it('does not reopen after choosing a suggestion whose name carries whitespace', async () => {
      searchLocationsMock.mockResolvedValue([{ ...parisCity, name: '  Paris  ' }]);
      getAttractionsMock.mockResolvedValue([louvre]);
      renderPage();

      typeInput('pa');
      const listbox = await findDropdown();
      fireEvent.click(within(listbox).getByRole('option'));

      await sleep(500);

      expect(queryDropdown()).not.toBeInTheDocument();
    });

    it('keeps a submitted-but-unchosen search alive across unmount and remount', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      const { unmount } = renderPage();

      submitSearch('paris');
      await waitFor(() => {
        expect(searchLocationsMock).toHaveBeenCalledWith('paris');
      });

      unmount();
      searchLocationsMock.mockClear();
      renderPage();

      expect(searchbox()).toHaveValue('paris');
      await waitFor(() => {
        expect(searchLocationsMock).toHaveBeenCalledWith('paris');
      });
    });

    it('issues no further location search when an option is chosen before the debounce settles', async () => {
      searchLocationsMock.mockResolvedValue([
        { ...parisCity, name: 'Tokyo', latitude: 35.6762, longitude: 139.6503 },
      ]);
      getAttractionsMock.mockResolvedValue([louvre]);
      renderPage();

      typeInput('Tok');
      const listbox = await findDropdown();
      fireEvent.click(within(listbox).getByRole('option'));

      await sleep(500);

      expect(searchLocationsMock).toHaveBeenCalledTimes(1);
      expect(searchLocationsMock).toHaveBeenCalledWith('Tok');
      expect(screen.getByText('Attractions near Tokyo')).toBeInTheDocument();
      expect(getAttractionsMock).toHaveBeenCalledWith(35.6762, 139.6503, {
        kinds: [],
        minRate: null,
      });
    });
  });

});
