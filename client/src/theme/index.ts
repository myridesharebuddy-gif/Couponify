import { palette } from './palette';
import { typography } from './typography';

export interface Theme {
  mode: 'dark';
  background: string;
  surface: string;
  card: string;
  text: string;
  subtext: string;
  accent: string;
  border: string;
  success: string;
  danger: string;
  muted: string;
  header: string;
  ink: string;
  inputBackground: string;
  glow: string;
  script: string;
  palette: typeof palette;
  typography: typeof typography;
}

const theme: Theme = {
  mode: 'dark',
  background: palette.emerald,
  surface: palette.emeraldDeep,
  card: palette.emeraldDeep,
  text: palette.gold,
  subtext: palette.goldMuted,
  accent: palette.gold,
  border: palette.gold,
  success: palette.gold,
  danger: '#B2433A',
  muted: palette.cream,
  header: palette.ink,
  ink: palette.ink,
  inputBackground: palette.cream,
  glow: 'rgba(216, 194, 138, 0.45)',
  script: palette.gold,
  palette,
  typography
};

export const useTheme = () => theme;
