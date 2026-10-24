import type { SQLiteDatabase } from 'expo-sqlite';
import type { Reminder } from '../domain/reminders';

interface ReminderRow {
  id: string;
  kind: Reminder['kind'];
  hour: number;
  minute: number;
  days_mask: number;
  enabled: number;
}

export async function listReminders(db: SQLiteDatabase): Promise<Reminder[]> {
  const rows = await db.getAllAsync<ReminderRow>(
    'SELECT id, kind, hour, minute, days_mask, enabled FROM reminders ORDER BY hour, minute, id',
  );
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    hour: r.hour,
    minute: r.minute,
    daysMask: r.days_mask,
    enabled: r.enabled === 1,
  }));
}

export async function upsertReminder(db: SQLiteDatabase, r: Reminder): Promise<void> {
  await db.runAsync(
    `INSERT INTO reminders (id, kind, hour, minute, days_mask, enabled, created_at_utc)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET kind = excluded.kind, hour = excluded.hour,
       minute = excluded.minute, days_mask = excluded.days_mask, enabled = excluded.enabled`,
    r.id,
    r.kind,
    r.hour,
    r.minute,
    r.daysMask,
    r.enabled ? 1 : 0,
    new Date().toISOString(),
  );
}

export async function removeReminder(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM reminders WHERE id = ?', id);
}

export async function clearReminders(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM reminders');
}
