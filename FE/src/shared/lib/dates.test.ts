import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  daysBetween,
  formatDate,
  formatDateRange,
  formatSegmentDate,
  formatShortDate,
  pluralizeCount,
  todayISO,
  tripStatus,
} from './dates';

describe('formatDate / formatDateRange', () => {
  it('formats a single date as "Mon D, YYYY"', () => {
    expect(formatDate('2026-08-01')).toBe('Aug 1, 2026');
    expect(formatDate('2026-12-25')).toBe('Dec 25, 2026');
  });

  it('joins a range with an en dash', () => {
    expect(formatDateRange('2026-08-01', '2026-08-03')).toBe('Aug 1, 2026 – Aug 3, 2026');
  });
});

describe('formatShortDate', () => {
  it('formats as "D Mon" with no year', () => {
    expect(formatShortDate('2026-08-12')).toBe('12 Aug');
    expect(formatShortDate('2026-06-02')).toBe('2 Jun');
  });
});

describe('formatSegmentDate', () => {
  it('formats as "Wkd · Mon D" with the correct weekday', () => {
    expect(formatSegmentDate('2026-08-12')).toBe('Wed · Aug 12');
    expect(formatSegmentDate('2026-08-01')).toBe('Sat · Aug 1');
  });
});

describe('daysBetween', () => {
  it('counts whole calendar days from → to', () => {
    expect(daysBetween('2026-08-01', '2026-08-03')).toBe(2);
    expect(daysBetween('2026-08-01', '2026-08-01')).toBe(0);
  });

  it('is negative when the target precedes the source', () => {
    expect(daysBetween('2026-08-03', '2026-08-01')).toBe(-2);
  });

  it('spans month and year boundaries', () => {
    expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
  });
});

describe('pluralizeCount', () => {
  it('singularizes at one and pluralizes otherwise', () => {
    expect(pluralizeCount(1, 'day')).toBe('1 day');
    expect(pluralizeCount(5, 'day')).toBe('5 days');
    expect(pluralizeCount(0, 'place')).toBe('0 places');
    expect(pluralizeCount(1, 'place')).toBe('1 place');
  });
});

describe('todayISO', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the local calendar date as YYYY-MM-DD', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 4, 9, 30));
    expect(todayISO()).toBe('2026-07-04');
  });
});

describe('tripStatus', () => {
  it('reports Past when the end date is before today', () => {
    expect(tripStatus('2026-06-02', '2026-06-05', '2026-07-16')).toEqual({
      kind: 'past',
      label: 'Past',
    });
  });

  it('reports Ongoing · Day k while today is within the range', () => {
    expect(tripStatus('2026-08-12', '2026-08-16', '2026-08-14')).toEqual({
      kind: 'ongoing',
      label: 'Ongoing · Day 3',
      dayIndex: 3,
    });
  });

  it('treats the start date itself as Ongoing · Day 1', () => {
    expect(tripStatus('2026-08-12', '2026-08-16', '2026-08-12')).toEqual({
      kind: 'ongoing',
      label: 'Ongoing · Day 1',
      dayIndex: 1,
    });
  });

  it('treats the end date itself as Ongoing (last day)', () => {
    expect(tripStatus('2026-08-12', '2026-08-16', '2026-08-16')).toEqual({
      kind: 'ongoing',
      label: 'Ongoing · Day 5',
      dayIndex: 5,
    });
  });

  it('reports Ongoing · Day 1 for a single-day trip on its day', () => {
    expect(tripStatus('2026-08-12', '2026-08-12', '2026-08-12')).toEqual({
      kind: 'ongoing',
      label: 'Ongoing · Day 1',
      dayIndex: 1,
    });
  });

  it('reports Tomorrow when the trip starts one day out', () => {
    expect(tripStatus('2026-08-13', '2026-08-16', '2026-08-12')).toEqual({
      kind: 'upcoming',
      label: 'Tomorrow',
    });
  });

  it('reports "In N days" for a further-out upcoming trip', () => {
    expect(tripStatus('2026-08-12', '2026-08-16', '2026-07-16')).toEqual({
      kind: 'upcoming',
      label: 'In 27 days',
    });
  });
});
