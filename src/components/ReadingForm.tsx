import React, { useMemo, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { usePreventRemove, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useApp } from '../i18n/I18nContext';
import type { TKey } from '../i18n/strings';
import { insertReading, updateReading } from '../db/readingsRepository';
import { contextForHour } from '../domain/dates';
import { createId } from '../domain/id';
import { ARMS, CONTEXTS, LOCAL_PROFILE_ID, POSITIONS } from '../domain/types';
import type { Arm, BloodPressureReading, MeasurementContext, Position } from '../domain/types';
import { validateReadingInput } from '../domain/validation';
import type { DataQualityWarningCode, ParsedReading, ValidationErrorCode } from '../domain/validation';
import { spacing } from '../theme/tokens';
import { ConfirmDialog, useToast } from './feedback';
import { AccessibleNumericInput, ChoiceChips, DateTimeField, InfoTooltip } from './inputs';
import type { TextInputHandle } from './inputs';
import { SafetyNotice } from './domainViews';
import { AppHeader, AppText, Card, PrimaryButton, Row, Screen, SecondaryButton } from './ui';


const ERROR_KEY: Record<ValidationErrorCode, TKey> = {
  systolicRequired: 'err_systolicRequired',
  diastolicRequired: 'err_diastolicRequired',
  systolicNotInteger: 'err_notInteger',
  diastolicNotInteger: 'err_notInteger',
  pulseNotInteger: 'err_notInteger',
  systolicNotPositive: 'err_notPositive',
  diastolicNotPositive: 'err_notPositive',
  pulseNotPositive: 'err_notPositive',
  systolicRange: 'err_systolicRange',
  diastolicRange: 'err_diastolicRange',
  pulseRange: 'err_pulseRange',
  dateInvalid: 'err_dateInvalid',
  notesTooLong: 'err_notesTooLong',
  armInvalid: 'err_enumInvalid',
  positionInvalid: 'err_enumInvalid',
  contextInvalid: 'err_enumInvalid',
};

const WARNING_KEY: Record<DataQualityWarningCode, TKey> = {
  orderingOdd: 'warn_ordering',
  systolicUnusual: 'warn_systolicUnusual',
  diastolicUnusual: 'warn_diastolicUnusual',
  pulseUnusual: 'warn_pulseUnusual',
  futureTime: 'warn_future',
};

interface Pending {
  parsed: ParsedReading;
  warnings: DataQualityWarningCode[];
  veryHigh: boolean;
}

export function ReadingForm({ initial }: { initial?: BloodPressureReading }) {
  const { t, colors } = useApp();
  const db = useSQLiteContext();
  const router = useRouter();
  const toast = useToast();
  const editing = initial != null;

  const [systolic, setSystolic] = useState(initial ? String(initial.systolic) : '');
  const [diastolic, setDiastolic] = useState(initial ? String(initial.diastolic) : '');
  const [pulse, setPulse] = useState(initial?.pulseBpm != null ? String(initial.pulseBpm) : '');
  const [arm, setArm] = useState<Arm>(initial?.arm ?? 'unknown');
  const [position, setPosition] = useState<Position>(initial?.position ?? 'unknown');
  const [contextChoice, setContextChoice] = useState<MeasurementContext | null>(initial?.context ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [measuredAt, setMeasuredAt] = useState<Date>(() =>
    initial ? new Date(initial.measuredAtUtc) : new Date(),
  );
  const [showDetails, setShowDetails] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [discardEvent, setDiscardEvent] = useState<{ repeat: () => void } | null>(null);

  const savingRef = useRef(false);
  const diaRef = useRef<TextInputHandle>(null);
  const pulseRef = useRef<TextInputHandle>(null);

  // Suggest a context from the time of day unless the user picked one.
  const context: MeasurementContext = contextChoice ?? contextForHour(measuredAt.getHours());

  const input = useMemo(
    () => ({ systolic, diastolic, pulse, measuredAt, arm, position, context, notes }),
    [systolic, diastolic, pulse, measuredAt, arm, position, context, notes],
  );
  const result = useMemo(() => validateReadingInput(input), [input]);

  const dirty = useMemo(() => {
    if (!initial) {
      return (
        systolic !== '' ||
        diastolic !== '' ||
        pulse !== '' ||
        notes !== '' ||
        contextChoice != null ||
        arm !== 'unknown' ||
        position !== 'unknown'
      );
    }
    return (
      systolic !== String(initial.systolic) ||
      diastolic !== String(initial.diastolic) ||
      pulse !== (initial.pulseBpm != null ? String(initial.pulseBpm) : '') ||
      notes !== (initial.notes ?? '') ||
      arm !== initial.arm ||
      position !== initial.position ||
      context !== initial.context ||
      measuredAt.getTime() !== new Date(initial.measuredAtUtc).getTime()
    );
  }, [initial, systolic, diastolic, pulse, notes, arm, position, context, contextChoice, measuredAt]);

  // Confirm before discarding meaningful unsaved changes (also covers the Android back button).
  const disablePrevention = usePreventRemove(dirty, ({ repeat }) => setDiscardEvent({ repeat }));

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const errorFor = (codes: ValidationErrorCode[]): string | undefined => {
    if (!submitted) return undefined;
    const code = result.errors.find((e) => codes.includes(e));
    return code ? t(ERROR_KEY[code]) : undefined;
  };

  const persist = async (parsed: ParsedReading) => {
    if (savingRef.current) return; // block double taps
    savingRef.current = true;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const record: BloodPressureReading = {
        id: initial?.id ?? createId(),
        profileId: initial?.profileId ?? LOCAL_PROFILE_ID,
        systolic: parsed.systolic,
        diastolic: parsed.diastolic,
        pulseBpm: parsed.pulseBpm,
        measuredAtUtc: parsed.measuredAt.toISOString(),
        timezoneOffsetMinutes: parsed.measuredAt.getTimezoneOffset(),
        arm: parsed.arm,
        position: parsed.position,
        context: parsed.context,
        notes: parsed.notes,
        source: initial?.source ?? 'manual',
        createdAtUtc: initial?.createdAtUtc ?? now,
        updatedAtUtc: now,
      };
      if (editing) await updateReading(db, record);
      else await insertReading(db, record);
      // Only after persistence succeeded: allow leaving without the discard prompt.
      disablePrevention();
      toast.show(t(editing ? 'toast_updated' : 'toast_saved'), 'success');
      leave();
    } catch {
      // Keep the form exactly as the user left it.
      toast.show(t('toast_saveFailed'), 'error');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const onSave = () => {
    if (savingRef.current) return;
    setSubmitted(true);
    const r = validateReadingInput(input);
    if (r.errors.length > 0 || !r.parsed) return;
    if (r.warnings.length > 0 || r.veryHigh) {
      setPending({ parsed: r.parsed, warnings: r.warnings, veryHigh: r.veryHigh });
      return;
    }
    void persist(r.parsed);
  };

  const liveSys = result.parsed?.systolic ?? (result.errors.length === 0 ? undefined : Number(systolic));
  const liveDia = result.parsed?.diastolic ?? Number(diastolic);
  const showLiveSafety =
    result.veryHigh && Number.isFinite(liveSys) && Number.isFinite(liveDia) && liveSys != null;

  const mergeDate = (d: Date) => {
    const next = new Date(measuredAt);
    next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    setMeasuredAt(next);
  };
  const mergeTime = (d: Date) => {
    const next = new Date(measuredAt);
    next.setHours(d.getHours(), d.getMinutes(), 0, 0);
    setMeasuredAt(next);
  };

  return (
    <>
      <Screen
        header={
          <AppHeader
            title={t(editing ? 'editReading' : 'addReading')}
            subtitle={t('addSubtitle')}
            onBack={leave}
          />
        }
        footer={
          <PrimaryButton
            label={t(editing ? 'saveChanges' : 'saveReading')}
            onPress={onSave}
            loading={saving}
            accessibilityHint={t('saveHint')}
          />
        }
      >
        {!editing ? (
          <AppText variant="body" color={colors.muted}>
            {t('quickAddIntro')}
          </AppText>
        ) : null}

        <Card>
          <Row align="flex-start" gap={spacing.md}>
            <AccessibleNumericInput
              large
              label={t('systolicLabel')}
              hint={t('systolicHint')}
              value={systolic}
              onChangeText={setSystolic}
              unit="mmHg"
              placeholder="—"
              error={errorFor([
                'systolicRequired',
                'systolicNotInteger',
                'systolicNotPositive',
                'systolicRange',
              ])}
              returnKeyType="next"
              onSubmitEditing={() => diaRef.current?.focus()}
              blurOnSubmit={false}
            />
            <AccessibleNumericInput
              large
              inputRef={diaRef}
              label={t('diastolicLabel')}
              hint={t('diastolicHint')}
              value={diastolic}
              onChangeText={setDiastolic}
              unit="mmHg"
              placeholder="—"
              error={errorFor([
                'diastolicRequired',
                'diastolicNotInteger',
                'diastolicNotPositive',
                'diastolicRange',
              ])}
              returnKeyType="next"
              onSubmitEditing={() => pulseRef.current?.focus()}
              blurOnSubmit={false}
            />
          </Row>
          <AccessibleNumericInput
            inputRef={pulseRef}
            label={t('pulseLabel')}
            hint={t('pulseHint')}
            value={pulse}
            onChangeText={setPulse}
            unit={t('bpm')}
            placeholder={t('optional')}
            error={errorFor(['pulseNotInteger', 'pulseNotPositive', 'pulseRange'])}
            returnKeyType="done"
            blurOnSubmit
          />
          <InfoTooltip label={t('whatDoNumbersMean')} text={t('numbersExplain')} />
        </Card>

        {showLiveSafety ? <SafetyNotice systolic={liveSys as number} diastolic={liveDia} compact /> : null}

        <SecondaryButton
          label={showDetails ? t('hideDetails') : t('moreDetails')}
          symbol={showDetails ? '−' : '+'}
          onPress={() => setShowDetails((v) => !v)}
          accessibilityHint={t('moreDetailsHint')}
        />

        {showDetails ? (
          <Card>
            <Row wrap align="flex-start">
              <DateTimeField label={t('dateLabel')} mode="date" value={measuredAt} onChange={mergeDate} />
              <DateTimeField label={t('timeLabel')} mode="time" value={measuredAt} onChange={mergeTime} />
            </Row>
            {errorFor(['dateInvalid']) ? (
              <AppText variant="caption" color={colors.emergency}>
                ⚠ {errorFor(['dateInvalid'])}
              </AppText>
            ) : null}
            <ChoiceChips
              label={t('arm')}
              value={arm}
              onChange={setArm}
              options={ARMS.map((a) => ({ value: a, label: t(`arm_${a}` as TKey) }))}
            />
            <ChoiceChips
              label={t('position')}
              value={position}
              onChange={setPosition}
              options={POSITIONS.map((p) => ({ value: p, label: t(`pos_${p}` as TKey) }))}
            />
            <View style={{ gap: spacing.xs }}>
              <ChoiceChips
                label={t('context')}
                value={context}
                onChange={setContextChoice}
                options={CONTEXTS.map((c) => ({ value: c, label: t(`ctx_${c}` as TKey) }))}
              />
              {contextChoice == null ? (
                <AppText variant="caption" color={colors.muted}>
                  {t('contextAuto')}
                </AppText>
              ) : null}
            </View>
            <NotesField value={notes} onChange={setNotes} error={errorFor(['notesTooLong'])} />
          </Card>
        ) : null}
      </Screen>

      <ConfirmDialog
        visible={pending != null}
        title={pending?.veryHigh ? t('safetyHighTitle') : t('checkValuesTitle')}
        confirmLabel={t(pending?.veryHigh ? 'saveReading' : 'saveVerified')}
        cancelLabel={t('reviewValues')}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const p = pending;
          setPending(null);
          if (p) void persist(p.parsed);
        }}
      >
        {pending?.veryHigh ? (
          <SafetyNotice systolic={pending.parsed.systolic} diastolic={pending.parsed.diastolic} />
        ) : null}
        {pending?.warnings.map((w) => (
          <AppText key={w}>• {t(WARNING_KEY[w])}</AppText>
        ))}
      </ConfirmDialog>

      <ConfirmDialog
        visible={discardEvent != null}
        title={t('discardTitle')}
        message={t('discardBody')}
        confirmLabel={t('discard')}
        cancelLabel={t('keepEditing')}
        destructive
        onCancel={() => setDiscardEvent(null)}
        onConfirm={() => {
          const ev = discardEvent;
          setDiscardEvent(null);
          disablePrevention();
          ev?.repeat();
        }}
      />
    </>
  );
}

function NotesField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const { colors, t, rtl } = useApp();
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="label">{t('notes')}</AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline
        maxLength={1100}
        placeholder={t('notesPlaceholder')}
        placeholderTextColor={colors.muted}
        textAlignVertical="top"
        accessibilityLabel={t('notes')}
        maxFontSizeMultiplier={1.5}
        style={{
          minHeight: 96,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: error ? colors.emergency : colors.border,
          backgroundColor: colors.inputBackground,
          padding: spacing.md,
          color: colors.text,
          fontSize: 16,
          textAlign: rtl ? 'right' : 'left',
        }}
      />
      <AppText variant="caption" color={colors.muted}>
        {value.length}/1000 · {t('notesPrivacy')}
      </AppText>
      {error ? (
        <AppText variant="caption" color={colors.emergency}>
          ⚠ {error}
        </AppText>
      ) : null}
    </View>
  );
}
