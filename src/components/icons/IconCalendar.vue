<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :style="{ color }"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" />
    <path
      d="M16 2v4M8 2v4M3 10h18"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
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
