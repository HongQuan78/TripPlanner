import type { OpeningHoursAvailability } from './openingHoursAvailability';

export interface DestinationDetails {
  xid: string;
  name: string;
  category: string | null;
  description: string | null;
  imageUrls: string[];
  address: string | null;
  openingHours: string | null;
  openingHoursAvailability: OpeningHoursAvailability;
  timeZone: string | null;
  countryCode: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
}
