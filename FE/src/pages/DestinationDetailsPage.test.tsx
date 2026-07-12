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

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { getDestinationDetails } from '../api/locations';
import { useAuth } from '../auth/AuthContext';

const getDestinationDetailsMock = vi.mocked(getDestinationDetails);
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

function renderPage(onAddToTrip?: (details: DestinationDetails) => void) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/search', '/attractions/W123']} initialIndex={1}>
        <Routes>
          <Route path="/search" element={<p>search screen</p>} />
          <Route
            path="/attractions/:xid"
            element={<DestinationDetailsPage onAddToTrip={onAddToTrip} />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getDestinationDetailsMock.mockReset();
  useAuthMock.mockReset();
  setAuthenticated(false);
});

describe('DestinationDetailsPage', () => {
  it('renders name, category, description, photo, and info rows when all fields are present', async () => {
    getDestinationDetailsMock.mockResolvedValue(fullDetails);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Louvre Museum' })).toBeInTheDocument();
    });
    expect(screen.getByText('Museums')).toBeInTheDocument();
    expect(screen.getByText('The largest art museum in the world.')).toBeInTheDocument();
    expect(screen.getByText('Rue de Rivoli, 75001 Paris')).toBeInTheDocument();
    expect(screen.getByText('Mo-Su 09:00-18:00')).toBeInTheDocument();
    const website = screen.getByRole('link', { name: /www\.louvre\.fr/i });
    expect(website).toHaveAttribute('href', 'https://www.louvre.fr');
    expect(website).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/1.jpg');
    expect(getDestinationDetailsMock).toHaveBeenCalledWith('W123');
  });

  it('renders fallbacks and an image placeholder when all optional fields are absent', async () => {
    getDestinationDetailsMock.mockResolvedValue(bareDetails);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hidden Garden' })).toBeInTheDocument();
    });
    expect(screen.getByText(/no description available/i)).toBeInTheDocument();
    expect(screen.getAllByText(/not available/i)).toHaveLength(3);
    expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /website/i })).not.toBeInTheDocument();
  });

  it('shows a single photo without carousel controls', async () => {
    getDestinationDetailsMock.mockResolvedValue(fullDetails);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /previous photo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next photo/i })).not.toBeInTheDocument();
  });

  it('cycles through three photos with wrapping next and previous controls', async () => {
    getDestinationDetailsMock.mockResolvedValue({
      ...fullDetails,
      imageUrls: [
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
        'https://example.com/3.jpg',
      ],
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByAltText('Louvre Museum photo 1 of 3')).toBeInTheDocument();
    });

    const next = screen.getByRole('button', { name: /next photo/i });
    const previous = screen.getByRole('button', { name: /previous photo/i });

    fireEvent.click(next);
    expect(screen.getByAltText('Louvre Museum photo 2 of 3')).toHaveAttribute(
      'src',
      'https://example.com/2.jpg',
    );

    fireEvent.click(next);
    expect(screen.getByAltText('Louvre Museum photo 3 of 3')).toBeInTheDocument();

    fireEvent.click(next);
    expect(screen.getByAltText('Louvre Museum photo 1 of 3')).toHaveAttribute(
      'src',
      'https://example.com/1.jpg',
    );

    fireEvent.click(previous);
    expect(screen.getByAltText('Louvre Museum photo 3 of 3')).toHaveAttribute(
      'src',
      'https://example.com/3.jpg',
    );
  });

  it('keeps Add to Trip available with a log-in hint when unauthenticated', async () => {
    setAuthenticated(false);
    getDestinationDetailsMock.mockResolvedValue(fullDetails);
    const onAddToTrip = vi.fn();
    renderPage(onAddToTrip);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add to trip/i })).toBeInTheDocument();
    });
    const button = screen.getByRole('button', { name: /add to trip/i });
    expect(button).toBeEnabled();
    expect(screen.getByText(/asked to log in/i)).toBeInTheDocument();
    fireEvent.click(button);
    expect(onAddToTrip).toHaveBeenCalledWith(fullDetails);
  });

  it('enables Add to Trip and invokes the integration point when authenticated', async () => {
    setAuthenticated(true);
    getDestinationDetailsMock.mockResolvedValue(fullDetails);
    const onAddToTrip = vi.fn();
    renderPage(onAddToTrip);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add to trip/i })).toBeInTheDocument();
    });
    const button = screen.getByRole('button', { name: /add to trip/i });
    expect(button).toBeEnabled();
    expect(screen.queryByText(/asked to log in/i)).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(onAddToTrip).toHaveBeenCalledWith(fullDetails);
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
      expect(screen.getByRole('heading', { name: 'Louvre Museum' })).toBeInTheDocument();
    });
    expect(getDestinationDetailsMock).toHaveBeenCalledTimes(2);
  });

  it('navigates back to the previous screen with the back control', async () => {
    getDestinationDetailsMock.mockResolvedValue(fullDetails);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Louvre Museum' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(screen.getByText('search screen')).toBeInTheDocument();
  });
});
