/**
 * Theme — public barrel export.
 *
 * Usage in components (Composition API):
 *   import { useTheme } from '@/theme';
 *   const { isLightTheme, toggleTheme } = useTheme();
 *
 *   import tokens from '@/theme/tokens';
 *
 * The CSS variables file (variables.css) is imported once in main.js.
 */

export { useTheme } from './useTheme';
export { default as tokens } from './tokens';
