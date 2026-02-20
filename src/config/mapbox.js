/**
 * Centralized Mapbox configuration.
 *
 * Reads environment variables once and exports a frozen config object.
 * Components should import this instead of reading `import.meta.env` directly.
 *
 * @example
 * import { mapboxConfig } from '@/config/mapbox';
 * mapboxgl.accessToken = mapboxConfig.accessToken;
 */

const mapboxConfig = Object.freeze({
  accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '',
  style: import.meta.env.VITE_MAPBOX_STYLE || 'mapbox://styles/mapbox/standard',
  center: [
    parseFloat(import.meta.env.VITE_MAPBOX_CENTER_LNG) || -76.5410942407,
    parseFloat(import.meta.env.VITE_MAPBOX_CENTER_LAT) || 3.4300127118,
  ],
  zoom: 12,
  pitch: 0,
});

/**
 * Static-map style used for thumbnail previews (streets style).
 * Kept separate because the interactive map may use a different base style.
 */
const staticMapStyle = 'mapbox://styles/mapbox/streets-v11';

/**
 * Converts a mapbox:// style URL to the path segment needed by the Static Images API.
 * e.g. 'mapbox://styles/mapbox/streets-v11' → 'mapbox/streets-v11'
 */
function staticMapStylePath(styleUrl = staticMapStyle) {
  return styleUrl.replace('mapbox://styles/', '');
}

export { mapboxConfig, staticMapStyle, staticMapStylePath };
