import { en } from '../src/i18n/en';
import { ur } from '../src/i18n/ur';

const placeholders = (s: string): string[] => (s.match(/\{\w+\}/g) ?? []).sort();

describe('localisation', () => {
  it('has the same keys in English and Urdu', () => {
    expect(Object.keys(ur).sort()).toEqual(Object.keys(en).sort());
  });

  it('keeps the same {placeholders} in every translation', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect({ key, p: placeholders(ur[key]) }).toEqual({ key, p: placeholders(en[key]) });
    }
  });

  it('has no empty strings', () => {
    for (const dict of [en, ur]) {
      for (const [key, value] of Object.entries(dict))
        expect({ key, empty: value.trim() === '' }).toEqual({ key, empty: false });
    }
  });
});
