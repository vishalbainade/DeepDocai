// Dark mode color mapping utility
// Used by components that rely on inline styles to get the right color for the current theme.

const lightColors = {
  // Backgrounds
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F8FAFC',
  bgHover: 'rgba(142, 132, 184, 0.08)',
  bgActiveItem: 'rgba(142, 132, 184, 0.08)',
  bgInput: '#F8FAFC',
  bgDropdown: '#FFFFFF',
  bgOverlay: 'rgba(0, 0, 0, 0.5)',
  bgChat: '#F8FAFC',

  // Borders
  borderPrimary: '#EAF0F6',
  borderInput: '#EAF0F6',
  borderAccent: '#8E84B8',

  // Text
  textPrimary: '#1E293B',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textFaint: '#94A3B8',
  textAccent: '#8E84B8',

  // Shadows
  shadowCard: '0 2px 12px rgba(142, 132, 184, 0.08)',
  shadowDropdown: '0 4px 16px rgba(0, 0, 0, 0.1)',
  shadowActive: '0 0 6px rgba(142, 132, 184, 0.1)',
};

const darkColors = {
  // Backgrounds
  bgPrimary: '#1e293b',
  bgSecondary: '#0f172a',
  bgHover: 'rgba(142, 132, 184, 0.12)',
  bgActiveItem: 'rgba(142, 132, 184, 0.15)',
  bgInput: '#0f172a',
  bgDropdown: '#1e293b',
  bgOverlay: 'rgba(0, 0, 0, 0.7)',
  bgChat: '#0f172a',

  // Borders
  borderPrimary: '#334155',
  borderInput: '#475569',
  borderAccent: '#8E84B8',

  // Text
  textPrimary: '#f1f5f9',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  textFaint: '#64748b',
  textAccent: '#a89cd6',

  // Shadows
  shadowCard: '0 2px 12px rgba(0, 0, 0, 0.4)',
  shadowDropdown: '0 4px 16px rgba(0, 0, 0, 0.5)',
  shadowActive: '0 0 6px rgba(142, 132, 184, 0.25)',
};

/**
 * Returns the correct color palette based on whether dark mode is active.
 * Use in components: const colors = useDarkColors();
 */
export const getDarkColors = (isDark) => isDark ? darkColors : lightColors;

// Hook form for use in components
import { useTheme } from '../contexts/ThemeContext';

export const useDarkColors = () => {
  const { resolvedTheme } = useTheme();
  return getDarkColors(resolvedTheme === 'dark');
};

export const useIsDark = () => {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'dark';
};
