import { useEffect, useMemo, useState } from 'react';
import type { DestinationDetails } from '@/shared/api/models/destination/destinationDetails';
import { parseOpenNow, type OpenNowResult } from './openNow';

const REFRESH_INTERVAL_MS = 60_000;

export function useOpenNow(destination: DestinationDetails | undefined): OpenNowResult | null {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const openingHours = destination?.openingHours ?? null;
  const timeZone = destination?.timeZone ?? null;
  const countryCode = destination?.countryCode ?? null;
  const latitude = destination?.latitude ?? null;
  const longitude = destination?.longitude ?? null;

  return useMemo(
    () => parseOpenNow(openingHours, { timeZone, countryCode, latitude, longitude, now }),
    [openingHours, timeZone, countryCode, latitude, longitude, now],
  );
}
