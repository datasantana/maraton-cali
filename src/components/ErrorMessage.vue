<template>
  <div class="error-message" :class="{ 'error-message--fullscreen': fullscreen }">
    <p class="error-message__text">{{ message }}</p>
    <button
      v-if="retryable"
      class="error-message__retry"
      @click="$emit('retry')"
    >
      Retry
    </button>
  </div>
</template>

<script setup>
/**
 * ErrorMessage — Reusable error display.
 *
 * Shows an error message with an optional retry button.
 * When `fullscreen` is true (default), the container covers the entire
 * viewport, replacing the view's content.
 */
defineProps({
  /** Error text to display */
  message: {
    type: String,
    default: 'Something went wrong.',
  },
  /** Whether a retry button should be shown */
  retryable: {
    type: Boolean,
    default: false,
  },
  /** Whether the error should fill the whole viewport */
  fullscreen: {
    type: Boolean,
    default: true,
  },
});

defineEmits(['retry']);
</script>

<style scoped>
.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-family: var(--font-family);
}

.error-message--fullscreen {
  height: 100vh;
  width: 100%;
  background: var(--color-bg);
}

.error-message__text {
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-diff-challenging-text);
  text-align: center;
  max-width: 480px;
  padding: 0 1rem;
}

.error-message__retry {
  padding: 0.5rem 1.5rem;
  font-size: 0.95rem;
  font-family: var(--font-family);
  color: var(--color-text);
  background: var(--color-speed-btn-bg);
  border: 1px solid var(--color-speed-btn-border);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.error-message__retry:hover {
  background: var(--color-speed-btn-hover-bg);
}
</style>
