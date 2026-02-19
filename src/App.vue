<template>
  <router-view/>
</template>

<script setup>
import { useTheme } from '@/theme';

// Initialize global theme (dark/light class on <html>, localStorage, cross-tab sync)
useTheme();
</script>

<style>
body {
  margin: 0;
  font-family: var(--font-family);
  background-color: var(--color-bg);
  color: var(--color-text);
  transition: var(--transition-theme);
}
</style>
