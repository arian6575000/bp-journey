import { validateReadingInput } from '../src/domain/validation';
import type { ReadingFormInput } from '../src/domain/validation';

const now = new Date('2026-10-23T12:00:00Z');
const base: ReadingFormInput = {
  systolic: '120',
  diastolic: '80',
  pulse: '72',
  measuredAt: new Date('2026-10-23T08:00:00Z'),
  arm: 'left',
  position: 'sitting',
  context: 'morning',
  notes: '',
};
const check = (patch: Partial<ReadingFormInput>) => validateReadingInput({ ...base, ...patch }, now);

describe('validateReadingInput', () => {
  it('accepts a normal reading and parses numbers', () => {
    const r = check({});
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.parsed).toMatchObject({ systolic: 120, diastolic: 80, pulseBpm: 72, notes: null });
  });

  it('requires systolic and diastolic, but not pulse', () => {
    expect(check({ systolic: '', diastolic: '  ' }).errors).toEqual([
      'systolicRequired',
      'diastolicRequired',
    ]);
    const noPulse = check({ pulse: '' });
    expect(noPulse.errors).toEqual([]);
    expect(noPulse.parsed?.pulseBpm).toBeNull();
  });

  it('rejects non-numeric, decimal, negative and zero values', () => {
    expect(check({ systolic: 'abc' }).errors).toContain('systolicNotInteger');
    expect(check({ systolic: '120.5' }).errors).toContain('systolicNotInteger');
    expect(check({ diastolic: '-80' }).errors).toContain('diastolicNotPositive');
    expect(check({ systolic: '0' }).errors).toContain('systolicNotPositive');
    expect(check({ pulse: '-5' }).errors).toContain('pulseNotPositive');
    expect(check({ pulse: 'x' }).errors).toContain('pulseNotInteger');
  });

  it('enforces technical ranges', () => {
    expect(check({ systolic: '29' }).errors).toContain('systolicRange');
    expect(check({ systolic: '301' }).errors).toContain('systolicRange');
    expect(check({ diastolic: '19' }).errors).toContain('diastolicRange');
    expect(check({ diastolic: '201' }).errors).toContain('diastolicRange');
    expect(check({ pulse: '19' }).errors).toContain('pulseRange');
    expect(check({ systolic: '30', diastolic: '20', pulse: '250' }).errors).toEqual([]);
  });

  it('never returns parsed data when there are errors', () => {
    expect(check({ systolic: 'abc' }).parsed).toBeUndefined();
  });

  it('warns (but does not block) for unusual values and odd ordering', () => {
    const r = check({ systolic: '80', diastolic: '85' });
    expect(r.errors).toEqual([]);
    expect(r.warnings).toContain('orderingOdd');
    expect(check({ systolic: '260', diastolic: '100' }).warnings).toContain('systolicUnusual');
    expect(check({ pulse: '30' }).warnings).toContain('pulseUnusual');
  });

  it('handles dates: invalid is an error, future is a warning', () => {
    expect(check({ measuredAt: new Date('nope') }).errors).toContain('dateInvalid');
    const future = check({ measuredAt: new Date('2026-10-24T12:00:00Z') });
    expect(future.errors).toEqual([]);
    expect(future.warnings).toContain('futureTime');
  });

  it('limits notes length and trims notes', () => {
    expect(check({ notes: 'x'.repeat(1001) }).errors).toContain('notesTooLong');
    expect(check({ notes: '  after walk  ' }).parsed?.notes).toBe('after walk');
  });

  it('rejects invalid enum values', () => {
    expect(check({ arm: 'foot' as never }).errors).toContain('armInvalid');
    expect(check({ position: 'x' as never }).errors).toContain('positionInvalid');
    expect(check({ context: 'x' as never }).errors).toContain('contextInvalid');
  });

  it('keeps the emergency flag separate from validation', () => {
    expect(check({ systolic: '181', diastolic: '90' }).veryHigh).toBe(true);
    expect(check({ systolic: '150', diastolic: '121' }).veryHigh).toBe(true);
    expect(check({ systolic: '180', diastolic: '120' }).veryHigh).toBe(false);
    expect(check({ systolic: '181', diastolic: '90' }).errors).toEqual([]);
  });
});
