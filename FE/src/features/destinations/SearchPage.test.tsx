import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/client';
import type { Attraction, LocationSearchResult } from '@/shared/api/types';
import SearchPage from './SearchPage';
import { resetSearchState } from './searchState';

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

function submitSearch(query: string) {
  fireEvent.change(screen.getByRole('searchbox', { name: /search/i }), {
    target: { value: query },
  });
  fireEvent.click(screen.getByRole('button', { name: /^search$/i }));
}

beforeEach(() => {
  searchLocationsMock.mockReset();
  getAttractionsMock.mockReset();
  resetSearchState();
});

describe('SearchPage', () => {
  it('renders submitted results with name, country code, and type labels', async () => {
    searchLocationsMock.mockResolvedValue([parisCity, franceCountry]);
    renderPage();

    submitSearch('paris');

    await waitFor(() => {
      expect(screen.getByText('Paris')).toBeInTheDocument();
    });
    expect(screen.getByText('France')).toBeInTheDocument();
    expect(screen.getAllByText('FR')).toHaveLength(2);
    expect(screen.getByText('City')).toBeInTheDocument();
    expect(screen.getByText('Country')).toBeInTheDocument();
    expect(searchLocationsMock).toHaveBeenCalledWith('paris');
  });

  it('renders at most 5 results', async () => {
    const many = Array.from({ length: 7 }, (_, index) => ({
      ...parisCity,
      name: `City ${index + 1}`,
      latitude: index,
    }));
    searchLocationsMock.mockResolvedValue(many);
    renderPage();

    submitSearch('city');

    await waitFor(() => {
      expect(screen.getByText('City 1')).toBeInTheDocument();
    });
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.queryByText('City 6')).not.toBeInTheDocument();
  });

  it('indicates partial matches', async () => {
    searchLocationsMock.mockResolvedValue([{ ...parisCity, isPartialMatch: true }]);
    renderPage();

    submitSearch('par');

    await waitFor(() => {
      expect(screen.getByText(/partial match/i)).toBeInTheDocument();
    });
  });

  it('fetches attractions with the city coordinates when a city is selected', async () => {
    searchLocationsMock.mockResolvedValue([parisCity]);
    getAttractionsMock.mockResolvedValue([louvre]);
    renderPage();

    submitSearch('paris');
    await waitFor(() => {
      expect(screen.getByText('Paris')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /paris/i }));

    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });
    expect(getAttractionsMock).toHaveBeenCalledWith(48.8566, 2.3522);
  });

  it('shows a narrow-to-city prompt and fetches nothing when a country is selected', async () => {
    searchLocationsMock.mockResolvedValue([franceCountry]);
    renderPage();

    submitSearch('france');
    await waitFor(() => {
      expect(screen.getByText('France')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /france/i }));

    expect(screen.getByText(/search for a specific city/i)).toBeInTheDocument();
    expect(getAttractionsMock).not.toHaveBeenCalled();
  });

  it('renders attraction cards with kinds tags capped at 3, rating, and heritage tag', async () => {
    searchLocationsMock.mockResolvedValue([parisCity]);
    getAttractionsMock.mockResolvedValue([louvre]);
    renderPage();

    submitSearch('paris');
    await waitFor(() => {
      expect(screen.getByText('Paris')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /paris/i }));
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
    expect(within(card).getByRole('img')).toHaveAttribute('src', 'https://example.com/louvre.jpg');
  });

  it('renders the image placeholder and no rating badge for a bare attraction', async () => {
    searchLocationsMock.mockResolvedValue([parisCity]);
    getAttractionsMock.mockResolvedValue([barePlace]);
    renderPage();

    submitSearch('paris');
    await waitFor(() => {
      expect(screen.getByText('Paris')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /paris/i }));
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
    searchLocationsMock.mockResolvedValue([parisCity]);
    getAttractionsMock.mockResolvedValue([louvre]);
    renderPage();

    submitSearch('paris');
    await waitFor(() => {
      expect(screen.getByText('Paris')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /paris/i }));
    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });

    fireEvent.error(within(screen.getByRole('link', { name: /louvre museum/i })).getByRole('img'));

    const card = screen.getByRole('link', { name: /louvre museum/i });
    expect(within(card).queryByRole('img')).not.toBeInTheDocument();
    expect(within(card).getByTestId('image-placeholder')).toBeInTheDocument();
  });

  it('shows the no-results message when the search returns nothing', async () => {
    searchLocationsMock.mockResolvedValue([]);
    renderPage();

    submitSearch('xyzzy');

    await waitFor(() => {
      expect(screen.getByText(/no matching places found/i)).toBeInTheDocument();
    });
  });

  it('shows an empty state when a city has no attractions', async () => {
    searchLocationsMock.mockResolvedValue([parisCity]);
    getAttractionsMock.mockResolvedValue([]);
    renderPage();

    submitSearch('paris');
    await waitFor(() => {
      expect(screen.getByText('Paris')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /paris/i }));

    await waitFor(() => {
      expect(screen.getByText(/no attractions in this area/i)).toBeInTheDocument();
    });
  });

  it('shows a service unavailable state with retry when the search returns 503', async () => {
    searchLocationsMock.mockRejectedValueOnce(new ApiError(503, 'Service unavailable.'));
    searchLocationsMock.mockResolvedValueOnce([parisCity]);
    renderPage();

    submitSearch('paris');

    await waitFor(() => {
      expect(screen.getByText(/service unavailable/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(screen.getByText('Paris')).toBeInTheDocument();
    });
    expect(searchLocationsMock).toHaveBeenCalledTimes(2);
  });

  it('shows a service unavailable state with retry when attractions return 503', async () => {
    searchLocationsMock.mockResolvedValue([parisCity]);
    getAttractionsMock.mockRejectedValueOnce(new ApiError(503, 'Service unavailable.'));
    getAttractionsMock.mockResolvedValueOnce([louvre]);
    renderPage();

    submitSearch('paris');
    await waitFor(() => {
      expect(screen.getByText('Paris')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /paris/i }));

    await waitFor(() => {
      expect(screen.getByText(/service unavailable/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });
    expect(getAttractionsMock).toHaveBeenCalledTimes(2);
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
    await waitFor(() => {
      expect(screen.getByText('Paris')).toBeInTheDocument();
    });
  });

  it('resets to the initial state when the search is cleared', async () => {
    searchLocationsMock.mockResolvedValue([parisCity]);
    renderPage();

    submitSearch('paris');
    await waitFor(() => {
      expect(screen.getByText('Paris')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByRole('searchbox', { name: /search/i })).toHaveValue('');
  });

  it('does not submit a whitespace-only query', () => {
    renderPage();

    fireEvent.change(screen.getByRole('searchbox', { name: /search/i }), {
      target: { value: '   ' },
    });
    fireEvent.submit(screen.getByRole('search'));

    expect(searchLocationsMock).not.toHaveBeenCalled();
  });

  it('restores the search, results, and selection after unmounting and remounting', async () => {
    searchLocationsMock.mockResolvedValue([parisCity]);
    getAttractionsMock.mockResolvedValue([louvre]);
    const first = renderPage();

    submitSearch('paris');
    await waitFor(() => {
      expect(screen.getByText('Paris')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /paris/i }));
    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });

    first.unmount();
    renderPage();

    expect(screen.getByRole('searchbox', { name: /search/i })).toHaveValue('paris');
    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });
    expect(screen.getByText(/attractions near paris/i)).toBeInTheDocument();
  });

  it('clears the previous selection when a new search is submitted', async () => {
    searchLocationsMock.mockResolvedValueOnce([parisCity]);
    getAttractionsMock.mockResolvedValue([louvre]);
    renderPage();

    submitSearch('paris');
    await waitFor(() => {
      expect(screen.getByText('Paris')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /paris/i }));
    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });

    searchLocationsMock.mockResolvedValueOnce([franceCountry]);
    submitSearch('france');

    await waitFor(() => {
      expect(screen.getByText('France')).toBeInTheDocument();
    });
    expect(screen.queryByText(/attractions near paris/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Louvre Museum')).not.toBeInTheDocument();
  });

  function typeInput(value: string) {
    fireEvent.change(screen.getByRole('searchbox', { name: /search/i }), {
      target: { value },
    });
  }

  function sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  describe('hero band and suggestion chips', () => {
    const chipCities = ['Đà Nẵng', 'Paris', 'Tokyo', 'Rome', 'Barcelona', 'New York'];

    it('renders the hero headline, tagline, and an input without placeholder text', () => {
      renderPage();

      expect(screen.getByRole('heading', { level: 1, name: 'Where to next?' })).toBeInTheDocument();
      expect(
        screen.getByText('Search any city and start building the trip.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('searchbox', { name: /search/i })).not.toHaveAttribute(
        'placeholder',
      );
    });

    it('shows the six popular-search chips under their label before any search', () => {
      renderPage();

      expect(screen.getByText('Popular searches')).toBeInTheDocument();
      for (const city of chipCities) {
        expect(screen.getByRole('button', { name: city })).toBeInTheDocument();
      }
    });

    it('pre-fills the input and submits the search in one gesture when a chip is activated', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Paris' }));

      expect(screen.getByRole('searchbox', { name: /search/i })).toHaveValue('Paris');
      await waitFor(() => {
        expect(screen.getByText('Paris')).toBeInTheDocument();
      });
      expect(searchLocationsMock).toHaveBeenCalledWith('Paris');
      expect(screen.queryByText('Popular searches')).not.toBeInTheDocument();
    });

    it('hides the chips once a query has been submitted and restores them on Clear', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      renderPage();

      submitSearch('paris');
      await waitFor(() => {
        expect(screen.getByText('Paris')).toBeInTheDocument();
      });
      expect(screen.queryByText('Popular searches')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /clear/i }));

      expect(screen.getByText('Popular searches')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tokyo' })).toBeInTheDocument();
    });

    it('keeps chips visible while typing an unsubmitted query', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      renderPage();

      typeInput('pa');
      await screen.findByRole('listbox', { name: /location suggestions/i });

      expect(screen.getByText('Popular searches')).toBeInTheDocument();
    });

    it('skips the pre-search chips when a session is restored', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      const first = renderPage();

      submitSearch('paris');
      await waitFor(() => {
        expect(screen.getByText('Paris')).toBeInTheDocument();
      });
      first.unmount();

      renderPage();

      expect(screen.queryByText('Popular searches')).not.toBeInTheDocument();
    });
  });

  describe('auto-suggest', () => {
    it('shows debounced suggestions with name, country code, and type labels after typing 2+ characters', async () => {
      searchLocationsMock.mockResolvedValue([parisCity, franceCountry]);
      renderPage();

      typeInput('p');
      typeInput('pa');
      typeInput('par');
      expect(searchLocationsMock).not.toHaveBeenCalled();

      const listbox = await screen.findByRole('listbox', { name: /location suggestions/i });
      expect(searchLocationsMock).toHaveBeenCalledTimes(1);
      expect(searchLocationsMock).toHaveBeenCalledWith('par');
      const options = within(listbox).getAllByRole('option');
      expect(options).toHaveLength(2);
      expect(within(options[0]).getByText('Paris')).toBeInTheDocument();
      expect(within(options[0]).getByText('FR')).toBeInTheDocument();
      expect(within(options[0]).getByText('City')).toBeInTheDocument();
      expect(within(options[1]).getByText('France')).toBeInTheDocument();
      expect(within(options[1]).getByText('Country')).toBeInTheDocument();
    });

    it('does not fetch suggestions for fewer than 2 characters', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      renderPage();

      typeInput('p');
      await sleep(400);

      expect(searchLocationsMock).not.toHaveBeenCalled();
      expect(screen.queryByRole('listbox', { name: /location suggestions/i })).not.toBeInTheDocument();
    });

    it('choosing a city suggestion fills the input, closes the dropdown, and loads attractions without refetching the search', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      getAttractionsMock.mockResolvedValue([louvre]);
      renderPage();

      typeInput('pa');
      const listbox = await screen.findByRole('listbox', { name: /location suggestions/i });
      fireEvent.mouseDown(within(listbox).getByRole('option'));

      expect(screen.getByRole('searchbox', { name: /search/i })).toHaveValue('Paris');
      expect(screen.queryByRole('listbox', { name: /location suggestions/i })).not.toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
      });
      expect(getAttractionsMock).toHaveBeenCalledWith(parisCity.latitude, parisCity.longitude);
      expect(searchLocationsMock).toHaveBeenCalledTimes(1);
    });

    it('choosing a country suggestion shows the narrow-to-city prompt and fetches no attractions', async () => {
      searchLocationsMock.mockResolvedValue([franceCountry]);
      renderPage();

      typeInput('fr');
      const listbox = await screen.findByRole('listbox', { name: /location suggestions/i });
      fireEvent.mouseDown(within(listbox).getByRole('option'));

      expect(
        screen.getByText(/france is a country — search for a specific city/i),
      ).toBeInTheDocument();
      expect(getAttractionsMock).not.toHaveBeenCalled();
    });

    it('supports keyboard navigation with ArrowDown/ArrowUp and Enter selection', async () => {
      searchLocationsMock.mockResolvedValue([parisCity, franceCountry]);
      getAttractionsMock.mockResolvedValue([louvre]);
      renderPage();

      typeInput('fr');
      const listbox = await screen.findByRole('listbox', { name: /location suggestions/i });
      const options = within(listbox).getAllByRole('option');
      const searchbox = screen.getByRole('searchbox', { name: /search/i });

      fireEvent.keyDown(searchbox, { key: 'ArrowDown' });
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      fireEvent.keyDown(searchbox, { key: 'ArrowDown' });
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
      fireEvent.keyDown(searchbox, { key: 'ArrowDown' });
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      fireEvent.keyDown(searchbox, { key: 'ArrowUp' });
      expect(options[1]).toHaveAttribute('aria-selected', 'true');

      fireEvent.keyDown(searchbox, { key: 'Enter' });
      expect(searchbox).toHaveValue('France');
      expect(screen.queryByRole('listbox', { name: /location suggestions/i })).not.toBeInTheDocument();
      expect(
        screen.getByText(/france is a country — search for a specific city/i),
      ).toBeInTheDocument();
    });

    it('closes the dropdown on Escape without changing the input', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      renderPage();

      typeInput('pa');
      await screen.findByRole('listbox', { name: /location suggestions/i });

      fireEvent.keyDown(screen.getByRole('searchbox', { name: /search/i }), { key: 'Escape' });

      expect(screen.queryByRole('listbox', { name: /location suggestions/i })).not.toBeInTheDocument();
      expect(screen.getByRole('searchbox', { name: /search/i })).toHaveValue('pa');
    });

    it('fails silently when the suggestion request errors', async () => {
      searchLocationsMock.mockRejectedValue(new ApiError(503, 'Service unavailable'));
      renderPage();

      typeInput('pa');
      await waitFor(() => {
        expect(searchLocationsMock).toHaveBeenCalledWith('pa');
      });
      await sleep(50);

      expect(screen.queryByRole('listbox', { name: /location suggestions/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/service unavailable/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('does not reopen the dropdown for the chosen suggestion text', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      getAttractionsMock.mockResolvedValue([louvre]);
      renderPage();

      typeInput('pa');
      const listbox = await screen.findByRole('listbox', { name: /location suggestions/i });
      fireEvent.mouseDown(within(listbox).getByRole('option'));

      await sleep(400);

      expect(screen.queryByRole('listbox', { name: /location suggestions/i })).not.toBeInTheDocument();
    });
  });
});
