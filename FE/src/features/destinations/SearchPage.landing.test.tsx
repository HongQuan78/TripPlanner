import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PopularTile from './PopularTile';
import { POPULAR_CITIES } from './popularCities';
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
  louvre,
  parisCity,
  queryDropdown,
  renderPage,
  searchbox,
  tokyoCity,
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
  describe('landing body', () => {
    const tileCities = ['Đà Nẵng', 'Paris', 'Tokyo', 'Rome', 'Barcelona', 'New York'];

    it('renders the hero headline, tagline, a wordless input, and the search landmark', () => {
      renderPage();

      expect(screen.getByRole('heading', { level: 1, name: 'Where to next?' })).toBeInTheDocument();
      expect(screen.getByText('Search any city and start building the trip.')).toBeInTheDocument();
      expect(searchbox()).not.toHaveAttribute('placeholder');
      expect(screen.getByRole('search')).toBeInTheDocument();
    });

    it('omits the recent-searches section entirely on a first visit', () => {
      renderPage();

      expect(screen.queryByText('Recent searches')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /clear recent searches/i })).not.toBeInTheDocument();
      expect(screen.getByText('Popular searches')).toBeInTheDocument();
    });

    it('renders the six popular-search tiles under their label', () => {
      renderPage();

      for (const city of tileCities) {
        expect(screen.getByRole('button', { name: city })).toBeInTheDocument();
      }
    });

    it('renders a photograph on every configured tile, pointing at that city image', () => {
      renderPage();

      for (const city of POPULAR_CITIES) {
        const tile = screen.getByRole('button', { name: city.name });
        const image = within(tile).getByTestId('tile-image');
        expect(image).toHaveAttribute('src', city.imageUrl!);
      }
    });

    it('keeps the photograph decorative so the tile is still named by the city alone', () => {
      renderPage();

      const tile = screen.getByRole('button', { name: 'Tokyo' });
      const image = within(tile).getByTestId('tile-image');
      expect(image).toHaveAttribute('alt', '');
      expect(image).toHaveAttribute('aria-hidden', 'true');
      expect(tile).toHaveAccessibleName('Tokyo');
    });

    it('holds the photograph hidden over the gradient until it finishes loading', () => {
      renderPage();

      const tile = screen.getByRole('button', { name: 'Rome' });
      const gradientBefore = tile.className;
      const image = within(tile).getByTestId('tile-image');
      expect(image).toHaveAttribute('data-loaded', 'false');

      fireEvent.load(image);

      expect(within(tile).getByTestId('tile-image')).toHaveAttribute('data-loaded', 'true');
      expect(tile.className).toBe(gradientBefore);
    });

    it('drops a failed photograph and leaves the tile on its gradient alone', () => {
      renderPage();

      const tile = screen.getByRole('button', { name: 'Paris' });
      const gradientBefore = tile.className;

      fireEvent.error(within(tile).getByTestId('tile-image'));

      expect(within(tile).queryByTestId('tile-image')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Paris' })).toBeInTheDocument();
      expect(tile.className).toBe(gradientBefore);
    });

    it('shows a cache-hit photograph without waiting for a load event', () => {
      const completeSpy = vi
        .spyOn(HTMLImageElement.prototype, 'complete', 'get')
        .mockReturnValue(true);

      renderPage();

      const tile = screen.getByRole('button', { name: 'Barcelona' });
      expect(within(tile).getByTestId('tile-image')).toHaveAttribute('data-loaded', 'true');

      completeSpy.mockRestore();
    });

    it('renders no photograph for a city with no configured image', () => {
      render(
        <PopularTile
          city={{ name: 'Nowhere', imageUrl: null }}
          gradientClass="grad"
          onSelect={() => {}}
        />,
      );

      const tile = screen.getByRole('button', { name: 'Nowhere' });
      expect(within(tile).queryByTestId('tile-image')).not.toBeInTheDocument();
      expect(tile.className).toContain('grad');
    });

    it('activates the search from a tile whose photograph has failed', async () => {
      searchLocationsMock.mockResolvedValue([tokyoCity]);
      renderPage();

      const tile = screen.getByRole('button', { name: 'Tokyo' });
      fireEvent.error(within(tile).getByTestId('tile-image'));
      fireEvent.click(screen.getByRole('button', { name: 'Tokyo' }));

      expect(searchbox()).toHaveValue('Tokyo');
      await waitFor(() => {
        expect(searchLocationsMock).toHaveBeenCalledWith('Tokyo');
      });
    });

    it('renders the how-it-works band as three ordered steps with no heading of its own', () => {
      renderPage();

      expect(screen.getByText('Search a city')).toBeInTheDocument();
      expect(screen.getByText('Anywhere in the world, by name.')).toBeInTheDocument();
      expect(screen.getByText("See what's there")).toBeInTheDocument();
      expect(
        screen.getByText('Attractions with ratings, heritage marks, and distance from the centre.'),
      ).toBeInTheDocument();
      expect(screen.getByText('Build the days')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Drop places into a day-by-day itinerary and move them as plans change.',
        ),
      ).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });

    it('conveys the step order through real list semantics, not the visual numeral alone', () => {
      renderPage();

      const list = screen.getByRole('list');
      expect(list.tagName).toBe('OL');
      expect(within(list).getAllByRole('listitem')).toHaveLength(3);
      for (const numeral of ['1', '2', '3']) {
        expect(within(list).getByText(numeral)).toHaveAttribute('aria-hidden', 'true');
      }
    });

    it('does not emit step headings that compete with "Attractions near"', () => {
      renderPage();

      expect(screen.queryByRole('heading', { name: 'Search a city' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: "See what's there" })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Build the days' })).not.toBeInTheDocument();
    });

    it('pre-fills and submits the text search when a tile is activated', async () => {
      searchLocationsMock.mockResolvedValue([tokyoCity]);
      getAttractionsMock.mockResolvedValue([louvre]);
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Tokyo' }));

      expect(searchbox()).toHaveValue('Tokyo');
      await waitFor(() => {
        expect(searchLocationsMock).toHaveBeenCalledWith('Tokyo');
      });

      const listbox = await findDropdown();
      const option = within(listbox).getByRole('option', { name: /Tokyo/ });
      fireEvent.mouseDown(option);

      await waitFor(() => {
        expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      });
      expect(screen.getByText('Attractions near Tokyo')).toBeInTheDocument();
      expect(screen.queryByText('Popular searches')).not.toBeInTheDocument();
    });

    it('keeps the pre-search body visible while a tile search is still resolving', async () => {
      searchLocationsMock.mockResolvedValue([tokyoCity]);
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Rome' }));

      expect(screen.getByText('Popular searches')).toBeInTheDocument();
      await waitFor(() => {
        expect(searchLocationsMock).toHaveBeenCalledWith('Rome');
      });
    });

    it('records a chosen city as a recent search and re-chooses it from its chip', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      getAttractionsMock.mockResolvedValue([louvre]);
      renderPage();

      await chooseSuggestion('pa', /Paris/);
      await waitFor(() => {
        expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /clear search/i }));

      const recentSection = screen.getByText('Recent searches').closest('section')!;
      const chip = within(recentSection).getByRole('button', { name: /Paris/ });
      const callsBefore = searchLocationsMock.mock.calls.length;
      fireEvent.click(chip);

      await waitFor(() => {
        expect(screen.getByText('Attractions near Paris')).toBeInTheDocument();
      });
      expect(queryDropdown()).not.toBeInTheDocument();
      expect(searchLocationsMock.mock.calls.length).toBe(callsBefore);
    });

    it('erases the history when "Clear recent searches" is activated', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      getAttractionsMock.mockResolvedValue([louvre]);
      renderPage();

      await chooseSuggestion('pa', /Paris/);
      await waitFor(() => {
        expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /clear search/i }));
      expect(screen.getByText('Recent searches')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /clear recent searches/i }));

      expect(screen.queryByText('Recent searches')).not.toBeInTheDocument();
    });

    it('returns the full pre-search body on clear and keeps the history', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      getAttractionsMock.mockResolvedValue([louvre]);
      renderPage();

      await chooseSuggestion('pa', /Paris/);
      await waitFor(() => {
        expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      });
      expect(screen.queryByText('Popular searches')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /clear search/i }));

      expect(searchbox()).toHaveValue('');
      expect(queryDropdown()).not.toBeInTheDocument();
      expect(screen.getByText('Popular searches')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tokyo' })).toBeInTheDocument();
      expect(screen.getByText('Build the days')).toBeInTheDocument();
      expect(screen.getByText('Recent searches')).toBeInTheDocument();
      expect(screen.queryByText('Attractions near Paris')).not.toBeInTheDocument();
    });

    it('renders the inline clear only when the field has a value', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      renderPage();

      expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument();

      typeInput('pa');

      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
    });

    it('keeps the pre-search body visible while typing an unsubmitted query', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      renderPage();

      typeInput('pa');
      await findDropdown();

      expect(screen.getByText('Popular searches')).toBeInTheDocument();
    });

    it('selects the current value when the bar is focused so typing replaces it', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      getAttractionsMock.mockResolvedValue([louvre]);
      renderPage();

      await chooseSuggestion('pa', /Paris/);
      const input = searchbox() as HTMLInputElement;

      fireEvent.focus(input);

      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe('Paris'.length);
    });
  });

});
