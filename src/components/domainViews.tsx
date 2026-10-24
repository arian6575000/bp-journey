import React from 'react';
import { Switch, Text, View } from 'react-native';
import { useApp } from '../i18n/I18nContext';
import type { TKey } from '../i18n/strings';
import { CATEGORY_SYMBOL, classify, isLow, isVeryHigh } from '../domain/classification';
import type { BpCategory } from '../domain/classification';
import { formatMeasuredDate, formatMeasuredTime } from '../domain/format';
import { formatTime, hasDay } from '../domain/reminders';
import type { Reminder } from '../domain/reminders';
import type { BloodPressureReading } from '../domain/types';
import { radii, spacing } from '../theme/tokens';
import type { Palette } from '../theme/tokens';
import { AppText, Card, Row, SecondaryButton } from './ui';

export const CATEGORY_KEY: Record<BpCategory, TKey> = {
  normal: 'cat_normal',
  elevated: 'cat_elevated',
  stage1: 'cat_stage1',
  stage2: 'cat_stage2',
  veryHigh: 'cat_veryHigh',
};

export function categoryColors(category: BpCategory, c: Palette): { fg: string; bg: string } {
  switch (category) {
    case 'normal':
      return { fg: c.success, bg: c.successBg };
    case 'elevated':
      return { fg: c.caution, bg: c.cautionBg };
    case 'stage1':
      return { fg: c.caution, bg: c.cautionBg };
    case 'stage2':
      return { fg: c.high, bg: c.highBg };
    case 'veryHigh':
      return { fg: c.emergency, bg: c.emergencyBg };
  }
}

/** Status is always shown as symbol + words, never colour alone. */
export function StatusBadge({ category }: { category: BpCategory }) {
  const { colors, t } = useApp();
  const { fg, bg } = categoryColors(category, colors);
  return (
    <View
      accessible
      accessibilityLabel={t(CATEGORY_KEY[category])}
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: bg,
        borderRadius: radii.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
      }}
    >
      <Text style={{ color: fg, fontSize: 12 }}>{CATEGORY_SYMBOL[category]}</Text>
      <Text maxFontSizeMultiplier={1.4} style={{ color: fg, fontWeight: '700', fontSize: 13 }}>
        {t(CATEGORY_KEY[category])}
      </Text>
    </View>
  );
}

export function SafetyNotice({
  systolic,
  diastolic,
  compact,
}: {
  systolic: number;
  diastolic: number;
  compact?: boolean;
}) {
  const { colors, t } = useApp();
  if (isVeryHigh(systolic, diastolic)) {
    return (
      <View
        accessibilityRole="alert"
        style={{
          backgroundColor: colors.emergencyBg,
          borderRadius: radii.lg,
          borderWidth: 2,
          borderColor: colors.emergency,
          padding: spacing.lg,
          gap: spacing.sm,
        }}
      >
        <AppText variant="heading" color={colors.emergency}>
          ⬣ {t('safetyHighTitle')}
        </AppText>
        {/* Emergency advice first so it is never delayed by anything else on screen. */}
        <AppText color={colors.emergency} style={{ fontWeight: '700' }}>
          {t('safetyHighSymptoms')}
        </AppText>
        {compact ? null : (
          <>
            <AppText color={colors.text}>{t('safetyHighRepeat')}</AppText>
            <AppText color={colors.text}>{t('safetyHighSeek')}</AppText>
            <AppText variant="caption" color={colors.muted}>
              {t('safetyNotSafe')}
            </AppText>
          </>
        )}
      </View>
    );
  }
  if (isLow(systolic, diastolic)) {
    return (
      <View
        accessibilityRole="alert"
        style={{
          backgroundColor: colors.cautionBg,
          borderRadius: radii.lg,
          borderWidth: 1.5,
          borderColor: colors.caution,
          padding: spacing.lg,
          gap: spacing.xs,
        }}
      >
        <AppText variant="heading" color={colors.caution}>
          ▼ {t('safetyLowTitle')}
        </AppText>
        <AppText color={colors.text}>{t('safetyLowBody')}</AppText>
      </View>
    );
  }
  return null;
}

