import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useApp } from '../i18n/I18nContext';
import type { TKey } from '../i18n/strings';
import { useAsyncData } from '../hooks/useAsyncData';
import { queryReadings } from '../db/readingsRepository';
import type { RangePreset } from '../domain/dates';
import { buildCsv, buildReportHtml, REPORT_MAX_ROWS } from '../domain/exportData';
import type { ReportLabels } from '../domain/exportData';
import { formatDeviceDate, formatDeviceTime, formatMeasuredDate, formatMeasuredTime } from '../domain/format';
import { roundTo, summarize } from '../domain/stats';
import { canShare, sharePdf, shareTextFile } from '../services/exporter';
import { DateRangeSelector, defaultRangeValue, resolveRange } from '../components/inputs';
import type { RangeValue } from '../components/inputs';
import { ErrorState, LoadingState, useToast } from '../components/feedback';
import {
  AppHeader,
  AppText,
  Card,
  MetricCard,
  PrimaryButton,
  Row,
  Screen,
  SecondaryButton,
} from '../components/ui';

const PRESETS: RangePreset[] = ['7d', '30d', '90d', '6m', '1y', 'all', 'custom'];
const f = (v: number | null) => (v == null ? '–' : String(roundTo(v, 0)));

export default function ReportsScreen() {
  const { t, colors, language, rtl } = useApp();
  const router = useRouter();
  const db = useSQLiteContext();
  const toast = useToast();
  const [range, setRange] = useState<RangeValue>(defaultRangeValue('30d'));
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null);
  const resolved = useMemo(() => resolveRange(range), [range]);

  const { data, loading, error, reload } = useAsyncData(
    () => queryReadings(db, { from: resolved.from, to: resolved.to, order: 'asc' }),
    [db, resolved.from.getTime(), resolved.to.getTime()],
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const header = <AppHeader title={t('reportsExport')} subtitle={t('reportsSub')} onBack={back} />;

  const periodText =
    range.preset === 'all'
      ? t('range_all')
      : `${formatDeviceDate(resolved.from, language)} – ${formatDeviceDate(new Date(resolved.to.getTime() - 1), language)}`;
  const stamp = new Date().toISOString().slice(0, 10);

  const run = async (kind: 'pdf' | 'csv') => {
    if (!data || data.length === 0 || busy) return;
    setBusy(kind);
    try {
      if (!(await canShare())) {
        toast.show(t('sharingUnavailable'), 'error');
        return;
      }
      if (kind === 'csv') {
        await shareTextFile(`bp-journey-${stamp}.csv`, buildCsv(data), 'text/csv', t('exportCsv'));
      } else {
        const labelKeys = [
          'title',
          'period',
          'generated',
          'summary',
          'readingsCount',
          'avgSystolic',
          'avgDiastolic',
          'avgPulse',
          'range',
          'date',
          'time',
          'systolic',
          'diastolic',
          'pulse',
          'context',
          'arm',
          'notes',
          'disclaimer',
          'none',
          'truncated',
        ] as const;
        const labels = Object.fromEntries(
          labelKeys.map((k) => [k, t(`rep_${k}` as TKey)]),
        ) as unknown as ReportLabels;
        // Newest first, capped so very long histories still produce a usable document.
        const rows = [...data]
          .reverse()
          .slice(0, REPORT_MAX_ROWS)
          .map((r) => ({
            date: formatMeasuredDate(r, language),
            time: formatMeasuredTime(r, language),
            systolic: r.systolic,
            diastolic: r.diastolic,
            pulse: r.pulseBpm,
            context: t(`ctx_${r.context}` as TKey),
            arm: t(`arm_${r.arm}` as TKey),
            notes: r.notes,
          }));
        const html = buildReportHtml({
          labels,
          rtl,
          periodText,
          generatedText: `${formatDeviceDate(new Date(), language)} ${formatDeviceTime(new Date(), language)}`,
          summary: summarize(data),
          rows,
          totalRows: data.length,
        });
        await sharePdf(html, t('exportPdf'));
      }
    } catch {
      toast.show(t('exportFailed'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const summary = data ? summarize(data) : null;
  return (
    <Screen header={header}>
      <Card>
        <DateRangeSelector value={range} onChange={setRange} presets={PRESETS} />
      </Card>
      {loading && !data ? <LoadingState /> : null}
      {error ? <ErrorState message={t('loadFailed')} onRetry={reload} /> : null}
      {summary ? (
        <Card>
          <AppText variant="heading">{t('reportPreview')}</AppText>
          <AppText variant="caption" color={colors.muted}>
            {t('periodUsed', { period: periodText })}
          </AppText>
          {summary.count === 0 ? (
            <AppText color={colors.muted}>{t('noReadingsInPeriod')}</AppText>
          ) : (
            <Row wrap align="stretch">
              <MetricCard label={t('readingsCount')} value={String(summary.count)} />
              <MetricCard
                label={t('avgBp')}
                value={`${f(summary.avgSystolic)}/${f(summary.avgDiastolic)}`}
                unit="mmHg"
              />
              <MetricCard
                label={t('avgPulse')}
                value={f(summary.avgPulse)}
                unit={summary.avgPulse == null ? undefined : t('bpm')}
              />
            </Row>
          )}
        </Card>
      ) : null}
      <PrimaryButton
        label={`⇪ ${t('exportPdf')}`}
        loading={busy === 'pdf'}
        disabled={!data || data.length === 0 || busy != null}
        onPress={() => void run('pdf')}
      />
      <SecondaryButton
        label={`⇪ ${t('exportCsv')}`}
        disabled={!data || data.length === 0 || busy != null}
        onPress={() => void run('csv')}
      />
      <AppText variant="caption" color={colors.muted}>
        {t('reportNote')}
      </AppText>
    </Screen>
  );
}
