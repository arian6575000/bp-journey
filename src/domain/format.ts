import { localParts } from './dates';
import type { BloodPressureReading, Language } from './types';

/** Latin digits are used in both languages so blood-pressure numbers never change shape. */
const locale = (language: Language): string => (language === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB');

function safeFormat(fn: () => string, fallback: string): string {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/** Formats a calendar date key/Date as a UTC calendar date (no time-zone shifting). */
export function formatCalendarDate(
  date: Date,
  language: Language,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  return safeFormat(
    () => date.toLocaleDateString(locale(language), { ...options, timeZone: 'UTC' }),
    date.toISOString().slice(0, 10),
  );
}

/** Date of a measurement as it was on the wall clock when measured. */
export function formatMeasuredDate(r: BloodPressureReading, language: Language): string {
  const p = localParts(r.measuredAtUtc, r.timezoneOffsetMinutes);
  return formatCalendarDate(new Date(Date.UTC(p.year, p.month - 1, p.day)), language);
}

export function formatMeasuredTime(r: BloodPressureReading, language: Language): string {
  const p = localParts(r.measuredAtUtc, r.timezoneOffsetMinutes);
  const d = new Date(Date.UTC(2000, 0, 1, p.hour, p.minute));
  return safeFormat(
    () => d.toLocaleTimeString(locale(language), { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }),
    `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`,
  );
}

export function formatDeviceDate(date: Date, language: Language): string {
  return safeFormat(
    () => date.toLocaleDateString(locale(language), { day: 'numeric', month: 'short', year: 'numeric' }),
    date.toDateString(),
  );
}

export function formatDeviceTime(date: Date, language: Language): string {
  return safeFormat(
    () => date.toLocaleTimeString(locale(language), { hour: 'numeric', minute: '2-digit' }),
    date.toTimeString().slice(0, 5),
  );
}

export function formatDecimal(value: number, decimals: number): string {
  return value.toFixed(decimals);
}
