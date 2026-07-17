import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attraction } from '@/shared/api/types';
import AttractionCard from './AttractionCard';

vi.mock('@/features/trips/AddToTripContext', () => ({
  useAddToTrip: vi.fn(),
}));

import { useAddToTrip } from '@/features/trips/AddToTripContext';

const useAddToTripMock = vi.mocked(useAddToTrip);

const attraction: Attraction = {
  xid: 'W123',
  name: 'Louvre Museum',
  kinds: ['museums'],
  rating: '3',
  imageUrl: null,
  distanceMeters: 120.5,
};

function renderCard(overrides: Partial<Attraction> = {}) {
  return render(
    <MemoryRouter initialEntries={['/search']}>
      <Routes>
        <Route
          path="/search"
          element={<AttractionCard attraction={{ ...attraction, ...overrides }} />}
        />
        <Route path="/attractions/:xid" element={<p>details screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAddToTripMock.mockReset();
});

describe('AttractionCard add-to-trip', () => {
  it('starts the add-to-trip flow with the xid without navigating', () => {
    const requestAdd = vi.fn();
    useAddToTripMock.mockReturnValue({ requestAdd });
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: /add louvre museum to a trip/i }));

    expect(requestAdd).toHaveBeenCalledWith('W123');
    expect(screen.queryByText('details screen')).not.toBeInTheDocument();
  });

  it('still navigates to the details page from the card body', () => {
    useAddToTripMock.mockReturnValue({ requestAdd: vi.fn() });
    renderCard();

    fireEvent.click(screen.getByRole('link', { name: /louvre museum/i }));

    expect(screen.getByText('details screen')).toBeInTheDocument();
  });
});

describe('AttractionCard rating badge and heritage chip', () => {
  beforeEach(() => {
    useAddToTripMock.mockReturnValue({ requestAdd: vi.fn() });
  });

  it('renders the rating badge over the placeholder when there is no image', () => {
    renderCard({ rating: '2', imageUrl: null });

    expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();
    expect(screen.getByLabelText('Rated 2 of 3')).toBeInTheDocument();
  });

  it('renders no badge and no "Not rated" text for an unrated attraction', () => {
    renderCard({ rating: null });

    expect(screen.queryByLabelText(/rated/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/not rated/i)).not.toBeInTheDocument();
  });

  it('renders the heritage chip inside the card link when the rating carries the h flag', () => {
    renderCard({ rating: '3h' });

    const link = screen.getByRole('link', { name: /louvre museum/i });
    expect(link).toHaveTextContent('heritage');
  });

  it('renders no heritage chip without the h flag', () => {
    renderCard({ rating: '3' });

    expect(screen.queryByText('heritage')).not.toBeInTheDocument();
  });
});

describe('AttractionCard distance line', () => {
  beforeEach(() => {
    useAddToTripMock.mockReturnValue({ requestAdd: vi.fn() });
  });

  it('shows rounded meters below 1 km', () => {
    renderCard({ distanceMeters: 350.4 });

    expect(screen.getByText('350 m from center')).toBeInTheDocument();
  });

  it('shows kilometers with one decimal at or above 1 km', () => {
    renderCard({ distanceMeters: 2345 });

    expect(screen.getByText('2.3 km from center')).toBeInTheDocument();
  });

  it('switches to kilometers when rounding would reach 1000 m', () => {
    renderCard({ distanceMeters: 999.6 });

    expect(screen.getByText('1.0 km from center')).toBeInTheDocument();
    expect(screen.queryByText('1000 m from center')).not.toBeInTheDocument();
  });

  it('renders nothing when the distance is null', () => {
    renderCard({ distanceMeters: null });

    expect(screen.queryByText(/from center/i)).not.toBeInTheDocument();
  });
});

describe('AttractionCard image states', () => {
  beforeEach(() => {
    useAddToTripMock.mockReturnValue({ requestAdd: vi.fn() });
  });

  it('shows the loading shimmer while the image has not loaded yet', () => {
    renderCard({ imageUrl: 'https://example.com/louvre.jpg' });

    expect(screen.getByTestId('image-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('image-placeholder')).not.toBeInTheDocument();
  });

  it('removes the loading shimmer once the image loads', () => {
    renderCard({ imageUrl: 'https://example.com/louvre.jpg' });

    fireEvent.load(screen.getByAltText('Louvre Museum'));

    expect(screen.queryByTestId('image-loading')).not.toBeInTheDocument();
    expect(screen.getByAltText('Louvre Museum')).toBeInTheDocument();
  });

  it('shows the placeholder when the image fails to load', () => {
    renderCard({ imageUrl: 'https://example.com/louvre.jpg' });

    fireEvent.error(screen.getByAltText('Louvre Museum'));

    expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();
    expect(screen.queryByTestId('image-loading')).not.toBeInTheDocument();
  });

  it('shows the placeholder without a loading state when there is no image url', () => {
    renderCard();

    expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();
    expect(screen.queryByTestId('image-loading')).not.toBeInTheDocument();
  });

  it('clears the loading shimmer when the image is already cached on mount', () => {
    const completeSpy = vi
      .spyOn(HTMLImageElement.prototype, 'complete', 'get')
      .mockReturnValue(true);

    renderCard({ imageUrl: 'https://example.com/louvre.jpg' });

    expect(screen.queryByTestId('image-loading')).not.toBeInTheDocument();
    expect(screen.getByAltText('Louvre Museum')).toBeInTheDocument();

    completeSpy.mockRestore();
  });
});
