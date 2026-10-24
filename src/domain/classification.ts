/**
 * Blood-pressure interpretation, kept in one place so it can be reviewed and updated without
 * touching the UI.
 *
 * Source: 2017 ACC/AHA guideline for high blood pressure in adults (office/clinic readings).
 * It applies to adults only, and a single reading can never diagnose hypertension or hypotension.
 * Pregnancy and children need professional guidance. This is information, not medical advice.
 */
export const GUIDELINE = {
  name: '2017 ACC/AHA',
  population: 'adults',
  veryHighSystolicAbove: 180,
  veryHighDiastolicAbove: 120,
  stage2SystolicFrom: 140,
  stage2DiastolicFrom: 90,
  stage1SystolicFrom: 130,
  stage1DiastolicFrom: 80,
  elevatedSystolicFrom: 120,
  /** Readings below these are flagged for attention, never labelled harmless. */
  lowSystolicBelow: 90,
  lowDiastolicBelow: 60,
} as const;

export type BpCategory = 'normal' | 'elevated' | 'stage1' | 'stage2' | 'veryHigh';

export const CATEGORY_ORDER: readonly BpCategory[] = ['normal', 'elevated', 'stage1', 'stage2', 'veryHigh'];

export function classify(systolic: number, diastolic: number): BpCategory {
  const g = GUIDELINE;
  if (systolic > g.veryHighSystolicAbove || diastolic > g.veryHighDiastolicAbove) return 'veryHigh';
  if (systolic >= g.stage2SystolicFrom || diastolic >= g.stage2DiastolicFrom) return 'stage2';
  if (systolic >= g.stage1SystolicFrom || diastolic >= g.stage1DiastolicFrom) return 'stage1';
  if (systolic >= g.elevatedSystolicFrom) return 'elevated';
  return 'normal';
}

/** Emergency-safety concept, deliberately separate from category labels. */
export function isVeryHigh(systolic: number, diastolic: number): boolean {
  return systolic > GUIDELINE.veryHighSystolicAbove || diastolic > GUIDELINE.veryHighDiastolicAbove;
}

/** A low reading may be normal for some people, so it is only flagged for awareness. */
export function isLow(systolic: number, diastolic: number): boolean {
  return systolic < GUIDELINE.lowSystolicBelow || diastolic < GUIDELINE.lowDiastolicBelow;
}

/** Icon-like symbols so status is never conveyed by colour alone. */
export const CATEGORY_SYMBOL: Record<BpCategory, string> = {
  normal: '●',
  elevated: '▲',
  stage1: '◆',
  stage2: '◼',
  veryHigh: '⬣',
};
