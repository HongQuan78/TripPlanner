import { describe, expect, it } from 'vitest';
import type { Attraction } from '@/shared/api/models/destination/attraction';
import { sortAttractions } from './attractionFilters';

function attraction(xid: string, rating: string | null): Attraction {
  return { xid, name: xid, kinds: [], rating, imageUrl: null, distanceMeters: null };
}

describe('sortAttractions', () => {
  it('returns the provider order unchanged for recommended sort', () => {
    const list = [attraction('a', '1'), attraction('b', '3'), attraction('c', null)];

    const result = sortAttractions(list, 'recommended');

    expect(result).toBe(list);
    expect(result.map((item) => item.xid)).toEqual(['a', 'b', 'c']);
  });

  it('orders by numeric rating descending with unrated last for highest-rating sort', () => {
    const list = [
      attraction('low', '1'),
      attraction('none', null),
      attraction('high', '3'),
      attraction('mid', '2'),
    ];

    const result = sortAttractions(list, 'rating');

    expect(result.map((item) => item.xid)).toEqual(['high', 'mid', 'low', 'none']);
  });

  it('treats a heritage rating suffix as its numeric level', () => {
    const list = [attraction('plain', '3'), attraction('heritage', '3h')];

    const result = sortAttractions(list, 'rating');

    expect(result.map((item) => item.xid)).toEqual(['plain', 'heritage']);
  });

  it('keeps provider order as a stable tiebreak for equal ratings', () => {
    const list = [attraction('first', '2'), attraction('second', '2'), attraction('third', '2')];

    const result = sortAttractions(list, 'rating');

    expect(result.map((item) => item.xid)).toEqual(['first', 'second', 'third']);
  });

  it('does not mutate the input list', () => {
    const list = [attraction('a', '1'), attraction('b', '3')];

    sortAttractions(list, 'rating');

    expect(list.map((item) => item.xid)).toEqual(['a', 'b']);
  });
});
