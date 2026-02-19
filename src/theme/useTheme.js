/**
 * useTheme — Composition API composable that replaces the legacy themeMixin.
 *
 * Provides reactive dark / light theme toggling with:
 *   - localStorage persistence
 *   - OS preference fallback (prefers-color-scheme)
 *   - Cross-tab synchronisation via the `storage` event
 *   - Automatic `.light-theme` class on `<html>` for CSS variable switching
 *
 * Usage:
 *   import { useTheme } from '@/theme';
 *   const { isLightTheme, toggleTheme } = useTheme();
 */

import { ref, watch, onMounted, onBeforeUnmount } from 'vue';

export function useTheme() {
  const isLightTheme = ref(false);

  // Keep <html> class in sync for global CSS vars
  watch(isLightTheme, (light) => {
    document.documentElement.classList.toggle('light-theme', light);
  });

  /** Toggle between dark and light, persisting to localStorage. */
  function toggleTheme() {
    isLightTheme.value = !isLightTheme.value;
    localStorage.setItem('theme', isLightTheme.value ? 'light' : 'dark');
  }

  // Cross-tab synchronisation handler
  let storageHandler = null;

  onMounted(() => {
    // 1. Restore from localStorage
    const saved = localStorage.getItem('theme');
    if (saved) {
      isLightTheme.value = saved === 'light';
    } else {
      isLightTheme.value = window.matchMedia('(prefers-color-scheme: light)').matches;
    }

    // Apply immediately
    document.documentElement.classList.toggle('light-theme', isLightTheme.value);

    // 2. Cross-tab synchronisation
    storageHandler = () => {
      const theme = localStorage.getItem('theme');
      if (theme) {
        isLightTheme.value = theme === 'light';
      }
    };
    window.addEventListener('storage', storageHandler);
  });

  onBeforeUnmount(() => {
    if (storageHandler) {
      window.removeEventListener('storage', storageHandler);
    }
  });

  return { isLightTheme, toggleTheme };
}
