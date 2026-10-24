import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../i18n/I18nContext';
import { motion, radii, spacing } from '../theme/tokens';
import { AppText, Card, PrimaryButton, Row, SecondaryButton } from './ui';

export function LoadingState({ label }: { label?: string }) {
  const { colors, t } = useApp();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? t('loading')}
      style={{ padding: spacing.xxl, alignItems: 'center', gap: spacing.md }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText variant="caption" color={colors.muted}>
        {label ?? t('loading')}
      </AppText>
    </View>
  );
}

export function EmptyState({
  symbol = '♡',
  title,
  body,
  actionLabel,
  onAction,
}: {
  symbol?: string;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useApp();
  return (
    <Card style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.backgroundAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppText variant="title" color={colors.primary} center importantForAccessibility="no">
          {symbol}
        </AppText>
      </View>
      <AppText variant="heading" center accessibilityRole="header">
        {title}
      </AppText>
      {body ? (
        <AppText variant="body" color={colors.muted} center>
          {body}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} style={{ alignSelf: 'stretch' }} />
      ) : null}
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t, colors } = useApp();
  return (
    <Card style={{ borderColor: colors.emergency }}>
      <AppText variant="heading" color={colors.emergency} accessibilityRole="alert">
        {t('errorTitle')}
      </AppText>
      <AppText>{message}</AppText>
      {onRetry ? <SecondaryButton label={t('retry')} onPress={onRetry} /> : null}
    </Card>
  );
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive,
  children,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  children?: React.ReactNode;
}) {
  const { colors } = useApp();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl }}
      >
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.xl,
            padding: spacing.xl,
            gap: spacing.md,
            maxHeight: '88%',
          }}
        >
          <ScrollView contentContainerStyle={{ gap: spacing.md }}>
            <AppText variant="heading" accessibilityRole="header">
              {title}
            </AppText>
            {message ? <AppText>{message}</AppText> : null}
            {children}
          </ScrollView>
          <View style={{ gap: spacing.sm }}>
            <PrimaryButton label={confirmLabel} onPress={onConfirm} destructive={destructive} />
            <SecondaryButton label={cancelLabel} onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const { colors, t } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        accessibilityLabel={t('close')}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
      >
        <Pressable
          accessibilityViewIsModal
          onPress={() => undefined}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            padding: spacing.xl,
            paddingBottom: spacing.xl + insets.bottom,
            gap: spacing.lg,
            maxHeight: '85%',
          }}
        >
          <Row style={{ justifyContent: 'space-between' }}>
            <AppText variant="heading" accessibilityRole="header" style={{ flex: 1 }}>
              {title}
            </AppText>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={{ minHeight: 48, justifyContent: 'center' }}
            >
              <AppText variant="label" color={colors.primary}>
                {t('done')}
              </AppText>
            </Pressable>
          </Row>
          <ScrollView contentContainerStyle={{ gap: spacing.lg }}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type ToastKind = 'success' | 'error' | 'info';
interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
}
const ToastContext = createContext<{ show: (message: string, kind?: ToastKind) => void }>({
  show: () => undefined,
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ id: Date.now(), message, kind });
      Animated.timing(opacity, { toValue: 1, duration: motion.fast, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: motion.base, useNativeDriver: true }).start(() =>
          setToast(null),
        );
      }, 3200);
    },
    [opacity],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const bg =
    toast?.kind === 'error'
      ? colors.emergencyBg
      : toast?.kind === 'success'
        ? colors.successBg
        : colors.surface;
  const fg =
    toast?.kind === 'error' ? colors.emergency : toast?.kind === 'success' ? colors.success : colors.text;
  const symbol = toast?.kind === 'error' ? '⚠' : toast?.kind === 'success' ? '✓' : 'ℹ';

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            left: spacing.lg,
            right: spacing.lg,
            bottom: insets.bottom + 96,
            opacity,
          }}
        >
          <View
            style={{
              backgroundColor: bg,
              borderColor: colors.border,
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderRadius: radii.lg,
              padding: spacing.md,
              elevation: 6,
            }}
          >
            <Row>
              <AppText color={fg}>{symbol}</AppText>
              <AppText color={fg} style={{ flex: 1 }}>
                {toast.message}
              </AppText>
            </Row>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}
