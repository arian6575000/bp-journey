import type { SQLiteDatabase } from 'expo-sqlite';
import type { LanguagePreference, ThemePreference } from '../domain/types';

export interface AppSettings {
  language: LanguagePreference;
  theme: ThemePreference;
  displayName: string;
  /** ISO timestamp until which reminders are paused, or null. */
  remindersPausedUntil: string | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'system',
  theme: 'system',
  displayName: '',
  remindersPausedUntil: null,
};

export async function loadSettings(db: SQLiteDatabase): Promise<AppSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const language = map.get('language');
  const theme = map.get('theme');
  return {
    language: language === 'en' || language === 'ur' || language === 'system' ? language : 'system',
    theme: theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system',
    displayName: map.get('displayName') ?? '',
    remindersPausedUntil: map.get('remindersPausedUntil') || null,
  };
}

export async function saveSetting<K extends keyof AppSettings>(
  db: SQLiteDatabase,
  key: K,
  value: AppSettings[K],
): Promise<void> {
  if (value === null || value === '') {
    await db.runAsync('DELETE FROM settings WHERE key = ?', key);
    return;
  }
  await db.runAsync(
    `INSERT INTO settings (key, value, updated_at_utc) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at_utc = excluded.updated_at_utc`,
    key,
    String(value),
    new Date().toISOString(),
  );
}

export async function clearSettings(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM settings');
}
