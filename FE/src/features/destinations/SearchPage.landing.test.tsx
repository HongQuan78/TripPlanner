import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PopularTile from './PopularTile';
import tileStyles from './PopularTile.module.css';
import { POPULAR_CITIES } from './popularCities';
import { TILE_GRADIENTS } from './landingContent';
import { resetSearchState } from './searchState';
import { clearRecentSearches } from './recentSearches';

const hiddenImageClass = tileStyles.tileImageHidden;

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
    const tileCities = POPULAR_CITIES.map((city) => city.name);

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

      const configured = POPULAR_CITIES.filter((city) => city.imageUrl !== null);
      expect(configured.length).toBeGreaterThan(0);
      for (const city of configured) {
        const tile = screen.getByRole('button', { name: city.name });
        const image = within(tile).getByTestId('tile-image');
        expect(image).toHaveAttribute('src', city.imageUrl);
      }
    });

    it('carries a gradient underlay on every shipped tile, not just a hand-built one', () => {
      renderPage();

      expect(TILE_GRADIENTS.length).toBeGreaterThan(0);
      for (const gradient of TILE_GRADIENTS) {
        expect(gradient).toBeTruthy();
      }
      POPULAR_CITIES.forEach((city, index) => {
        const tile = screen.getByRole('button', { name: city.name });
        expect(tile.className).toContain(TILE_GRADIENTS[index % TILE_GRADIENTS.length]);
      });
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

      const romeIndex = POPULAR_CITIES.findIndex((city) => city.name === 'Rome');
      const romeGradient = TILE_GRADIENTS[romeIndex % TILE_GRADIENTS.length];
      const tile = screen.getByRole('button', { name: 'Rome' });
      const image = within(tile).getByTestId('tile-image');
      expect(image).toHaveAttribute('data-loaded', 'false');
      expect(image.className).toContain(hiddenImageClass);
      expect(tile.className).toContain(romeGradient);

      fireEvent.load(image);

      const afterLoad = within(tile).getByTestId('tile-image');
      expect(afterLoad).toHaveAttribute('data-loaded', 'true');
      expect(afterLoad.className).not.toContain(hiddenImageClass);
      expect(tile.className).toContain(romeGradient);
    });

    it('drops a failed photograph and leaves the tile on its gradient alone', () => {
      renderPage();

      const parisIndex = POPULAR_CITIES.findIndex((city) => city.name === 'Paris');
      const parisGradient = TILE_GRADIENTS[parisIndex % TILE_GRADIENTS.length];
      const tile = screen.getByRole('button', { name: 'Paris' });

      fireEvent.error(within(tile).getByTestId('tile-image'));

      expect(within(tile).queryByTestId('tile-image')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Paris' })).toBeInTheDocument();
      expect(tile.className).toContain(parisGradient);
    });

    it('defers offscreen tile photographs instead of loading all six eagerly', () => {
      renderPage();

      const tile = screen.getByRole('button', { name: 'Tokyo' });
      const image = within(tile).getByTestId('tile-image');
      expect(image).toHaveAttribute('loading', 'lazy');
      expect(image).toHaveAttribute('decoding', 'async');
    });

    it('shows a cache-hit photograph without waiting for a load event', () => {
      vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);

      renderPage();

      const tile = screen.getByRole('button', { name: 'Barcelona' });
      const image = within(tile).getByTestId('tile-image');
      expect(image).toHaveAttribute('data-loaded', 'true');
      expect(image.className).not.toContain(hiddenImageClass);
    });

    it('renders no photograph for a city with no configured image', () => {
      render(
        <PopularTile
          city={{ name: 'Nowhere', imageUrl: null, credit: null }}
          gradientClass="grad"
          onSelect={() => {}}
        />,
      );

      const tile = screen.getByRole('button', { name: 'Nowhere' });
      expect(within(tile).queryByTestId('tile-image')).not.toBeInTheDocument();
      expect(tile.className).toContain('grad');
    });

    it('treats a blank configured image the same as no image at all', () => {
      render(
        <PopularTile
          city={{ name: 'Blankville', imageUrl: '', credit: null }}
          gradientClass="grad"
          onSelect={() => {}}
        />,
      );

      const tile = screen.getByRole('button', { name: 'Blankville' });
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
      expect(searchbox()).toHaveFocus();
      await waitFor(() => {
        expect(searchLocationsMock).toHaveBeenCalledWith('Tokyo');
      });

      const listbox = await findDropdown();
      const option = within(listbox).getByRole('option', { name: /Tokyo/ });
      fireEvent.click(option);

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

    it('lists every recent search newest-first, one chip per stored city', async () => {
      getAttractionsMock.mockResolvedValue([louvre]);

      searchLocationsMock.mockResolvedValue([parisCity]);
      renderPage();
      await chooseSuggestion('pa', /Paris/);
      await waitFor(() => {
        expect(screen.getByText('Attractions near Paris')).toBeInTheDocument();
      });

      searchLocationsMock.mockResolvedValue([tokyoCity]);
      fireEvent.click(screen.getByRole('button', { name: /clear search/i }));
      await chooseSuggestion('to', /Tokyo/);
      await waitFor(() => {
        expect(screen.getByText('Attractions near Tokyo')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /clear search/i }));

      const recentSection = screen.getByText('Recent searches').closest('section')!;
      const chips = within(recentSection)
        .getAllByRole('button')
        .filter((button) => button.getAttribute('aria-label') !== 'Clear recent searches');
      expect(chips.map((chip) => chip.textContent)).toEqual(['Tokyo', 'Paris']);
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
