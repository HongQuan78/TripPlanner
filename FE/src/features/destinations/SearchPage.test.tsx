import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/client';
import type { Attraction, LocationSearchResult } from '@/shared/api/types';
import PopularTile from './PopularTile';
import { POPULAR_CITIES } from './popularCities';
import SearchPage from './SearchPage';
import { resetSearchState } from './searchState';
import { clearRecentSearches } from './recentSearches';

vi.mock('./api', () => ({
  searchLocations: vi.fn(),
  getAttractions: vi.fn(),
}));

vi.mock('@/features/trips/AddToTripContext', () => ({
  useAddToTrip: () => ({ requestAdd: vi.fn() }),
}));

import { getAttractions, searchLocations } from './api';

const searchLocationsMock = vi.mocked(searchLocations);
const getAttractionsMock = vi.mocked(getAttractions);

const parisCity: LocationSearchResult = {
  name: 'Paris',
  countryCode: 'FR',
  locationType: 'City',
  latitude: 48.8566,
  longitude: 2.3522,
  isPartialMatch: false,
};

const tokyoCity: LocationSearchResult = {
  name: 'Tokyo',
  countryCode: 'JP',
  locationType: 'City',
  latitude: 35.6762,
  longitude: 139.6503,
  isPartialMatch: false,
};

const franceCountry: LocationSearchResult = {
  name: 'France',
  countryCode: 'FR',
  locationType: 'Country',
  latitude: 46.2276,
  longitude: 2.2137,
  isPartialMatch: false,
};

const louvre: Attraction = {
  xid: 'W123',
  name: 'Louvre Museum',
  kinds: ['museums', 'interesting_places', 'cultural', 'urban_environment'],
  rating: '3h',
  imageUrl: 'https://example.com/louvre.jpg',
  distanceMeters: 250,
};

const barePlace: Attraction = {
  xid: 'N456',
  name: 'Hidden Garden',
  kinds: [],
  rating: null,
  imageUrl: null,
  distanceMeters: null,
};

