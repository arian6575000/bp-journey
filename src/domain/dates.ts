import type { MeasurementContext } from './types';

export type RangePreset = 'today' | '7d' | '30d' | '90d' | '6m' | '1y' | 'custom' | 'all';

/** `from` is inclusive, `to` is exclusive. */
export interface DateRange {
  from: Date;
  to: Date;
}

const DAY_MS = 86_400_000;

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

/**
 * Range for a preset, ending at the end of the day of `now`.
 * For `custom`, `custom.to` is treated as an inclusive calendar day.
 */
export function rangeForPreset(
  preset: RangePreset,
  now: Date = new Date(),
  custom?: { from: Date; to: Date },
): DateRange {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  switch (preset) {
    case 'today':
      return { from: today, to: tomorrow };
    case '7d':
      return { from: addDays(today, -6), to: tomorrow };
    case '30d':
      return { from: addDays(today, -29), to: tomorrow };
    case '90d':
      return { from: addDays(today, -89), to: tomorrow };
    case '6m':
      return { from: addDays(addMonths(today, -6), 1), to: tomorrow };
    case '1y':
      return { from: addDays(addMonths(today, -12), 1), to: tomorrow };
    case 'all':
      return { from: new Date(0), to: tomorrow };
    case 'custom': {
      const from = startOfDay(custom?.from ?? today);
      const toDay = startOfDay(custom?.to ?? today);
      const [a, b] = from <= toDay ? [from, toDay] : [toDay, from];
      return { from: a, to: addDays(b, 1) };
    }
  }
}

export function daysInRange(range: DateRange): number {
  return Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / DAY_MS));
}

/** The range of identical length that ends where `range` begins. */
export function previousRange(range: DateRange): DateRange {
  const days = daysInRange(range);
  return { from: addDays(range.from, -days), to: range.from };
}

export interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = Sunday
}

/** Wall-clock parts of a measurement, using the UTC offset recorded when it was taken. */
export function localParts(utcIso: string, offsetMinutes: number): LocalParts {
  const shifted = new Date(Date.parse(utcIso) - offsetMinutes * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

const pad = (n: number): string => String(n).padStart(2, '0');

export function dayKey(p: LocalParts): string {
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function monthKey(p: LocalParts): string {
  return `${p.year}-${pad(p.month)}`;
}

/** Key (yyyy-mm-dd) of the Monday that starts the ISO week containing `p`. */
export function weekKey(p: LocalParts): string {
  const midnight = Date.UTC(p.year, p.month - 1, p.day);
  const back = (p.weekday + 6) % 7;
  const monday = new Date(midnight - back * DAY_MS);
  return `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`;
}

/** Calendar date for a `yyyy-mm-dd` / `yyyy-mm` key as UTC midnight (format with timeZone "UTC"). */
export function keyToUtcDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

/** Suggested label for the time of day. A suggestion only; the user can always change it. */
export function contextForHour(hour: number): MeasurementContext {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export function toIso(date: Date): string {
  return date.toISOString();
}
