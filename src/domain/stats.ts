import { dayKey, localParts, monthKey, weekKey , daysInRange } from './dates';
import type { DateRange } from './dates';
import type { BloodPressureReading } from './types';
import { CATEGORY_ORDER, classify } from './classification';
import type { BpCategory } from './classification';

export interface Summary {
  count: number;
  avgSystolic: number | null;
  avgDiastolic: number | null;
  /** Based only on readings that have a recorded pulse. */
  avgPulse: number | null;
  pulseCount: number;
  minSystolic: number | null;
  maxSystolic: number | null;
  minDiastolic: number | null;
  maxDiastolic: number | null;
  minPulse: number | null;
  maxPulse: number | null;
}

/** Consistent rounding used everywhere values are displayed. */
export function roundTo(value: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

const mean = (values: number[]): number | null =>
  values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;

const minOf = (values: number[]): number | null => (values.length ? Math.min(...values) : null);
const maxOf = (values: number[]): number | null => (values.length ? Math.max(...values) : null);

export function summarize(readings: readonly BloodPressureReading[]): Summary {
  const sys = readings.map((r) => r.systolic);
  const dia = readings.map((r) => r.diastolic);
  const pulse = readings.flatMap((r) => (r.pulseBpm == null ? [] : [r.pulseBpm]));
  return {
    count: readings.length,
    avgSystolic: mean(sys),
    avgDiastolic: mean(dia),
    avgPulse: mean(pulse),
    pulseCount: pulse.length,
    minSystolic: minOf(sys),
    maxSystolic: maxOf(sys),
    minDiastolic: minOf(dia),
    maxDiastolic: maxOf(dia),
    minPulse: minOf(pulse),
    maxPulse: maxOf(pulse),
  };
}

export type Granularity = 'day' | 'week' | 'month';

export interface Bucket {
  /** yyyy-mm-dd (day, week start) or yyyy-mm (month). */
  key: string;
  summary: Summary;
}

export function groupReadings(readings: readonly BloodPressureReading[], granularity: Granularity): Bucket[] {
  const groups = new Map<string, BloodPressureReading[]>();
  for (const r of readings) {
    const parts = localParts(r.measuredAtUtc, r.timezoneOffsetMinutes);
    const key =
      granularity === 'day' ? dayKey(parts) : granularity === 'week' ? weekKey(parts) : monthKey(parts);
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, list]) => ({ key, summary: summarize(list) }));
}

/** Minimum number of readings in each period before a comparison is shown. */
export const MIN_READINGS_FOR_COMPARISON = 3;

export interface Comparison {
  /** null when either period has too few readings to compare fairly. */
  systolicDelta: number | null;
  diastolicDelta: number | null;
  pulseDelta: number | null;
  currentCount: number;
  previousCount: number;
  sufficient: boolean;
}

export function compareSummaries(current: Summary, previous: Summary): Comparison {
  const sufficient =
    current.count >= MIN_READINGS_FOR_COMPARISON && previous.count >= MIN_READINGS_FOR_COMPARISON;
  const delta = (a: number | null, b: number | null): number | null =>
    sufficient && a != null && b != null ? a - b : null;
  return {
    systolicDelta: delta(current.avgSystolic, previous.avgSystolic),
    diastolicDelta: delta(current.avgDiastolic, previous.avgDiastolic),
    pulseDelta:
      current.pulseCount >= MIN_READINGS_FOR_COMPARISON && previous.pulseCount >= MIN_READINGS_FOR_COMPARISON
        ? delta(current.avgPulse, previous.avgPulse)
        : null,
    currentCount: current.count,
    previousCount: previous.count,
    sufficient,
  };
}

export interface Frequency {
  days: number;
  readings: number;
  daysWithReadings: number;
  readingsPerWeek: number;
}

export function measurementFrequency(readings: readonly BloodPressureReading[], range: DateRange): Frequency {
  const days = daysInRange(range);
  const daySet = new Set(readings.map((r) => dayKey(localParts(r.measuredAtUtc, r.timezoneOffsetMinutes))));
  return {
    days,
    readings: readings.length,
    daysWithReadings: daySet.size,
    readingsPerWeek: (readings.length / days) * 7,
  };
}

export function categoryDistribution(readings: readonly BloodPressureReading[]): Record<BpCategory, number> {
  const result = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, 0])) as Record<BpCategory, number>;
  for (const r of readings) result[classify(r.systolic, r.diastolic)] += 1;
  return result;
}

export interface Slot {
  key: string;
  summary: Summary | null;
}

const EMPTY_KEYED = (key: string): Slot => ({ key, summary: null });

/**
 * One slot per calendar day/week/month across the range. Slots without readings carry `null`
 * so charts can show a gap instead of implying a measurement happened.
 */
export function fillSlots(buckets: readonly Bucket[], range: DateRange, granularity: Granularity): Slot[] {
  const byKey = new Map(buckets.map((b) => [b.key, b.summary]));
  const keys: string[] = [];
  const seen = new Set<string>();
  const totalDays = daysInRange(range);
  for (let i = 0; i < totalDays; i += 1) {
    const d = new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate() + i);
    const parts = {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: 0,
      minute: 0,
      weekday: d.getDay(),
    };
    const key =
      granularity === 'day' ? dayKey(parts) : granularity === 'week' ? weekKey(parts) : monthKey(parts);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys.map((key) => {
    const summary = byKey.get(key);
    return summary ? { key, summary } : EMPTY_KEYED(key);
  });
}

/** Day for ranges up to 90 days, weeks up to ~1 year, otherwise months. */
export function autoGranularity(range: DateRange): Granularity {
  const days = daysInRange(range);
  if (days <= 92) return 'day';
  if (days <= 400) return 'week';
  return 'month';
}
