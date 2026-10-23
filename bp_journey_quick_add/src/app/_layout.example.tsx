// Example root layout for Expo Router.
// For production, wrap the app with SafeAreaProvider and SQLiteProvider,
// and add a proper font/RTL initialization strategy before rendering screens.

import React from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { getDatabase } from '../database/db';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="bp-journey.db" onInit={async (db) => {
      // Initialize schema using the same migrations as db.ts.
      // Prefer one initialization path in the real app to avoid opening two connections.
      await db.execAsync('PRAGMA foreign_keys = ON;');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY NOT NULL,
          applied_at_utc TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY NOT NULL,
          display_name TEXT,
          created_at_utc TEXT NOT NULL
        );
        INSERT OR IGNORE INTO profiles (id, display_name, created_at_utc)
        VALUES ('local-profile', NULL, datetime('now'));
        CREATE TABLE IF NOT EXISTS readings (
          id TEXT PRIMARY KEY NOT NULL,
          profile_id TEXT NOT NULL,
          systolic INTEGER NOT NULL CHECK (systolic > 0),
          diastolic INTEGER NOT NULL CHECK (diastolic > 0),
          pulse_bpm INTEGER,
          measured_at_utc TEXT NOT NULL,
          timezone_offset_minutes INTEGER NOT NULL,
          arm TEXT NOT NULL,
          position TEXT NOT NULL,
          context TEXT NOT NULL,
          notes TEXT,
          source TEXT NOT NULL DEFAULT 'manual',
          created_at_utc TEXT NOT NULL,
          updated_at_utc TEXT NOT NULL,
          deleted_at_utc TEXT,
          FOREIGN KEY (profile_id) REFERENCES profiles(id)
        );
        CREATE INDEX IF NOT EXISTS idx_readings_profile_measured
          ON readings(profile_id, measured_at_utc DESC);
      `);
      void getDatabase; // Use a single schema initializer in the final app.
    }}>
      <Stack screenOptions={{ headerShown: false }} />
    </SQLiteProvider>
  );
}
