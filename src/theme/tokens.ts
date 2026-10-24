export interface Palette {
  primary: string;
  primaryText: string;
  secondary: string;
  accent: string;
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceGlass: string;
  border: string;
  text: string;
  muted: string;
  inputBackground: string;
  success: string;
  successBg: string;
  caution: string;
  cautionBg: string;
  high: string;
  highBg: string;
  emergency: string;
  emergencyBg: string;
  chartSystolic: string;
  chartDiastolic: string;
  chartPulse: string;
  chartGrid: string;
  overlay: string;
}

export const lightPalette: Palette = {
  primary: '#1565D8',
  primaryText: '#FFFFFF',
  secondary: '#0E8F8A',
  accent: '#19B3A6',
  background: '#EDF4FF',
  backgroundAlt: '#E3EEFF',
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255,255,255,0.86)',
  border: 'rgba(60,110,175,0.22)',
  text: '#14243A',
  muted: '#566A83',
  inputBackground: '#F4F8FF',
  success: '#12704A',
  successBg: '#DDF6EA',
  caution: '#8A5300',
  cautionBg: '#FFF1D6',
  high: '#A63A00',
  highBg: '#FFE6D8',
  emergency: '#A30D0D',
  emergencyBg: '#FFE1E1',
  chartSystolic: '#1565D8',
  chartDiastolic: '#0E8F8A',
  chartPulse: '#B25400',
  chartGrid: 'rgba(60,110,175,0.18)',
  overlay: 'rgba(10,20,35,0.45)',
};

export const darkPalette: Palette = {
  primary: '#5AA2FF',
  primaryText: '#06182F',
  secondary: '#46CFC7',
  accent: '#46CFC7',
  background: '#0B1422',
  backgroundAlt: '#101C2E',
  surface: '#152235',
  surfaceGlass: 'rgba(24,38,58,0.88)',
  border: 'rgba(140,180,230,0.22)',
  text: '#EAF1FB',
  muted: '#9DB0C8',
  inputBackground: '#0F1B2D',
  success: '#6EE0A9',
  successBg: '#10372A',
  caution: '#FFC76A',
  cautionBg: '#3A2B0C',
  high: '#FFA26B',
  highBg: '#3F2313',
  emergency: '#FF8E8E',
  emergencyBg: '#401717',
  chartSystolic: '#5AA2FF',
  chartDiastolic: '#46CFC7',
  chartPulse: '#FFB26B',
  chartGrid: 'rgba(140,180,230,0.2)',
  overlay: 'rgba(0,0,0,0.6)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
export const radii = { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 } as const;
export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800' as const },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800' as const },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  label: { fontSize: 14, lineHeight: 19, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  number: { fontSize: 40, lineHeight: 46, fontWeight: '800' as const },
};
export const shadows = {
  card: {
    shadowColor: '#3B6FB0',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
};
export const motion = { fast: 140, base: 220, slow: 320 } as const;
/** Minimum comfortable touch target (dp). */
export const TOUCH = 48;
export const chart = {
  height: 220,
  pointRadius: 3.5,
  selectedRadius: 6,
  strokeWidth: 2.5,
  step: 34,
} as const;
