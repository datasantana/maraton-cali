/**
 * useRouteAnimation — Composable that encapsulates the route animation logic.
 *
 * Manages:
 *  - `requestAnimationFrame` loop (frame → updateDisplay → camera)
 *  - Play / pause / speed / seek controls (driven by the Pinia playbackStore)
 *
 * Delegates layer management to useMapLayers and marks to useMarkers.
 *
 * Captured closure variables (startTime, isPaused, speed, …) avoid Vue
 * reactivity overhead for high-frequency animation state.
 *
 * @param {import('pinia').Store} store - The playback Pinia store instance
 * @returns {{ setup: (map: mapboxgl.Map) => void }}
 */

import { watch, onBeforeUnmount } from 'vue';
import mapboxgl from 'mapbox-gl';
import turf from 'turf';
import tokens from '@/theme/tokens';
import { useMapLayers } from '@/composables/useMapLayers';
import { useMarkers } from '@/composables/useMarkers';

export function useRouteAnimation(store) {
  // Control closures — assigned inside setup() once the map + data are ready
  let _seekToPhase = null;
  let _togglePause = null;
  let _setSpeed = null;
  let _internalPhase = 0;
  let _animationFrame = null;
  let _restartTimeout = null;

  // --- External-control watchers (reference mutable closures) ----------------

  watch(() => store.progress, (newVal) => {
    if (_seekToPhase && Math.abs(newVal - _internalPhase) > 0.002) {
      _seekToPhase(newVal);
    }
  });

  watch(() => store.isPlaying, (newVal) => {
    if (_togglePause) _togglePause(newVal);
  });

  watch(() => store.speed, (newVal) => {
    if (_setSpeed) _setSpeed(newVal);
  });

  onBeforeUnmount(() => {
    if (_animationFrame) cancelAnimationFrame(_animationFrame);
    if (_restartTimeout) clearTimeout(_restartTimeout);
  });

  // ---------------------------------------------------------------------------
  // setup(map) — called once after map 'load' fires
  // ---------------------------------------------------------------------------

  function setup(map) {
    const pathData = store.pathData;
    const marksData = store.marksData;
    const duration = store.duration;
    const showMarks = true;
    const startBearing = 0;

    // Extract the LineString feature (first feature in the FeatureCollection)
    const lineFeature = pathData.features[0];

    // Pre-calculate the total distance of the path (2D; turf ignores the 3rd coordinate)
    const totalDistance = turf.lineDistance(lineFeature);

    // Animation state variables (plain JS — no reactivity needed)
    let startTime;
    let isPaused = true;       // Always start paused — user must press play
    let pauseTimestamp = performance.now();
    let speed = store.speed;
    let hasStarted = false;    // Whether the animation has ever been started
    let savedCameraState = null;

    _internalPhase = 0;

    // --- Compute route bounds for fit operations ---
    const routeBounds = new mapboxgl.LngLatBounds();
    lineFeature.geometry.coordinates.forEach(coord => {
      routeBounds.extend([coord[0], coord[1]]);
    });

    // --- Initialize map layers and marks ---
    const { showAnimationLayers, showOverviewLayers, headMarker } = useMapLayers(map, lineFeature);
    const { updateHeadPosition, resetPopup } = useMarkers(map, marksData, showMarks, lineFeature, totalDistance);

    // --- Speed control (called from speed watcher) ---
    _setSpeed = (newSpeed) => {
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
        pitch,
        bearing,
      };
      if (smooth) {
        map.jumpTo(newCameraPosition);
      } else {
        map.easeTo(newCameraPosition);
      }
      return newCameraPosition;
    };

    // --- Display update helper (used by both animation frame and seek) ---
    const updateDisplay = (phase, moveCamera = true) => {
      const currentDistance = totalDistance * phase;
      const { coordinates } = turf.along(lineFeature, currentDistance).geometry;
      const [lng, lat] = coordinates;

      // Update the head marker BEFORE the camera to keep them in sync
      headMarker.setLngLat([lng, lat]);

      // Update mark popup (proximity-based, only active during animation)
      updateHeadPosition(lng, lat, phase, !isPaused);

      if (moveCamera) {
        const bearing = startBearing - phase * 300.0;
        computeCameraPosition(45, bearing, [lng, lat], 50, true);
      }

      // Two-tone gradient on the route line
      // Uses a single interpolate expression with a near-instant transition to
      // transparent at the leading edge. Avoids `case` + `<` which causes a
      // second-line rendering artifact in the gradient texture.
      // Reference: https://www.mapbox.com/blog/building-cinematic-route-animations-with-mapboxgl
      const safePhase = Math.max(phase, 0.0001);
      map.setPaintProperty('lineLayer', 'line-gradient', [
        'interpolate',
        ['linear'],
        ['line-progress'],
        0,
        tokens.colors.route.gradientStart,
        safePhase,
        tokens.colors.route.gradientEnd,
        Math.min(safePhase + 0.0001, 1),
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
      _internalPhase = animationPhase;

      // Write current progress directly to the store
      store.setProgress(animationPhase);

      updateDisplay(animationPhase);

      if (animationPhase < 1) {
        _animationFrame = window.requestAnimationFrame(frame);
      } else {
        // Animation complete — hide popup and restart after a short delay
        resetPopup();
        _restartTimeout = setTimeout(() => {
          startTime = undefined;
          _internalPhase = 0;
          store.setProgress(0);
          _animationFrame = window.requestAnimationFrame(frame);
        }, 1500);
      }
    };

    // --- Pause / resume / first-play control (called from playing watcher) ---
    _togglePause = (playing) => {
      if (playing && !hasStarted) {
        // ── FIRST PLAY ──────────────────────────────────────────────
        hasStarted = true;
        isPaused = false;
        pauseTimestamp = null;

        // Initialize the animated progress display at phase 0
        updateDisplay(0, false);

        // Show animated layers, hide full route
        showAnimationLayers();

        // Fly to start point of route (pitch 45, zoom 17)
        // Duration doubled to let tiles load before animation begins
        const startCoords = lineFeature.geometry.coordinates[0];
        map.flyTo({
          center: [startCoords[0], startCoords[1]],
          zoom: 17,
          pitch: 45,
          bearing: 0,
          duration: 4000,
        });

        map.once('moveend', () => {
          startTime = undefined;
          _animationFrame = window.requestAnimationFrame(frame);
        });

      } else if (playing && isPaused) {
        // ── RESUME FROM PAUSE ───────────────────────────────────────
        isPaused = false;

        // Show animated layers, hide full route
        showAnimationLayers();

        if (savedCameraState) {
          // Duration doubled to let tiles load before animation resumes
          map.flyTo({
            ...savedCameraState,
            duration: 3000,
          });

          map.once('moveend', () => {
            if (startTime !== undefined && pauseTimestamp !== null) {
              startTime += performance.now() - pauseTimestamp;
            }
            pauseTimestamp = null;
            savedCameraState = null;
            _animationFrame = window.requestAnimationFrame(frame);
          });
        } else {
          if (startTime !== undefined && pauseTimestamp !== null) {
            startTime += performance.now() - pauseTimestamp;
          }
          pauseTimestamp = null;
          _animationFrame = window.requestAnimationFrame(frame);
        }

      } else if (!playing && !isPaused) {
        // ── PAUSE ───────────────────────────────────────────────────
        isPaused = true;
        pauseTimestamp = performance.now();
        if (_animationFrame) {
          cancelAnimationFrame(_animationFrame);
        }
        if (_restartTimeout) {
          clearTimeout(_restartTimeout);
        }

        // Save current camera state for resume fly-back
        savedCameraState = {
          center: map.getCenter().toArray(),
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
        };

        // Show full route in gray behind animated progress; hide popup
        showOverviewLayers();
        resetPopup();

        // Fly to fit route extent, top-down view
        // Duration doubled for smoother overview transition
        const fitCamera = map.cameraForBounds(routeBounds, { padding: 50 });
        map.flyTo({
          center: fitCamera.center,
          zoom: fitCamera.zoom,
          pitch: 0,
          bearing: 0,
          duration: 3000,
        });
      }
    };

    // --- Seek control (called from progress watcher) ---
    _seekToPhase = (targetPhase) => {
      if (!hasStarted) return; // Cannot seek before animation starts

      const clampedPhase = Math.max(0, Math.min(1, targetPhase));
      const now = performance.now();
      const effectiveNow = isPaused ? (pauseTimestamp || now) : now;

      // Adjust startTime so animation phase matches the target
      startTime = effectiveNow - clampedPhase * (duration / speed);
      _internalPhase = clampedPhase;

      // Update display — skip camera movement when paused (overview mode)
      updateDisplay(clampedPhase, !isPaused);

      // If animation had stopped (phase ≥ 1), restart the frame loop
      if (!isPaused && clampedPhase < 1) {
        if (_animationFrame) cancelAnimationFrame(_animationFrame);
        if (_restartTimeout) clearTimeout(_restartTimeout);
        _animationFrame = window.requestAnimationFrame(frame);
      }
    };

    // --- Fit map to full route extent, top-down view (initial state) ---
    map.fitBounds(routeBounds, {
      padding: 50,
      pitch: 0,
      bearing: 0,
    });

    // Do NOT start animation automatically — wait for user to press play
  }

  return { setup };
}
