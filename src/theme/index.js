/**
 * Theme — public barrel export.
 *
 * Usage in components (Composition API):
 *   import { useTheme } from '@/theme';
 *   const { isLightTheme, toggleTheme } = useTheme();
 *
 *   import tokens from '@/theme/tokens';
 *
 * The CSS variables are auto-generated from tokens.js at build/dev time
 * by the cssTokensPlugin (see vite.config.js + tokensToCSS.js).
 */

export { useTheme } from './useTheme';
export { default as tokens } from './tokens';
export { tokensToCSS } from './tokensToCSS';
