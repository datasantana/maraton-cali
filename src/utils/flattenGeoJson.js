/**
 * flattenGeoJson — Strips 3D (Z) values from coordinates and normalises all
 * geometry types to flat 2D LineStrings / Points.
 *
 * Supported transformations:
 *  - LineString / MultiLineString → single LineString (2D)
 *  - Point / MultiPoint           → Point(s)           (2D)
 *  - Polygon / MultiPolygon       → dropped (not useful for route rendering)
 *
 * Any feature whose geometry cannot be mapped to a LineString or Point is
 * silently discarded so downstream code only ever receives clean features.
 *
 * @param {Object} geojson - A GeoJSON FeatureCollection (or single Feature)
 * @returns {Object} A new FeatureCollection with flat 2D geometries
 */
export function flattenGeoJson(geojson) {
  // Accept a bare Feature by wrapping it
  const features =
    geojson.type === 'FeatureCollection'
      ? geojson.features
      : geojson.type === 'Feature'
        ? [geojson]
        : [];

  const flatFeatures = [];

  for (const feature of features) {
    const { geometry, properties, ...rest } = feature;
    if (!geometry) continue;

    switch (geometry.type) {
      // --- LineString: strip Z from each coordinate ---
      case 'LineString':
        flatFeatures.push({
          ...rest,
          type: 'Feature',
          properties: properties || {},
          geometry: {
            type: 'LineString',
            coordinates: geometry.coordinates.map(stripZ),
          },
        });
        break;

      // --- MultiLineString: merge all rings into one flat LineString ---
      case 'MultiLineString':
        flatFeatures.push({
          ...rest,
          type: 'Feature',
          properties: properties || {},
          geometry: {
            type: 'LineString',
            coordinates: geometry.coordinates.flat().map(stripZ),
          },
        });
        break;

      // --- Point: strip Z ---
      case 'Point':
        flatFeatures.push({
          ...rest,
          type: 'Feature',
          properties: properties || {},
          geometry: {
            type: 'Point',
            coordinates: stripZ(geometry.coordinates),
          },
        });
        break;

      // --- MultiPoint: explode into individual Points ---
      case 'MultiPoint':
        for (const coord of geometry.coordinates) {
          flatFeatures.push({
            type: 'Feature',
            properties: properties || {},
            geometry: {
              type: 'Point',
              coordinates: stripZ(coord),
            },
          });
        }
        break;

      // Other geometry types (Polygon, GeometryCollection, etc.) are dropped
      default:
        break;
    }
  }

  return {
    type: 'FeatureCollection',
    features: flatFeatures,
  };
}

/**
 * Strip the Z (elevation) value from a coordinate, keeping only [lng, lat].
 * @param {number[]} coord - [lng, lat] or [lng, lat, z]
 * @returns {number[]} [lng, lat]
 */
function stripZ(coord) {
  return [coord[0], coord[1]];
}
