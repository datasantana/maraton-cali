<template>
  <!-- PlayBack removed from here — now a sibling in the parent view for proper progress sync -->
  <div class="map-wrapper">
    <div ref="mapContainer" class="map"></div>
  </div>
</template>

<script>
import mapboxgl from 'mapbox-gl';
import turf from 'turf';
import tokens from '@/theme/tokens';

export default {
  name: 'RouteMap',
  props: {
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
  },
  emits: ['update:progress'],
  mounted() {
    this.initMap();
  },
  beforeUnmount() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }
    if (this._restartTimeout) {
      clearTimeout(this._restartTimeout);
    }
    if (this.map) {
      this.map.remove();
    }
  },
  watch: {
    // External seek — when PlayBack scrub changes progress significantly
    progress(newVal) {
      if (this._seekToPhase && Math.abs(newVal - (this._internalPhase || 0)) > 0.002) {
        this._seekToPhase(newVal);
      }
    },
    // React to play/pause from parent
    playing(newVal) {
      if (this._togglePause) {
        this._togglePause(newVal);
      }
    },
    // React to speed changes from parent
    speed(newVal) {
      if (this._setSpeed) {
        this._setSpeed(newVal);
      }
    },
  },
  methods: {
    initMap() {
      // Mapbox configuration from environment variables
      mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
      this.map = new mapboxgl.Map({
        container: this.$refs.mapContainer,
        style: import.meta.env.VITE_MAPBOX_STYLE || 'mapbox://styles/mapbox/standard',
        center: [
          parseFloat(import.meta.env.VITE_MAPBOX_CENTER_LNG) || -76.5410942407,
          parseFloat(import.meta.env.VITE_MAPBOX_CENTER_LAT) || 3.4300127118,
        ],
        zoom: 12,
        pitch: 0,
      });

      // Add navigation control with a compass and zoom controls.
      this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      // Add fullscreen control — use parent container so overlays (PlayBack, RaceTitle) stay visible
      const fullscreenOptions = this.fullscreenContainer ? { container: this.fullscreenContainer } : {};
      this.map.addControl(new mapboxgl.FullscreenControl(fullscreenOptions), 'top-right');

      this.map.on('load', () => {
        this.setupAnimation();
      });
    },

    setupAnimation() {
      const pathData = this.pathData;
      const marksData = this.marksData;
      const duration = this.duration;

      // Define a startBearing for camera movement
      const startBearing = 0;

      // Extract the LineString feature (first feature in the FeatureCollection)
      const lineFeature = pathData.features[0];

      // Pre-calculate the total distance of the path (2D; turf ignores the 3rd coordinate)
      const totalDistance = turf.lineDistance(lineFeature);

      // Animation state variables
      let startTime;
      let isPaused = true; // Always start paused — user must press play
      let pauseTimestamp = performance.now();
      let speed = this.speed;
      let hasStarted = false; // Whether the animation has ever been started
      let savedCameraState = null; // Camera state saved on pause for resume fly-back

      // Internal phase tracking for external-seek detection
      this._internalPhase = 0;

      // --- Compute route bounds for fit operations ---
      const routeBounds = new mapboxgl.LngLatBounds();
      lineFeature.geometry.coordinates.forEach(coord => {
        routeBounds.extend([coord[0], coord[1]]);
      });

      // --- Speed control (called from speed watcher) ---
      this._setSpeed = (newSpeed) => {
        const now = performance.now();
        const effectiveNow = isPaused ? pauseTimestamp : now;
        if (startTime !== undefined) {
          const elapsed = effectiveNow - startTime;
          const currentPhase = Math.min(elapsed / (duration / speed), 1);
          speed = newSpeed;
          startTime = effectiveNow - currentPhase * (duration / speed);
        } else {
          speed = newSpeed;
        }
      };

      // --- Pause / resume / first-play control (called from playing watcher) ---
      this._togglePause = (playing) => {
        if (playing && !hasStarted) {
          // ── FIRST PLAY ──────────────────────────────────────────────
          hasStarted = true;
          isPaused = false;
          pauseTimestamp = null;

          // Initialize the animated progress display at phase 0
          updateDisplay(0, false);

          // Show animated layers, hide full route
          this.map.setLayoutProperty('lineLayer', 'visibility', 'visible');
          this.map.setLayoutProperty('headLayer', 'visibility', 'visible');
          this.map.setLayoutProperty('fullRouteLayer', 'visibility', 'none');

          // Fly to start point of route (pitch 45, zoom 17)
          const startCoords = lineFeature.geometry.coordinates[0];
          this.map.flyTo({
            center: [startCoords[0], startCoords[1]],
            zoom: 17,
            pitch: 45,
            bearing: 0,
            duration: 2000,
          });

          this.map.once('moveend', () => {
            startTime = undefined;
            this._animationFrame = window.requestAnimationFrame(frame);
          });

        } else if (playing && isPaused) {
          // ── RESUME FROM PAUSE ───────────────────────────────────────
          isPaused = false;

          // Hide full route
          this.map.setLayoutProperty('fullRouteLayer', 'visibility', 'none');

          if (savedCameraState) {
            this.map.flyTo({
              ...savedCameraState,
              duration: 1500,
            });

            this.map.once('moveend', () => {
              if (startTime !== undefined && pauseTimestamp !== null) {
                startTime += performance.now() - pauseTimestamp;
              }
              pauseTimestamp = null;
              savedCameraState = null;
              this._animationFrame = window.requestAnimationFrame(frame);
            });
          } else {
            if (startTime !== undefined && pauseTimestamp !== null) {
              startTime += performance.now() - pauseTimestamp;
            }
            pauseTimestamp = null;
            this._animationFrame = window.requestAnimationFrame(frame);
          }

        } else if (!playing && !isPaused) {
          // ── PAUSE ───────────────────────────────────────────────────
          isPaused = true;
          pauseTimestamp = performance.now();
          if (this._animationFrame) {
            cancelAnimationFrame(this._animationFrame);
          }
          if (this._restartTimeout) {
            clearTimeout(this._restartTimeout);
          }

          // Save current camera state for resume fly-back
          savedCameraState = {
            center: this.map.getCenter().toArray(),
            zoom: this.map.getZoom(),
            pitch: this.map.getPitch(),
            bearing: this.map.getBearing(),
          };

          // Show full route in gray behind animated progress
          this.map.setLayoutProperty('fullRouteLayer', 'visibility', 'visible');

          // Fly to fit route extent, top-down view
          const fitCamera = this.map.cameraForBounds(routeBounds, { padding: 50 });
          this.map.flyTo({
            center: fitCamera.center,
            zoom: fitCamera.zoom,
            pitch: 0,
            bearing: 0,
            duration: 1500,
          });
        }
      };

      // --- Seek control (called from progress watcher) ---
      this._seekToPhase = (targetPhase) => {
        if (!hasStarted) return; // Cannot seek before animation starts

        const clampedPhase = Math.max(0, Math.min(1, targetPhase));
        const now = performance.now();
        const effectiveNow = isPaused ? (pauseTimestamp || now) : now;

        // Adjust startTime so animation phase matches the target
        startTime = effectiveNow - clampedPhase * (duration / speed);
        this._internalPhase = clampedPhase;

        // Update display — skip camera movement when paused (overview mode)
        updateDisplay(clampedPhase, !isPaused);

        // If animation had stopped (phase ≥ 1), restart the frame loop
        if (!isPaused && clampedPhase < 1) {
          if (this._animationFrame) cancelAnimationFrame(this._animationFrame);
          if (this._restartTimeout) clearTimeout(this._restartTimeout);
          this._animationFrame = window.requestAnimationFrame(frame);
        }
      };

      // ---------------------------------------------------------------
      // Marks system — preserved for future use.
      // Set showMarks=true and provide marksData with Point features
      // to reactivate the markers layer.
      // ---------------------------------------------------------------
      if (this.showMarks && marksData && marksData.features && marksData.features.length > 0) {
        this.map.addSource('marks', {
          type: 'geojson',
          data: marksData,
        });
        this._loadMarkerImagesAndLayers();
      }

      // --- Full route layer (visible initially and when paused) ---
      this.map.addSource('full-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: lineFeature.geometry.coordinates,
          },
        },
      });
      this.map.addLayer({
        id: 'fullRouteLayer',
        type: 'line',
        source: 'full-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          'visibility': 'visible',
        },
        paint: {
          'line-color': tokens.colors.route.full,
          'line-width': 5,
          'line-opacity': 0.8,
          'line-dasharray': [2, 2],
        },
      });

      // --- Animated route line source (initially hidden) ---
      this.map.addSource('line', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: lineFeature.geometry.coordinates,
          },
        },
        lineMetrics: true,
      });

      // Add a layer to visualize the animated line (initially hidden)
      this.map.addLayer({
        id: 'lineLayer',
        type: 'line',
        source: 'line',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          'visibility': 'none',
        },
        paint: {
          'line-color': tokens.colors.route.animatedLine,
          'line-width': 8,
        },
      });

      // --- Animated head marker (red circle at front of the path) ---
      this.map.addSource('head', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [],
          },
        },
      });
      this.map.addLayer({
        id: 'headLayer',
        type: 'circle',
        source: 'head',
        layout: {
          'visibility': 'none',
        },
        paint: {
          'circle-radius': 15,
          'circle-color': tokens.colors.route.head,
        },
      });

      // --- Camera position computation ---
      const computeCameraPosition = (pitch, bearing, targetPosition, altitude, smooth = false) => {
        const bearingInRadian = bearing / 57.29;
        const pitchInRadian = (90 - pitch) / 57.29;

        const lngDiff =
          ((altitude * Math.tan(pitchInRadian)) * Math.sin(-bearingInRadian)) / 70000;
        const latDiff =
          ((altitude * Math.tan(pitchInRadian)) * Math.cos(-bearingInRadian)) / 110000;

        const newCameraPosition = {
          center: [targetPosition[0] + lngDiff, targetPosition[1] - latDiff],
          zoom: 17,
          pitch: pitch,
          bearing: bearing,
        };
        if (smooth) {
          this.map.jumpTo(newCameraPosition);
        } else {
          this.map.easeTo(newCameraPosition);
        }
        return newCameraPosition;
      };

      // --- Display update helper (used by both animation frame and seek) ---
      const updateDisplay = (phase, moveCamera = true) => {
        const currentDistance = totalDistance * phase;
        const { coordinates } = turf.along(lineFeature, currentDistance).geometry;
        const [lng, lat] = coordinates;

        if (moveCamera) {
          const bearing = startBearing - phase * 300.0;
          computeCameraPosition(45, bearing, [lng, lat], 50, true);
        }

        // Update the head circle
        this.map.getSource('head').setData({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
        });

        // Two-tone gradient on the route line
        const safePhase = Math.max(phase, 0.0001);
        this.map.setPaintProperty('lineLayer', 'line-gradient', [
          'case',
          ['<', ['line-progress'], safePhase],
          [
            'interpolate',
            ['linear'],
            ['line-progress'],
            0,
            tokens.colors.route.gradientStart,
            safePhase,
            tokens.colors.route.gradientEnd,
          ],
          'rgba(0, 0, 0, 0)',
        ]);
      };

      // --- Animation frame loop ---
      const frame = (time) => {
        if (!startTime) startTime = time;

        // Safety: if paused between RAF schedule and execution, stop
        if (isPaused) return;

        // Clamp animationPhase to 1 to avoid overshooting
        let animationPhase = Math.min((time - startTime) / (duration / speed), 1);

        // Track internal phase for seek-detection in the progress watcher
        this._internalPhase = animationPhase;

        // Notify parent of the current progress
        this.$emit('update:progress', animationPhase);

        updateDisplay(animationPhase);

        if (animationPhase < 1) {
          this._animationFrame = window.requestAnimationFrame(frame);
        } else {
          // Animation complete — restart after a short delay
          this._restartTimeout = setTimeout(() => {
            startTime = undefined;
            this._internalPhase = 0;
            this.$emit('update:progress', 0);
            this._animationFrame = window.requestAnimationFrame(frame);
          }, 1500);
        }
      };

      // --- Fit map to full route extent, top-down view (initial state) ---
      this.map.fitBounds(routeBounds, {
        padding: 50,
        pitch: 0,
        bearing: 0,
      });

      // Do NOT start animation automatically — wait for user to press play
    },

    /**
     * Marks: image loading and layer creation.
     * Preserved intact for future use — currently inactive when showMarks=false.
     * To reactivate: set showMarks=true and ensure marksData has Point features
     * with a `name` property (e.g. "KM5", "Hidratacion", "Gatorade", "Salida", "Llegada").
     */
    _loadMarkerImagesAndLayers() {
      const markerImages = [
        { id: 'distance-marker', path: require('../assets/dist-mark.png') },
        { id: 'hydration-marker', path: require('../assets/punto-hidratacion-2.png') },
        { id: 'gatorade-marker', path: require('../assets/punto-hidratacion-1.png') },
        { id: 'start-marker', path: require('../assets/start-mark.png') },
        { id: 'finish-marker', path: require('../assets/finish-mark.png') },
      ];

      let imagesLoaded = 0;
      const totalImages = markerImages.length;

      const addMarkersLayers = () => {
        // Distance markers (KM%)
        this.map.addLayer({
          id: 'distanceMarkersLayer',
          type: 'symbol',
          source: 'marks',
          filter: ['all', ['>=', ['index-of', 'KM', ['get', 'name']], 0]],
          layout: {
            'icon-image': 'distance-marker',
            'icon-size': 0.2,
            'icon-allow-overlap': true,
            'text-field': ['get', 'name'],
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          },
          paint: {
            'text-color': '#e4e4e4',
            'text-halo-color': 'rgba(0, 0, 0, 0.7)',
            'text-halo-width': 2,
            'text-halo-blur': 1,
          },
        });

        // Hydration markers
        this.map.addLayer({
          id: 'hydrationMarkersLayer',
          type: 'symbol',
          source: 'marks',
          filter: ['==', ['get', 'name'], 'Hidratacion'],
          layout: {
            'icon-image': 'hydration-marker',
            'icon-size': 0.2,
            'icon-allow-overlap': true,
            'icon-anchor': 'bottom',
            'text-offset': [0, -0.5],
            'text-anchor': 'bottom',
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 12,
          },
          paint: {
            'text-color': '#e4e4e4',
            'text-halo-color': 'rgba(0, 0, 0, 0.7)',
            'text-halo-width': 2,
            'text-halo-blur': 1,
          },
        });

        // Gatorade markers
        this.map.addLayer({
          id: 'gatoradeMarkersLayer',
          type: 'symbol',
          source: 'marks',
          filter: ['==', ['get', 'name'], 'Gatorade'],
          layout: {
            'icon-image': 'gatorade-marker',
            'icon-size': 0.2,
            'icon-allow-overlap': true,
            'icon-anchor': 'bottom',
            'text-offset': [0, -0.5],
            'text-anchor': 'bottom',
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 10,
          },
          paint: {
            'text-color': '#e4e4e4',
            'text-halo-color': 'rgba(0, 0, 0, 0.7)',
            'text-halo-width': 2,
            'text-halo-blur': 1,
          },
        });

        // Start marker
        this.map.addLayer({
          id: 'startMarkerLayer',
          type: 'symbol',
          source: 'marks',
          filter: ['==', ['get', 'name'], 'Salida'],
          layout: {
            'icon-image': 'start-marker',
            'icon-size': 0.2,
            'icon-allow-overlap': true,
            'text-field': 'SALIDA',
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 14,
          },
          paint: {
            'text-color': '#00ff00',
            'text-halo-color': 'rgba(0, 0, 0, 0.7)',
            'text-halo-width': 2,
            'text-halo-blur': 1,
          },
        });

        // Finish marker
        this.map.addLayer({
          id: 'finishMarkerLayer',
          type: 'symbol',
          source: 'marks',
          filter: ['==', ['get', 'name'], 'Llegada'],
          layout: {
            'icon-image': 'finish-marker',
            'icon-size': 0.2,
            'icon-allow-overlap': true,
            'text-field': 'META',
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 14,
          },
          paint: {
            'text-color': '#ff0000',
            'text-halo-color': 'rgba(0, 0, 0, 0.7)',
            'text-halo-width': 2,
            'text-halo-blur': 1,
          },
        });
      };

      // Load all images and add layers when complete
      markerImages.forEach((marker) => {
        this.map.loadImage(marker.path, (error, image) => {
          if (error) {
            console.error(`Error loading ${marker.id} image:`, error);
            return;
          }
          if (!this.map.hasImage(marker.id)) {
            this.map.addImage(marker.id, image);
          }
          imagesLoaded++;

          // Add all layers once all images are loaded
          if (imagesLoaded === totalImages) {
            addMarkersLayers();
          }
        });
      });
    },
  },
};
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