export function ReadingValueCard({
  reading,
  onPress,
}: {
  reading: BloodPressureReading;
  onPress?: () => void;
}) {
  const { colors, t, language } = useApp();
  const category = classify(reading.systolic, reading.diastolic);
  const pulse = reading.pulseBpm != null ? `${reading.pulseBpm} ${t('bpm')}` : t('notRecorded');
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${t('latestReading')}: ${reading.systolic} ${t('over')} ${reading.diastolic} mmHg, ${t('pulse')} ${pulse}, ${formatMeasuredDate(reading, language)} ${formatMeasuredTime(reading, language)}`}
    >
      <AppText variant="label" color={colors.muted}>
        {t('latestReading')}
      </AppText>
      <Row gap={spacing.sm} align="flex-end" style={{ justifyContent: 'center' }}>
        <AppText variant="number" style={{ fontSize: 56, lineHeight: 62 }}>
          {reading.systolic}
        </AppText>
        <AppText variant="number" color={colors.muted} style={{ fontSize: 40 }}>
          /
        </AppText>
        <AppText variant="number" style={{ fontSize: 56, lineHeight: 62 }}>
          {reading.diastolic}
        </AppText>
        <AppText variant="label" color={colors.muted} style={{ marginBottom: 10 }}>
          mmHg
        </AppText>
      </Row>
      <Row style={{ justifyContent: 'space-between' }} wrap>
        <AppText variant="label">♥ {pulse}</AppText>
        <StatusBadge category={category} />
      </Row>
      <AppText variant="caption" color={colors.muted}>
        {formatMeasuredDate(reading, language)} · {formatMeasuredTime(reading, language)} ·{' '}
        {t(`ctx_${reading.context}`)}
      </AppText>
    </Card>
  );
}

export function ReadingListItem({
  reading,
  onPress,
}: {
  reading: BloodPressureReading;
  onPress: () => void;
}) {
  const { colors, t, language } = useApp();
  const category = classify(reading.systolic, reading.diastolic);
  const pulse = reading.pulseBpm != null ? `${reading.pulseBpm} ${t('bpm')}` : t('notRecorded');
  return (
    <Card
      onPress={onPress}
      style={{ padding: spacing.md, gap: spacing.sm }}
      accessibilityLabel={`${reading.systolic} ${t('over')} ${reading.diastolic} mmHg, ${t('pulse')} ${pulse}, ${formatMeasuredDate(reading, language)} ${formatMeasuredTime(reading, language)}, ${t(CATEGORY_KEY[category])}`}
    >
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={spacing.xs} align="flex-end">
          <AppText variant="heading" style={{ fontSize: 26, lineHeight: 32 }}>
            {reading.systolic}/{reading.diastolic}
          </AppText>
          <AppText variant="caption" color={colors.muted} style={{ marginBottom: 4 }}>
            mmHg
          </AppText>
        </Row>
        <StatusBadge category={category} />
      </Row>
      <Row style={{ justifyContent: 'space-between' }} wrap gap={spacing.sm}>
        <AppText variant="caption" color={colors.muted}>
          {formatMeasuredDate(reading, language)} · {formatMeasuredTime(reading, language)}
        </AppText>
        <AppText variant="caption" color={colors.muted}>
          ♥ {pulse} · {t(`ctx_${reading.context}`)}
        </AppText>
      </Row>
    </Card>
  );
}

const WEEKDAY_KEYS: TKey[] = ['day_sun', 'day_mon', 'day_tue', 'day_wed', 'day_thu', 'day_fri', 'day_sat'];

export function ReminderCard({
  reminder,
  onToggle,
  onEdit,
}: {
  reminder: Reminder;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
}) {
  const { colors, t } = useApp();
  const days = WEEKDAY_KEYS.filter((_, i) => hasDay(reminder.daysMask, i))
    .map((k) => t(k))
    .join(' · ');
  const title = t(`reminder_${reminder.kind}` as TKey);
  return (
    <Card style={{ opacity: reminder.enabled ? 1 : 0.75 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <AppText variant="heading">{title}</AppText>
          <AppText variant="number" style={{ fontSize: 30, lineHeight: 36 }}>
            {formatTime(reminder.hour, reminder.minute)}
          </AppText>
          <AppText variant="caption" color={colors.muted}>
            {days || t('noDaysSelected')}
          </AppText>
        </View>
        <Switch
          accessibilityLabel={`${title} ${formatTime(reminder.hour, reminder.minute)}`}
          value={reminder.enabled}
          onValueChange={onToggle}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </Row>
      <SecondaryButton label={t('edit')} onPress={onEdit} />
    </Card>
  );
}
