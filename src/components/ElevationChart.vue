<template>
  <div class="elevation-chart">
    <svg viewBox="0 0 300 40" preserveAspectRatio="none" class="elevation-chart__svg">
      <polyline
        :points="elevationPoints"
        fill="none"
        stroke="url(#progressGradient)"
        stroke-width="2"
      />
      <defs>
        <linearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#00e676" />
          <stop :offset="progressPercent + '%'" stop-color="#00e676" />
          <stop :offset="progressPercent + '%'" stop-color="rgba(255,255,255,0.2)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0.2)" />
        </linearGradient>
      </defs>
    </svg>
    <!-- Progress head indicator -->
    <div class="elevation-chart__head" :style="{ left: progressPercent + '%' }">
      <div class="elevation-chart__head-line"></div>
      <div class="elevation-chart__head-dot"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  /** Parsed elevation profile array */
  elevationProfile: {
    type: Array,
    default: () => [],
  },
  /** Total route distance in km */
  totalDistance: {
    type: Number,
    default: 0,
  },
  /** Current progress 0–1 */
  progress: {
    type: Number,
    default: 0,
  },
});

const progressPercent = computed(() => Math.min(props.progress * 100, 100));

/**
 * Generate SVG polyline points from real elevation profile data.
 * Downsamples to ~150 points for smooth rendering without excessive DOM nodes.
 */
const elevationPoints = computed(() => {
  if (!props.elevationProfile || props.elevationProfile.length === 0) {
    // Fallback placeholder when no profile data is available (legacy routes)
    return '0,20 15,18 30,15 50,19 70,14 90,17 110,12 130,16 150,10 170,13 190,8 210,12 230,6 250,10 270,8 290,12 300,10';
  }

  const profile = props.elevationProfile;
  const maxDist = props.totalDistance || profile[profile.length - 1].distance_km_cum || 1;

  // Find elevation range for Y-axis scaling
  let minEle = Infinity, maxEle = -Infinity;
  for (const p of profile) {
    if (p.ele < minEle) minEle = p.ele;
    if (p.ele > maxEle) maxEle = p.ele;
  }
  const eleRange = maxEle - minEle || 1;

  // Downsample to ~150 points for a smooth SVG without excessive DOM nodes
  const maxPoints = 150;
  const step = Math.max(1, Math.floor(profile.length / maxPoints));

  const points = [];
  for (let i = 0; i < profile.length; i += step) {
    const p = profile[i];
    const x = (p.distance_km_cum / maxDist) * 300;
    const y = 40 - ((p.ele - minEle) / eleRange) * 34 - 3;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  // Always include the last point for a complete profile
  const last = profile[profile.length - 1];
  const lastX = (last.distance_km_cum / maxDist) * 300;
  const lastY = 40 - ((last.ele - minEle) / eleRange) * 34 - 3;
  points.push(`${lastX.toFixed(1)},${lastY.toFixed(1)}`);

  return points.join(' ');
});
</script>

<style scoped>
.elevation-chart {
  position: relative;
  height: 36px;
}

.elevation-chart__svg {
  width: 100%;
  height: 100%;
}

.elevation-chart__head {
  position: absolute;
  top: 0;
  bottom: -6px;
  width: 2px;
  transform: translateX(-50%);
  pointer-events: none;
}

.elevation-chart__head-line {
  width: 2px;
  height: 100%;
  background: var(--color-accent);
  border-radius: 1px;
}

.elevation-chart__head-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
  position: absolute;
  bottom: -3px;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 0 0 6px rgba(0, 230, 118, 0.5);
}
</style>
