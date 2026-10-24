import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useApp } from '../../i18n/I18nContext';
import type { TKey } from '../../i18n/strings';
import { useAsyncData } from '../../hooks/useAsyncData';
import { queryReadings } from '../../db/readingsRepository';
import { keyToUtcDate } from '../../domain/dates';
import type { RangePreset } from '../../domain/dates';
import { formatCalendarDate, formatDeviceDate } from '../../domain/format';
import {
  autoGranularity,
  categoryDistribution,
  fillSlots,
  groupReadings,
  roundTo,
  summarize,
} from '../../domain/stats';
import type { Granularity } from '../../domain/stats';
import { CATEGORY_ORDER, GUIDELINE } from '../../domain/classification';
import { ChoiceChips, DateRangeSelector, defaultRangeValue, resolveRange } from '../../components/inputs';
import type { RangeValue } from '../../components/inputs';
import { SeriesChart, TrendChartCard } from '../../components/charts';
import type { ChartSlot } from '../../components/charts';
import { categoryColors, CATEGORY_KEY } from '../../components/domainViews';
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback';
import { AppHeader, AppText, Card, IconButton, MetricCard, Row, Screen } from '../../components/ui';
import { spacing } from '../../theme/tokens';

const PRESETS: RangePreset[] = ['7d', '30d', '90d', '6m', '1y', 'custom'];
const f = (v: number | null, d = 0) => (v == null ? '–' : String(roundTo(v, d)));

