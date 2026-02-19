<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :style="{ color }"
    aria-hidden="true"
  >
    <path
      d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
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
