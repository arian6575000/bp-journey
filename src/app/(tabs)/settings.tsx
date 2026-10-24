import React from 'react';
import { useRouter } from 'expo-router';
import { useApp } from '../../i18n/I18nContext';
import { AppHeader, AppText, Card, Divider, Screen, SettingsRow } from '../../components/ui';

export default function SettingsScreen() {
  const { t, colors } = useApp();
  const router = useRouter();
  const go = (path: string) => () => router.push(path as never);
  return (
    <Screen header={<AppHeader title={t('tab_settings')} />}>
      <Card>
        <SettingsRow
          symbol="☺"
          title={t('profileAndPrefs')}
          subtitle={t('profileAndPrefsSub')}
          onPress={go('/profile')}
        />
        <Divider />
        <SettingsRow
          symbol="⏰"
          title={t('reminders')}
          subtitle={t('remindersSub')}
          onPress={go('/reminders')}
        />
        <Divider />
        <SettingsRow
          symbol="ⓘ"
          title={t('measurementGuide')}
          subtitle={t('guideSub')}
          onPress={go('/guide')}
        />
        <Divider />
        <SettingsRow
          symbol="⇪"
          title={t('reportsExport')}
          subtitle={t('reportsSub')}
          onPress={go('/reports')}
        />
      </Card>
      <Card>
        <SettingsRow
          symbol="🔒"
          title={t('privacyData')}
          subtitle={t('privacySub')}
          onPress={go('/privacy')}
        />
        <Divider />
        <SettingsRow symbol="?" title={t('aboutHelp')} subtitle={t('aboutSub')} onPress={go('/about')} />
      </Card>
      <AppText variant="caption" color={colors.muted}>
        {t('disclaimerShort')}
      </AppText>
    </Screen>
  );
}
