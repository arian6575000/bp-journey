import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextProps, TextStyle, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../i18n/I18nContext';
import { radii, shadows, spacing, TOUCH, typography } from '../theme/tokens';

type Variant = keyof typeof typography;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

/** Text that follows the active language direction and caps scaling so layouts survive large fonts. */
export function AppText({ variant = 'body', color, center, style, ...rest }: AppTextProps) {
  const { colors, rtl } = useApp();
  return (
    <Text
      maxFontSizeMultiplier={variant === 'number' || variant === 'display' ? 1.25 : 1.6}
      {...rest}
      style={[
        typography[variant],
        {
          color: color ?? colors.text,
          textAlign: center ? 'center' : rtl ? 'right' : 'left',
          writingDirection: rtl ? 'rtl' : 'ltr',
        },
        style,
      ]}
    />
  );
}

export function Row({
  children,
  style,
  gap = spacing.md,
  align = 'center',
  wrap,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
  align?: ViewStyle['alignItems'];
  wrap?: boolean;
}) {
  const { rtl } = useApp();
  return (
    <View
      style={[
        {
          flexDirection: rtl ? 'row-reverse' : 'row',
          alignItems: align,
          gap,
          flexWrap: wrap ? 'wrap' : 'nowrap',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
  glass = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  glass?: boolean;
}) {
  const { colors } = useApp();
  const base: ViewStyle = {
    backgroundColor: glass ? colors.surfaceGlass : colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  };
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        android_ripple={{ color: colors.border }}
        style={({ pressed }) => [base, pressed && { opacity: 0.85 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export function Screen({
  children,
  scroll = true,
  header,
  footer,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl + (footer ? 0 : insets.bottom) },
        contentStyle,
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, padding: spacing.lg, gap: spacing.lg }, contentStyle]}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {header}
      <View style={{ flex: 1 }}>{body}</View>
      {footer ? (
        <View
          style={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: Math.max(insets.bottom, spacing.md),
            backgroundColor: colors.background,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export function IconButton({
  symbol,
  label,
  onPress,
  disabled,
  size = TOUCH,
}: {
  symbol: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: colors.border, radius: size / 2 }}
      style={{
        width: size,
        height: size,
        borderRadius: radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceGlass,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ fontSize: 22, color: colors.text }} importantForAccessibility="no">
        {symbol}
      </Text>
    </Pressable>
  );
}

export function AppHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const { t, rtl } = useApp();
  return (
    <Row style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, minHeight: 64 }}>
      {onBack ? <IconButton symbol={rtl ? '→' : '←'} label={t('back')} onPress={onBack} /> : null}
      <View style={{ flex: 1 }}>
        <AppText variant="title" accessibilityRole="header" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="#6A7B91">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </Row>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  symbol?: string;
  destructive?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  accessibilityHint,
  symbol,
  destructive,
  style,
}: ButtonProps) {
  const { colors } = useApp();
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
      style={[
        {
          minHeight: 54,
          borderRadius: radii.lg,
          backgroundColor: destructive ? colors.emergency : colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          paddingHorizontal: spacing.xl,
          opacity: inactive ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.primaryText} />
      ) : (
        <>
          {symbol ? <Text style={{ color: colors.primaryText, fontSize: 20 }}>{symbol}</Text> : null}
          <Text
            maxFontSizeMultiplier={1.4}
            style={{ color: colors.primaryText, fontSize: 17, fontWeight: '700' }}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
  accessibilityHint,
  symbol,
  destructive,
  style,
}: ButtonProps) {
  const { colors } = useApp();
  const color = destructive ? colors.emergency : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: colors.border }}
      style={[
        {
          minHeight: TOUCH,
          borderRadius: radii.lg,
          borderWidth: 1.5,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {symbol ? <Text style={{ color, fontSize: 18 }}>{symbol}</Text> : null}
      <Text maxFontSizeMultiplier={1.4} style={{ color, fontSize: 16, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useApp();
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <AppText variant="heading" accessibilityRole="header" style={{ flex: 1 }}>
        {title}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={{ minHeight: TOUCH, justifyContent: 'center' }}
        >
          <AppText variant="label" color={colors.primary}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </Row>
  );
}

export function SettingsRow({
  title,
  subtitle,
  value,
  onPress,
  right,
  symbol,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  symbol?: string;
}) {
  const { colors, rtl } = useApp();
  const content = (
    <Row style={{ minHeight: TOUCH + 8, paddingVertical: spacing.xs }}>
      {symbol ? (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.md,
            backgroundColor: colors.backgroundAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 20, color: colors.primary }} importantForAccessibility="no">
            {symbol}
          </Text>
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <AppText variant="body" style={{ fontWeight: '600' }}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.muted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="label" color={colors.muted}>
          {value}
        </AppText>
      ) : null}
      {right}
      {onPress && !right ? (
        <Text style={{ color: colors.muted, fontSize: 20 }} importantForAccessibility="no">
          {rtl ? '‹' : '›'}
        </Text>
      ) : null}
    </Row>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}, ${value}` : title}
      onPress={onPress}
      android_ripple={{ color: colors.border }}
    >
      {content}
    </Pressable>
  );
}

export function Divider() {
  const { colors } = useApp();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

export function MetricCard({
  label,
  value,
  unit,
  caption,
  style,
}: {
  label: string;
  value: string;
  unit?: string;
  caption?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useApp();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}${caption ? `. ${caption}` : ''}`}
      style={[
        {
          flex: 1,
          minWidth: 140,
          backgroundColor: colors.inputBackground,
          borderRadius: radii.md,
          padding: spacing.md,
          gap: 2,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <AppText variant="caption" color={colors.muted}>
        {label}
      </AppText>
      <Row gap={4} align="flex-end">
        <AppText variant="heading" style={{ fontSize: 24, lineHeight: 30 }}>
          {value}
        </AppText>
        {unit ? (
          <AppText variant="caption" color={colors.muted} style={{ marginBottom: 3 }}>
            {unit}
          </AppText>
        ) : null}
      </Row>
      {caption ? (
        <AppText variant="caption" color={colors.muted}>
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}

export type { TextStyle };
