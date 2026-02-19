<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="currentColor"
    :style="{ color }"
    aria-hidden="true"
  >
    <path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28A1 1 0 008 5.14z" />
  </svg>
</template>

<script setup>
defineProps({
  /** Icon width & height in px */
  size: {
    type: [Number, String],
    default: 24,
  },
  /** Icon colour — inherits from parent via currentColor by default */
  color: {
    type: String,
    default: 'currentColor',
  },
});
</script>
