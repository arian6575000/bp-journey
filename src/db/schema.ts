export interface Migration {
  version: number;
  statements: string[];
}

/**
 * Versioned schema. Never edit an applied migration; append a new one.
 * (SQLite cannot alter CHECK constraints, so v2 rebuilds the readings table.)
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY NOT NULL,
        display_name TEXT,
        created_at_utc TEXT NOT NULL
      )`,
      `INSERT OR IGNORE INTO profiles (id, display_name, created_at_utc)
        VALUES ('local-profile', NULL, datetime('now'))`,
      `CREATE TABLE IF NOT EXISTS readings (
        id TEXT PRIMARY KEY NOT NULL,
        profile_id TEXT NOT NULL,
        systolic INTEGER NOT NULL CHECK (systolic > 0),
        diastolic INTEGER NOT NULL CHECK (diastolic > 0),
        pulse_bpm INTEGER,
        measured_at_utc TEXT NOT NULL,
        timezone_offset_minutes INTEGER NOT NULL,
        arm TEXT NOT NULL CHECK (arm IN ('left','right','unknown')),
        position TEXT NOT NULL CHECK (position IN ('sitting','lying','standing','unknown')),
        context TEXT NOT NULL CHECK (context IN ('morning','evening','resting','other')),
        notes TEXT,
        source TEXT NOT NULL DEFAULT 'manual',
        created_at_utc TEXT NOT NULL,
        updated_at_utc TEXT NOT NULL,
        deleted_at_utc TEXT,
        FOREIGN KEY (profile_id) REFERENCES profiles(id)
      )`,
    ],
  },
  {
    version: 2,
    statements: [
      `CREATE TABLE readings_v2 (
        id TEXT PRIMARY KEY NOT NULL,
        profile_id TEXT NOT NULL,
        systolic INTEGER NOT NULL CHECK (systolic > 0),
        diastolic INTEGER NOT NULL CHECK (diastolic > 0),
        pulse_bpm INTEGER CHECK (pulse_bpm IS NULL OR pulse_bpm > 0),
        measured_at_utc TEXT NOT NULL,
        timezone_offset_minutes INTEGER NOT NULL,
        arm TEXT NOT NULL CHECK (arm IN ('left','right','unknown')),
        position TEXT NOT NULL CHECK (position IN ('sitting','lying','standing','unknown')),
        context TEXT NOT NULL CHECK (context IN ('morning','afternoon','evening','night','other')),
        notes TEXT,
        source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','imported')),
        created_at_utc TEXT NOT NULL,
        updated_at_utc TEXT NOT NULL,
        deleted_at_utc TEXT,
        FOREIGN KEY (profile_id) REFERENCES profiles(id)
      )`,
      `INSERT INTO readings_v2 (
        id, profile_id, systolic, diastolic, pulse_bpm, measured_at_utc, timezone_offset_minutes,
        arm, position, context, notes, source, created_at_utc, updated_at_utc, deleted_at_utc
      ) SELECT
        id, profile_id, systolic, diastolic, pulse_bpm, measured_at_utc, timezone_offset_minutes,
        arm, position,
        CASE context WHEN 'resting' THEN 'other' ELSE context END,
        notes,
        CASE source WHEN 'imported' THEN 'imported' ELSE 'manual' END,
        created_at_utc, updated_at_utc, deleted_at_utc
      FROM readings`,
      `DROP TABLE readings`,
      `ALTER TABLE readings_v2 RENAME TO readings`,
      `CREATE INDEX idx_readings_active_measured
        ON readings(deleted_at_utc, measured_at_utc DESC)`,
      `CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at_utc TEXT NOT NULL
      )`,
      `CREATE TABLE reminders (
        id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('morning','evening','custom')),
        hour INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
        minute INTEGER NOT NULL CHECK (minute BETWEEN 0 AND 59),
        days_mask INTEGER NOT NULL CHECK (days_mask BETWEEN 0 AND 127),
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at_utc TEXT NOT NULL
      )`,
    ],
  },
];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;
