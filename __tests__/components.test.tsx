import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { lightPalette } from '../src/theme/tokens';
import { en } from '../src/i18n/en';

import { SafetyNotice, StatusBadge } from '../src/components/domainViews';
import { AccessibleNumericInput } from '../src/components/inputs';

// Components read language/theme from the app context; provide a lightweight stand-in.
jest.mock('../src/i18n/I18nContext', () => ({
  useApp: () => ({
    colors: require('../src/theme/tokens').lightPalette,
    rtl: false,
    language: 'en',
    isDark: false,
    t: (key: string, vars?: Record<string, string | number>) => {
      let s: string = (require('../src/i18n/en').en as Record<string, string>)[key] ?? key;
      for (const [k, v] of Object.entries(vars ?? {})) s = s.split(`{${k}}`).join(String(v));
      return s;
    },
  }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

describe('components', () => {
  it('shows emergency advice first for a very high reading', () => {
    render(<SafetyNotice systolic={190} diastolic={100} />);
    expect(screen.getByText(en.safetyHighSymptoms)).toBeTruthy();
    expect(screen.getByText(en.safetyNotSafe)).toBeTruthy();
  });

  it('shows nothing for an ordinary reading and a low-reading notice when low', () => {
    const { toJSON } = render(<SafetyNotice systolic={120} diastolic={80} />);
    expect(toJSON()).toBeNull();
    render(<SafetyNotice systolic={85} diastolic={55} />);
    expect(screen.getByText(new RegExp(en.safetyLowTitle))).toBeTruthy();
  });

  it('never relies on colour alone for status', () => {
    render(<StatusBadge category="stage2" />);
    expect(screen.getByText(en.cat_stage2)).toBeTruthy();
    expect(screen.getByText('◼')).toBeTruthy();
  });

  it('keeps what the user typed and offers a clear button', () => {
    const onChange = jest.fn();
    render(<AccessibleNumericInput label="Top" value="12" onChangeText={onChange} error="Oops" hint="hint" />);
    expect(screen.getByDisplayValue('12')).toBeTruthy();
    expect(screen.getByText(/Oops/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText(`${en.clear}: Top`));
    expect(onChange).toHaveBeenCalledWith('');
    expect(lightPalette.primary).toBeTruthy();
  });
});
