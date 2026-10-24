import React, { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useApp } from '../i18n/I18nContext';
import type { TKey } from '../i18n/strings';
import { useAsyncData } from '../hooks/useAsyncData';
import { listReminders, removeReminder, upsertReminder } from '../db/remindersRepository';
import { defaultReminder, MAX_REMINDERS, toggleDay, hasDay } from '../domain/reminders';
import type { Reminder, ReminderKind } from '../domain/reminders';
import { createId } from '../domain/id';
import { formatDeviceDate } from '../domain/format';
import {
  getPermissionState,
  requestPermission,
  sendTestReminder,
  syncReminders,
} from '../services/notifications';
import type { PermissionState } from '../services/notifications';
import { BottomSheet, EmptyState, ErrorState, LoadingState, useToast } from '../components/feedback';
import { DateTimeField, FilterChips } from '../components/inputs';
import { ReminderCard } from '../components/domainViews';
import { AppHeader, AppText, Card, PrimaryButton, Row, Screen, SecondaryButton } from '../components/ui';
import { spacing } from '../theme/tokens';

const DAY_KEYS: TKey[] = ['day_sun', 'day_mon', 'day_tue', 'day_wed', 'day_thu', 'day_fri', 'day_sat'];

export default function RemindersScreen() {
  const { t, colors, language, settings, updateSetting } = useApp();
  const router = useRouter();
  const db = useSQLiteContext();
  const toast = useToast();
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [draft, setDraft] = useState<Reminder | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useAsyncData(() => listReminders(db), [db]);
  const reminders = data ?? [];

  const [openedAt] = useState(() => Date.now());
  const pausedUntil = settings.remindersPausedUntil ? new Date(settings.remindersPausedUntil) : null;
  const paused = pausedUntil != null && pausedUntil.getTime() > openedAt;

  const text = useCallback(
    () => ({ channelName: t('reminderChannel'), title: t('notifTitle'), body: t('notifBody') }),
    [t],
  );

  useEffect(() => {
    void getPermissionState()
      .then(setPermission)
      .catch(() => undefined);
  }, []);

  /** Persist a change, then make the registered notifications match exactly. */
  const apply = async (change: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await change();
      const list = await listReminders(db);
      await syncReminders(list, pausedUntil, text());
      reload();
    } catch {
      toast.show(t('reminderSaveFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const ensurePermission = async (): Promise<boolean> => {
    const current = await getPermissionState();
    if (current === 'granted') {
      setPermission('granted');
      return true;
    }
    const result = await requestPermission(t('reminderChannel'));
    setPermission(result);
    return result === 'granted';
  };

  const add = async (kind: ReminderKind) => {
    if (reminders.length >= MAX_REMINDERS) {
      toast.show(t('reminderLimit', { n: MAX_REMINDERS }), 'info');
      return;
    }
    await ensurePermission(); // asked in context, right when the first reminder is created
    await apply(() => upsertReminder(db, defaultReminder(kind, createId())));
  };

  const toggle = async (r: Reminder, enabled: boolean) => {
    if (enabled) await ensurePermission();
    await apply(() => upsertReminder(db, { ...r, enabled }));
  };

  const pause = async (days: number) => {
    const until = new Date(new Date().getTime() + days * 86_400_000);
    await updateSetting('remindersPausedUntil', until.toISOString());
    await syncReminders(reminders, until, text());
  };

  const resume = async () => {
    await updateSetting('remindersPausedUntil', null);
    await syncReminders(reminders, null, text());
  };

  const sendTest = async () => {
    const ok = await ensurePermission();
    if (!ok) {
      toast.show(t('permissionDeniedToast'), 'error');
      return;
    }
    await sendTestReminder(text());
    toast.show(t('testSent'), 'success');
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const header = <AppHeader title={t('reminders')} subtitle={t('remindersSub')} onBack={back} />;

  if (loading && !data)
    return (
      <Screen header={header}>
        <LoadingState />
      </Screen>
    );
  if (error)
    return (
      <Screen header={header}>
        <ErrorState message={t('loadFailed')} onRetry={reload} />
      </Screen>
    );

  return (
    <Screen header={header}>
      <Card>
        <AppText variant="heading">{t('notifStatus')}</AppText>
        <AppText>
          {permission === 'granted' ? '✓ ' : permission === 'denied' ? '⚠ ' : 'ℹ '}
          {t(
            permission === 'granted'
              ? 'perm_granted'
              : permission === 'denied'
                ? 'perm_denied'
                : 'perm_undetermined',
          )}
        </AppText>
        {permission === 'denied' ? (
          <SecondaryButton label={t('openSystemSettings')} onPress={() => void Linking.openSettings()} />
        ) : null}
        {permission === 'undetermined' ? (
          <SecondaryButton label={t('allowNotifications')} onPress={() => void ensurePermission()} />
        ) : null}
        <AppText variant="caption" color={colors.muted}>
          {t('reminderPrivacy')}
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading">{t('pauseTitle')}</AppText>
        {paused && pausedUntil ? (
          <>
            <AppText>{t('pausedUntil', { date: formatDeviceDate(pausedUntil, language) })}</AppText>
            <AppText variant="caption" color={colors.muted}>
              {t('pauseNote')}
            </AppText>
            <PrimaryButton label={t('resumeNow')} onPress={() => void resume()} />
          </>
        ) : (
          <>
            <AppText color={colors.muted}>{t('pauseBody')}</AppText>
            <Row wrap gap={spacing.sm}>
              {[1, 3, 7].map((d) => (
                <SecondaryButton
                  key={d}
                  label={t('pauseDays', { n: d })}
                  onPress={() => void pause(d)}
                  style={{ flexGrow: 1 }}
                />
              ))}
            </Row>
          </>
        )}
      </Card>

      {reminders.length === 0 ? (
        <EmptyState symbol="⏰" title={t('noRemindersTitle')} body={t('noRemindersBody')} />
      ) : (
        reminders.map((r) => (
          <ReminderCard
            key={r.id}
            reminder={r}
            onToggle={(v) => void toggle(r, v)}
            onEdit={() => setDraft(r)}
          />
        ))
      )}

      <Card>
        <AppText variant="heading">{t('addReminder')}</AppText>
        <Row wrap gap={spacing.sm}>
          <SecondaryButton
            label={`☀ ${t('reminder_morning')}`}
            onPress={() => void add('morning')}
            disabled={busy}
            style={{ flexGrow: 1 }}
          />
          <SecondaryButton
            label={`☾ ${t('reminder_evening')}`}
            onPress={() => void add('evening')}
            disabled={busy}
            style={{ flexGrow: 1 }}
          />
          <SecondaryButton
            label={`⏱ ${t('reminder_custom')}`}
            onPress={() => void add('custom')}
            disabled={busy}
            style={{ flexGrow: 1 }}
          />
        </Row>
        <SecondaryButton
          label={t('sendTest')}
          onPress={() => void sendTest()}
          accessibilityHint={t('sendTestHint')}
        />
      </Card>

      <BottomSheet visible={draft != null} onClose={() => setDraft(null)} title={t('editReminder')}>
        {draft ? (
          <>
            <DateTimeField
              label={t('timeLabel')}
              mode="time"
              value={new Date(2000, 0, 1, draft.hour, draft.minute)}
              onChange={(d) => setDraft({ ...draft, hour: d.getHours(), minute: d.getMinutes() })}
            />
            <FilterChips<string>
              label={t('days')}
              selected={DAY_KEYS.map((_, i) => (hasDay(draft.daysMask, i) ? String(i) : '')).filter(Boolean)}
              onToggle={(v) => setDraft({ ...draft, daysMask: toggleDay(draft.daysMask, Number(v)) })}
              options={DAY_KEYS.map((k, i) => ({ value: String(i), label: t(k) }))}
            />
            <View style={{ gap: spacing.sm }}>
              <PrimaryButton
                label={t('save')}
                disabled={draft.daysMask === 0}
                onPress={() => {
                  const next = draft;
                  setDraft(null);
                  void apply(() => upsertReminder(db, next));
                }}
              />
              {draft.daysMask === 0 ? (
                <AppText variant="caption" color={colors.emergency}>
                  ⚠ {t('noDaysSelected')}
                </AppText>
              ) : null}
              <SecondaryButton
                label={t('delete')}
                destructive
                onPress={() => {
                  const id = draft.id;
                  setDraft(null);
                  void apply(() => removeReminder(db, id));
                }}
              />
            </View>
          </>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}
