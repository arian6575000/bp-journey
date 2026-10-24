import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { useApp } from '../i18n/I18nContext';
import { chart as chartTokens, spacing } from '../theme/tokens';
import { AppText, Card, Row, SecondaryButton } from './ui';

export type MarkerShape = 'circle' | 'square' | 'triangle';

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  shape: MarkerShape;
  values: (number | null)[];
}

export interface ChartSlot {
  key: string;
  /** Short axis label. */
  label: string;
  /** Long label for the selected-point details. */
  longLabel: string;
}

interface Props {
  slots: ChartSlot[];
  series: ChartSeries[];
  unit: string;
  kind?: 'line' | 'bar';
  /** Number of readings behind each slot, shown in the details. */
  counts?: number[];
  accessibilitySummary: string;
}

const PAD = { left: 42, right: 14, top: 14, bottom: 30 };
const MIN_STEP = 30;

/** Rounds a span to a "nice" tick step (1, 2, 5 x 10^n). */
export function niceStep(span: number, targetTicks = 4): number {
  const raw = span / targetTicks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * pow;
}

export function yDomain(values: number[]): { min: number; max: number; ticks: number[] } {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, 10);
  const step = niceStep(span + span * 0.2);
  const min = Math.floor((lo - span * 0.1) / step) * step;
  const max = Math.ceil((hi + span * 0.1) / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  return { min, max, ticks };
}

function Marker({
  shape,
  x,
  y,
  r,
  color,
  selected,
}: {
  shape: MarkerShape;
  x: number;
  y: number;
  r: number;
  color: string;
  selected: boolean;
}) {
  const size = selected ? r + 2.5 : r;
  if (shape === 'square')
    return <Rect x={x - size} y={y - size} width={size * 2} height={size * 2} fill={color} />;
  if (shape === 'triangle') {
    const pts = `${x},${y - size - 1} ${x - size - 1},${y + size} ${x + size + 1},${y + size}`;
    return <Polygon points={pts} fill={color} />;
  }
  return <Circle cx={x} cy={y} r={size} fill={color} />;
}

/**
 * Line (daily/weekly/monthly averages) or grouped-bar chart over fixed slots.
 * Lines are only drawn between *adjacent* slots that both have data, so gaps stay visible and
 * nothing implies a measurement happened where there was none.
 */
