import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import AddToTripDialog from '../components/AddToTripDialog';

export const PENDING_ADD_KEY = 'tripplanner.pendingAdd';

interface AddToTripContextValue {
  requestAdd: (xid: string) => void;
}

const AddToTripContext = createContext<AddToTripContextValue>({
  requestAdd: () => {},
});

export function AddToTripProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeXid, setActiveXid] = useState<string | null>(null);

  const requestAdd = useCallback(
    (xid: string) => {
      if (!isAuthenticated) {
        sessionStorage.setItem(PENDING_ADD_KEY, xid);
        const returnTo = encodeURIComponent(location.pathname + location.search);
        navigate(`/login?returnTo=${returnTo}`);
        return;
      }
      setActiveXid(xid);
    },
    [isAuthenticated, location, navigate],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    const pending = sessionStorage.getItem(PENDING_ADD_KEY);
    if (pending) {
      sessionStorage.removeItem(PENDING_ADD_KEY);
      setActiveXid(pending);
    }
  }, [isAuthenticated]);

  const value = useMemo<AddToTripContextValue>(() => ({ requestAdd }), [requestAdd]);

  return (
    <AddToTripContext.Provider value={value}>
      {children}
      {activeXid !== null && (
        <AddToTripDialog xid={activeXid} onClose={() => setActiveXid(null)} />
      )}
    </AddToTripContext.Provider>
  );
}

export function useAddToTrip(): AddToTripContextValue {
  return useContext(AddToTripContext);
}
