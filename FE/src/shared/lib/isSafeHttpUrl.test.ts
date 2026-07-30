import { describe, expect, it } from 'vitest';
import { isSafeHttpUrl } from './isSafeHttpUrl';

describe('isSafeHttpUrl', () => {
  it('accepts http and https absolute urls', () => {
    expect(isSafeHttpUrl('https://www.louvre.fr')).toBe(true);
    expect(isSafeHttpUrl('http://example.com/path?q=1')).toBe(true);
  });

  it('rejects script-bearing schemes', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('JavaScript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeHttpUrl('vbscript:msgbox(1)')).toBe(false);
  });

  it('rejects empty, blank and missing values', () => {
    expect(isSafeHttpUrl(null)).toBe(false);
    expect(isSafeHttpUrl(undefined)).toBe(false);
    expect(isSafeHttpUrl('')).toBe(false);
    expect(isSafeHttpUrl('   ')).toBe(false);
  });

  it('rejects a value that is not a url at all', () => {
    expect(isSafeHttpUrl('not a url')).toBe(false);
  });
});
