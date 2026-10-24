import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useApp } from '../../i18n/I18nContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { countReadings, getLatestReading, queryReadings } from '../../db/readingsRepository';
import { daysInRange, previousRange, rangeForPreset } from '../../domain/dates';
import type { RangePreset } from '../../domain/dates';
import { formatDeviceDate, formatMeasuredDate } from '../../domain/format';
import { compareSummaries, measurementFrequency, roundTo, summarize } from '../../domain/stats';
import type { Summary } from '../../domain/stats';
import { isVeryHigh } from '../../domain/classification';
import { ChoiceChips } from '../../components/inputs';
import { ErrorState, LoadingState } from '../../components/feedback';
import { ReadingListItem, ReadingValueCard, SafetyNotice } from '../../components/domainViews';
import {
  AppHeader,
  AppText,
  Card,
  IconButton,
  MetricCard,
  PrimaryButton,
  Row,
  Screen,
  SecondaryButton,
  SectionHeader,
} from '../../components/ui';
import { spacing } from '../../theme/tokens';

const PERIODS: RangePreset[] = ['7d', '30d', '90d'];

function fmt(v: number | null, decimals = 0): string {
  return v == null ? '–' : String(roundTo(v, decimals));
}

export default function HomeScreen() {
  const { t, language, colors, settings } = useApp();
  const router = useRouter();
  const db = useSQLiteContext();
  const [period, setPeriod] = useState<RangePreset>('30d');

  const { data, loading, error, reload } = useAsyncData(async () => {
    const now = new Date();
    const range = rangeForPreset(period, now);
    const prev = previousRange(range);
    const [total, latest, recent, current, previous] = await Promise.all([
      countReadings(db),
      getLatestReading(db),
      queryReadings(db, { order: 'desc', limit: 5 }),
      queryReadings(db, { from: range.from, to: range.to }),
      queryReadings(db, { from: prev.from, to: prev.to }),
    ]);
    return {
      total,
      latest,
      recent,
      range,
      current: summarize(current),
      previous: summarize(previous),
      frequency: measurementFrequency(current, range),
    };
  }, [db, period]);

  const go = (path: string) => router.push(path as never);
  const today = formatDeviceDate(new Date(), language);
  const name = settings.displayName.trim();

  const header = (
    <AppHeader
      title={name ? t('greetingName', { name }) : 'BP Journey'}
      subtitle={today}
      right={<IconButton symbol="☺" label={t('profile')} onPress={() => go('/profile')} />}
    />
  );

  if (loading && !data)
    return (
      <Screen header={header}>
        <LoadingState />
      </Screen>
    );
  if (error || !data)
    return (
      <Screen header={header}>
        <ErrorState message={t('loadFailed')} onRetry={reload} />
      </Screen>
    );

  if (data.total === 0) {
    return (
      <Screen header={header}>
        <Card>
          <AppText variant="heading">{t('welcomeTitle')}</AppText>
          <AppText>{t('welcomeBody')}</AppText>
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label">{t('systolicLabel')}</AppText>
            <AppText color={colors.muted}>{t('systolicHint')}</AppText>
            <AppText variant="label">{t('diastolicLabel')}</AppText>
            <AppText color={colors.muted}>{t('diastolicHint')}</AppText>
          </View>
          <PrimaryButton label={`＋ ${t('addReading')}`} onPress={() => go('/reading/add')} />
          <SecondaryButton label={t('measurementGuide')} onPress={() => go('/guide')} />
        </Card>
        <AppText variant="caption" color={colors.muted}>
          {t('disclaimerShort')}
        </AppText>
      </Screen>
    );
  }

  const { current, previous, frequency, latest } = data;
  const cmp = compareSummaries(current, previous);
  const delta = (v: number | null): string => (v == null ? '' : `${v > 0 ? '+' : ''}${roundTo(v, 1)}`);
  const periodText = `${formatDeviceDate(data.range.from, language)} – ${formatDeviceDate(new Date(data.range.to.getTime() - 1), language)}`;

  const stat = (summary: Summary) => summary;
  void stat;

  return (
    <Screen header={header}>
      {latest ? (
        <>
          <ReadingValueCard reading={latest} onPress={() => go(`/reading/${latest.id}`)} />
          {isVeryHigh(latest.systolic, latest.diastolic) ? (
            <SafetyNotice systolic={latest.systolic} diastolic={latest.diastolic} compact />
          ) : null}
        </>
      ) : null}

      <PrimaryButton label={`＋ ${t('addReading')}`} onPress={() => go('/reading/add')} />

      <View style={{ gap: spacing.sm }}>
        <SectionHeader title={t('quickActions')} />
        <Row wrap gap={spacing.sm}>
          <SecondaryButton
            label={t('viewHistory')}
            symbol="☰"
            onPress={() => go('/history')}
            style={{ flexGrow: 1 }}
          />
          <SecondaryButton
            label={t('viewTrends')}
            symbol="↗"
            onPress={() => go('/trends')}
            style={{ flexGrow: 1 }}
          />
          <SecondaryButton
            label={t('measurementGuide')}
            symbol="ⓘ"
            onPress={() => go('/guide')}
            style={{ flexGrow: 1 }}
          />
          <SecondaryButton
            label={t('exportReport')}
            symbol="⇪"
            onPress={() => go('/reports')}
            style={{ flexGrow: 1 }}
          />
        </Row>
      </View>

      <Card>
        <SectionHeader title={t('summary')} />
        <ChoiceChips
          value={period}
          onChange={setPeriod}
          options={PERIODS.map((p) => ({ value: p, label: t(`range_${p}` as 'range_7d') }))}
        />
        <AppText variant="caption" color={colors.muted}>
          {t('periodUsed', { period: periodText })}
        </AppText>
        {current.count === 0 ? (
          <AppText color={colors.muted}>{t('noReadingsInPeriod')}</AppText>
        ) : (
          <>
            <Row wrap align="stretch">
              <MetricCard label={t('readingsCount')} value={String(current.count)} />
              <MetricCard
                label={t('avgBp')}
                value={`${fmt(current.avgSystolic)}/${fmt(current.avgDiastolic)}`}
                unit="mmHg"
              />
            </Row>
            <Row wrap align="stretch">
              <MetricCard
                label={t('avgPulse')}
                value={fmt(current.avgPulse)}
                unit={current.avgPulse == null ? undefined : t('bpm')}
                caption={
                  current.pulseCount > 0 ? t('basedOnPulse', { n: current.pulseCount }) : t('noPulseRecorded')
                }
              />
              <MetricCard
                label={t('frequency')}
                value={fmt(frequency.readingsPerWeek, 1)}
                unit={t('perWeek')}
                caption={t('daysWithReadings', {
                  n: frequency.daysWithReadings,
                  total: daysInRange(data.range),
                })}
              />
            </Row>
            <View style={{ gap: 2 }}>
              <AppText variant="label">{t('changeVsPrevious')}</AppText>
              {cmp.sufficient && cmp.systolicDelta != null && cmp.diastolicDelta != null ? (
                <AppText>
                  {t('changeText', { sys: delta(cmp.systolicDelta), dia: delta(cmp.diastolicDelta) })}
                </AppText>
              ) : (
                <AppText color={colors.muted}>{t('notEnoughToCompare')}</AppText>
              )}
              <AppText variant="caption" color={colors.muted}>
                {t('changeNote')}
              </AppText>
            </View>
            {latest ? (
              <AppText variant="caption" color={colors.muted}>
                {t('latestMeasurement', { date: formatMeasuredDate(latest, language) })}
              </AppText>
            ) : null}
          </>
        )}
      </Card>

      <View style={{ gap: spacing.sm }}>
        <SectionHeader
          title={t('recentActivity')}
          actionLabel={t('viewAll')}
          onAction={() => go('/history')}
        />
        {data.recent.map((r) => (
          <ReadingListItem key={r.id} reading={r} onPress={() => go(`/reading/${r.id}`)} />
        ))}
      </View>

      <AppText variant="caption" color={colors.muted}>
        {t('disclaimerShort')}
      </AppText>
    </Screen>
  );
}
