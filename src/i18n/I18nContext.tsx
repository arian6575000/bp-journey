import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getLocales } from 'expo-localization';
import { useSQLiteContext } from 'expo-sqlite';
import { strings } from './strings';
import type { TKey } from './strings';
import { DEFAULT_SETTINGS, loadSettings, saveSetting } from '../db/settingsRepository';
import type { AppSettings } from '../db/settingsRepository';
import type { Language } from '../domain/types';
import { darkPalette, lightPalette } from '../theme/tokens';
import type { Palette } from '../theme/tokens';

export type TFunction = (key: TKey, vars?: Record<string, string | number>) => string;

interface AppContextValue {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  reloadSettings: () => Promise<void>;
  language: Language;
  rtl: boolean;
  t: TFunction;
  isDark: boolean;
  colors: Palette;
}

const AppContext = createContext<AppContextValue | null>(null);

function systemLanguage(): Language {
  try {
    return getLocales()[0]?.languageCode === 'ur' ? 'ur' : 'en';
  } catch {
    return 'en';
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const scheme = useColorScheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  const reloadSettings = useCallback(async () => {
    try {
      setSettings(await loadSettings(db));
    } finally {
      setLoaded(true);
    }
  }, [db]);

  useEffect(() => {
    void reloadSettings();
  }, [reloadSettings]);

  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      await saveSetting(db, key, value);
      setSettings((old) => ({ ...old, [key]: value }));
    },
    [db],
  );

  const language: Language = settings.language === 'system' ? systemLanguage() : settings.language;
  const isDark = settings.theme === 'system' ? scheme === 'dark' : settings.theme === 'dark';

  const value = useMemo<AppContextValue>(() => {
    const dict = strings[language];
    const t: TFunction = (key, vars) => {
      let text: string = dict[key] ?? strings.en[key];
      if (vars) {
        for (const [name, replacement] of Object.entries(vars)) {
          text = text.split(`{${name}}`).join(String(replacement));
        }
      }
      return text;
    };
    return {
      settings,
      updateSetting,
      reloadSettings,
      language,
      rtl: language === 'ur',
      t,
      isDark,
      colors: isDark ? darkPalette : lightPalette,
    };
  }, [settings, updateSetting, reloadSettings, language, isDark]);

  // Avoid flashing the wrong language/theme before settings are read.
  if (!loaded) return null;
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
