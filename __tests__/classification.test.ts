import { classify, isLow, isVeryHigh } from '../src/domain/classification';

describe('classify (2017 ACC/AHA, adults)', () => {
  it.each([
    [119, 79, 'normal'],
    [120, 79, 'elevated'],
    [129, 79, 'elevated'],
    [129, 80, 'stage1'],
    [130, 70, 'stage1'],
    [139, 89, 'stage1'],
    [140, 70, 'stage2'],
    [125, 90, 'stage2'],
    [180, 120, 'stage2'],
    [181, 80, 'veryHigh'],
    [150, 121, 'veryHigh'],
  ] as const)('%i/%i is %s', (s, d, expected) => {
    expect(classify(s, d)).toBe(expected);
  });

  it('flags very high and low separately', () => {
    expect(isVeryHigh(180, 120)).toBe(false);
    expect(isVeryHigh(181, 60)).toBe(true);
    expect(isLow(89, 70)).toBe(true);
    expect(isLow(110, 59)).toBe(true);
    expect(isLow(110, 70)).toBe(false);
  });
});
