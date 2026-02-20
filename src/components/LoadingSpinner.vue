<template>
  <div class="loading-spinner" :class="{ 'loading-spinner--fullscreen': fullscreen }">
    <div class="loading-spinner__circle" />
    <p v-if="message" class="loading-spinner__message">{{ message }}</p>
  </div>
</template>

<script setup>
/**
 * LoadingSpinner — Reusable loading indicator.
 *
 * Displays an animated spinner with an optional message.
 * When `fullscreen` is true (default), the container covers the entire
 * viewport so it can replace a view's content while data loads.
 */
defineProps({
  /** Text shown below the spinner */
  message: {
    type: String,
    default: 'Loading…',
  },
  /** Whether the spinner should fill the whole viewport */
  fullscreen: {
    type: Boolean,
    default: true,
  },
});
</script>

<style scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-family: var(--font-family);
  color: var(--color-text-muted);
}

.loading-spinner--fullscreen {
  height: 100vh;
  width: 100%;
  background: var(--color-bg);
}

/* Animated ring */
.loading-spinner__circle {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-brand-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-spinner__message {
  margin: 0;
  font-size: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
