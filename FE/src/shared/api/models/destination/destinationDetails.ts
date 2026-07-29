export interface DestinationDetails {
  xid: string;
  name: string;
  category: string | null;
  description: string | null;
  imageUrls: string[];
  address: string | null;
  openingHours: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
}
