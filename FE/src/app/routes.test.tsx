import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { routes } from './routes';

vi.mock('@/features/destinations/destinationService', () => ({
  destinationService: {
    searchLocations: vi.fn(),
    getAttractions: vi.fn(),
    getDestinationDetails: vi.fn(),
  },
}));

import { destinationService } from '@/features/destinations/destinationService';

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </QueryClientProvider>,
  );
}

describe('routes', () => {
  it('renders the search experience at /', () => {
    renderAt('/');

    expect(screen.getByRole('searchbox', { name: /search/i })).toBeInTheDocument();
  });

  it('renders the search experience at /search', () => {
    renderAt('/search');

    expect(screen.getByRole('searchbox', { name: /search/i })).toBeInTheDocument();
  });

  it('renders the destination details page at /attractions/:xid', async () => {
    vi.mocked(destinationService.getDestinationDetails).mockResolvedValue({
      xid: 'W123',
      name: 'Louvre Museum',
      category: null,
      description: null,
      imageUrls: [],
      address: null,
      openingHours: null,
      website: null,
      latitude: null,
      longitude: null,
    });
    renderAt('/attractions/W123');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Louvre Museum' })).toBeInTheDocument();
    });
  });

  it('redirects an unauthenticated visitor from /trips to login', () => {
    renderAt('/trips');

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });

  it('redirects an unauthenticated visitor from /trips/:id to login', () => {
    renderAt('/trips/7');

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders auth routes without the app header and nav', () => {
    renderAt('/login');

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trip Planner' })).toHaveAttribute('href', '/');
  });

  it('keeps the app header on non-auth routes', () => {
    renderAt('/search');

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders the not-found page for unknown paths', () => {
    renderAt('/definitely/not-a-page');

    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });
});
