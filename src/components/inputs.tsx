import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useApp } from '../i18n/I18nContext';
import type { TKey } from '../i18n/strings';
import { addDays, rangeForPreset, startOfDay } from '../domain/dates';
import type { DateRange, RangePreset } from '../domain/dates';
import { formatDeviceDate, formatDeviceTime } from '../domain/format';
import { radii, spacing, TOUCH } from '../theme/tokens';
import { AppText, Row } from './ui';

export type TextInputHandle = React.ComponentRef<typeof TextInput>;

interface NumericProps {
  inputRef?: React.Ref<TextInputHandle>;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  hint?: string;
  error?: string;
  unit?: string;
  placeholder?: string;
  maxLength?: number;
  large?: boolean;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
}

/** Large numeric field with label, plain-language hint, inline error and a clear button. */
export function AccessibleNumericInput({
  inputRef,
  label,
  value,
  onChangeText,
  hint,
  error,
  unit,
  placeholder,
  maxLength = 3,
  large,
  returnKeyType,
  onSubmitEditing,
  blurOnSubmit,
}: NumericProps) {
  const { colors, t, rtl } = useApp();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ flex: 1, minWidth: 130, gap: spacing.xs }}>
      <AppText variant="label">{label}</AppText>
      <Row
        gap={4}
        style={{
          minHeight: large ? 72 : TOUCH + 6,
          borderRadius: radii.md,
          borderWidth: focused || error ? 2 : 1,
          borderColor: error ? colors.emergency : focused ? colors.primary : colors.border,
          backgroundColor: colors.inputBackground,
          paddingHorizontal: spacing.md,
        }}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={maxLength}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          selectTextOnFocus
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          submitBehavior={blurOnSubmit ? 'blurAndSubmit' : 'submit'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          accessibilityHint={hint}
          maxFontSizeMultiplier={1.3}
          style={{
            flex: 1,
            color: colors.text,
            fontSize: large ? 36 : 22,
            fontWeight: '800',
            paddingVertical: spacing.sm,
            textAlign: rtl ? 'right' : 'left',
          }}
        />
        {unit ? (
          <AppText variant="caption" color={colors.muted}>
            {unit}
          </AppText>
        ) : null}
        {value.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('clear')}: ${label}`}
            onPress={() => onChangeText('')}
            hitSlop={8}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: colors.muted, fontSize: 18 }}>✕</Text>
          </Pressable>
        ) : null}
      </Row>
      {hint ? (
        <AppText variant="caption" color={colors.muted}>
          {hint}
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="caption" color={colors.emergency} accessibilityLiveRegion="polite">
          ⚠ {error}
        </AppText>
      ) : null}
    </View>
  );
}

export function FilterChips<T extends string>({
  options,
  selected,
  onToggle,
  label,
}: {
  options: { value: T; label: string }[];
  selected: readonly T[];
  onToggle: (value: T) => void;
  label?: string;
}) {
  const { colors } = useApp();
  return (
    <View style={{ gap: spacing.sm }}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <Row wrap gap={spacing.sm}>
        {options.map((option) => {
          const on = selected.includes(option.value);
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={option.label}
              onPress={() => onToggle(option.value)}
              style={{
                minHeight: 44,
                paddingHorizontal: spacing.lg,
                borderRadius: radii.pill,
                justifyContent: 'center',
                backgroundColor: on ? colors.primary : colors.inputBackground,
                borderWidth: 1,
                borderColor: on ? colors.primary : colors.border,
              }}
            >
              <Text
                maxFontSizeMultiplier={1.4}
                style={{ color: on ? colors.primaryText : colors.text, fontWeight: '600', fontSize: 14 }}
              >
                {on ? '✓ ' : ''}
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}

/** Single-choice variant of the chips (radio semantics). */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  label?: string;
}) {
  const { colors } = useApp();
  return (
    <View style={{ gap: spacing.sm }}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <Row wrap gap={spacing.sm}>
        {options.map((option) => {
          const on = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, checked: on }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              style={{
                minHeight: 44,
                paddingHorizontal: spacing.lg,
                borderRadius: radii.pill,
                justifyContent: 'center',
                backgroundColor: on ? colors.primary : colors.inputBackground,
                borderWidth: 1,
                borderColor: on ? colors.primary : colors.border,
              }}
            >
              <Text
                maxFontSizeMultiplier={1.4}
                style={{ color: on ? colors.primaryText : colors.text, fontWeight: '600', fontSize: 14 }}
              >
                {on ? '● ' : '○ '}
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}

/** Date or time field. Android uses the native dialog; other platforms show an inline picker. */
export function DateTimeField({
  label,
  value,
  mode,
  onChange,
  maximumDate,
}: {
  label: string;
  value: Date;
  mode: 'date' | 'time';
  onChange: (date: Date) => void;
  maximumDate?: Date;
}) {
  const { colors, language } = useApp();
  const [open, setOpen] = useState(false);
  const text = mode === 'date' ? formatDeviceDate(value, language) : formatDeviceTime(value, language);

  const press = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode,
        maximumDate,
        onValueChange: (_event, date) => onChange(date),
      });
    } else {
      setOpen((o) => !o);
    }
  };

  return (
    <View style={{ flex: 1, minWidth: 140, gap: spacing.xs }}>
      <AppText variant="label">{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text}`}
        onPress={press}
        android_ripple={{ color: colors.border }}
        style={{
          minHeight: TOUCH + 4,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.inputBackground,
          paddingHorizontal: spacing.md,
          justifyContent: 'center',
        }}
      >
        <AppText style={{ fontWeight: '600' }}>
          {mode === 'date' ? '▦  ' : '◷  '}
          {text}
        </AppText>
      </Pressable>
      {open && Platform.OS !== 'android' ? (
        <DateTimePicker
          value={value}
          mode={mode}
          maximumDate={maximumDate}
          onValueChange={(_event, date) => onChange(date)}
        />
      ) : null}
    </View>
  );
}

