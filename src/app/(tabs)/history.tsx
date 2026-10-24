import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useApp } from '../../i18n/I18nContext';
import type { TKey } from '../../i18n/strings';
import { useDataVersion } from '../../db/dataEvents';
import { countReadings, queryReadings } from '../../db/readingsRepository';
import type { ReadingFilters } from '../../db/readingsQuery';
import type { RangePreset } from '../../domain/dates';
import { CONTEXTS } from '../../domain/types';
import type { Arm, BloodPressureReading, MeasurementContext } from '../../domain/types';
import { BottomSheet, ErrorState, LoadingState, EmptyState } from '../../components/feedback';
import {
  ChoiceChips,
  DateRangeSelector,
  defaultRangeValue,
  FilterChips,
  resolveRange,
} from '../../components/inputs';
import type { RangeValue } from '../../components/inputs';
import { ReadingListItem } from '../../components/domainViews';
import { AppHeader, AppText, IconButton, Row, Screen, SecondaryButton } from '../../components/ui';
import { spacing } from '../../theme/tokens';

const PAGE = 30;
const PRESETS: RangePreset[] = ['all', 'today', '7d', '30d', '90d', 'custom'];
type ArmFilter = Arm | 'any';
type PulseFilter = 'any' | 'with' | 'without';

export default function HistoryScreen() {
  const { t, colors } = useApp();
  const router = useRouter();
  const db = useSQLiteContext();
  const version = useDataVersion();

  const [range, setRange] = useState<RangeValue>(defaultRangeValue('all'));
  const [contexts, setContexts] = useState<MeasurementContext[]>([]);
  const [arm, setArm] = useState<ArmFilter>('any');
  const [pulse, setPulse] = useState<PulseFilter>('any');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [sheet, setSheet] = useState(false);

  const [items, setItems] = useState<BloodPressureReading[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const loadingMore = useRef(false);
  const requestId = useRef(0);

  const buildFilters = useCallback((): ReadingFilters => {
    const filters: ReadingFilters = { order };
    if (range.preset !== 'all') {
      const r = resolveRange(range);
      filters.from = r.from;
      filters.to = r.to;
    }
    if (contexts.length > 0) filters.contexts = contexts;
    if (arm !== 'any') filters.arm = arm;
    if (pulse !== 'any') filters.pulse = pulse;
    return filters;
  }, [range, contexts, arm, pulse, order]);

  const loadFirst = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setFailed(false);
    try {
      const filters = buildFilters();
      const [rows, count] = await Promise.all([
        queryReadings(db, { ...filters, limit: PAGE }),
        countReadings(db, filters),
      ]);
      if (id !== requestId.current) return;
      setItems(rows);
      setTotal(count);
    } catch {
      if (id === requestId.current) setFailed(true);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [db, buildFilters]);

  // Reload whenever filters change or stored data changes (add/edit/delete elsewhere).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading state is part of fetching
    void loadFirst();
  }, [loadFirst, version]);

  const loadMore = async () => {
    if (loadingMore.current || loading || items.length >= total) return;
    loadingMore.current = true;
    const id = requestId.current;
    try {
      const rows = await queryReadings(db, { ...buildFilters(), limit: PAGE, offset: items.length });
      if (id === requestId.current) setItems((old) => [...old, ...rows]);
    } finally {
      loadingMore.current = false;
    }
  };

  const filtersActive = range.preset !== 'all' || contexts.length > 0 || arm !== 'any' || pulse !== 'any';
  const reset = () => {
    setRange(defaultRangeValue('all'));
    setContexts([]);
    setArm('any');
    setPulse('any');
  };

  const header = (
    <AppHeader
      title={t('tab_history')}
      subtitle={t('nReadings', { n: total })}
      right={
        <IconButton
          symbol="＋"
          label={t('addReading')}
          onPress={() => router.push('/reading/add' as never)}
        />
      }
    />
  );

  const controls = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
      <Row gap={spacing.sm} wrap>
        <SecondaryButton
          label={`${t('filters')}${filtersActive ? ' •' : ''}`}
          symbol="⛃"
          onPress={() => setSheet(true)}
          style={{ flex: 1 }}
        />
        <SecondaryButton
          label={order === 'desc' ? t('newestFirst') : t('oldestFirst')}
          symbol={order === 'desc' ? '↓' : '↑'}
          onPress={() => setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
          accessibilityHint={t('sortHint')}
          style={{ flex: 1 }}
        />
      </Row>
      {filtersActive ? <SecondaryButton label={t('resetFilters')} onPress={reset} /> : null}
    </View>
  );

  return (
    <Screen header={header} scroll={false}>
      {failed ? (
        <ErrorState message={t('loadFailed')} onRetry={() => void loadFirst()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(r) => r.id}
          ListHeaderComponent={controls}
          renderItem={({ item }) => (
            <View style={{ marginBottom: spacing.sm }}>
              <ReadingListItem reading={item} onPress={() => router.push(`/reading/${item.id}` as never)} />
            </View>
          )}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            loading ? (
              <LoadingState />
            ) : filtersActive ? (
              <EmptyState
                symbol="⌕"
                title={t('noMatches')}
                body={t('noMatchesBody')}
                actionLabel={t('resetFilters')}
                onAction={reset}
              />
            ) : (
              <EmptyState
                title={t('noReadingsYet')}
                body={t('noReadingsBody')}
                actionLabel={t('addReading')}
                onAction={() => router.push('/reading/add' as never)}
              />
            )
          }
          ListFooterComponent={
            items.length > 0 && items.length < total ? (
              <LoadingState />
            ) : (
              <View style={{ height: spacing.xl }} />
            )
          }
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        />
      )}

      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title={t('filters')}>
        <DateRangeSelector value={range} onChange={setRange} presets={PRESETS} />
        <FilterChips
          label={t('timeOfDay')}
          selected={contexts}
          onToggle={(c) => setContexts((old) => (old.includes(c) ? old.filter((x) => x !== c) : [...old, c]))}
          options={CONTEXTS.map((c) => ({ value: c, label: t(`ctx_${c}` as TKey) }))}
        />
        <ChoiceChips<ArmFilter>
          label={t('arm')}
          value={arm}
          onChange={setArm}
          options={[
            { value: 'any', label: t('any') },
            { value: 'left', label: t('arm_left') },
            { value: 'right', label: t('arm_right') },
            { value: 'unknown', label: t('arm_unknown') },
          ]}
        />
        <ChoiceChips<PulseFilter>
          label={t('pulseData')}
          value={pulse}
          onChange={setPulse}
          options={[
            { value: 'any', label: t('any') },
            { value: 'with', label: t('withPulse') },
            { value: 'without', label: t('withoutPulse') },
          ]}
        />
        <SecondaryButton label={t('resetFilters')} onPress={reset} />
        <AppText variant="caption" color={colors.muted}>
          {t('nReadings', { n: total })}
        </AppText>
      </BottomSheet>
    </Screen>
  );
}
