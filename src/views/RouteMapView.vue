<template>
  <div class="route-view" ref="routeViewContainer">
    <div v-if="loading" class="loading">Loading route...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <!--
      RouteMap and PlayBack are siblings inside the parent so that progress,
      playing and speed state can be managed here and passed via props.
      PlayBack overlays on the map using absolute positioning.
    -->
    <template v-else>
      <RouteMap
        :pathData="pathData"
        :marksData="marksData"
        :duration="duration"
        :progress="progress"
        :playing="isPlaying"
        :speed="currentSpeed"
        :showMarks="false"
        :fullscreenContainer="routeViewContainer"
        @update:progress="onMapProgress"
      />
      <RaceTitle
        v-if="routeConfig"
        :name="routeConfig.name"
        :type="routeConfig.type"
        :city="eventCity"
        :distance="routeConfig.distance"
        :distanceUnit="routeConfig.distanceUnit"
        :difficulty="routeConfig.difficulty"
        :description="routeConfig.description"
      />
      <PlayBack
        :playing="isPlaying"
        :progress="progress"
        :elevationProfile="elevationProfile"
        :totalDistance="totalDistance"
        @toggle-play="onTogglePlay"
        @speed-change="onSpeedChange"
        @update:progress="onPlaybackScrub"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import RouteMap from '@/components/RouteMap.vue';
import PlayBack from '@/components/PlayBack.vue';
import RaceTitle from '@/components/RaceTitle.vue';
import { parseElevationCsv } from '@/utils/parseElevationCsv';
import eventData from '@/assets/event.json';

// Build route lookup from centralized event config.
// Asset files follow a naming convention based on route id:
//   routes/{id}.geojson   — route geometry (GeoJSON FeatureCollection)
//   elevation/{id}.csv    — elevation profile
//   marks/{id}.json       — race marks (optional, for legacy routes)
const ROUTE_MAP = Object.fromEntries(
  eventData.routes.map(r => [r.id, r])
);

// Event-level city from centralized config
const EVENT_CITY = eventData.city || '';

const route = useRoute();

// --- Route data ---
const pathData = ref(null);
const marksData = ref(null);
const elevationProfile = ref([]);
const totalDistance = ref(0);
const duration = ref(300000);
const eventCity = EVENT_CITY;
const routeConfig = ref(null);

// --- Shared playback state — single source of truth for both children ---
const progress = ref(0);
const isPlaying = ref(false);
const currentSpeed = ref(1);

// --- Loading state ---
const loading = ref(true);
const error = ref(null);

// --- Template ref for fullscreen container ---
const routeViewContainer = ref(null);

// --- Data loading ---
async function loadRouteData(routeId) {
  loading.value = true;
  error.value = null;
  pathData.value = null;
  marksData.value = null;
  elevationProfile.value = [];
  totalDistance.value = 0;
  routeConfig.value = null;
  progress.value = 0;
  isPlaying.value = false;
  currentSpeed.value = 1;

  const config = ROUTE_MAP[routeId];
  if (!config) {
    error.value = `Route "${routeId}" not found.`;
    loading.value = false;
    return;
  }

  routeConfig.value = config;

  try {
    if (config.legacy) {
      // Legacy route: separate path + marks JSON files in routes/ and marks/
      const [pathModule, marksModule] = await Promise.all([
        import(`@/assets/routes/${routeId}.json`),
        import(`@/assets/marks/${routeId}.json`),
      ]);
      pathData.value = pathModule.default || pathModule;
      marksData.value = marksModule.default || marksModule;
      elevationProfile.value = [];
      totalDistance.value = 0;
    } else {
      // Standard route: GeoJSON + elevation CSV
      const [geojsonModule, csvModule] = await Promise.all([
        import(`@/assets/routes/${routeId}.geojson`),
        import(`@/assets/elevation/${routeId}.csv?raw`),
      ]);

      const geojson = geojsonModule.default || geojsonModule;
      const csvText = csvModule.default || csvModule;

      // Split GeoJSON into:
      //   - pathData:  FeatureCollection with the LineString (route geometry)
      //   - marksData: FeatureCollection with Point features (enriched waypoints)
      const lineFeature = geojson.features.find(f => f.geometry.type === 'LineString');
      const pointFeatures = geojson.features.filter(f => f.geometry.type === 'Point');

      pathData.value = {
        type: 'FeatureCollection',
        features: lineFeature ? [lineFeature] : [],
      };

      // Marks preserved for future use (currently showMarks=false on RouteMap)
      marksData.value = {
        type: 'FeatureCollection',
        features: pointFeatures,
      };

      // Parse elevation CSV into numeric-typed array
      elevationProfile.value = parseElevationCsv(csvText);

      // Total distance from the last profile point
      if (elevationProfile.value.length > 0) {
        totalDistance.value = elevationProfile.value[elevationProfile.value.length - 1].distance_km_cum;
      }
    }

    duration.value = config.duration;
  } catch (err) {
    console.error('Failed to load route data:', err);
    error.value = 'Failed to load route data.';
  } finally {
    loading.value = false;
  }
}

// --- Event handlers ---

// Animation drives progress updates — RouteMap → parent → PlayBack
function onMapProgress(val) {
  progress.value = val;
}

// Scrub drives progress updates — PlayBack → parent → RouteMap
function onPlaybackScrub(val) {
  progress.value = val;
}

// Play/pause state — PlayBack → parent → RouteMap (via playing prop)
function onTogglePlay(playing) {
  isPlaying.value = playing;
}

// Speed change — PlayBack → parent → RouteMap (via speed prop)
function onSpeedChange(speed) {
  currentSpeed.value = speed;
}

// --- Route change watcher ---
watch(() => route.params.routeId, (routeId) => {
  loadRouteData(routeId);
}, { immediate: true });
</script>

<style scoped>
.route-view {
  width: 100%;
  height: 100vh;
  position: relative;
  background: var(--color-bg);
}

/* Ensure the container fills the screen when Mapbox fullscreen control is active */
.route-view:fullscreen {
  width: 100%;
  height: 100%;
}

.loading,
.error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-family: var(--font-family);
  font-size: 1.2rem;
  color: var(--color-text-muted);
  background: var(--color-bg);
}

.error {
  color: var(--color-diff-challenging-text);
}
</style>
