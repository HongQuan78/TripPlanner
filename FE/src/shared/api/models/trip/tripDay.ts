import type { Destination } from '../destination/destination';

export interface TripDay {
  day: string;
  destinations: Destination[];
}
