import type { SQLiteDatabase } from 'expo-sqlite';
import type { BloodPressureReading } from '../domain/types';
import { buildReadingsQuery } from './readingsQuery';
import type { ReadingFilters } from './readingsQuery';
import { notifyDataChanged } from './dataEvents';

interface ReadingRow {
  id: string;
  profile_id: string;
  systolic: number;
  diastolic: number;
  pulse_bpm: number | null;
  measured_at_utc: string;
  timezone_offset_minutes: number;
  arm: BloodPressureReading['arm'];
  position: BloodPressureReading['position'];
  context: BloodPressureReading['context'];
  notes: string | null;
  source: BloodPressureReading['source'];
  created_at_utc: string;
  updated_at_utc: string;
}

function fromRow(row: ReadingRow): BloodPressureReading {
  return {
    id: row.id,
    profileId: row.profile_id,
    systolic: row.systolic,
    diastolic: row.diastolic,
    pulseBpm: row.pulse_bpm,
    measuredAtUtc: row.measured_at_utc,
    timezoneOffsetMinutes: row.timezone_offset_minutes,
    arm: row.arm,
    position: row.position,
    context: row.context,
    notes: row.notes,
    source: row.source,
    createdAtUtc: row.created_at_utc,
    updatedAtUtc: row.updated_at_utc,
  };
}

export async function insertReading(db: SQLiteDatabase, r: BloodPressureReading): Promise<void> {
  await db.runAsync(
    `INSERT INTO readings (
      id, profile_id, systolic, diastolic, pulse_bpm, measured_at_utc, timezone_offset_minutes,
      arm, position, context, notes, source, created_at_utc, updated_at_utc
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    r.id,
    r.profileId,
    r.systolic,
    r.diastolic,
    r.pulseBpm,
    r.measuredAtUtc,
    r.timezoneOffsetMinutes,
    r.arm,
    r.position,
    r.context,
    r.notes,
    r.source,
    r.createdAtUtc,
    r.updatedAtUtc,
  );
  notifyDataChanged();
}

/** Updates in place (same id), so editing never creates a duplicate record. */
export async function updateReading(db: SQLiteDatabase, r: BloodPressureReading): Promise<void> {
  const result = await db.runAsync(
    `UPDATE readings SET
      systolic = ?, diastolic = ?, pulse_bpm = ?, measured_at_utc = ?, timezone_offset_minutes = ?,
      arm = ?, position = ?, context = ?, notes = ?, updated_at_utc = ?
     WHERE id = ? AND deleted_at_utc IS NULL`,
    r.systolic,
    r.diastolic,
    r.pulseBpm,
    r.measuredAtUtc,
    r.timezoneOffsetMinutes,
    r.arm,
    r.position,
    r.context,
    r.notes,
    r.updatedAtUtc,
    r.id,
  );
  if (result.changes === 0) throw new Error('Reading not found');
  notifyDataChanged();
}

export async function deleteReading(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    'UPDATE readings SET deleted_at_utc = ? WHERE id = ? AND deleted_at_utc IS NULL',
    new Date().toISOString(),
    id,
  );
  notifyDataChanged();
}

export async function getReading(db: SQLiteDatabase, id: string): Promise<BloodPressureReading | null> {
  const row = await db.getFirstAsync<ReadingRow>(
    'SELECT * FROM readings WHERE id = ? AND deleted_at_utc IS NULL',
    id,
  );
  return row ? fromRow(row) : null;
}

export async function queryReadings(
  db: SQLiteDatabase,
  filters: ReadingFilters,
): Promise<BloodPressureReading[]> {
  const { sql, params } = buildReadingsQuery(filters);
  const rows = await db.getAllAsync<ReadingRow>(sql, params);
  return rows.map(fromRow);
}

export async function countReadings(db: SQLiteDatabase, filters: ReadingFilters = {}): Promise<number> {
  const { sql, params } = buildReadingsQuery(filters, 'COUNT(*) AS c');
  const row = await db.getFirstAsync<{ c: number }>(sql, params);
  return row?.c ?? 0;
}

export async function getLatestReading(db: SQLiteDatabase): Promise<BloodPressureReading | null> {
  const rows = await queryReadings(db, { order: 'desc', limit: 1 });
  return rows[0] ?? null;
}

/** Permanently removes every reading (used by "Delete all data"). */
export async function deleteAllReadings(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM readings');
  notifyDataChanged();
}
