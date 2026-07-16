import { describe, expect, it } from 'vitest';
import { parseOpenNow } from './openNow';

// Reference instants (local time): a Wednesday at 10:00 and at 20:00.
const wed1000 = new Date(2026, 6, 15, 10, 0, 0); // Wed Jul 15 2026 10:00
const wed2000 = new Date(2026, 6, 15, 20, 0, 0); // Wed Jul 15 2026 20:00
const sun1000 = new Date(2026, 6, 19, 10, 0, 0); // Sun Jul 19 2026 10:00

describe('parseOpenNow', () => {
  it('returns open for a Daily range that covers the current time', () => {
    expect(parseOpenNow('Daily 07:00-17:00', wed1000)).toEqual({ status: 'open' });
  });

  it('accepts an en dash between the times', () => {
    expect(parseOpenNow('Daily 07:00–17:00', wed1000)).toEqual({ status: 'open' });
  });

  it('returns closed for a Daily range outside the current time', () => {
    expect(parseOpenNow('Daily 07:00-17:00', wed2000)).toEqual({ status: 'closed' });
  });

  it('treats a bare time range as every day', () => {
    expect(parseOpenNow('09:00-18:00', wed1000)).toEqual({ status: 'open' });
  });

  it('returns open for 24/7', () => {
    expect(parseOpenNow('24/7', wed2000)).toEqual({ status: 'open' });
  });

  it('honors a Mo-Su range', () => {
    expect(parseOpenNow('Mo-Su 09:00-18:00', wed1000)).toEqual({ status: 'open' });
  });

  it('returns closed today when the day is outside a weekday-only range', () => {
    expect(parseOpenNow('Mo-Fr 09:00-17:00', sun1000)).toEqual({ status: 'closed' });
  });

  it('returns open when a later rule in a list covers today', () => {
    expect(parseOpenNow('Mo-Fr 09:00-17:00; Su 08:00-12:00', sun1000)).toEqual({
      status: 'open',
    });
  });

  it('handles a comma-separated day list', () => {
    expect(parseOpenNow('Mo,We,Fr 09:00-12:00', wed1000)).toEqual({ status: 'open' });
  });

  it('handles an overnight range that wraps past midnight', () => {
    expect(parseOpenNow('Daily 20:00-02:00', wed2000)).toEqual({ status: 'open' });
  });

  it('returns null for an unparseable string', () => {
    expect(parseOpenNow('by appointment only', wed1000)).toBeNull();
  });

  it('returns null when a rule carries an unrecognized token', () => {
    expect(parseOpenNow('Mo-Fr sunrise-sunset', wed1000)).toBeNull();
  });

  it('returns null for null or empty input', () => {
    expect(parseOpenNow(null, wed1000)).toBeNull();
    expect(parseOpenNow('   ', wed1000)).toBeNull();
  });
});
