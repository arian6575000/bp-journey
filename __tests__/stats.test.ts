import {
  compareSummaries,
  groupReadings,
  measurementFrequency,
  summarize,
  roundTo,
  categoryDistribution,
 autoGranularity, fillSlots } from '../src/domain/stats';
import type { BloodPressureReading } from '../src/domain/types';
import {
  rangeForPreset,
  previousRange,
  dayKey,
  weekKey,
  monthKey,
  localParts,
  contextForHour,
} from '../src/domain/dates';


let n = 0;
function reading(
  utc: string,
  sys: number,
  dia: number,
  pulse: number | null = null,
  offset = 0,
): BloodPressureReading {
  n += 1;
  return {
    id: `r${n}`,
    profileId: 'local-profile',
    systolic: sys,
    diastolic: dia,
    pulseBpm: pulse,
    measuredAtUtc: utc,
    timezoneOffsetMinutes: offset,
    arm: 'left',
    position: 'sitting',
    context: 'morning',
    notes: null,
    source: 'manual',
    createdAtUtc: utc,
    updatedAtUtc: utc,
  };
}

describe('summarize', () => {
  it('handles empty input without inventing numbers', () => {
    const s = summarize([]);
    expect(s.count).toBe(0);
    expect(s.avgSystolic).toBeNull();
    expect(s.avgPulse).toBeNull();
  });

  it('averages without truncating and ignores missing pulse', () => {
    const s = summarize([
      reading('2026-10-01T08:00:00.000Z', 121, 80, 70),
      reading('2026-10-02T08:00:00.000Z', 124, 81, null),
      reading('2026-10-03T08:00:00.000Z', 126, 83, 75),
    ]);
    expect(s.count).toBe(3);
    expect(s.avgSystolic).toBeCloseTo(123.6667, 4);
    expect(s.avgPulse).toBe(72.5);
    expect(s.pulseCount).toBe(2);
    expect(s.minSystolic).toBe(121);
    expect(s.maxDiastolic).toBe(83);
  });

  it('rounds consistently (half up)', () => {
    expect(roundTo(123.5)).toBe(124);
    expect(roundTo(72.25, 1)).toBe(72.3);
  });
});

describe('grouping and keys', () => {
  it('uses the recorded UTC offset for the local day', () => {
    // 22:30 UTC with offset -300 (UTC+5) is 03:30 next day locally.
    const p = localParts('2026-10-23T22:30:00.000Z', -300);
    expect(dayKey(p)).toBe('2026-10-24');
    expect(p.hour).toBe(3);
  });

  it('groups by day, ISO week (Monday) and month', () => {
    const rs = [
      reading('2026-10-04T08:00:00.000Z', 120, 80), // Sunday -> week of Mon 2026-09-28
      reading('2026-10-05T08:00:00.000Z', 130, 85), // Monday
      reading('2026-10-05T18:00:00.000Z', 140, 90),
    ];
    expect(groupReadings(rs, 'day').map((b) => [b.key, b.summary.count])).toEqual([
      ['2026-10-04', 1],
      ['2026-10-05', 2],
    ]);
    expect(groupReadings(rs, 'week').map((b) => b.key)).toEqual(['2026-09-28', '2026-10-05']);
    expect(groupReadings(rs, 'month').map((b) => b.key)).toEqual(['2026-10']);
    expect(weekKey(localParts('2026-10-05T08:00:00.000Z', 0))).toBe('2026-10-05');
    expect(monthKey(localParts('2026-10-05T08:00:00.000Z', 0))).toBe('2026-10');
  });

  it('suggests a context from the hour', () => {
    expect([6, 13, 19, 23, 2].map(contextForHour)).toEqual([
      'morning',
      'afternoon',
      'evening',
      'night',
      'night',
    ]);
  });
});

describe('comparison and frequency', () => {
  it('refuses to compare when a period has too few readings', () => {
    const a = summarize([reading('2026-10-01T08:00:00.000Z', 120, 80)]);
    const b = summarize([reading('2026-09-01T08:00:00.000Z', 130, 85)]);
    const c = compareSummaries(a, b);
    expect(c.sufficient).toBe(false);
    expect(c.systolicDelta).toBeNull();
  });

  it('compares when both periods have enough readings', () => {
    const mk = (base: number) =>
      summarize([1, 2, 3].map((i) => reading(`2026-10-0${i}T08:00:00.000Z`, base + i, 80)));
    const c = compareSummaries(mk(120), mk(130));
    expect(c.sufficient).toBe(true);
    expect(c.systolicDelta).toBeCloseTo(-10);
    expect(c.pulseDelta).toBeNull();
  });

  it('computes frequency over the selected period', () => {
    const range = rangeForPreset('7d', new Date(2026, 9, 23, 12));
    const rs = [
      reading(
        new Date(2026, 9, 22, 8).toISOString(),
        120,
        80,
        null,
        new Date(2026, 9, 22, 8).getTimezoneOffset(),
      ),
      reading(
        new Date(2026, 9, 22, 20).toISOString(),
        120,
        80,
        null,
        new Date(2026, 9, 22, 20).getTimezoneOffset(),
      ),
    ];
    const f = measurementFrequency(rs, range);
    expect(f.days).toBe(7);
    expect(f.daysWithReadings).toBe(1);
    expect(f.readingsPerWeek).toBeCloseTo(2);
  });

  it('counts categories', () => {
    const d = categoryDistribution([
      reading('2026-10-01T08:00:00.000Z', 110, 70),
      reading('2026-10-01T09:00:00.000Z', 190, 100),
    ]);
    expect(d.normal).toBe(1);
    expect(d.veryHigh).toBe(1);
  });
});

describe('ranges', () => {
  const now = new Date(2026, 9, 23, 15, 30);
  it('builds preset ranges ending tomorrow 00:00 (exclusive)', () => {
    const r = rangeForPreset('7d', now);
    expect(r.from).toEqual(new Date(2026, 9, 17));
    expect(r.to).toEqual(new Date(2026, 9, 24));
    expect(rangeForPreset('today', now).from).toEqual(new Date(2026, 9, 23));
    expect(rangeForPreset('30d', now).from).toEqual(new Date(2026, 8, 24));
  });
  it('treats custom end as an inclusive day and swaps reversed input', () => {
    const r = rangeForPreset('custom', now, { from: new Date(2026, 9, 5), to: new Date(2026, 9, 1) });
    expect(r.from).toEqual(new Date(2026, 9, 1));
    expect(r.to).toEqual(new Date(2026, 9, 6));
  });
  it('previous range has the same length', () => {
    const r = rangeForPreset('7d', now);
    const p = previousRange(r);
    expect(p.to).toEqual(r.from);
    expect(p.from).toEqual(new Date(2026, 9, 10));
  });
});

describe('fillSlots', () => {
  it('creates a slot for every day, with null where nothing was measured', () => {
    const range = rangeForPreset('7d', new Date(2026, 9, 23, 12));
    const d = new Date(2026, 9, 21, 9);
    const rs = [reading(d.toISOString(), 120, 80, null, d.getTimezoneOffset())];
    const slots = fillSlots(groupReadings(rs, 'day'), range, 'day');
    expect(slots).toHaveLength(7);
    expect(slots.filter((s) => s.summary).map((s) => s.key)).toEqual(['2026-10-21']);
  });
  it('picks a sensible granularity', () => {
    const now = new Date(2026, 9, 23);
    expect(autoGranularity(rangeForPreset('30d', now))).toBe('day');
    expect(autoGranularity(rangeForPreset('6m', now))).toBe('week');
    expect(autoGranularity(rangeForPreset('1y', now))).toBe('week');
  });
});
