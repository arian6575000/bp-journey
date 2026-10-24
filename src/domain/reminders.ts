export type ReminderKind = 'morning' | 'evening' | 'custom';

export interface Reminder {
  id: string;
  kind: ReminderKind;
  hour: number;
  minute: number;
  /** Bit n set means the weekday with JS index n (0 = Sunday) is enabled. */
  daysMask: number;
  enabled: boolean;
}

export const ALL_DAYS_MASK = 0b1111111;
export const MAX_REMINDERS = 6;

export function hasDay(mask: number, weekdayIndex: number): boolean {
  return (mask & (1 << weekdayIndex)) !== 0;
}

export function toggleDay(mask: number, weekdayIndex: number): number {
  return mask ^ (1 << weekdayIndex);
}

export function defaultReminder(kind: ReminderKind, id: string): Reminder {
  return {
    id,
    kind,
    hour: kind === 'evening' ? 20 : kind === 'morning' ? 8 : 12,
    minute: 0,
    daysMask: ALL_DAYS_MASK,
    enabled: true,
  };
}

export interface ScheduledSlot {
  key: string;
  /** Expo weekday: 1 = Sunday ... 7 = Saturday. */
  weekday: number;
  hour: number;
  minute: number;
}

/**
 * Computes the weekly notification slots to register. Duplicate slots (same weekday and time
 * from different reminders) are collapsed so the user never gets two identical notifications.
 */
export function buildSchedule(
  reminders: readonly Reminder[],
  pausedUntil: Date | null,
  now: Date = new Date(),
): ScheduledSlot[] {
  if (pausedUntil && pausedUntil.getTime() > now.getTime()) return [];
  const slots = new Map<string, ScheduledSlot>();
  for (const reminder of reminders) {
    if (!reminder.enabled) continue;
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      if (!hasDay(reminder.daysMask, dayIndex)) continue;
      const key = `${dayIndex}-${reminder.hour}-${reminder.minute}`;
      if (!slots.has(key)) {
        slots.set(key, { key, weekday: dayIndex + 1, hour: reminder.hour, minute: reminder.minute });
      }
    }
  }
  return [...slots.values()];
}

export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
