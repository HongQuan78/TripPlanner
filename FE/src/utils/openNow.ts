export interface OpenNowResult {
  status: 'open' | 'closed';
}

const DAY_INDEX: Record<string, number> = {
  su: 0,
  mo: 1,
  tu: 2,
  we: 3,
  th: 4,
  fr: 5,
  sa: 6,
};

const DAY_ORDER = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];
const TIME_RANGE = /^((?:[01]?\d|2[0-4])):([0-5]\d)-((?:[01]?\d|2[0-4])):([0-5]\d)$/;
const DAY_RANGE = /^(su|mo|tu|we|th|fr|sa)-(su|mo|tu|we|th|fr|sa)$/;

function minutes(hours: number, mins: number): number {
  return hours * 60 + mins;
}

function parseDayToken(token: string): number[] | null {
  const days = new Set<number>();
  for (const part of token.split(',')) {
    if (part in DAY_INDEX) {
      days.add(DAY_INDEX[part]);
      continue;
    }
    const range = DAY_RANGE.exec(part);
    if (range === null) {
      return null;
    }
    const start = DAY_INDEX[range[1]];
    const end = DAY_INDEX[range[2]];
    let index = start;
    for (let step = 0; step < 7; step += 1) {
      days.add(index);
      if (index === end) {
        break;
      }
      index = (index + 1) % 7;
    }
  }
  return [...days];
}

function timeCovers(range: string, nowMinutes: number): boolean | null {
  const match = TIME_RANGE.exec(range);
  if (match === null) {
    return null;
  }
  const start = minutes(Number(match[1]), Number(match[2]));
  const end = minutes(Number(match[3]), Number(match[4]));
  if (end === start) {
    return false;
  }
  if (end < start) {
    return nowMinutes >= start || nowMinutes < end;
  }
  return nowMinutes >= start && nowMinutes < end;
}

export function parseOpenNow(
  openingHours: string | null,
  now: Date = new Date(),
): OpenNowResult | null {
  if (openingHours === null) {
    return null;
  }
  const normalized = openingHours
    .trim()
    .toLowerCase()
    .replace(/[‒-―]/g, '-')
    .replace(/\s+/g, ' ');
  if (normalized.length === 0) {
    return null;
  }
  if (normalized === '24/7') {
    return { status: 'open' };
  }

  const today = now.getDay();
  const nowMinutes = minutes(now.getHours(), now.getMinutes());
  let openToday = false;

  for (const rawRule of normalized.split(';')) {
    const rule = rawRule.trim();
    if (rule.length === 0) {
      continue;
    }
    const tokens = rule.split(' ');
    let days: number[];
    let timeTokens: string[];

    if (TIME_RANGE.test(tokens[0])) {
      days = [...DAY_ORDER.keys()];
      timeTokens = tokens;
    } else {
      const dayToken = tokens[0] === 'daily' || tokens[0] === 'everyday' ? null : tokens[0];
      days = dayToken === null ? [...DAY_ORDER.keys()] : (parseDayToken(dayToken) ?? []);
      if (days.length === 0) {
        return null;
      }
      timeTokens = tokens.slice(1);
    }

    if (timeTokens.length === 0) {
      return null;
    }
    for (const timeToken of timeTokens) {
      const covers = timeCovers(timeToken, nowMinutes);
      if (covers === null) {
        return null;
      }
      if (days.includes(today) && covers) {
        openToday = true;
      }
    }
  }

  return { status: openToday ? 'open' : 'closed' };
}