export function SeriesChart({ slots, series, unit, kind = 'line', counts, accessibilitySummary }: Props) {
  const { colors, t } = useApp();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const allValues = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  const valuesKey = allValues.join(',');
  const layout = useMemo(() => {
    if (allValues.length === 0 || slots.length === 0 || width === 0) return null;
    const domain = yDomain(kind === 'bar' ? [0, ...allValues] : allValues);
    const available = width - PAD.left - PAD.right;
    const step = slots.length > 1 ? Math.max(MIN_STEP, available / (slots.length - 1)) : 0;
    const innerWidth = slots.length > 1 ? step * (slots.length - 1) : available;
    const totalWidth = Math.max(width, PAD.left + PAD.right + innerWidth + (kind === 'bar' ? step : 0));
    const height = chartTokens.height;
    const plotH = height - PAD.top - PAD.bottom;
    const x = (i: number) =>
      slots.length > 1 ? PAD.left + (kind === 'bar' ? step / 2 : 0) + i * step : PAD.left + available / 2;
    const y = (v: number) => PAD.top + plotH * (1 - (v - domain.min) / (domain.max - domain.min));
    return { domain, step, totalWidth, height, plotH, x, y };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, slots.length, kind, valuesKey]);

  const withData = slots.map((_, i) => i).filter((i) => series.some((s) => s.values[i] != null));
  const move = (dir: 1 | -1) => {
    if (withData.length === 0) return;
    const current = selected == null ? (dir === 1 ? -1 : slots.length) : selected;
    const next =
      dir === 1 ? withData.find((i) => i > current) : [...withData].reverse().find((i) => i < current);
    setSelected(next ?? (dir === 1 ? withData[0]! : withData[withData.length - 1]!));
  };

  const labelEvery = layout ? Math.max(1, Math.ceil(64 / Math.max(layout.step, 1))) : 1;

  return (
    <View style={{ gap: spacing.md }}>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityLabel={accessibilitySummary}
        accessibilityRole="image"
      >
        {layout ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={layout.totalWidth > width}
            contentContainerStyle={{ width: layout.totalWidth }}
          >
            <Svg width={layout.totalWidth} height={layout.height}>
              {layout.domain.ticks.map((tick) => (
                <G key={`t${tick}`}>
                  <Line
                    x1={PAD.left}
                    x2={layout.totalWidth - PAD.right}
                    y1={layout.y(tick)}
                    y2={layout.y(tick)}
                    stroke={colors.chartGrid}
                    strokeWidth={1}
                  />
                  <SvgText
                    x={PAD.left - 6}
                    y={layout.y(tick) + 4}
                    fontSize={11}
                    fill={colors.muted}
                    textAnchor="end"
                  >
                    {Math.round(tick)}
                  </SvgText>
                </G>
              ))}
              {slots.map((slot, i) =>
                i % labelEvery === 0 ? (
                  <SvgText
                    key={`x${slot.key}`}
                    x={layout.x(i)}
                    y={layout.height - 8}
                    fontSize={11}
                    fill={colors.muted}
                    textAnchor="middle"
                  >
                    {slot.label}
                  </SvgText>
                ) : null,
              )}
              {selected != null ? (
                <Line
                  x1={layout.x(selected)}
                  x2={layout.x(selected)}
                  y1={PAD.top}
                  y2={PAD.top + layout.plotH}
                  stroke={colors.muted}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              ) : null}

              {kind === 'line'
                ? series.map((s) => {
                    const segments: string[] = [];
                    let current = '';
                    s.values.forEach((v, i) => {
                      if (v == null) {
                        if (current.includes('L')) segments.push(current);
                        current = '';
                        return;
                      }
                      current += `${current === '' ? 'M' : 'L'}${layout.x(i)},${layout.y(v)} `;
                    });
                    if (current.includes('L')) segments.push(current);
                    return (
                      <G key={s.id}>
                        {segments.map((d, idx) => (
                          <Path
                            key={idx}
                            d={d}
                            stroke={s.color}
                            strokeWidth={chartTokens.strokeWidth}
                            fill="none"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        ))}
                        {s.values.map((v, i) =>
                          v == null ? null : (
                            <Marker
                              key={i}
                              shape={s.shape}
                              x={layout.x(i)}
                              y={layout.y(v)}
                              r={chartTokens.pointRadius}
                              color={s.color}
                              selected={selected === i}
                            />
                          ),
                        )}
                      </G>
                    );
                  })
                : series.map((s, si) => {
                    const barW = Math.min(18, Math.max(6, layout.step * 0.3));
                    const offset = (si - (series.length - 1) / 2) * (barW + 2);
                    return (
                      <G key={s.id}>
                        {s.values.map((v, i) =>
                          v == null ? null : (
                            <Rect
                              key={i}
                              x={layout.x(i) + offset - barW / 2}
                              y={layout.y(v)}
                              width={barW}
                              height={Math.max(1, layout.y(layout.domain.min) - layout.y(v))}
                              rx={3}
                              fill={s.color}
                              opacity={selected == null || selected === i ? 1 : 0.55}
                            />
                          ),
                        )}
                      </G>
                    );
                  })}

              {slots.map((slot, i) => (
                <Rect
                  key={`hit${slot.key}`}
                  x={layout.x(i) - Math.max(layout.step, 30) / 2}
                  y={PAD.top}
                  width={Math.max(layout.step, 30)}
                  height={layout.plotH}
                  fill="transparent"
                  onPress={() => setSelected((old) => (old === i ? null : i))}
                />
              ))}
            </Svg>
          </ScrollView>
        ) : (
          <View style={{ height: chartTokens.height }} />
        )}
      </View>

      <Row wrap gap={spacing.lg}>
        {series.map((s) => (
          <Row key={s.id} gap={6}>
            <Svg width={18} height={14}>
              <Marker shape={s.shape} x={9} y={7} r={5} color={s.color} selected={false} />
            </Svg>
            <AppText variant="caption">
              {s.label} ({unit})
            </AppText>
          </Row>
        ))}
      </Row>

      <View
        accessibilityLiveRegion="polite"
        style={{
          backgroundColor: colors.inputBackground,
          borderRadius: 12,
          padding: spacing.md,
          gap: 2,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {selected == null ? (
          <AppText variant="caption" color={colors.muted}>
            {t('chartTapHint')}
          </AppText>
        ) : (
          <>
            <AppText variant="label">{slots[selected]?.longLabel}</AppText>
            {series.map((s) => {
              const v = s.values[selected];
              return (
                <AppText key={s.id} variant="caption">
                  {s.label}: {v == null ? t('noMeasurement') : `${Math.round(v * 10) / 10} ${unit}`}
                </AppText>
              );
            })}
            {counts && counts[selected] ? (
              <AppText variant="caption" color={colors.muted}>
                {t('readingsInSlot', { n: counts[selected]! })}
              </AppText>
            ) : null}
          </>
        )}
      </View>

      {withData.length > 1 ? (
        <Row gap={spacing.sm}>
          <SecondaryButton label={`◀ ${t('previousPoint')}`} onPress={() => move(-1)} style={{ flex: 1 }} />
          <SecondaryButton label={`${t('nextPoint')} ▶`} onPress={() => move(1)} style={{ flex: 1 }} />
        </Row>
      ) : null}
    </View>
  );
}

export function TrendChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { colors } = useApp();
  return (
    <Card>
      <View>
        <AppText variant="heading" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.muted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {children}
    </Card>
  );
}
