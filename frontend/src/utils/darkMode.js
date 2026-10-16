// Dark mode color mapping utility
// Used by components that rely on inline styles to get the right color for the current theme.

const lightColors = {
  // Backgrounds
  bgCanvas: '#faf9f5',
  bgSidebar: '#f5f4ef',
  bgPrimary: '#ffffff',
  bgSecondary: '#faf9f5',
  bgHover: 'rgba(0, 0, 0, 0.04)',
  bgActiveItem: 'rgba(218, 119, 86, 0.08)',
  bgInput: '#ffffff',
  bgDropdown: '#ffffff',
  bgOverlay: 'rgba(0, 0, 0, 0.45)',
  bgChat: '#faf9f5',

  // Borders
  borderPrimary: '#e5e5df',
  borderInput: '#e2e0d8',
  borderAccent: '#da7756',

  // Text
  textPrimary: '#2d2b28',
  textSecondary: '#6b6863',
  textMuted: '#9e9b94',
  textFaint: '#b8b5ad',
  textAccent: '#da7756',
  brandClay: '#da7756',

  // Shadows
  shadowCard: '0 2px 10px rgba(0, 0, 0, 0.04)',
  shadowDropdown: '0 8px 24px -4px rgba(0, 0, 0, 0.12)',
  shadowActive: '0 0 0 2px rgba(218, 119, 86, 0.2)',
};

const darkColors = {
  // Backgrounds
  bgCanvas: '#1f1e1d',
  bgSidebar: '#171715',
  bgPrimary: '#262522',
  bgSecondary: '#1f1e1d',
  bgHover: 'rgba(255, 255, 255, 0.05)',
  bgActiveItem: 'rgba(218, 119, 86, 0.14)',
  bgInput: '#262522',
  bgDropdown: '#262522',
  bgOverlay: 'rgba(0, 0, 0, 0.65)',
  bgChat: '#1f1e1d',

  // Borders
  borderPrimary: '#383733',
  borderInput: '#3d3c37',
  borderAccent: '#da7756',

  // Text
  textPrimary: '#f3f1ec',
  textSecondary: '#a6a39b',
  textMuted: '#78756e',
  textFaint: '#5a5751',
  textAccent: '#da7756',
  brandClay: '#da7756',

  // Shadows
  shadowCard: '0 2px 10px rgba(0, 0, 0, 0.4)',
  shadowDropdown: '0 8px 24px -4px rgba(0, 0, 0, 0.55)',
  shadowActive: '0 0 0 2px rgba(218, 119, 86, 0.25)',
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
