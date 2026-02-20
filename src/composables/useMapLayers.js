/**
 * useMapLayers — Composable that manages Mapbox sources and layers for route rendering.
 *
 * Creates three layer groups:
 *  1. Full route (dashed, visible initially and when paused)
 *  2. Animated line (gradient, visible during playback)
 *  3. Head marker (circle at current animation position)
 *
 * @param {mapboxgl.Map} map - Mapbox map instance
 * @param {Object} lineFeature - GeoJSON LineString feature
 * @returns {{ showAnimationLayers: Function, showOverviewLayers: Function }}
 */

import tokens from '@/theme/tokens';

export function useMapLayers(map, lineFeature) {
  const coordinates = lineFeature.geometry.coordinates;

  // --- Full route layer (visible initially and when paused) ---
  map.addSource('full-route', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates,
      },
    },
  });
  map.addLayer({
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
  map.addSource('line', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates,
      },
    },
    lineMetrics: true,
  });
  map.addLayer({
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

  // --- Animated head marker (circle at front of the path) ---
  map.addSource('head', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [],
      },
    },
  });
  map.addLayer({
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

  /**
   * Show animated layers (line + head) and hide full route.
   * Used when animation starts or resumes.
   */
  function showAnimationLayers() {
    map.setLayoutProperty('lineLayer', 'visibility', 'visible');
    map.setLayoutProperty('headLayer', 'visibility', 'visible');
    map.setLayoutProperty('fullRouteLayer', 'visibility', 'none');
  }

  /**
   * Show full route layer (overview mode when paused).
   */
  function showOverviewLayers() {
    map.setLayoutProperty('fullRouteLayer', 'visibility', 'visible');
  }

  return {
    showAnimationLayers,
    showOverviewLayers,
  };
}