function renderPage() {
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

function searchbox() {
  return screen.getByRole('searchbox', { name: /search/i });
}

function typeInput(value: string) {
  fireEvent.change(searchbox(), { target: { value } });
}

function submitSearch(query: string) {
  typeInput(query);
  fireEvent.click(screen.getByRole('button', { name: /^search$/i }));
}

function queryDropdown() {
  return screen.queryByRole('listbox', { name: /location suggestions/i });
}

function findDropdown() {
  return screen.findByRole('listbox', { name: /location suggestions/i });
}

async function chooseSuggestion(query: string, optionName: RegExp) {
  typeInput(query);
  let option: HTMLElement | null = null;
  await waitFor(() => {
    const listbox = screen.getByRole('listbox', { name: /location suggestions/i });
    option = within(listbox).getByRole('option', { name: optionName });
  });
  fireEvent.mouseDown(option!);
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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

    it('keeps the dropdown open showing "No attractions found." when nothing matches', async () => {
      searchLocationsMock.mockResolvedValue([]);
      renderPage();

      submitSearch('xyzzy');

      await waitFor(() => {
        expect(screen.getByText('No attractions found.')).toBeInTheDocument();
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
      fireEvent.mouseDown(within(listbox).getByRole('option'));

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
      fireEvent.mouseDown(within(listbox).getByRole('option'));

      await sleep(500);

      expect(queryDropdown()).not.toBeInTheDocument();
    });

    it('issues no further location search when an option is chosen before the debounce settles', async () => {
      searchLocationsMock.mockResolvedValue([
        { ...parisCity, name: 'Tokyo', latitude: 35.6762, longitude: 139.6503 },
      ]);
      getAttractionsMock.mockResolvedValue([louvre]);
      renderPage();

      typeInput('Tok');
      const listbox = await findDropdown();
      fireEvent.mouseDown(within(listbox).getByRole('option'));

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

  describe('auto-suggest', () => {
    it('shows debounced suggestions after typing 2+ characters', async () => {
      searchLocationsMock.mockResolvedValue([parisCity, franceCountry]);
      renderPage();

      typeInput('p');
      typeInput('pa');
      typeInput('par');
      expect(searchLocationsMock).not.toHaveBeenCalled();

      const listbox = await findDropdown();
      expect(searchLocationsMock).toHaveBeenCalledTimes(1);
      expect(searchLocationsMock).toHaveBeenCalledWith('par');
      expect(within(listbox).getAllByRole('option')).toHaveLength(2);
    });

    it('does not open or fetch for fewer than 2 characters', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      renderPage();

      typeInput('p');
      await sleep(400);

      expect(searchLocationsMock).not.toHaveBeenCalled();
      expect(queryDropdown()).not.toBeInTheDocument();
    });

    it('keeps the previous option list rendered while the next query resolves', async () => {
      searchLocationsMock.mockResolvedValueOnce([parisCity]);
      searchLocationsMock.mockImplementationOnce(() => new Promise(() => {}));
      renderPage();

      typeInput('pa');
      await findDropdown();

      typeInput('par');
      await waitFor(() => {
        expect(searchLocationsMock).toHaveBeenCalledTimes(2);
      });

      const listbox = queryDropdown();
      expect(listbox).toBeInTheDocument();
      expect(within(listbox!).getAllByRole('option')).toHaveLength(1);
      expect(screen.queryByText('No attractions found.')).not.toBeInTheDocument();
    });

    it('supports keyboard navigation with ArrowDown/ArrowUp and Enter selection', async () => {
      searchLocationsMock.mockResolvedValue([parisCity, franceCountry]);
      getAttractionsMock.mockResolvedValue([louvre]);
      renderPage();

      typeInput('fr');
      const listbox = await findDropdown();
      const options = within(listbox).getAllByRole('option');

      fireEvent.keyDown(searchbox(), { key: 'ArrowDown' });
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      fireEvent.keyDown(searchbox(), { key: 'ArrowDown' });
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
      fireEvent.keyDown(searchbox(), { key: 'ArrowDown' });
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      fireEvent.keyDown(searchbox(), { key: 'ArrowUp' });
      expect(options[1]).toHaveAttribute('aria-selected', 'true');

      fireEvent.keyDown(searchbox(), { key: 'Enter' });
      expect(searchbox()).toHaveValue('France');
      expect(queryDropdown()).not.toBeInTheDocument();
      expect(
        screen.getByText(/france is a country — search for a specific city/i),
      ).toBeInTheDocument();
    });

    it('keeps the combobox contract on the input and never makes options tab stops', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      renderPage();

      const input = searchbox();
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
      expect(input).toHaveAttribute('aria-expanded', 'false');
      expect(input).toHaveAttribute('aria-controls', 'location-suggestions');
      expect(input).toHaveAccessibleDescription(/arrow keys/i);

      typeInput('pa');
      const listbox = await findDropdown();
      expect(searchbox()).toHaveAttribute('aria-expanded', 'true');
      for (const option of within(listbox).getAllByRole('option')) {
        expect(option).not.toHaveAttribute('tabindex');
      }

      fireEvent.keyDown(searchbox(), { key: 'ArrowDown' });
      expect(searchbox()).toHaveAttribute(
        'aria-activedescendant',
        'location-suggestions-option-0',
      );
    });

    it('fails silently when the suggestion request errors', async () => {
      searchLocationsMock.mockRejectedValue(new ApiError(503, 'Service unavailable'));
      renderPage();

      typeInput('pa');
      await waitFor(() => {
        expect(searchLocationsMock).toHaveBeenCalledWith('pa');
      });
      await sleep(50);

      expect(queryDropdown()).not.toBeInTheDocument();
      expect(screen.queryByText(/service unavailable/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('announces the chosen city in a polite live region', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      getAttractionsMock.mockResolvedValue([louvre]);
      renderPage();

      await chooseSuggestion('pa', /Paris/);

      const announcement = screen.getByText('Paris selected.');
      expect(announcement).toHaveAttribute('aria-live', 'polite');
    });

    it('empties the live region when the search is cleared', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      getAttractionsMock.mockResolvedValue([louvre]);
      renderPage();

      await chooseSuggestion('pa', /Paris/);
      expect(screen.getByText('Paris selected.')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /clear search/i }));

      expect(screen.queryByText('Paris selected.')).not.toBeInTheDocument();
    });

    it('re-announces the same city when it is chosen twice in a row', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      getAttractionsMock.mockResolvedValue([louvre]);
      renderPage();

      await chooseSuggestion('pa', /Paris/);
      const region = screen.getByText('Paris selected.');
      const first = region.textContent;

      fireEvent.click(screen.getByRole('button', { name: /clear search/i }));
      await chooseSuggestion('pa', /Paris/);

      expect(screen.getByText('Paris selected.').textContent).not.toBe(first);
    });
  });

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
