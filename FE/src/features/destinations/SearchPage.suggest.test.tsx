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
  chooseSuggestion,
  findDropdown,
  franceCountry,
  louvre,
  parisCity,
  queryDropdown,
  renderPage,
  searchbox,
  sleep,
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
      expect(screen.queryByText('No matching locations found.')).not.toBeInTheDocument();
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
      expect(input).not.toHaveAttribute('aria-controls');
      expect(input).toHaveAccessibleDescription(/arrow keys/i);

      typeInput('pa');
      const listbox = await findDropdown();
      expect(searchbox()).toHaveAttribute('aria-expanded', 'true');
      expect(searchbox()).toHaveAttribute('aria-controls', 'location-suggestions');
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

    it('reopens the dismissed dropdown on ArrowDown without altering the query', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      renderPage();

      typeInput('pa');
      await findDropdown();

      fireEvent.keyDown(searchbox(), { key: 'Escape' });
      expect(queryDropdown()).not.toBeInTheDocument();

      fireEvent.keyDown(searchbox(), { key: 'ArrowDown' });

      await findDropdown();
      expect(searchbox()).toHaveValue('pa');
    });

    it('announces the no-match message through a live region rather than an empty listbox', async () => {
      searchLocationsMock.mockResolvedValue([]);
      renderPage();

      typeInput('xyzzy');

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('No matching locations found.');
      });
      expect(queryDropdown()).not.toBeInTheDocument();
      expect(searchbox()).not.toHaveAttribute('aria-controls');
    });

    it('omits the country pill when the provider supplies no country code', async () => {
      searchLocationsMock.mockResolvedValue([{ ...parisCity, countryCode: '' }]);
      renderPage();

      typeInput('pa');
      const listbox = await findDropdown();

      const option = within(listbox).getByRole('option');
      expect(option).toHaveTextContent('Paris');
      expect(option).toHaveTextContent('City');
      expect(option.textContent).not.toContain('FR');
      expect(within(option).getAllByText(/^(City|Country)$/)).toHaveLength(1);
    });

    it('re-announces the same city when it is chosen twice in a row', async () => {
      searchLocationsMock.mockResolvedValue([parisCity]);
      getAttractionsMock.mockResolvedValue([louvre]);
      renderPage();

      await chooseSuggestion('pa', /Paris/);
      const first = screen.getByText(/Paris selected\./).textContent ?? '';

      fireEvent.click(screen.getByRole('button', { name: /clear search/i }));
      await chooseSuggestion('pa', /Paris/);

      const second = screen.getByText(/Paris selected\./).textContent ?? '';
      expect(second).toContain('Paris selected.');
      expect(second).not.toBe(first);
      const collapse = (text: string) => text.replace(/\s+/g, ' ').trim();
      expect(collapse(second)).not.toBe(collapse(first));
    });
  });

});
