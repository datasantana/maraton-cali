<template>
  <section class="hero-section">
    <h1 class="hero-section__title">{{ city }}</h1>
    <div class="hero-section__date">
      <IconCalendar :size="20" />
      <span>{{ formattedDate }}</span>
    </div>
  </section>
</template>

<script setup>
import IconCalendar from '@/components/icons/IconCalendar.vue';

defineProps({
  /** City name displayed as main hero heading */
  city: {
    type: String,
    required: true,
  },
  /** Formatted event date string */
  formattedDate: {
    type: String,
    required: true,
  },
});
</script>

<style scoped>
.hero-section {
  text-align: center;
  padding: 4rem 2rem;
}

.hero-section__title {
  font-size: 6rem;
  font-weight: 800;
  margin: 0 0 1rem;
  letter-spacing: -2px;
}

.hero-section__date {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--color-primary);
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .hero-section__title {
    font-size: 4rem;
  }
}
</style>
