import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useApp } from '../../../i18n/I18nContext';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { getReading } from '../../../db/readingsRepository';
import { ReadingForm } from '../../../components/ReadingForm';
import { EmptyState, ErrorState, LoadingState } from '../../../components/feedback';
import { AppHeader, Screen } from '../../../components/ui';

export default function EditReadingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useApp();
  const db = useSQLiteContext();
  const router = useRouter();
  const { data, loading, error, reload } = useAsyncData(() => getReading(db, String(id)), [db, id]);

  if (loading && !data)
    return (
      <Screen header={<AppHeader title={t('editReading')} onBack={() => router.back()} />}>
        <LoadingState />
      </Screen>
    );
  if (error)
    return (
      <Screen header={<AppHeader title={t('editReading')} onBack={() => router.back()} />}>
        <ErrorState message={t('loadFailed')} onRetry={reload} />
      </Screen>
    );
  if (!data)
    return (
      <Screen header={<AppHeader title={t('editReading')} onBack={() => router.back()} />}>
        <EmptyState title={t('readingNotFound')} />
      </Screen>
    );
  // key: re-mount only when switching to a different record, not on every reload.
  return <ReadingForm key={data.id} initial={data} />;
}
