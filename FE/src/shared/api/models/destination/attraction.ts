export interface Attraction {
  xid: string;
  name: string;
  kinds: string[];
  rating: string | null;
  imageUrl: string | null;
  distanceMeters: number | null;
}
