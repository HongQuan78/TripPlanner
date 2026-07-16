const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${monthNames[month - 1]} ${day}, ${year}`;
}

export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

export function formatShortDate(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${day} ${monthNames[month - 1]}`;
}

export function formatSegmentDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = weekdayNames[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday} · ${monthNames[month - 1]} ${day}`;
}

export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((toUtc - fromUtc) / 86400000);
}

export function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function pluralizeCount(count: number, unit: string): string {
  return `${count} ${count === 1 ? unit : `${unit}s`}`;
}

export type TripStatusKind = 'upcoming' | 'ongoing' | 'past';

export interface TripStatus {
  kind: TripStatusKind;
  label: string;
  dayIndex?: number;
}

export function tripStatus(startDate: string, endDate: string, today: string): TripStatus {
  if (endDate < today) {
    return { kind: 'past', label: 'Past' };
  }
  if (startDate <= today) {
    const dayIndex = daysBetween(startDate, today) + 1;
    return { kind: 'ongoing', label: `Ongoing · Day ${dayIndex}`, dayIndex };
  }
  const daysUntil = daysBetween(today, startDate);
  const label = daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`;
  return { kind: 'upcoming', label };
}
