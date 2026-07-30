import { describe, expect, it } from 'vitest';
import { parseOpenNow } from './openNow';

const wed1000 = new Date(2026, 6, 15, 10, 0, 0);
const wed1230 = new Date(2026, 6, 15, 12, 30, 0);
const wed1400 = new Date(2026, 6, 15, 14, 0, 0);
const wed2000 = new Date(2026, 6, 15, 20, 0, 0);
const sat0100 = new Date(2026, 6, 18, 1, 0, 0);
const sat1100 = new Date(2026, 6, 18, 11, 0, 0);
const sun1000 = new Date(2026, 6, 19, 10, 0, 0);

describe('parseOpenNow', () => {
  it('returns open for a Daily range that covers the current time', () => {
    expect(parseOpenNow('Daily 07:00-17:00', { now: wed1000 })).toEqual({ status: 'open' });
  });

  it('returns closed for a Daily range outside the current time', () => {
    expect(parseOpenNow('Daily 07:00-17:00', { now: wed2000 })).toEqual({ status: 'closed' });
  });

  it('returns open for 24/7', () => {
    expect(parseOpenNow('24/7', { now: wed2000 })).toEqual({ status: 'open' });
  });

  it('honors a Mo-Su range', () => {
    expect(parseOpenNow('Mo-Su 09:00-18:00', { now: wed1000 })).toEqual({ status: 'open' });
  });

  it('returns closed today when the day is outside a weekday-only range', () => {
    expect(parseOpenNow('Mo-Fr 09:00-17:00', { now: sun1000 })).toEqual({ status: 'closed' });
  });

  it('handles a comma-separated day list', () => {
    expect(parseOpenNow('Mo,We,Fr 09:00-12:00', { now: wed1000 })).toEqual({ status: 'open' });
  });

  it('closes during a comma-separated lunch break', () => {
    expect(parseOpenNow('Mo-Fr 09:00-12:00,13:00-17:00', { now: wed1230 })).toEqual({
      status: 'closed',
    });
  });

  it('opens after a comma-separated lunch break', () => {
    expect(parseOpenNow('Mo-Fr 09:00-12:00,13:00-17:00', { now: wed1400 })).toEqual({
      status: 'open',
    });
  });

  it('honors an off clause without discarding the rules that parsed', () => {
    expect(parseOpenNow('Mo-Fr 09:00-17:00; Sa off', { now: wed1000 })).toEqual({ status: 'open' });
    expect(parseOpenNow('Mo-Fr 09:00-17:00; Sa off', { now: sat1100 })).toEqual({ status: 'closed' });
  });

  it('lets a later rule override an earlier one instead of ORing them', () => {
    expect(parseOpenNow('Mo-Su 09:00-17:00; We 09:00-12:00', { now: wed1400 })).toEqual({
      status: 'closed',
    });
  });

  it('attributes an overnight range to the day the span started on', () => {
    expect(parseOpenNow('Mo-Fr 20:00-02:00', { now: sat0100 })).toEqual({ status: 'open' });
  });

  it('handles a public-holiday clause when a country code is supplied', () => {
    expect(parseOpenNow('Mo-Fr 08:00-20:00; PH off', { countryCode: 'fr', now: wed1000 })).toEqual({
      status: 'open',
    });
  });

  it('closes on an actual public holiday', () => {
    const bastilleDay = new Date(2026, 6, 14, 10, 0, 0);

    expect(
      parseOpenNow('Mo-Fr 08:00-20:00; PH off', { countryCode: 'fr', now: bastilleDay }),
    ).toEqual({ status: 'closed' });
  });

  it('still evaluates the weekday rules when no country code narrows the holiday clause', () => {
    expect(parseOpenNow('Mo-Fr 08:00-20:00; PH off', { now: wed1000 })).toEqual({ status: 'open' });
  });

  it('cannot detect a holiday without a country code and reports the weekday rule', () => {
    const bastilleDay = new Date(2026, 6, 14, 10, 0, 0);

    expect(parseOpenNow('Mo-Fr 08:00-20:00; PH off', { now: bastilleDay })).toEqual({
      status: 'open',
    });
  });

  it('handles extended hours past midnight', () => {
    expect(parseOpenNow('Mo-Fr 10:00-26:00', { now: wed2000 })).toEqual({ status: 'open' });
  });

  it('returns null for an unparseable string', () => {
    expect(parseOpenNow('by appointment only', { now: wed1000 })).toBeNull();
  });

  it('returns null for null, empty or blank input', () => {
    expect(parseOpenNow(null, { now: wed1000 })).toBeNull();
    expect(parseOpenNow('', { now: wed1000 })).toBeNull();
    expect(parseOpenNow('   ', { now: wed1000 })).toBeNull();
  });

  it('evaluates against the destination timezone, not the viewer clock', () => {
    const earlyMorningUtc = new Date('2026-07-15T06:00:00Z');

    expect(
      parseOpenNow('Mo-Fr 09:00-18:00', { timeZone: 'Europe/Paris', now: earlyMorningUtc }),
    ).toEqual({ status: 'closed' });
    expect(
      parseOpenNow('Mo-Fr 09:00-18:00', { timeZone: 'Asia/Ho_Chi_Minh', now: earlyMorningUtc }),
    ).toEqual({ status: 'open' });
  });

  it('crosses a day boundary correctly when the destination is a day ahead', () => {
    const saturdayEarlyUtc = new Date('2026-07-18T03:00:00Z');

    expect(
      parseOpenNow('Sa 09:00-12:00', { timeZone: 'Asia/Ho_Chi_Minh', now: saturdayEarlyUtc }),
    ).toEqual({ status: 'open' });
    expect(
      parseOpenNow('Sa 09:00-12:00', { timeZone: 'Europe/Paris', now: saturdayEarlyUtc }),
    ).toEqual({ status: 'closed' });
  });

  it('falls back to the viewer clock when the timezone is unusable', () => {
    expect(parseOpenNow('Daily 07:00-17:00', { timeZone: 'Not/AZone', now: wed1000 })).toEqual({ status: 'open' });
  });
});
