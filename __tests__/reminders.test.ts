import { ALL_DAYS_MASK, buildSchedule, hasDay, toggleDay } from '../src/domain/reminders';
import type { Reminder } from '../src/domain/reminders';

const r = (over: Partial<Reminder>): Reminder => ({
  id: 'a',
  kind: 'morning',
  hour: 8,
  minute: 0,
  daysMask: ALL_DAYS_MASK,
  enabled: true,
  ...over,
});

describe('buildSchedule', () => {
  const now = new Date('2026-10-23T10:00:00Z');
  it('creates one weekly slot per enabled day (Expo weekday 1 = Sunday)', () => {
    const slots = buildSchedule([r({ daysMask: 0b0000011 })], null, now);
    expect(slots.map((s) => s.weekday)).toEqual([1, 2]);
  });
  it('skips disabled reminders and collapses duplicates', () => {
    expect(buildSchedule([r({ enabled: false })], null, now)).toEqual([]);
    expect(buildSchedule([r({ id: 'a' }), r({ id: 'b' })], null, now)).toHaveLength(7);
  });
  it('schedules nothing while paused, and resumes after the pause date', () => {
    expect(buildSchedule([r({})], new Date('2026-10-25T00:00:00Z'), now)).toEqual([]);
    expect(buildSchedule([r({})], new Date('2026-10-22T00:00:00Z'), now)).toHaveLength(7);
  });
  it('toggles days in the mask', () => {
    const m = toggleDay(ALL_DAYS_MASK, 0);
    expect(hasDay(m, 0)).toBe(false);
    expect(hasDay(m, 1)).toBe(true);
    expect(hasDay(toggleDay(m, 0), 0)).toBe(true);
  });
});
