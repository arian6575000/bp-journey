import React, { useState } from 'react';
import { TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../i18n/I18nContext';
import type { TKey } from '../i18n/strings';
import type { LanguagePreference, ThemePreference } from '../domain/types';
import { ChoiceChips } from '../components/inputs';
import { useToast } from '../components/feedback';
import { AppHeader, AppText, Card, PrimaryButton, Screen, SettingsRow } from '../components/ui';
import { spacing } from '../theme/tokens';

export default function ProfileScreen() {
  const { t, colors, rtl, settings, updateSetting } = useApp();
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(settings.displayName);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const saveName = async () => {
    try {
      await updateSetting('displayName', name.trim());
      toast.show(t('toast_profileSaved'), 'success');
    } catch {
      toast.show(t('toast_saveFailed'), 'error');
    }
  };

  const setLanguage = (value: LanguagePreference) => void updateSetting('language', value);
  const setTheme = (value: ThemePreference) => void updateSetting('theme', value);

  return (
    <Screen header={<AppHeader title={t('profileAndPrefs')} onBack={back} />}>
      <Card>
        <AppText variant="heading">{t('displayName')}</AppText>
        <AppText variant="caption" color={colors.muted}>
          {t('displayNameHint')}
        </AppText>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={40}
          placeholder={t('optional')}
          placeholderTextColor={colors.muted}
          accessibilityLabel={t('displayName')}
          maxFontSizeMultiplier={1.5}
          style={{
            minHeight: 52,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.inputBackground,
            paddingHorizontal: spacing.md,
            color: colors.text,
            fontSize: 16,
            textAlign: rtl ? 'right' : 'left',
          }}
        />
        <PrimaryButton
          label={t('save')}
          onPress={() => void saveName()}
          disabled={name.trim() === settings.displayName}
        />
      </Card>

      <Card>
        <ChoiceChips<LanguagePreference>
          label={t('language')}
          value={settings.language}
          onChange={setLanguage}
          options={[
            { value: 'system', label: t('lang_system') },
            { value: 'en', label: 'English' },
            { value: 'ur', label: 'اردو' },
          ]}
        />
        <ChoiceChips<ThemePreference>
          label={t('theme')}
          value={settings.theme}
          onChange={setTheme}
          options={(['system', 'light', 'dark'] as const).map((v) => ({
            value: v,
            label: t(`theme_${v}` as TKey),
          }))}
        />
      </Card>

      <Card>
        <SettingsRow
          symbol="⏰"
          title={t('reminders')}
          subtitle={t('remindersSub')}
          onPress={() => router.push('/reminders' as never)}
        />
      </Card>
    </Screen>
  );
}
