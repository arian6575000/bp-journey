import { en } from './en';
import { ur } from './ur';

export type TKey = keyof typeof en;

export const strings: Record<'en' | 'ur', Record<TKey, string>> = { en, ur };
