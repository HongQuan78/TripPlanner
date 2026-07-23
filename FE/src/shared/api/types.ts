export interface AuthResponse {
  id: number;
  email: string;
  role: string;
  token: string;
}

export interface MessageResponse {
  message: string;
}

export interface LocationSearchResult {
  name: string;
  countryCode: string;
  locationType: string;
  latitude: number;
  longitude: number;
  isPartialMatch: boolean;
}

export interface Attraction {
  xid: string;
  name: string;
  kinds: string[];
  rating: string | null;
  imageUrl: string | null;
  distanceMeters: number | null;
}

export interface AttractionFilters {
  kinds: string[];
  minRate: number | null;
}

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

export interface Destination {
  id: number;
  name: string;
  rating: number;
  category: string;
  xid: string | null;
  openingHours: string | null;
  cuisineType: string | null;
  isHalalFriendly: boolean | null;
}

export interface TripDay {
  day: string;
  destinations: Destination[];
}

export interface Trip {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  tripDays: TripDay[];
  savedPlaces: Destination[];
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface CreateTripRequest {
  name: string;
  startDate: string;
  endDate: string;
}

export interface UpdateTripRequest {
  name: string;
  startDate: string;
  endDate: string;
  confirmed: boolean;
}

export type AddDestinationToDayRequest = { destinationId: number } | { xid: string };

export type AddSavedPlaceRequest = { destinationId: number } | { xid: string };

export interface ScheduleSavedPlaceRequest {
  destinationId: number;
}

export interface ReorderDayDestinationsRequest {
  destinationIds: number[];
}

export interface MoveDestinationRequest {
  toDate: string;
}
