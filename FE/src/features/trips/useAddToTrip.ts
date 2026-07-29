import { createContext, useContext } from 'react';

export interface AddToTripContextValue {
  requestAdd: (xid: string) => void;
}

export const AddToTripContext = createContext<AddToTripContextValue | null>(null);

export function useAddToTrip(): AddToTripContextValue {
  const value = useContext(AddToTripContext);
  if (value === null) {
    throw new Error('useAddToTrip must be used within an AddToTripProvider');
  }
  return value;
}
