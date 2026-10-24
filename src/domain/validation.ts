import { ARMS, CONTEXTS, POSITIONS } from './types';
import type { Arm, MeasurementContext, Position } from './types';
import { isVeryHigh } from './classification';

/** Technical acceptance range for data entry. Not clinical thresholds. */
export const LIMITS = {
  systolic: { min: 30, max: 300 },
  diastolic: { min: 20, max: 200 },
  pulse: { min: 20, max: 250 },
  notesMaxLength: 1000,
} as const;

/** Values outside these are accepted but the user is asked to double-check. */
export const UNUSUAL = {
  systolic: { min: 70, max: 250 },
  diastolic: { min: 40, max: 150 },
  pulse: { min: 35, max: 200 },
} as const;

export type ValidationErrorCode =
  | 'systolicRequired'
  | 'diastolicRequired'
  | 'systolicNotInteger'
  | 'diastolicNotInteger'
  | 'pulseNotInteger'
  | 'systolicNotPositive'
  | 'diastolicNotPositive'
  | 'pulseNotPositive'
  | 'systolicRange'
  | 'diastolicRange'
  | 'pulseRange'
  | 'dateInvalid'
  | 'notesTooLong'
  | 'armInvalid'
  | 'positionInvalid'
  | 'contextInvalid';

export type DataQualityWarningCode =
  'orderingOdd' | 'systolicUnusual' | 'diastolicUnusual' | 'pulseUnusual' | 'futureTime';

export interface ReadingFormInput {
  systolic: string;
  diastolic: string;
  pulse: string;
  measuredAt: Date;
  arm: Arm;
  position: Position;
  context: MeasurementContext;
  notes: string;
}

export interface ParsedReading {
  systolic: number;
  diastolic: number;
  pulseBpm: number | null;
  measuredAt: Date;
  arm: Arm;
  position: Position;
  context: MeasurementContext;
  notes: string | null;
}

export interface ValidationResult {
  /** Technical errors. Any error blocks saving. */
  errors: ValidationErrorCode[];
  /** Data-quality warnings. The user may confirm and save anyway. */
  warnings: DataQualityWarningCode[];
  /** Emergency-safety flag, independent from errors/warnings. */
  veryHigh: boolean;
  /** Present only when there are no errors. */
  parsed?: ParsedReading;
}

type IntParse = { kind: 'empty' } | { kind: 'invalid' } | { kind: 'ok'; value: number };

function parseWholeNumber(raw: string): IntParse {
  const text = raw.trim();
  if (text === '') return { kind: 'empty' };
  if (!/^\d+$/.test(text)) return { kind: 'invalid' };
  const value = Number(text);
  return Number.isSafeInteger(value) ? { kind: 'ok', value } : { kind: 'invalid' };
}

/** Negative numbers and decimals are reported with a specific message. */
function classifyInvalid(raw: string): 'notInteger' | 'notPositive' {
  const text = raw.trim();
  if (/^-\d/.test(text)) return 'notPositive';
  return 'notInteger';
}

export function validateReadingInput(input: ReadingFormInput, now: Date = new Date()): ValidationResult {
  const errors: ValidationErrorCode[] = [];
  const warnings: DataQualityWarningCode[] = [];

  const sys = parseWholeNumber(input.systolic);
  const dia = parseWholeNumber(input.diastolic);
  const pul = parseWholeNumber(input.pulse);

  if (sys.kind === 'empty') errors.push('systolicRequired');
  else if (sys.kind === 'invalid') {
    errors.push(
      classifyInvalid(input.systolic) === 'notPositive' ? 'systolicNotPositive' : 'systolicNotInteger',
    );
  } else if (sys.value <= 0) errors.push('systolicNotPositive');
  else if (sys.value < LIMITS.systolic.min || sys.value > LIMITS.systolic.max) errors.push('systolicRange');

  if (dia.kind === 'empty') errors.push('diastolicRequired');
  else if (dia.kind === 'invalid') {
    errors.push(
      classifyInvalid(input.diastolic) === 'notPositive' ? 'diastolicNotPositive' : 'diastolicNotInteger',
    );
  } else if (dia.value <= 0) errors.push('diastolicNotPositive');
  else if (dia.value < LIMITS.diastolic.min || dia.value > LIMITS.diastolic.max)
    errors.push('diastolicRange');

  if (pul.kind === 'invalid') {
    errors.push(classifyInvalid(input.pulse) === 'notPositive' ? 'pulseNotPositive' : 'pulseNotInteger');
  } else if (pul.kind === 'ok') {
    if (pul.value <= 0) errors.push('pulseNotPositive');
    else if (pul.value < LIMITS.pulse.min || pul.value > LIMITS.pulse.max) errors.push('pulseRange');
  }

  if (!(input.measuredAt instanceof Date) || Number.isNaN(input.measuredAt.getTime())) {
    errors.push('dateInvalid');
  }

  if (input.notes.trim().length > LIMITS.notesMaxLength) errors.push('notesTooLong');
  if (!ARMS.includes(input.arm)) errors.push('armInvalid');
  if (!POSITIONS.includes(input.position)) errors.push('positionInvalid');
  if (!CONTEXTS.includes(input.context)) errors.push('contextInvalid');

  const sysOk = sys.kind === 'ok' && !errors.some((e) => e.startsWith('systolic'));
  const diaOk = dia.kind === 'ok' && !errors.some((e) => e.startsWith('diastolic'));
  const pulOk = pul.kind === 'ok' && !errors.some((e) => e.startsWith('pulse'));

  if (sysOk && diaOk && sys.value <= dia.value) warnings.push('orderingOdd');
  if (sysOk && (sys.value < UNUSUAL.systolic.min || sys.value > UNUSUAL.systolic.max))
    warnings.push('systolicUnusual');
  if (diaOk && (dia.value < UNUSUAL.diastolic.min || dia.value > UNUSUAL.diastolic.max))
    warnings.push('diastolicUnusual');
  if (pulOk && (pul.value < UNUSUAL.pulse.min || pul.value > UNUSUAL.pulse.max))
    warnings.push('pulseUnusual');
  if (!errors.includes('dateInvalid') && input.measuredAt.getTime() > now.getTime() + 60_000) {
    warnings.push('futureTime');
  }

  const veryHigh = sysOk && diaOk ? isVeryHigh(sys.value, dia.value) : false;

  if (errors.length > 0 || sys.kind !== 'ok' || dia.kind !== 'ok') {
    return { errors, warnings, veryHigh };
  }

  return {
    errors,
    warnings,
    veryHigh,
    parsed: {
      systolic: sys.value,
      diastolic: dia.value,
      pulseBpm: pul.kind === 'ok' ? pul.value : null,
      measuredAt: input.measuredAt,
      arm: input.arm,
      position: input.position,
      context: input.context,
      notes: input.notes.trim() === '' ? null : input.notes.trim(),
    },
  };
}
