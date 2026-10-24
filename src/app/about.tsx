import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useApp } from '../i18n/I18nContext';
import type { TKey } from '../i18n/strings';
import { GUIDELINE } from '../domain/classification';
import { AppHeader, AppText, Card, Divider, Row, Screen } from '../components/ui';
import { spacing } from '../theme/tokens';

const FAQ: { q: TKey; a: TKey }[] = [
  { q: 'faq1q', a: 'faq1a' },
  { q: 'faq2q', a: 'faq2a' },
  { q: 'faq3q', a: 'faq3a' },
  { q: 'faq4q', a: 'faq4a' },
  { q: 'faq5q', a: 'faq5a' },
];

export default function AboutScreen() {
  const { t, colors } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen header={<AppHeader title={t('aboutHelp')} onBack={back} />}>
      <Card>
        <AppText variant="heading">BP Journey</AppText>
        <AppText color={colors.muted}>{t('version', { v: version })}</AppText>
        <AppText>{t('aboutBody')}</AppText>
      </Card>

      <Card style={{ borderColor: colors.caution }}>
        <AppText variant="heading" color={colors.caution}>
          {t('notMedicalTitle')}
        </AppText>
        <AppText>{t('notMedicalBody')}</AppText>
        <AppText variant="label" color={colors.emergency}>
          {t('emergencyLine')}
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading">{t('guidelineTitle')}</AppText>
        <AppText>{t('guidelineBody', { name: GUIDELINE.name, population: t('adultsOnly') })}</AppText>
        <AppText variant="caption" color={colors.muted}>
          {t('guidelineLimits')}
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading">{t('faqTitle')}</AppText>
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <View key={item.q}>
              {i > 0 ? <Divider /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                onPress={() => setOpen(isOpen ? null : i)}
                style={{ minHeight: 52, justifyContent: 'center', paddingVertical: spacing.xs }}
              >
                <Row style={{ justifyContent: 'space-between' }}>
                  <AppText style={{ flex: 1, fontWeight: '600' }}>{t(item.q)}</AppText>
                  <AppText color={colors.primary}>{isOpen ? '−' : '+'}</AppText>
                </Row>
              </Pressable>
              {isOpen ? <AppText color={colors.muted}>{t(item.a)}</AppText> : null}
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}
