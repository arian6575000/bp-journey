import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../i18n/I18nContext';
import type { TKey } from '../i18n/strings';
import { AppHeader, AppText, Card, PrimaryButton, Row, Screen } from '../components/ui';
import { radii, spacing } from '../theme/tokens';

const STEPS: { icon: string; title: TKey; body: TKey }[] = [
  { icon: '🧘', title: 'guide1t', body: 'guide1b' },
  { icon: '🚶', title: 'guide2t', body: 'guide2b' },
  { icon: '🪑', title: 'guide3t', body: 'guide3b' },
  { icon: '🦶', title: 'guide4t', body: 'guide4b' },
  { icon: '💪', title: 'guide5t', body: 'guide5b' },
  { icon: '🩺', title: 'guide6t', body: 'guide6b' },
  { icon: '🤫', title: 'guide7t', body: 'guide7b' },
  { icon: '📖', title: 'guide8t', body: 'guide8b' },
  { icon: '🔁', title: 'guide9t', body: 'guide9b' },
  { icon: '📝', title: 'guide10t', body: 'guide10b' },
];

const CHECKLIST: TKey[] = ['check1', 'check2', 'check3', 'check4', 'check5'];

export default function GuideScreen() {
  const { t, colors } = useApp();
  const router = useRouter();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen
      header={<AppHeader title={t('measurementGuide')} subtitle={t('guideSub')} onBack={back} />}
      footer={
        <PrimaryButton label={`＋ ${t('addReading')}`} onPress={() => router.push('/reading/add' as never)} />
      }
    >
      <Card>
        <AppText variant="heading">{t('checklistTitle')}</AppText>
        {CHECKLIST.map((key) => {
          const on = !!done[key];
          return (
            <Pressable
              key={key}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => setDone((old) => ({ ...old, [key]: !old[key] }))}
              style={{ minHeight: 48, justifyContent: 'center' }}
            >
              <Row>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: on ? colors.primary : colors.muted,
                    backgroundColor: on ? colors.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText color={colors.primaryText} style={{ fontSize: 16, lineHeight: 20 }}>
                    {on ? '✓' : ''}
                  </AppText>
                </View>
                <AppText style={{ flex: 1 }}>{t(key)}</AppText>
              </Row>
            </Pressable>
          );
        })}
      </Card>

      {STEPS.map((step, i) => (
        <Card key={step.title}>
          <Row align="flex-start">
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: radii.md,
                backgroundColor: colors.backgroundAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              importantForAccessibility="no-hide-descendants"
            >
              <AppText style={{ fontSize: 28, lineHeight: 34 }}>{step.icon}</AppText>
            </View>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <AppText variant="heading">
                {i + 1}. {t(step.title)}
              </AppText>
              <AppText color={colors.muted}>{t(step.body)}</AppText>
            </View>
          </Row>
        </Card>
      ))}

      <AppText variant="caption" color={colors.muted}>
        {t('guideDisclaimer')}
      </AppText>
    </Screen>
  );
}
