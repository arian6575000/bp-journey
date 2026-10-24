export type Arm = 'left' | 'right' | 'unknown';
export type Position = 'sitting' | 'lying' | 'standing' | 'unknown';
export type MeasurementContext = 'morning' | 'afternoon' | 'evening' | 'night' | 'other';
export type ReadingSource = 'manual' | 'imported';

export const ARMS: readonly Arm[] = ['left', 'right', 'unknown'];
export const POSITIONS: readonly Position[] = ['sitting', 'lying', 'standing', 'unknown'];
export const CONTEXTS: readonly MeasurementContext[] = ['morning', 'afternoon', 'evening', 'night', 'other'];

export interface BloodPressureReading {
  id: string;
  profileId: string;
  systolic: number;
  diastolic: number;
  pulseBpm: number | null;
  /** Instant of the measurement, ISO-8601 UTC (always `toISOString()` format). */
  measuredAtUtc: string;
  /** `Date.getTimezoneOffset()` at the time of the measurement (UTC minus local, minutes). */
  timezoneOffsetMinutes: number;
  arm: Arm;
  position: Position;
  context: MeasurementContext;
  notes: string | null;
  source: ReadingSource;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export type Language = 'en' | 'ur';
export type LanguagePreference = Language | 'system';
export type ThemePreference = 'system' | 'light' | 'dark';

export const LOCAL_PROFILE_ID = 'local-profile';
