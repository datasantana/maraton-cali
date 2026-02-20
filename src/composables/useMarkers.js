/**
 * useMarkers — Composable for race marks layer management.
 *
 * Currently inactive — preserved for future use.
 * Requires showMarks=true and a marksData FeatureCollection
 * with Point features to activate.
 *
 * TODO: Replace require() paths with Vite-compatible imports
 *       (new URL('../assets/marker.png', import.meta.url).href)
 *       when this feature is reactivated.
 *
 * @param {mapboxgl.Map} map - Mapbox map instance
 * @param {Object} marksData - GeoJSON FeatureCollection of Point features
 * @param {boolean} showMarks - Whether to activate marks rendering
 */

export function useMarkers(map, marksData, showMarks) {
  if (!showMarks || !marksData || !marksData.features || marksData.features.length === 0) {
    return;
  }

  map.addSource('marks', {
    type: 'geojson',
    data: marksData,
  });

  // loadMarkerImagesAndLayers(map) — reactivate when mark images are available
}
