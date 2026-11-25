import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';

export type Preference = 'system' | 'light' | 'dark';
export type Scheme = 'light' | 'dark';

export interface Palette {
  bg: string;
  card: string;
  ink: string;
  muted: string;
  line: string;
  stamp: string;
  stampInk: string;
  pine: string;
  gold: string;
  danger: string;
  tab: string;
  qr: string;
  qrBg: string;
  display: string;
  body: string;
}

const display = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, "Iowan Old Style", Palatino, serif',
}) as string;

const body = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: '"Avenir Next", "Segoe UI", sans-serif',
}) as string;

export const lightPalette: Palette = {
  bg: '#F3EEE4',
  card: '#FFFCF7',
  ink: '#1C1915',
  muted: '#6F675C',
  line: '#E3DACB',
  stamp: '#C4452D',
  stampInk: '#FFF7F2',
  pine: '#245446',
  gold: '#8C6A2F',
  danger: '#8E2A2A',
  tab: '#FFFCF7',
  qr: '#1C1915',
  qrBg: '#FFFCF7',
  display,
  body,
};

export const darkPalette: Palette = {
  bg: '#12110E',
  card: '#1E1C18',
  ink: '#F4EFE6',
  muted: '#B3A89A',
  line: '#343029',
  stamp: '#E15A42',
  stampInk: '#1C1915',
  pine: '#8FCBB8',
  gold: '#E0C27A',
  danger: '#F0A0A0',
  tab: '#1A1916',
  qr: '#F4EFE6',
  qrBg: '#1E1C18',
  display,
  body,
};

const THEME_KEY = 'stamply.theme';

interface ThemeValue {
  preference: Preference;
  scheme: Scheme;
  colors: Palette;
  setPreference: (preference: Preference) => void;
}

const ThemeContext = createContext<ThemeValue>({
  preference: 'system',
  scheme: 'light',
  colors: lightPalette,
  setPreference: () => undefined,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<Preference>('system');

  useEffect(() => {
    void AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') setPreferenceState(stored);
    });
  }, []);

  const setPreference = useCallback((next: Preference) => {
    setPreferenceState(next);
    void AsyncStorage.setItem(THEME_KEY, next);
  }, []);

  const scheme: Scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const value = useMemo<ThemeValue>(
    () => ({ preference, scheme, colors: scheme === 'dark' ? darkPalette : lightPalette, setPreference }),
    [preference, scheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
