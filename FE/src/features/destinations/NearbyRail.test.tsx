import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attraction } from '@/shared/api/types';
import NearbyRail from './NearbyRail';

vi.mock('./api', () => ({
  getAttractions: vi.fn(),
}));

import { getAttractions } from './api';

const getAttractionsMock = vi.mocked(getAttractions);

function makeAttraction(overrides: Partial<Attraction> & { xid: string }): Attraction {
  return {
    name: overrides.xid,
    kinds: ['historic'],
    rating: '3',
    imageUrl: 'https://example.com/a.jpg',
    distanceMeters: 3100,
    ...overrides,
  };
}

function renderRail(props?: Partial<{ latitude: number | null; longitude: number | null; selfXid: string }>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NearbyRail latitude={10} longitude={20} selfXid="SELF" {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getAttractionsMock.mockReset();
});

describe('NearbyRail', () => {
  it('renders the heading and cards, filtering out the current attraction', async () => {
    getAttractionsMock.mockResolvedValue([
      makeAttraction({ xid: 'SELF', name: 'This Place' }),
      makeAttraction({ xid: 'A1', name: 'Bái Đính Temple', kinds: ['temples'], distanceMeters: 3100 }),
    ]);
    renderRail();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /nearby attractions/i })).toBeInTheDocument();
    });
    expect(screen.getByText('Bái Đính Temple')).toBeInTheDocument();
    expect(screen.queryByText('This Place')).not.toBeInTheDocument();
    const link = screen.getByRole('link', { name: /bái đính temple/i });
    expect(link).toHaveAttribute('href', '/attractions/A1');
    expect(screen.getByText('3.1 km away')).toBeInTheDocument();
    expect(screen.getByText('temples')).toBeInTheDocument();
  });

  it('omits the rating star when the card has no rating', async () => {
    getAttractionsMock.mockResolvedValue([
      makeAttraction({ xid: 'A1', name: 'Unrated Spot', rating: null }),
    ]);
    renderRail();

    await waitFor(() => {
      expect(screen.getByText('Unrated Spot')).toBeInTheDocument();
    });
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });

  it('omits the distance line when distanceMeters is null', async () => {
    getAttractionsMock.mockResolvedValue([
      makeAttraction({ xid: 'A1', name: 'No Distance', distanceMeters: null }),
    ]);
    renderRail();

    await waitFor(() => {
      expect(screen.getByText('No Distance')).toBeInTheDocument();
    });
    expect(screen.queryByText(/km away/)).not.toBeInTheDocument();
  });

  it('renders nothing when the result is empty', async () => {
    getAttractionsMock.mockResolvedValue([makeAttraction({ xid: 'SELF' })]);
    const { container } = renderRail();

    await waitFor(() => {
      expect(getAttractionsMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole('heading', { name: /nearby/i })).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the request fails', async () => {
    getAttractionsMock.mockRejectedValue(new Error('boom'));
    const { container } = renderRail();

    await waitFor(() => {
      expect(getAttractionsMock).toHaveBeenCalled();
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('does not fetch and renders nothing when coordinates are missing', () => {
    const { container } = renderRail({ latitude: null, longitude: null });

    expect(getAttractionsMock).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });
});
