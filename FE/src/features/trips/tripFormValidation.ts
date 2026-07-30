export function validateTripForm(name: string, startDate: string, endDate: string): string | null {
  if (name.trim().length === 0) {
    return 'Trip name is required.';
  }
  if (!startDate || !endDate) {
    return 'Start and end dates are required.';
  }
  if (startDate > endDate) {
    return 'Start date must be on or before the end date.';
  }
  return null;
}
