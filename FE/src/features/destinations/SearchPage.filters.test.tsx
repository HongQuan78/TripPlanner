import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/apiError';
import type { Attraction } from '@/shared/api/models/destination/attraction';
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
  louvre,
  parisCity,
  renderPage,
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
  describe('filters and sort', () => {
    const lowRated: Attraction = {
      xid: 'low',
      name: 'Low Rated',
      kinds: [],
      rating: '1',
      imageUrl: null,
      distanceMeters: null,
    };
    const highRated: Attraction = {
      xid: 'high',
      name: 'High Rated',
      kinds: [],
      rating: '3',
      imageUrl: null,
      distanceMeters: null,
    };

    async function selectParisCity() {
      searchLocationsMock.mockResolvedValue([parisCity]);
      renderPage();
      await chooseSuggestion('pa', /Paris/);
    }

    it('refetches with the chosen category when a filter checkbox is toggled', async () => {
      getAttractionsMock.mockResolvedValue([louvre]);
      await selectParisCity();
      await waitFor(() => {
        expect(getAttractionsMock).toHaveBeenCalledWith(48.8566, 2.3522, {
          kinds: [],
          minRate: null,
        });
      });

      fireEvent.click(screen.getByRole('checkbox', { name: 'Cultural' }));

      await waitFor(() => {
        expect(getAttractionsMock).toHaveBeenCalledWith(48.8566, 2.3522, {
          kinds: ['cultural'],
          minRate: null,
        });
      });
    });

    it('refetches with the chosen minimum rating', async () => {
      getAttractionsMock.mockResolvedValue([louvre]);
      await selectParisCity();
      await waitFor(() => {
        expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/minimum rating/i), { target: { value: '3' } });

      await waitFor(() => {
        expect(getAttractionsMock).toHaveBeenCalledWith(48.8566, 2.3522, {
          kinds: [],
          minRate: 3,
        });
      });
    });

    it('clears filters and refetches the full list', async () => {
      getAttractionsMock.mockResolvedValue([louvre]);
      await selectParisCity();
      await waitFor(() => {
        expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('checkbox', { name: 'Cultural' }));
      await waitFor(() => {
        expect(getAttractionsMock).toHaveBeenCalledWith(48.8566, 2.3522, {
          kinds: ['cultural'],
          minRate: null,
        });
      });

      fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));

      expect(screen.getByRole('checkbox', { name: 'Cultural' })).not.toBeChecked();
      await waitFor(() => {
        expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      });
    });

    it('reorders by highest rating client-side without refetching and preserves filters', async () => {
      getAttractionsMock.mockResolvedValue([lowRated, highRated]);
      await selectParisCity();
      await waitFor(() => {
        expect(screen.getByText('Low Rated')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('checkbox', { name: 'Cultural' }));
      await waitFor(() => {
        expect(getAttractionsMock).toHaveBeenCalledWith(48.8566, 2.3522, {
          kinds: ['cultural'],
          minRate: null,
        });
      });
      await waitFor(() => {
        expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
      });
      const callsBeforeSort = getAttractionsMock.mock.calls.length;
      expect(screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent)).toEqual([
        'Low Rated',
        'High Rated',
      ]);

      fireEvent.change(screen.getByLabelText(/sort by/i), { target: { value: 'rating' } });

      expect(screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent)).toEqual([
        'High Rated',
        'Low Rated',
      ]);
      expect(getAttractionsMock.mock.calls.length).toBe(callsBeforeSort);
      expect(screen.getByRole('checkbox', { name: 'Cultural' })).toBeChecked();
    });

    it('resets filters and sort when a new city is chosen from the dropdown', async () => {
      getAttractionsMock.mockResolvedValue([lowRated, highRated]);
      await selectParisCity();
      await waitFor(() => {
        expect(screen.getByText('Low Rated')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('checkbox', { name: 'Cultural' }));
      fireEvent.change(screen.getByLabelText(/minimum rating/i), { target: { value: '3' } });
      fireEvent.change(screen.getByLabelText(/sort by/i), { target: { value: 'rating' } });
      await waitFor(() => {
        expect(getAttractionsMock).toHaveBeenCalledWith(48.8566, 2.3522, {
          kinds: ['cultural'],
          minRate: 3,
        });
      });

      const lyon: LocationSearchResult = {
        ...parisCity,
        name: 'Lyon',
        latitude: 45.75,
        longitude: 4.85,
      };
      searchLocationsMock.mockResolvedValue([lyon]);
      await chooseSuggestion('ly', /Lyon/);

      await waitFor(() => {
        expect(getAttractionsMock).toHaveBeenLastCalledWith(45.75, 4.85, {
          kinds: [],
          minRate: null,
        });
      });
      expect(screen.getByRole('checkbox', { name: 'Cultural' })).not.toBeChecked();
      expect(screen.getByLabelText(/minimum rating/i)).toHaveValue('');
      expect(screen.getByLabelText(/sort by/i)).toHaveValue('recommended');
      expect(getAttractionsMock).not.toHaveBeenCalledWith(45.75, 4.85, {
        kinds: ['cultural'],
        minRate: 3,
      });
    });

    it('resets the minimum-rating select back to Any when Clear filters is clicked', async () => {
      getAttractionsMock.mockResolvedValue([louvre]);
      await selectParisCity();
      await waitFor(() => {
        expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/minimum rating/i), { target: { value: '3' } });
      await waitFor(() => {
        expect(getAttractionsMock).toHaveBeenCalledWith(48.8566, 2.3522, {
          kinds: [],
          minRate: 3,
        });
      });
      expect(screen.getByLabelText(/minimum rating/i)).toHaveValue('3');

      fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));

      expect(screen.getByLabelText(/minimum rating/i)).toHaveValue('');
      await waitFor(() => {
        expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      });
    });

    it('shows a filter-aware empty state when filtered results are empty', async () => {
      getAttractionsMock.mockResolvedValue([]);
      await selectParisCity();

      fireEvent.click(screen.getByRole('checkbox', { name: 'Historic' }));

      await waitFor(() => {
        expect(screen.getByText(/no attractions match these filters/i)).toBeInTheDocument();
      });
    });
  });

  describe('pagination / load more', () => {
    function makeAttractions(count: number, prefix: string): Attraction[] {
      return Array.from({ length: count }, (_, index) => ({
        xid: `${prefix}${index}`,
        name: `${prefix} Place ${index}`,
        kinds: [],
        rating: null,
        imageUrl: null,
        distanceMeters: null,
      }));
    }

    async function selectParisCity() {
      searchLocationsMock.mockResolvedValue([parisCity]);
      renderPage();
      await chooseSuggestion('pa', /Paris/);
    }

    function cardCount() {
      return screen.getAllByRole('heading', { level: 3 }).length;
    }

    it('shows Load more only when a full page of 20 is returned', async () => {
      getAttractionsMock.mockResolvedValue(makeAttractions(20, 'a'));
      await selectParisCity();

      await waitFor(() => {
        expect(cardCount()).toBe(20);
      });
      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
    });

    it('hides Load more when the first page has fewer than 20 items', async () => {
      getAttractionsMock.mockResolvedValue(makeAttractions(5, 'a'));
      await selectParisCity();

      await waitFor(() => {
        expect(cardCount()).toBe(5);
      });
      expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
    });

    it('appends the next page and hides Load more once a short page returns', async () => {
      getAttractionsMock
        .mockResolvedValueOnce(makeAttractions(20, 'a'))
        .mockResolvedValueOnce(makeAttractions(5, 'b'));
      await selectParisCity();

      await waitFor(() => {
        expect(cardCount()).toBe(20);
      });

      fireEvent.click(screen.getByRole('button', { name: /load more/i }));

      await waitFor(() => {
        expect(cardCount()).toBe(25);
      });
      expect(getAttractionsMock).toHaveBeenLastCalledWith(
        48.8566,
        2.3522,
        { kinds: [], minRate: null },
        20,
      );
      expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
    });

    it('dedupes appended pages by xid', async () => {
      const firstPage = makeAttractions(20, 'a');
      const secondPage = [firstPage[19], ...makeAttractions(3, 'b')];
      getAttractionsMock.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage);
      await selectParisCity();

      await waitFor(() => {
        expect(cardCount()).toBe(20);
      });

      fireEvent.click(screen.getByRole('button', { name: /load more/i }));

      await waitFor(() => {
        expect(cardCount()).toBe(23);
      });
      expect(screen.getAllByText('a Place 19')).toHaveLength(1);
    });

    it('shows a busy, disabled control while the next page loads', async () => {
      let resolveSecond: (value: Attraction[]) => void = () => {};
      getAttractionsMock.mockResolvedValueOnce(makeAttractions(20, 'a')).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );
      await selectParisCity();

      await waitFor(() => {
        expect(cardCount()).toBe(20);
      });

      fireEvent.click(screen.getByRole('button', { name: /load more/i }));

      const busy = await screen.findByRole('button', { name: /loading/i });
      expect(busy).toBeDisabled();
      expect(busy).toHaveAttribute('aria-busy', 'true');

      resolveSecond(makeAttractions(5, 'b'));
      await waitFor(() => {
        expect(cardCount()).toBe(25);
      });
    });

    it('keeps loaded items and offers a retry when the next page fails', async () => {
      getAttractionsMock
        .mockResolvedValueOnce(makeAttractions(20, 'a'))
        .mockRejectedValueOnce(new ApiError(503, 'Service unavailable.'))
        .mockResolvedValueOnce(makeAttractions(4, 'b'));
      await selectParisCity();

      await waitFor(() => {
        expect(cardCount()).toBe(20);
      });

      fireEvent.click(screen.getByRole('button', { name: /load more/i }));

      await waitFor(() => {
        expect(screen.getByText(/couldn't load more attractions/i)).toBeInTheDocument();
      });
      expect(cardCount()).toBe(20);
      expect(screen.getByRole('checkbox', { name: 'Cultural' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      await waitFor(() => {
        expect(cardCount()).toBe(24);
      });
    });

    it('resets pagination when a new city is chosen', async () => {
      getAttractionsMock
        .mockResolvedValueOnce(makeAttractions(20, 'a'))
        .mockResolvedValueOnce(makeAttractions(5, 'b'));
      await selectParisCity();

      await waitFor(() => {
        expect(cardCount()).toBe(20);
      });
      fireEvent.click(screen.getByRole('button', { name: /load more/i }));
      await waitFor(() => {
        expect(cardCount()).toBe(25);
      });

      const lyon: LocationSearchResult = {
        ...parisCity,
        name: 'Lyon',
        latitude: 45.75,
        longitude: 4.85,
      };
      searchLocationsMock.mockResolvedValue([lyon]);
      getAttractionsMock.mockResolvedValueOnce(makeAttractions(2, 'c'));
      await chooseSuggestion('ly', /Lyon/);

      await waitFor(() => {
        expect(cardCount()).toBe(2);
      });
      expect(screen.queryByText('a Place 0')).not.toBeInTheDocument();
      expect(getAttractionsMock).toHaveBeenLastCalledWith(45.75, 4.85, {
        kinds: [],
        minRate: null,
      });
    });
  });
});
