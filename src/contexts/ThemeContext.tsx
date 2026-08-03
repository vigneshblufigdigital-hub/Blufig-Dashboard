import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type ThemeMode = 'light' | 'dark' | 'system';
type FontSize = 'sm' | 'base' | 'lg' | 'xl';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('themeMode') as ThemeMode | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  });

  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('themeMode') as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const stored = localStorage.getItem('fontSize') as FontSize | null;
    if (stored === 'sm' || stored === 'base' || stored === 'lg' || stored === 'xl') {
      return stored;
    }
    return 'base';
  });

  // Handle system preference media query listener
  useEffect(() => {
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const updateTheme = () => {
        setTheme(mediaQuery.matches ? 'dark' : 'light');
      };
      updateTheme();
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    } else {
      setTheme(themeMode);
    }
  }, [themeMode]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    let px = '16px';
    let scale = '1';

    switch (fontSize) {
      case 'sm':
        px = '14px';
        scale = '0.92';
        break;
      case 'base':
        px = '16px';
        scale = '1';
        break;
      case 'lg':
        px = '18px';
        scale = '1.08';
        break;
      case 'xl':
        px = '20px';
        scale = '1.16';
        break;
    }

    root.style.fontSize = px;
    if (body) {
      body.style.fontSize = px;
    }
    root.setAttribute('data-font-size', fontSize);
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('themeMode', mode);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setThemeMode(nextTheme);
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, toggleTheme, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
