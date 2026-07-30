import OpeningHours from 'opening_hours';

export interface OpenNowResult {
  status: 'open' | 'closed';
}

function zonedNow(now: Date, timeZone: string | null): Date {
  if (timeZone === null) {
    return now;
  }
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);

    const field = (type: Intl.DateTimeFormatPartTypes): number | null => {
      const part = parts.find((candidate) => candidate.type === type);
      return part === undefined ? null : Number(part.value);
    };

    const year = field('year');
    const month = field('month');
    const day = field('day');
    const hour = field('hour');
    const minute = field('minute');
    const second = field('second');

    if (
      year === null ||
      month === null ||
      day === null ||
      hour === null ||
      minute === null ||
      second === null
    ) {
      return now;
    }

    return new Date(year, month - 1, day, hour, minute, second);
  } catch {
    return now;
  }
}

export interface OpenNowContext {
  timeZone?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  now?: Date;
}

export function parseOpenNow(
  openingHours: string | null,
  context: OpenNowContext = {},
): OpenNowResult | null {
  if (openingHours === null || openingHours.trim().length === 0) {
    return null;
  }

  const timeZone = context.timeZone ?? null;
  const countryCode = context.countryCode ?? null;
  const now = context.now ?? new Date();

  const location =
    countryCode === null
      ? null
      : {
          lat: context.latitude ?? 0,
          lon: context.longitude ?? 0,
          address: { country_code: countryCode.toLowerCase(), state: '' },
        };

  try {
    const schedule = new OpeningHours(openingHours, location);
    return { status: schedule.getState(zonedNow(now, timeZone)) ? 'open' : 'closed' };
  } catch {
    return null;
  }
}
