import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/apiError';
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
  barePlace,
  chooseSuggestion,
  franceCountry,
  louvre,
  parisCity,
  renderPage,
  searchbox,
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
  describe('chosen city', () => {
    async function chooseParis() {
      searchLocationsMock.mockResolvedValue([parisCity]);
      renderPage();
      await chooseSuggestion('pa', /Paris/);
    }

    it('fetches attractions with the city coordinates', async () => {
      getAttractionsMock.mockResolvedValue([louvre]);
      await chooseParis();

      await waitFor(() => {
        expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      });
      expect(getAttractionsMock).toHaveBeenCalledWith(48.8566, 2.3522, {
        kinds: [],
        minRate: null,
      });
      expect(searchLocationsMock).toHaveBeenCalledTimes(1);
    });

    it('shows a narrow-to-city prompt and fetches nothing when a country is chosen', async () => {
      searchLocationsMock.mockResolvedValue([franceCountry]);
      renderPage();

      await chooseSuggestion('fr', /France/);

      expect(screen.getByText(/france is a country — search for a specific city/i)).toBeInTheDocument();
      expect(getAttractionsMock).not.toHaveBeenCalled();
      expect(searchbox()).toHaveValue('France');
    });

    it('renders attraction cards with kinds tags capped at 3, rating, and heritage tag', async () => {
      getAttractionsMock.mockResolvedValue([louvre]);
      await chooseParis();
      await waitFor(() => {
        expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      });

      const card = screen.getByRole('link', { name: /louvre museum/i });
      expect(card).toHaveAttribute('href', '/attractions/W123');
      expect(within(card).getByText('museums')).toBeInTheDocument();
      expect(within(card).getByText('interesting places')).toBeInTheDocument();
      expect(within(card).getByText('cultural')).toBeInTheDocument();
      expect(within(card).queryByText('urban environment')).not.toBeInTheDocument();
      expect(within(card).getByLabelText('Rated 3 of 3')).toBeInTheDocument();
      expect(within(card).getByText(/heritage/i)).toBeInTheDocument();
      expect(within(card).getByRole('img')).toHaveAttribute(
        'src',
        'https://example.com/louvre.jpg',
      );
    });

    it('renders the image placeholder and no rating badge for a bare attraction', async () => {
      getAttractionsMock.mockResolvedValue([barePlace]);
      await chooseParis();
      await waitFor(() => {
        expect(screen.getByText('Hidden Garden')).toBeInTheDocument();
      });

      const card = screen.getByRole('link', { name: /hidden garden/i });
      expect(within(card).queryByRole('img')).not.toBeInTheDocument();
      expect(within(card).getByTestId('image-placeholder')).toBeInTheDocument();
      expect(within(card).queryByText(/not rated/i)).not.toBeInTheDocument();
      expect(within(card).queryByLabelText(/rated/i)).not.toBeInTheDocument();
    });

    it('falls back to the image placeholder when the image fails to load', async () => {
      getAttractionsMock.mockResolvedValue([louvre]);
      await chooseParis();
      await waitFor(() => {
        expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      });

      fireEvent.error(within(screen.getByRole('link', { name: /louvre museum/i })).getByRole('img'));

      const card = screen.getByRole('link', { name: /louvre museum/i });
      expect(within(card).queryByRole('img')).not.toBeInTheDocument();
      expect(within(card).getByTestId('image-placeholder')).toBeInTheDocument();
    });

    it('keeps a distinct empty state when a city has no attractions', async () => {
      getAttractionsMock.mockResolvedValue([]);
      await chooseParis();

      await waitFor(() => {
        expect(screen.getByText(/no attractions in this area/i)).toBeInTheDocument();
      });
    });

    it('shows a service unavailable state with retry when attractions return 503', async () => {
      getAttractionsMock.mockRejectedValueOnce(new ApiError(503, 'Service unavailable.'));
      getAttractionsMock.mockResolvedValueOnce([louvre]);
      await chooseParis();

      await waitFor(() => {
        expect(screen.getByText(/service unavailable/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      await waitFor(() => {
        expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      });
      expect(getAttractionsMock).toHaveBeenCalledTimes(2);
    });

    it('restores the input and the chosen city after unmounting and remounting', async () => {
      getAttractionsMock.mockResolvedValue([louvre]);
      const first = renderPage();
      searchLocationsMock.mockResolvedValue([parisCity]);
      await chooseSuggestion('pa', /Paris/);
      await waitFor(() => {
        expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      });

      first.unmount();
      renderPage();

      expect(searchbox()).toHaveValue('Paris');
      await waitFor(() => {
        expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      });
      expect(screen.getByText('Attractions near Paris')).toBeInTheDocument();
      expect(screen.queryByText('Popular searches')).not.toBeInTheDocument();
    });
  });

});
