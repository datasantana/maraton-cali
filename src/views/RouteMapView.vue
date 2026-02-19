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
        :fullscreenContainer="$refs.routeViewContainer"
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

<script>
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

export default {
  name: 'RouteMapView',
  components: {
    RouteMap,
    PlayBack,
    RaceTitle,
  },
  data() {
    return {
      // Route data
      pathData: null,
      marksData: null,
      elevationProfile: [],
      totalDistance: 0,
      duration: 300000,
      // Event-level city
      eventCity: EVENT_CITY,
      // Route metadata for RaceTitle
      routeConfig: null,
      // Shared playback state — single source of truth for both children
      progress: 0,
      isPlaying: false,
      currentSpeed: 1,
      // Loading state
      loading: true,
      error: null,
    };
  },
  watch: {
    '$route.params.routeId': {
      immediate: true,
      handler(routeId) {
        this.loadRouteData(routeId);
      },
    },
  },
  methods: {
    async loadRouteData(routeId) {
      this.loading = true;
      this.error = null;
      this.pathData = null;
      this.marksData = null;
      this.elevationProfile = [];
      this.totalDistance = 0;
      this.routeConfig = null;
      this.progress = 0;
      this.isPlaying = false;
      this.currentSpeed = 1;

      const config = ROUTE_MAP[routeId];
      if (!config) {
        this.error = `Route "${routeId}" not found.`;
        this.loading = false;
        return;
      }

      this.routeConfig = config;

      try {
        if (config.legacy) {
          // Legacy route: separate path + marks JSON files in routes/ and marks/
          const [pathModule, marksModule] = await Promise.all([
            import(`@/assets/routes/${routeId}.json`),
            import(`@/assets/marks/${routeId}.json`),
          ]);
          this.pathData = pathModule.default || pathModule;
          this.marksData = marksModule.default || marksModule;
          this.elevationProfile = [];
          this.totalDistance = 0;
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

          this.pathData = {
            type: 'FeatureCollection',
            features: lineFeature ? [lineFeature] : [],
          };

          // Marks preserved for future use (currently showMarks=false on RouteMap)
          this.marksData = {
            type: 'FeatureCollection',
            features: pointFeatures,
          };

          // Parse elevation CSV into numeric-typed array
          this.elevationProfile = parseElevationCsv(csvText);

          // Total distance from the last profile point
          if (this.elevationProfile.length > 0) {
            this.totalDistance = this.elevationProfile[this.elevationProfile.length - 1].distance_km_cum;
          }
        }

        this.duration = config.duration;
      } catch (err) {
        console.error('Failed to load route data:', err);
        this.error = 'Failed to load route data.';
      } finally {
        this.loading = false;
      }
    },

    // Animation drives progress updates — RouteMap → parent → PlayBack
    onMapProgress(val) {
      this.progress = val;
    },

    // Scrub drives progress updates — PlayBack → parent → RouteMap
    onPlaybackScrub(val) {
      this.progress = val;
    },

    // Play/pause state — PlayBack → parent → RouteMap (via playing prop)
    onTogglePlay(playing) {
      this.isPlaying = playing;
    },

    // Speed change — PlayBack → parent → RouteMap (via speed prop)
    onSpeedChange(speed) {
      this.currentSpeed = speed;
    },
  },
};
</script>

<style scoped>
.route-view {
  width: 100%;
  height: 100vh;
  position: relative;
  background: #0a0a0a;
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 1.2rem;
  color: #a1a1a1;
  background: #0a0a0a;
}

.error {
  color: #ff5252;
}
</style>
