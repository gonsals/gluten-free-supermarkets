import { useColorScheme } from 'react-native';

const light = {
  bg: '#F6F8F3',
  surface: '#FFFFFF',
  ink: '#182D25',
  muted: '#52635A',
  border: '#D9E2D8',
  accent: '#216647',
  soft: '#E6F0E8',
  danger: '#A12A29',
  warning: '#785416',
  warningBg: '#FFF2D6',
  positive: '#155C3A',
};
const dark: typeof light = {
  bg: '#101D17',
  surface: '#1B2B23',
  ink: '#EDF5EE',
  muted: '#B2C5B6',
  border: '#384C3F',
  accent: '#8ED5A7',
  soft: '#294333',
  danger: '#FFAAAA',
  warning: '#F9D48A',
  warningBg: '#3A301D',
  positive: '#A4E8BD',
};
export function usePalette() {
  return useColorScheme() === 'dark' ? dark : light;
}
export type Palette = typeof light;
export function assessmentColor(state: string, palette: Palette) {
  return state === 'declared_gluten_free'
    ? palette.positive
    : state === 'declared_gluten' || state === 'conflicting'
      ? palette.danger
      : palette.warning;
}
