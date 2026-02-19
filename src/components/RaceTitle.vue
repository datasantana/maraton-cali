<template>
  <div class="race-title">
    <div class="race-title__header">
      <span :class="['race-title__badge', difficultyClass]">{{ type }}</span>
      <span class="race-title__city">{{ city }}</span>
    </div>
    <h1 class="race-title__name">{{ name }}</h1>
    <p class="race-title__description">{{ description }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  /** Route display name, e.g. "21K" */
  name: {
    type: String,
    default: '',
  },
  /** Race type label, e.g. "Half Marathon", "Marathon" */
  type: {
    type: String,
    default: '',
  },
  /** City name, e.g. "Madrid" */
  city: {
    type: String,
    default: '',
  },
  /** Total distance in km, e.g. 21.097 */
  distance: {
    type: Number,
    default: 0,
  },
  /** Distance unit, e.g. "km" */
  distanceUnit: {
    type: String,
    default: 'km',
  },
  /** Route difficulty: "easy" | "moderate" | "challenging" */
  difficulty: {
    type: String,
    default: 'moderate',
  },
  /** Short description, e.g. "Castellana to Madrid Río" */
  description: {
    type: String,
    default: '',
  },
});

/** Format total distance with locale separators, e.g. "21,097m" or "15km" */
const formattedTotalDistance = computed(() => {
  if (!props.distance) return '';
  const isWholeKm = props.distance === Math.floor(props.distance);
  if (isWholeKm) {
    return `${props.distance.toLocaleString()}${props.distanceUnit}`;
  }
  const metres = Math.round(props.distance * 1000);
  return `${metres.toLocaleString()}m`;
});

const difficultyClass = computed(() => {
  return `race-title__badge--${props.difficulty}`;
});
</script>

<style scoped>
.race-title {
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 1000;
  padding: 16px 20px;
  background: var(--color-bg-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius);
  font-family: var(--font-family);
  color: var(--color-text);
  box-shadow: 0 8px 32px var(--color-shadow);
  max-width: 320px;
  transition: var(--transition-theme);
}

/* Header row: badge + distance */
.race-title__header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

/* Type badge */
.race-title__badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  line-height: 1.4;
  white-space: nowrap;
}

/* Difficulty colour variants */
.race-title__badge--easy {
  background: var(--color-diff-easy-bg);
  color: var(--color-diff-easy-text);
}

.race-title__badge--moderate {
  background: var(--color-diff-moderate-bg);
  color: var(--color-diff-moderate-text);
}

.race-title__badge--challenging {
  background: var(--color-diff-challenging-bg);
  color: var(--color-diff-challenging-text);
}

/* City text next to badge */
.race-title__city {
  font-size: 13px;
  font-weight: 500;
  opacity: 0.55;
}

/* Route name */
.race-title__name {
  margin: 0 0 4px;
  font-size: 26px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.3px;
}

/* Description */
.race-title__description {
  margin: 0;
  font-size: 13px;
  font-weight: 400;
  opacity: 0.6;
  line-height: 1.3;
}

/* ─── Mobile: notch centrado ─── */
@media (max-width: 768px) {
  .race-title {
    top: 12px;
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    max-width: calc(100% - 48px);
    width: auto;
    border-radius: 14px;
    padding: 10px 18px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .race-title__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    margin-bottom: 0;
    flex-shrink: 0;
  }

  .race-title__name {
    font-size: 18px;
    margin: 0;
    white-space: nowrap;
  }

  .race-title__description {
    display: none;
  }
}
</style>
