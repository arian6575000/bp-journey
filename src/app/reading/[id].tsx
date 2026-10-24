import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useApp } from '../../i18n/I18nContext';
import type { TKey } from '../../i18n/strings';
import { useAsyncData } from '../../hooks/useAsyncData';
import { deleteReading, getReading } from '../../db/readingsRepository';
import { classify, GUIDELINE } from '../../domain/classification';
import {
  formatDeviceDate,
  formatDeviceTime,
  formatMeasuredDate,
  formatMeasuredTime,
} from '../../domain/format';
import { ConfirmDialog, EmptyState, ErrorState, LoadingState, useToast } from '../../components/feedback';
import { SafetyNotice, StatusBadge } from '../../components/domainViews';
import {
  AppHeader,
  AppText,
  Card,
  Divider,
  PrimaryButton,
  Row,
  Screen,
  SecondaryButton,
} from '../../components/ui';
import { spacing } from '../../theme/tokens';

function Field({ label, value }: { label: string; value: string }) {
  const { colors } = useApp();
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <AppText variant="label" color={colors.muted} style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText style={{ flex: 2, fontWeight: '600' }}>{value}</AppText>
    </Row>
  );
}

export default function ReadingDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, colors, language } = useApp();
  const db = useSQLiteContext();
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { data, loading, error, reload } = useAsyncData(() => getReading(db, String(id)), [db, id]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const header = <AppHeader title={t('readingDetails')} onBack={back} />;

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
  if (!data)
    return (
      <Screen header={header}>
        <EmptyState title={t('readingNotFound')} actionLabel={t('back')} onAction={back} />
      </Screen>
    );

  const category = classify(data.systolic, data.diastolic);
  const doDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteReading(db, data.id);
      setConfirm(false);
      toast.show(t('toast_deleted'), 'success');
      back();
    } catch {
      toast.show(t('toast_deleteFailed'), 'error');
      setDeleting(false);
    }
  };

  return (
    <Screen header={header}>
      <Card>
        <Row gap={spacing.sm} align="flex-end" style={{ justifyContent: 'center' }}>
          <AppText variant="number" style={{ fontSize: 56, lineHeight: 62 }}>
            {data.systolic}
          </AppText>
          <AppText variant="number" color={colors.muted} style={{ fontSize: 40 }}>
            /
          </AppText>
          <AppText variant="number" style={{ fontSize: 56, lineHeight: 62 }}>
            {data.diastolic}
          </AppText>
          <AppText variant="label" color={colors.muted} style={{ marginBottom: 10 }}>
            mmHg
          </AppText>
        </Row>
        <StatusBadge category={category} />
        <AppText variant="caption" color={colors.muted}>
          {t('categoryNote', { guideline: GUIDELINE.name })}
        </AppText>
      </Card>

      <SafetyNotice systolic={data.systolic} diastolic={data.diastolic} />

      <Card>
        <Field
          label={t('pulse')}
          value={data.pulseBpm != null ? `${data.pulseBpm} ${t('bpm')}` : t('notRecorded')}
        />
        <Divider />
        <Field label={t('dateLabel')} value={formatMeasuredDate(data, language)} />
        <Field label={t('timeLabel')} value={formatMeasuredTime(data, language)} />
        <Divider />
        <Field label={t('arm')} value={t(`arm_${data.arm}` as TKey)} />
        <Field label={t('position')} value={t(`pos_${data.position}` as TKey)} />
        <Field label={t('context')} value={t(`ctx_${data.context}` as TKey)} />
        <Divider />
        <View style={{ gap: spacing.xs }}>
          <AppText variant="label" color={colors.muted}>
            {t('notes')}
          </AppText>
          <AppText>{data.notes ?? t('noNotes')}</AppText>
        </View>
        <Divider />
        <Field
          label={t('source')}
          value={t(data.source === 'manual' ? 'source_manual' : 'source_imported')}
        />
        <Field
          label={t('created')}
          value={`${formatDeviceDate(new Date(data.createdAtUtc), language)} ${formatDeviceTime(new Date(data.createdAtUtc), language)}`}
        />
        {data.updatedAtUtc !== data.createdAtUtc ? (
          <Field
            label={t('updated')}
            value={`${formatDeviceDate(new Date(data.updatedAtUtc), language)} ${formatDeviceTime(new Date(data.updatedAtUtc), language)}`}
          />
        ) : null}
      </Card>

      <PrimaryButton
        label={t('edit')}
        symbol="✎"
        onPress={() => router.push(`/reading/edit/${data.id}` as never)}
      />
      <SecondaryButton label={t('delete')} symbol="🗑" destructive onPress={() => setConfirm(true)} />

      <ConfirmDialog
        visible={confirm}
        title={t('deleteTitle')}
        message={t('deleteBody', {
          bp: `${data.systolic}/${data.diastolic}`,
          date: formatMeasuredDate(data, language),
        })}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={() => void doDelete()}
      />
    </Screen>
  );
}
