import type { Attraction } from '@/shared/api/types';

export type AttractionSort = 'recommended' | 'rating';

export const ATTRACTION_CATEGORIES = [
  { value: 'cultural', label: 'Cultural' },
  { value: 'historic', label: 'Historic' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'natural', label: 'Natural' },
  { value: 'amusements', label: 'Amusements' },
  { value: 'foods', label: 'Foods' },
] as const;

export const MIN_RATE_OPTIONS = [
  { value: null, label: 'Any rating' },
  { value: 2, label: '2+ stars' },
  { value: 3, label: '3+ stars' },
] as const;

function ratingValue(attraction: Attraction): number {
  if (attraction.rating === null) {
    return -1;
  }
  const level = Number.parseInt(attraction.rating, 10);
  return Number.isNaN(level) ? -1 : level;
}

export function sortAttractions(attractions: Attraction[], sort: AttractionSort): Attraction[] {
  if (sort !== 'rating') {
    return attractions;
  }
  return [...attractions].sort((a, b) => ratingValue(b) - ratingValue(a));
}

export function dedupeAttractions(attractions: Attraction[]): Attraction[] {
  const seen = new Set<string>();
  const unique: Attraction[] = [];
  for (const attraction of attractions) {
    if (seen.has(attraction.xid)) {
      continue;
    }
    seen.add(attraction.xid);
    unique.push(attraction);
  }
  return unique;
}
