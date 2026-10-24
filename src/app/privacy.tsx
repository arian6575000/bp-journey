import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useApp } from '../i18n/I18nContext';
import { clearReminders } from '../db/remindersRepository';
import { deleteAllReadings, queryReadings } from '../db/readingsRepository';
import { saveSetting } from '../db/settingsRepository';
import { buildBackupJson, buildCsv } from '../domain/exportData';
import { canShare, shareTextFile } from '../services/exporter';
import { syncReminders } from '../services/notifications';
import { ConfirmDialog, useToast } from '../components/feedback';
import { AppHeader, AppText, Card, PrimaryButton, SecondaryButton , Screen } from '../components/ui';

export default function PrivacyScreen() {
  const { t, colors, reloadSettings } = useApp();
  const router = useRouter();
  const db = useSQLiteContext();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const exportAll = async (kind: 'json' | 'csv') => {
    if (busy) return;
    setBusy(true);
    try {
      if (!(await canShare())) {
        toast.show(t('sharingUnavailable'), 'error');
        return;
      }
      const all = await queryReadings(db, { order: 'asc' });
      const stamp = new Date().toISOString().slice(0, 10);
      if (kind === 'json')
        await shareTextFile(
          `bp-journey-backup-${stamp}.json`,
          buildBackupJson(all, new Date()),
          'application/json',
          t('exportBackup'),
        );
      else await shareTextFile(`bp-journey-${stamp}.csv`, buildCsv(all), 'text/csv', t('exportCsv'));
    } catch {
      toast.show(t('exportFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const wipe = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteAllReadings(db);
      await clearReminders(db);
      await saveSetting(db, 'displayName', '');
      await saveSetting(db, 'remindersPausedUntil', null);
      await syncReminders([], null, {
        channelName: t('reminderChannel'),
        title: t('notifTitle'),
        body: t('notifBody'),
      });
      await reloadSettings();
      setConfirm(false);
      toast.show(t('toast_allDeleted'), 'success');
    } catch {
      toast.show(t('toast_deleteFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen header={<AppHeader title={t('privacyData')} subtitle={t('privacySub')} onBack={back} />}>
      <Card>
        <AppText variant="heading">{t('privacyPromiseTitle')}</AppText>
        <AppText>• {t('privacy1')}</AppText>
        <AppText>• {t('privacy2')}</AppText>
        <AppText>• {t('privacy3')}</AppText>
        <AppText>• {t('privacy4')}</AppText>
        <AppText variant="caption" color={colors.muted}>
          {t('privacyLimits')}
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading">{t('yourData')}</AppText>
        <AppText color={colors.muted}>{t('exportAllBody')}</AppText>
        <SecondaryButton
          label={`⇪ ${t('exportBackup')}`}
          onPress={() => void exportAll('json')}
          disabled={busy}
        />
        <SecondaryButton
          label={`⇪ ${t('exportCsv')}`}
          onPress={() => void exportAll('csv')}
          disabled={busy}
        />
      </Card>

      <Card style={{ borderColor: colors.emergency }}>
        <AppText variant="heading" color={colors.emergency}>
          {t('deleteAllTitle')}
        </AppText>
        <AppText color={colors.muted}>{t('deleteAllBody')}</AppText>
        <PrimaryButton label={t('deleteAllAction')} destructive onPress={() => setConfirm(true)} />
      </Card>

      <ConfirmDialog
        visible={confirm}
        title={t('deleteAllConfirmTitle')}
        message={t('deleteAllConfirmBody')}
        confirmLabel={t('deleteAllAction')}
        cancelLabel={t('cancel')}
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={() => void wipe()}
      />
    </Screen>
  );
}
