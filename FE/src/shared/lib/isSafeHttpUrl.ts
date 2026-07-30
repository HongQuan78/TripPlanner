export function isSafeHttpUrl(value: string | null | undefined): boolean {
  if (value === null || value === undefined || value.trim().length === 0) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
