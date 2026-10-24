import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { migrateDatabase, DATABASE_NAME } from '../db/db';
import { listReminders } from '../db/remindersRepository';
import { AppProvider, useApp } from '../i18n/I18nContext';
import { ToastProvider } from '../components/feedback';
import { configureNotificationHandler, syncReminders } from '../services/notifications';

configureNotificationHandler();

/** Re-registers saved reminders on launch and when the language/pause settings change. */
function ReminderBootstrap() {
  const db = useSQLiteContext();
  const { t, settings } = useApp();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const reminders = await listReminders(db);
        if (cancelled || reminders.length === 0) return;
        const paused = settings.remindersPausedUntil ? new Date(settings.remindersPausedUntil) : null;
        await syncReminders(reminders, paused, {
          channelName: t('reminderChannel'),
          title: t('notifTitle'),
          body: t('notifBody'),
        });
      } catch {
        // Reminders are best-effort; the Reminders screen reports problems explicitly.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, t, settings.remindersPausedUntil]);
  return null;
}

function Navigator() {
  const { isDark, colors } = useApp();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
      <ReminderBootstrap />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
        <AppProvider>
          <ToastProvider>
            <Navigator />
          </ToastProvider>
        </AppProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
