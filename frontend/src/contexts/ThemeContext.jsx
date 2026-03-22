import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUserPreferences, updateUserPreferences } from '../services/api';

const ThemeContext = createContext();

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => localStorage.getItem('theme') || 'system');
  const [resolvedTheme, setResolvedTheme] = useState('light');
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);

  // Resolve the actual theme (light or dark) based on user selection
  const resolveTheme = useCallback((themeValue) => {
    if (themeValue === 'dark') return 'dark';
    if (themeValue === 'light') return 'light';
    // System preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // Apply theme to DOM
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);

    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme, resolveTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setResolvedTheme(resolveTheme('system'));
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme, resolveTheme]);

  // Load preferences from backend on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    getUserPreferences()
      .then((prefs) => {
        setPreferences(prefs);
        if (prefs.theme) {
          setThemeState(prefs.theme);
        }
      })
      .catch(() => {
        // Silently fail - use localStorage fallback
      })
      .finally(() => setLoading(false));
  }, []);

  // Set theme and persist to backend
  const setTheme = useCallback(async (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    try {
      await updateUserPreferences({ theme: newTheme });
    } catch {
      // Silently fail - will apply locally
    }
  }, []);

  // Update any preference and sync to backend
  const updatePreference = useCallback(async (updates) => {
    try {
      const result = await updateUserPreferences(updates);
      setPreferences((prev) => ({ ...prev, ...result }));

      // If name changed, update localStorage user object too
      if (updates.displayName) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.name = updates.displayName;
          localStorage.setItem('user', JSON.stringify(user));
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to update preference:', error);
      throw error;
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        preferences,
        updatePreference,
        loading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
