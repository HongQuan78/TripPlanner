import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import type { DestinationDetails } from '../api/types';
import DestinationDetailsPage from './DestinationDetailsPage';

vi.mock('../api/locations', () => ({
  searchLocations: vi.fn(),
  getAttractions: vi.fn(),
  getDestinationDetails: vi.fn(),
}));

vi.mock('../api/trips', () => ({
  getTrips: vi.fn(),
  getTrip: vi.fn(),
  createTrip: vi.fn(),
  updateTrip: vi.fn(),
  addDestinationToDay: vi.fn(),
  removeDestinationFromDay: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Leaflet needs real layout; stub the map so jsdom stays happy.
vi.mock('../components/AttractionMap', () => ({
  default: ({ name }: { name: string }) => <div data-testid="map">{`Map: ${name}`}</div>,
}));

import { getAttractions, getDestinationDetails } from '../api/locations';
import { getTrips } from '../api/trips';
import { useAuth } from '../auth/AuthContext';
import { AddToTripProvider } from '../trips/AddToTripContext';

const getDestinationDetailsMock = vi.mocked(getDestinationDetails);
const getAttractionsMock = vi.mocked(getAttractions);
const getTripsMock = vi.mocked(getTrips);
const useAuthMock = vi.mocked(useAuth);

const fullDetails: DestinationDetails = {
  xid: 'W123',
  name: 'Louvre Museum',
  category: 'Museums',
  description: 'The largest art museum in the world.',
  imageUrls: ['https://example.com/1.jpg'],
  address: 'Rue de Rivoli, 75001 Paris',
  openingHours: 'Mo-Su 09:00-18:00',
  website: 'https://www.louvre.fr',
  latitude: 48.8606,
  longitude: 2.3376,
};

const bareDetails: DestinationDetails = {
  xid: 'N456',
  name: 'Hidden Garden',
  category: null,
  description: null,
  imageUrls: [],
  address: null,
  openingHours: null,
  website: null,
  latitude: null,
  longitude: null,
};

function setAuthenticated(isAuthenticated: boolean) {
  useAuthMock.mockReturnValue({
    user: isAuthenticated ? { id: 1, email: 'user@example.com', role: 'User' } : null,
    token: isAuthenticated ? 'token' : null,
    isAuthenticated,
    login: vi.fn(),
    logout: vi.fn(),
  });
}

function addToTripButtons() {
  return screen.getAllByRole('button', { name: /add to trip/i });
}

function renderPage(onAddToTrip?: (details: DestinationDetails) => void) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/search', '/attractions/W123']} initialIndex={1}>
        <AddToTripProvider>
          <Routes>
            <Route path="/search" element={<p>search screen</p>} />
            <Route
              path="/attractions/:xid"
              element={<DestinationDetailsPage onAddToTrip={onAddToTrip} />}
            />
          </Routes>
        </AddToTripProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getDestinationDetailsMock.mockReset();
  getAttractionsMock.mockReset();
  getAttractionsMock.mockResolvedValue([]);
  getTripsMock.mockReset();
  useAuthMock.mockReset();
  setAuthenticated(false);
  sessionStorage.clear();
});

describe('DestinationDetailsPage', () => {
  it('renders name, category, description, photo, map, and info rows when all fields are present', async () => {
    getDestinationDetailsMock.mockResolvedValue(fullDetails);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Louvre Museum' })).toBeInTheDocument();
    });
    expect(screen.getAllByText('Museums').length).toBeGreaterThan(0);
    expect(screen.getByText('The largest art museum in the world.')).toBeInTheDocument();
    expect(screen.getByText('Rue de Rivoli, 75001 Paris')).toBeInTheDocument();
    expect(screen.getAllByText('Mo-Su 09:00-18:00').length).toBeGreaterThan(0);
    expect(screen.getByTestId('map')).toHaveTextContent('Louvre Museum');
    const website = screen.getByRole('link', { name: /www\.louvre\.fr/i });
    expect(website).toHaveAttribute('href', 'https://www.louvre.fr');
    expect(website).toHaveAttribute('target', '_blank');
    expect(website).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('img', { name: 'Louvre Museum' })).toHaveAttribute(
      'src',
      'https://example.com/1.jpg',
    );
    expect(getDestinationDetailsMock).toHaveBeenCalledWith('W123');
  });

  it('renders fallbacks, no map, and an image placeholder when all optional fields are absent', async () => {
    getDestinationDetailsMock.mockResolvedValue(bareDetails);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Hidden Garden' })).toBeInTheDocument();
    });
    expect(screen.getByText(/no description available/i)).toBeInTheDocument();
    expect(screen.getAllByText(/not available/i)).toHaveLength(3);
    expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByTestId('map')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /location/i })).not.toBeInTheDocument();
  });

  it('shows a single photo without carousel controls', async () => {
    getDestinationDetailsMock.mockResolvedValue(fullDetails);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Louvre Museum' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /previous photo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next photo/i })).not.toBeInTheDocument();
  });

  it('shows an Open now badge when the hours parse and it is currently open', async () => {
    getDestinationDetailsMock.mockResolvedValue({ ...fullDetails, openingHours: '24/7' });
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Louvre Museum' })).toBeInTheDocument();
    });
    expect(screen.getAllByText(/open now/i).length).toBeGreaterThan(0);
  });

  it('shows no open-now badge when the hours string is unparseable', async () => {
    getDestinationDetailsMock.mockResolvedValue({
      ...fullDetails,
      openingHours: 'by appointment only',
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('by appointment only').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/open now/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^closed$/i)).not.toBeInTheDocument();
  });

  it('keeps Add to Trip enabled with a log-in note when unauthenticated', async () => {
    setAuthenticated(false);
    getDestinationDetailsMock.mockResolvedValue(fullDetails);
    const onAddToTrip = vi.fn();
    renderPage(onAddToTrip);

    await waitFor(() => {
      expect(addToTripButtons().length).toBeGreaterThan(0);
    });
    addToTripButtons().forEach((button) => expect(button).toBeEnabled());
    expect(screen.getAllByRole('link', { name: /^log in$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/to add to your trip/i).length).toBeGreaterThan(0);
    fireEvent.click(addToTripButtons()[0]);
    expect(onAddToTrip).toHaveBeenCalledWith(fullDetails);
  });

  it('enables Add to Trip and invokes the integration point when authenticated', async () => {
    setAuthenticated(true);
    getDestinationDetailsMock.mockResolvedValue(fullDetails);
    const onAddToTrip = vi.fn();
    renderPage(onAddToTrip);

    await waitFor(() => {
      expect(addToTripButtons().length).toBeGreaterThan(0);
    });
    addToTripButtons().forEach((button) => expect(button).toBeEnabled());
    expect(screen.queryByRole('link', { name: /^log in$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/added to your active itinerary/i)).toBeInTheDocument();
    fireEvent.click(addToTripButtons()[0]);
    expect(onAddToTrip).toHaveBeenCalledWith(fullDetails);
  });

  it('opens the trip picker through the provider when no integration prop is supplied', async () => {
    setAuthenticated(true);
    getDestinationDetailsMock.mockResolvedValue(fullDetails);
    getTripsMock.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Louvre Museum' })).toBeInTheDocument();
    });

    fireEvent.click(addToTripButtons()[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /pick a trip/i })).toBeInTheDocument();
  });

  it('shows a loading indicator while the details are in flight', () => {
    getDestinationDetailsMock.mockImplementation(() => new Promise(() => {}));
    renderPage();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows a not-found state on 404', async () => {
    getDestinationDetailsMock.mockRejectedValue(new ApiError(404, 'Not found.'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/destination not found/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('shows a service-unavailable state with a working retry on 503', async () => {
    getDestinationDetailsMock.mockRejectedValueOnce(new ApiError(503, 'Service unavailable.'));
    getDestinationDetailsMock.mockResolvedValueOnce(fullDetails);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/service unavailable/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Louvre Museum' })).toBeInTheDocument();
    });
    expect(getDestinationDetailsMock).toHaveBeenCalledTimes(2);
  });

  it('navigates back to the previous screen with the back control', async () => {
    getDestinationDetailsMock.mockResolvedValue(fullDetails);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Louvre Museum' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(screen.getByText('search screen')).toBeInTheDocument();
  });
});
