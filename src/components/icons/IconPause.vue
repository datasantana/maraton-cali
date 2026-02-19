<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="currentColor"
    :style="{ color }"
    aria-hidden="true"
  >
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
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
