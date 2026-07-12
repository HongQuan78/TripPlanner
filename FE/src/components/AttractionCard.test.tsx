import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attraction } from '../api/types';
import AttractionCard from './AttractionCard';

vi.mock('../trips/AddToTripContext', () => ({
  useAddToTrip: vi.fn(),
}));

import { useAddToTrip } from '../trips/AddToTripContext';

const useAddToTripMock = vi.mocked(useAddToTrip);

const attraction: Attraction = {
  xid: 'W123',
  name: 'Louvre Museum',
  kinds: ['museums'],
  rating: '3',
  imageUrl: null,
  distanceMeters: 120.5,
};

function renderCard() {
  return render(
    <MemoryRouter initialEntries={['/search']}>
      <Routes>
        <Route path="/search" element={<AttractionCard attraction={attraction} />} />
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
