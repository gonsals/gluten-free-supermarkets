import { Platform, useColorScheme } from 'react-native';

export const light = {
  bg: '#FCF8F0',
  surface: '#FFFCF7',
  ink: '#332B26',
  muted: '#726052',
  border: '#DDCDBD',
  accent: '#A43F28',
  onAccent: '#FFFFFF',
  soft: '#F3E5D4',
  danger: '#8A302B',
  dangerBg: '#FAEAE6',
  dangerBorder: '#D5A59D',
  warning: '#77500D',
  warningBg: '#FFF1D5',
  warningBorder: '#DCC18C',
  positive: '#24583D',
  positiveBg: '#E8F3EC',
  positiveBorder: '#A9C9B4',
};
export const dark: typeof light = {
  bg: '#251E1A',
  surface: '#312722',
  ink: '#FFF2E3',
  muted: '#D2BCA9',
  border: '#685043',
  accent: '#F5B699',
  onAccent: '#3B2117',
  soft: '#49342B',
  danger: '#FFD0CC',
  dangerBg: '#472B2C',
  dangerBorder: '#98615C',
  warning: '#FFE0A0',
  warningBg: '#41351D',
  warningBorder: '#8E7644',
  positive: '#C0F0D7',
  positiveBg: '#203B32',
  positiveBorder: '#507C66',
};
// System fonts keep editorial headings available offline, without a loading gate.
export const typography = {
  editorial: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
};
export function usePalette() {
  return useColorScheme() === 'dark' ? dark : light;
}
export type Palette = typeof light;
export function assessmentAppearance(state: string, palette: Palette) {
  const tone =
    state === 'declared_gluten_free'
      ? 'positive'
      : state === 'declared_gluten' || state === 'conflicting'
        ? 'danger'
        : 'warning';
  return {
    foreground: palette[tone],
    background: palette[`${tone}Bg`],
    border: palette[`${tone}Border`],
  };
}
export function assessmentColor(state: string, palette: Palette) {
  return assessmentAppearance(state, palette).foreground;
}