export default function TrendsScreen() {
  const { t, language, colors } = useApp();
  const router = useRouter();
  const db = useSQLiteContext();
  const [range, setRange] = useState<RangeValue>(defaultRangeValue('30d'));
  const [summaryGran, setSummaryGran] = useState<Exclude<Granularity, 'day'>>('week');
  const resolved = useMemo(() => resolveRange(range), [range]);

  // Only the selected date range is loaded, never the whole history.
  const { data, loading, error, reload } = useAsyncData(
    () => queryReadings(db, { from: resolved.from, to: resolved.to, order: 'asc' }),
    [db, resolved.from.getTime(), resolved.to.getTime()],
  );

  const analysis = useMemo(() => {
    if (!data) return null;
    const granularity = autoGranularity(resolved);
    const buckets = groupReadings(data, granularity);
    const slots = fillSlots(buckets, resolved, granularity);
    const label = (key: string, gran: Granularity, long: boolean): string =>
      gran === 'month'
        ? formatCalendarDate(
            keyToUtcDate(`${key}-01`),
            language,
            long ? { month: 'long', year: 'numeric' } : { month: 'short', year: '2-digit' },
          )
        : formatCalendarDate(
            keyToUtcDate(key),
            language,
            long ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' },
          );
    const chartSlots: ChartSlot[] = slots.map((s) => ({
      key: s.key,
      label: label(s.key, granularity, false),
      longLabel:
        granularity === 'week'
          ? t('weekOf', { date: label(s.key, granularity, true) })
          : label(s.key, granularity, true),
    }));
    const sumBuckets = groupReadings(data, summaryGran);
    const sumSlots = sumBuckets.map((b) => ({
      key: b.key,
      label: label(b.key, summaryGran, false),
      longLabel:
        summaryGran === 'week'
          ? t('weekOf', { date: label(b.key, summaryGran, true) })
          : label(b.key, summaryGran, true),
    }));
    return {
      granularity,
      summary: summarize(data),
      slots,
      chartSlots,
      sumBuckets,
      sumSlots,
      distribution: categoryDistribution(data),
    };
  }, [data, resolved, language, summaryGran, t]);

  const header = (
    <AppHeader
      title={t('tab_trends')}
      right={
        <IconButton
          symbol="＋"
          label={t('addReading')}
          onPress={() => router.push('/reading/add' as never)}
        />
      }
    />
  );

  const periodText = `${formatDeviceDate(resolved.from, language)} – ${formatDeviceDate(new Date(resolved.to.getTime() - 1), language)}`;

  let body: React.ReactNode;
  if (loading && !data) body = <LoadingState />;
  else if (error || !analysis || !data) body = <ErrorState message={t('loadFailed')} onRetry={reload} />;
  else if (data.length === 0) {
    body = (
      <EmptyState
        symbol="↗"
        title={t('noTrendData')}
        body={t('noTrendDataBody')}
        actionLabel={t('addReading')}
        onAction={() => router.push('/reading/add' as never)}
      />
    );
  } else {
    const { summary, slots, chartSlots, granularity, sumBuckets, sumSlots, distribution } = analysis;
    const avgKey: TKey =
      granularity === 'day' ? 'avg_day' : granularity === 'week' ? 'avg_week' : 'avg_month';
    const counts = slots.map((s) => s.summary?.count ?? 0);
    const sysValues = slots.map((s) => s.summary?.avgSystolic ?? null);
    const diaValues = slots.map((s) => s.summary?.avgDiastolic ?? null);
    const pulseValues = slots.map((s) => s.summary?.avgPulse ?? null);
    const pulsePoints = pulseValues.filter((v) => v != null).length;
    const maxCat = Math.max(1, ...CATEGORY_ORDER.map((c) => distribution[c]));

    body = (
      <>
        <Card>
          <AppText variant="heading">{t('rangeSummary')}</AppText>
          <AppText variant="caption" color={colors.muted}>
            {t('periodUsed', { period: periodText })}
          </AppText>
          <Row wrap align="stretch">
            <MetricCard label={t('readingsCount')} value={String(summary.count)} />
            <MetricCard
              label={t('avgBp')}
              value={`${f(summary.avgSystolic)}/${f(summary.avgDiastolic)}`}
              unit="mmHg"
            />
          </Row>
          <Row wrap align="stretch">
            <MetricCard
              label={t('minSys')}
              value={f(summary.minSystolic)}
              caption={`${t('max')}: ${f(summary.maxSystolic)}`}
            />
            <MetricCard
              label={t('minDia')}
              value={f(summary.minDiastolic)}
              caption={`${t('max')}: ${f(summary.maxDiastolic)}`}
            />
          </Row>
          <MetricCard
            label={t('avgPulse')}
            value={f(summary.avgPulse)}
            unit={summary.avgPulse == null ? undefined : t('bpm')}
            caption={
              summary.pulseCount > 0 ? t('basedOnPulse', { n: summary.pulseCount }) : t('noPulseRecorded')
            }
          />
        </Card>

        <TrendChartCard title={t('chartBpTitle')} subtitle={t(avgKey)}>
          <SeriesChart
            slots={chartSlots}
            counts={counts}
            unit="mmHg"
            accessibilitySummary={t('chartA11y', { n: summary.count, period: periodText })}
            series={[
              {
                id: 'sys',
                label: t('systolicLabel'),
                color: colors.chartSystolic,
                shape: 'circle',
                values: sysValues,
              },
              {
                id: 'dia',
                label: t('diastolicLabel'),
                color: colors.chartDiastolic,
                shape: 'square',
                values: diaValues,
              },
            ]}
          />
          <AppText variant="caption" color={colors.muted}>
            {t('gapNote')}
          </AppText>
        </TrendChartCard>

        <TrendChartCard title={t('chartPulseTitle')} subtitle={t(avgKey)}>
          {pulsePoints >= 2 ? (
            <SeriesChart
              slots={chartSlots}
              counts={counts}
              unit={t('bpm')}
              accessibilitySummary={t('chartA11y', { n: summary.pulseCount, period: periodText })}
              series={[
                {
                  id: 'pulse',
                  label: t('pulse'),
                  color: colors.chartPulse,
                  shape: 'triangle',
                  values: pulseValues,
                },
              ]}
            />
          ) : (
            <AppText color={colors.muted}>{t('notEnoughPulse')}</AppText>
          )}
        </TrendChartCard>

        <TrendChartCard title={t('chartSummaryTitle')} subtitle={t('chartSummarySub')}>
          <ChoiceChips
            value={summaryGran}
            onChange={setSummaryGran}
            options={[
              { value: 'week', label: t('weekly') },
              { value: 'month', label: t('monthly') },
            ]}
          />
          <SeriesChart
            kind="bar"
            slots={sumSlots}
            counts={sumBuckets.map((b) => b.summary.count)}
            unit="mmHg"
            accessibilitySummary={t('chartA11y', { n: summary.count, period: periodText })}
            series={[
              {
                id: 'sys',
                label: t('systolicLabel'),
                color: colors.chartSystolic,
                shape: 'circle',
                values: sumBuckets.map((b) => b.summary.avgSystolic),
              },
              {
                id: 'dia',
                label: t('diastolicLabel'),
                color: colors.chartDiastolic,
                shape: 'square',
                values: sumBuckets.map((b) => b.summary.avgDiastolic),
              },
            ]}
          />
          <View style={{ gap: spacing.sm }}>
            {[...sumBuckets].reverse().map((b, idx) => {
              const slot = [...sumSlots].reverse()[idx];
              return (
                <View key={b.key} accessible style={{ gap: 2, paddingVertical: spacing.xs }}>
                  <AppText variant="label">{slot?.longLabel}</AppText>
                  <AppText variant="caption" color={colors.muted}>
                    {t('summaryRow', {
                      sys: f(b.summary.avgSystolic),
                      dia: f(b.summary.avgDiastolic),
                      pulse: f(b.summary.avgPulse),
                      n: b.summary.count,
                      sysMin: f(b.summary.minSystolic),
                      sysMax: f(b.summary.maxSystolic),
                    })}
                  </AppText>
                </View>
              );
            })}
          </View>
        </TrendChartCard>

        <Card>
          <AppText variant="heading" accessibilityRole="header">
            {t('distributionTitle')}
          </AppText>
          <AppText variant="caption" color={colors.muted}>
            {t('distributionSub', { guideline: GUIDELINE.name })}
          </AppText>
          {CATEGORY_ORDER.map((c) => {
            const { fg, bg } = categoryColors(c, colors);
            const n = distribution[c];
            return (
              <View key={c} accessible accessibilityLabel={`${t(CATEGORY_KEY[c])}: ${n}`} style={{ gap: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <AppText variant="label">{t(CATEGORY_KEY[c])}</AppText>
                  <AppText variant="label">{n}</AppText>
                </Row>
                <View
                  style={{
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: colors.inputBackground,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${(n / maxCat) * 100}%`,
                      height: 12,
                      backgroundColor: n > 0 ? fg : bg,
                      borderRadius: 6,
                    }}
                  />
                </View>
              </View>
            );
          })}
          <AppText variant="caption" color={colors.muted}>
            {t('trendDisclaimer')}
          </AppText>
        </Card>
      </>
    );
  }

  return (
    <Screen header={header}>
      <Card>
        <DateRangeSelector value={range} onChange={setRange} presets={PRESETS} />
      </Card>
      {body}
    </Screen>
  );
}
