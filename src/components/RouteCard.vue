<template>
  <div class="route-card">
    <div class="route-card__image">
      <img :src="staticMapUrl" :alt="route.name + ' Route Map'" />
    </div>
    <div class="route-card__content">
      <div class="route-card__header">
        <h2 class="route-card__title">{{ route.name }}</h2>
        <span :class="['route-card__badge', 'route-card__badge--' + route.difficulty]">
          {{ capitalizeFirst(route.difficulty) }}
        </span>
      </div>
      <p class="route-card__subtitle">{{ route.type.toUpperCase() }}</p>
      <p class="route-card__description">{{ route.description }}</p>
      <router-link :to="'/route/' + route.id" class="route-card__btn">
        <IconMap :size="18" />
        View route details
      </router-link>
    </div>
  </div>
</template>

<script setup>
import IconMap from '@/components/icons/IconMap.vue';

defineProps({
  /** Route config object from event.json */
  route: {
    type: Object,
    required: true,
  },
  /** Static map preview URL */
  staticMapUrl: {
    type: String,
    required: true,
  },
});

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
</script>

<style scoped>
.route-card {
  flex: 1 1 calc(33.333% - 1.5rem);
  min-width: 280px;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-elevated);
  border-radius: var(--radius-card);
  overflow: hidden;
  transition: transform 0.2s ease, background-color 0.3s ease;
}

.route-card:hover {
  transform: translateY(-4px);
}

.route-card__image {
  width: 100%;
  height: 180px;
  overflow: hidden;
  flex-shrink: 0;
}

.route-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(100%);
  transition: filter 0.3s ease;
}

.route-card:hover .route-card__image img {
  filter: grayscale(50%);
}

.route-card__content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.route-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.route-card__title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

.route-card__badge {
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-badge);
  font-size: 0.75rem;
  font-weight: 600;
}

.route-card__badge--easy {
  background: var(--color-diff-easy-bg);
  color: var(--color-diff-easy-text);
  border: none;
}

.route-card__badge--moderate {
  background: var(--color-diff-moderate-bg);
  color: var(--color-diff-moderate-text);
  border: none;
}

.route-card__badge--challenging {
  background: var(--color-diff-challenging-bg);
  color: var(--color-diff-challenging-text);
  border: none;
}

.route-card__subtitle {
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 1px;
  margin: 0 0 1rem;
}

.route-card__description {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0;
  flex-grow: 1;
}

.route-card__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-btn);
  color: var(--color-text);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  margin-top: 1.5rem;
  box-sizing: border-box;
}

.route-card__btn:hover {
  background-color: var(--color-card-hover-bg);
  border-color: var(--color-text-muted);
}

@media (max-width: 1024px) {
  .route-card {
    flex: 1 1 calc(50% - 1rem);
  }
}

@media (max-width: 768px) {
  .route-card {
    flex: 1 1 100%;
    max-width: 100%;
  }
}
</style>
