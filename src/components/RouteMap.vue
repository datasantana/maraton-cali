<template>
  <!-- PlayBack removed from here — now a sibling in the parent view for proper progress sync -->
  <div class="map-wrapper">
    <div ref="mapContainer" class="map"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import mapboxgl from 'mapbox-gl';
import { useRouteAnimation } from '@/composables/useRouteAnimation';

const props = defineProps({
  // GeoJSON FeatureCollection — features[0] must be a LineString
  pathData: {
    type: Object,
    required: true,
  },
  // GeoJSON FeatureCollection of Point features (marks) — kept for future use
  marksData: {
    type: Object,
    default: () => ({ type: 'FeatureCollection', features: [] }),
  },
  // Animation duration in milliseconds
  duration: {
    type: Number,
    default: 300000,
  },
  // Current progress (0–1) synced with parent for PlayBack coordination
  progress: {
    type: Number,
    default: 0,
  },
  // Whether the animation is currently playing (driven by parent)
  playing: {
    type: Boolean,
    default: true,
  },
  // Speed multiplier for animation (driven by parent)
  speed: {
    type: Number,
    default: 1,
  },
  // Toggle to activate marks rendering — disabled for now
  showMarks: {
    type: Boolean,
    default: false,
  },
  // DOM element to use as fullscreen container (defaults to map container)
  fullscreenContainer: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:progress']);

// Template ref
const mapContainer = ref(null);

// Map instance (non-reactive to avoid Vue proxy overhead on Mapbox internals)
let map = null;

// Composable — watchers are registered immediately; setup() called after map loads
const { setup: setupAnimation } = useRouteAnimation(props, emit);

function initMap() {
  // Mapbox configuration from environment variables
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: import.meta.env.VITE_MAPBOX_STYLE || 'mapbox://styles/mapbox/standard',
    center: [
      parseFloat(import.meta.env.VITE_MAPBOX_CENTER_LNG) || -76.5410942407,
      parseFloat(import.meta.env.VITE_MAPBOX_CENTER_LAT) || 3.4300127118,
    ],
    zoom: 12,
    pitch: 0,
  });

  // Add navigation control with a compass and zoom controls.
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');
  // Add fullscreen control — use parent container so overlays (PlayBack, RaceTitle) stay visible
  const fullscreenOptions = props.fullscreenContainer ? { container: props.fullscreenContainer } : {};
  map.addControl(new mapboxgl.FullscreenControl(fullscreenOptions), 'top-right');

  map.on('load', () => {
    setupAnimation(map);
  });
}

onMounted(() => {
  initMap();
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
  }
});
</script>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
}
.map {
  width: 100%;
  height: 100%;
}
</style>
