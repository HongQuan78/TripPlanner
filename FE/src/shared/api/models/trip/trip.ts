import type { Destination } from '../destination/destination';
import type { TripDay } from './tripDay';

export interface Trip {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  tripDays: TripDay[];
  savedPlaces: Destination[];
}