export interface RangeValue {
  preset: RangePreset;
  customFrom: Date;
  customTo: Date;
}

export function resolveRange(value: RangeValue, now: Date = new Date()): DateRange {
  return rangeForPreset(value.preset, now, { from: value.customFrom, to: value.customTo });
}

export function defaultRangeValue(preset: RangePreset = '30d'): RangeValue {
  const today = startOfDay(new Date());
  return { preset, customFrom: addDays(today, -29), customTo: today };
}

const PRESET_LABEL: Record<RangePreset, TKey> = {
  today: 'range_today',
  '7d': 'range_7d',
  '30d': 'range_30d',
  '90d': 'range_90d',
  '6m': 'range_6m',
  '1y': 'range_1y',
  custom: 'range_custom',
  all: 'range_all',
};

export function DateRangeSelector({
  value,
  onChange,
  presets,
}: {
  value: RangeValue;
  onChange: (value: RangeValue) => void;
  presets: RangePreset[];
}) {
  const { t } = useApp();
  return (
    <View style={{ gap: spacing.md }}>
      <ChoiceChips
        label={t('period')}
        value={value.preset}
        onChange={(preset) => onChange({ ...value, preset })}
        options={presets.map((p) => ({ value: p, label: t(PRESET_LABEL[p]) }))}
      />
      {value.preset === 'custom' ? (
        <Row wrap align="flex-start">
          <DateTimeField
            label={t('from')}
            mode="date"
            value={value.customFrom}
            maximumDate={new Date()}
            onChange={(d) => onChange({ ...value, customFrom: d })}
          />
          <DateTimeField
            label={t('to')}
            mode="date"
            value={value.customTo}
            maximumDate={new Date()}
            onChange={(d) => onChange({ ...value, customTo: d })}
          />
        </Row>
      ) : null}
    </View>
  );
}

export function InfoTooltip({ text, label }: { text: string; label: string }) {
  const { colors } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: spacing.xs }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        hitSlop={8}
        style={{ minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 6 }}
      >
        <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '800' }}>ⓘ</Text>
        <AppText variant="caption" color={colors.primary}>
          {label}
        </AppText>
      </Pressable>
      {open ? (
        <View
          style={{
            backgroundColor: colors.backgroundAlt,
            borderRadius: radii.md,
            padding: spacing.md,
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: colors.border,
          }}
        >
          <AppText variant="caption">{text}</AppText>
        </View>
      ) : null}
    </View>
  );
}
