/**
 * useMarkers — Composable for race marks layer management.
 *
 * Two visual modes:
 *  1. **Overview** (initial / paused): KM marks shown as simple orange circles.
 *  2. **Animation** (playing): Full iconographic marks with fade transition.
 *
 * Animation-mode interactions:
 *  - **Start/Finish**: Salida visible at start (phase < 0.5), Llegada visible
 *    near end (phase > 0.95). Both hidden outside those ranges.
 *  - **Proximity pulse**: When the head passes near a mark, the mark scales
 *    to 2× its base size. Returns to 1× when the head moves away.
 *
 * @param {mapboxgl.Map} map - Mapbox map instance
 * @param {Object} marksData - GeoJSON FeatureCollection of Point features
 * @param {boolean} showMarks - Whether to activate marks rendering
 * @returns {{ showOverviewMarks, showAnimationMarks, updateHeadPosition }}
 */

// Vite-compatible image imports
const kmMarkUrl       = new URL('../assets/km-mark.png', import.meta.url).href;
const waterMarkUrl    = new URL('../assets/water-mark.png', import.meta.url).href;
const gatoradeMarkUrl = new URL('../assets/gatorade-mark.png', import.meta.url).href;
const startMarkUrl    = new URL('../assets/start-mark.png', import.meta.url).href;
const finishMarkUrl   = new URL('../assets/finish-mark.png', import.meta.url).href;
const goingMarkUrl    = new URL('../assets/going-mark.png', import.meta.url).href;

/** KM-only filter (reused for both the overview circle layer and the icon layer). */
const KM_FILTER = ['match', ['slice', ['get', 'name'], 0, 2], ['KM'], true, false];

/** Proximity threshold in degrees (~0.0004 ≈ 45 m at equator). */
const PROXIMITY_THRESHOLD = 0.0004;

/**
 * Icon-layer categories — sizes are already halved from the original values.
 */
const MARK_CATEGORIES = [
  {
    id: 'km-mark',
    url: kmMarkUrl,
    filter: KM_FILTER,
    iconSize: 0.175,
    textField: ['get', 'name'],
    textOffset: [0, 0.6],
    textSize: 20,
  },
  {
    id: 'water-mark',
    url: waterMarkUrl,
    filter: ['==', ['get', 'name'], 'Agua'],
    iconSize: 0.15,
    textField: null,
    textOffset: [0, 0],
    textSize: 0,
  },
  {
    id: 'gatorade-mark',
    url: gatoradeMarkUrl,
    filter: ['==', ['get', 'name'], 'Gatorade'],
    iconSize: 0.15,
    textField: null,
    textOffset: [0, 0],
    textSize: 0,
  },
  {
    id: 'start-mark',
    url: startMarkUrl,
    filter: ['==', ['get', 'name'], 'Salida'],
    iconSize: 0.225,
    textField: ['literal', 'Salida'],
    textOffset: [0, 2.0],
    textSize: 11,
  },
  {
    id: 'finish-mark',
    url: finishMarkUrl,
    filter: ['==', ['get', 'name'], 'Llegada'],
    iconSize: 0.225,
    textField: ['literal', 'Llegada'],
    textOffset: [0, 2.0],
    textSize: 11,
  },
  {
    id: 'going-mark',
    url: goingMarkUrl,
    filter: ['==', ['get', 'name'], 'Gel Going'],
    iconSize: 0.15,
    textField: null,
    textOffset: [0, 0],
    textSize: 0,
  },
];

/** Lookup base icon sizes by layer id for proximity scaling. */
const BASE_SIZES = Object.fromEntries(
  MARK_CATEGORIES.map((c) => [`marks-${c.id}`, c.iconSize])
);

/** IDs of all icon symbol layers (for bulk show/hide). */
const ICON_LAYER_IDS = MARK_CATEGORIES.map((c) => `marks-${c.id}`);
/** ID of the overview circle layer. */
const OVERVIEW_LAYER_ID = 'marks-overview-dots';

/** Duration in ms for the opacity fade transition. */
const FADE_MS = 600;

/** Layers subject to proximity scaling (everything except start/finish). */
const PROXIMITY_LAYER_IDS = ICON_LAYER_IDS.filter(
  (id) => id !== 'marks-start-mark' && id !== 'marks-finish-mark'
);

export function useMarkers(map, marksData, showMarks) {
  // No-op stubs when marks are disabled
  const noop = () => {};
  if (!showMarks || !marksData || !marksData.features || marksData.features.length === 0) {
    return { showOverviewMarks: noop, showAnimationMarks: noop, updateHeadPosition: noop };
  }

  // Pre-compute an array of { lng, lat, name } for proximity checks
  const markPoints = marksData.features.map((f) => ({
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    name: f.properties.name,
  }));

  // Build a lookup: layerId → Set of indices in markPoints that belong to that layer
  const layerIndices = {};
  MARK_CATEGORIES.forEach((cat) => {
    const lid = `marks-${cat.id}`;
    layerIndices[lid] = [];
  });
  markPoints.forEach((pt, i) => {
    const n = pt.name;
    let lid;
    if (n.startsWith('KM')) lid = 'marks-km-mark';
    else if (n === 'Agua') lid = 'marks-water-mark';
    else if (n === 'Gatorade') lid = 'marks-gatorade-mark';
    else if (n === 'Salida') lid = 'marks-start-mark';
    else if (n === 'Llegada') lid = 'marks-finish-mark';
    else if (n === 'Gel Going') lid = 'marks-going-mark';
    if (lid && layerIndices[lid]) layerIndices[lid].push(i);
  });

  // Track which layers currently have a nearby mark (to avoid redundant setPaint calls)
  const layerNear = {};
  PROXIMITY_LAYER_IDS.forEach((id) => { layerNear[id] = false; });

  // Track current start/finish visibility state
  let startVisible = true;
  let finishVisible = false;

  // ------ Shared GeoJSON source ------
  map.addSource('marks', {
    type: 'geojson',
    data: marksData,
  });

  // ------ Overview layer: orange circles for KM marks only (visible initially) ------
  map.addLayer({
    id: OVERVIEW_LAYER_ID,
    type: 'circle',
    source: 'marks',
    filter: KM_FILTER,
    paint: {
      'circle-radius': 5,
      'circle-color': '#F57C00',
      'circle-opacity': 1,
      'circle-opacity-transition': { duration: FADE_MS, delay: 0 },
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#FFFFFF',
      'circle-stroke-opacity': 1,
      'circle-stroke-opacity-transition': { duration: FADE_MS, delay: 0 },
    },
  });

  // ------ Icon layers: loaded asynchronously, hidden initially ------
  const imagePromises = MARK_CATEGORIES.map(
    (cat) =>
      new Promise((resolve) => {
        map.loadImage(cat.url, (err, image) => {
          if (err) {
            console.warn(`Failed to load mark image "${cat.id}":`, err);
            resolve(null);
            return;
          }
          if (!map.hasImage(cat.id)) {
            map.addImage(cat.id, image, { sdf: false });
          }
          resolve(cat);
        });
      })
  );

  Promise.all(imagePromises).then((results) => {
    results.forEach((cat) => {
      if (!cat) return;

      const layoutConfig = {
        'icon-image': cat.id,
        'icon-size': cat.iconSize,
        'icon-size-transition': { duration: 200, delay: 0 },
        'icon-allow-overlap': true,
        'icon-anchor': 'bottom',
      };

      if (cat.textField) {
        layoutConfig['text-field'] = cat.textField;
        layoutConfig['text-font'] = ['Open Sans Bold', 'Arial Unicode MS Bold'];
        layoutConfig['text-size'] = cat.textSize;
        layoutConfig['text-offset'] = cat.textOffset;
        layoutConfig['text-anchor'] = 'top';
        layoutConfig['text-allow-overlap'] = true;
      }

      map.addLayer({
        id: `marks-${cat.id}`,
        type: 'symbol',
        source: 'marks',
        filter: cat.filter,
        layout: layoutConfig,
        paint: {
          'icon-opacity': 0,
          'icon-opacity-transition': { duration: FADE_MS, delay: 0 },
          ...(cat.textField
            ? {
                'text-opacity': 0,
                'text-opacity-transition': { duration: FADE_MS, delay: 0 },
                'text-color': '#ffffff',
                'text-halo-color': '#000000',
                'text-halo-width': 1,
              }
            : {}),
        },
      });
    });
  });

  // ------ Mode toggling helpers ------

  /**
   * Switch to overview mode: fade in orange KM dots, fade out icon layers.
   * Also resets proximity scaling state.
   */
  function showOverviewMarks() {
    // Fade in overview dots
    map.setPaintProperty(OVERVIEW_LAYER_ID, 'circle-opacity', 1);
    map.setPaintProperty(OVERVIEW_LAYER_ID, 'circle-stroke-opacity', 1);

    // Fade out all icon layers and reset sizes
    ICON_LAYER_IDS.forEach((id) => {
      if (!map.getLayer(id)) return;
      map.setPaintProperty(id, 'icon-opacity', 0);
      // Reset to base size
      map.setLayoutProperty(id, 'icon-size', BASE_SIZES[id]);
      try { map.setPaintProperty(id, 'text-opacity', 0); } catch (_) { /* no text */ }
    });

    // Reset proximity state
    PROXIMITY_LAYER_IDS.forEach((id) => { layerNear[id] = false; });
    startVisible = true;
    finishVisible = false;
  }

  /**
   * Switch to animation mode: fade out orange KM dots, fade in icon layers.
   * Start mark visible, finish mark hidden (will appear at end of animation).
   */
  function showAnimationMarks() {
    // Fade out overview dots
    map.setPaintProperty(OVERVIEW_LAYER_ID, 'circle-opacity', 0);
    map.setPaintProperty(OVERVIEW_LAYER_ID, 'circle-stroke-opacity', 0);

    // Fade in all icon layers except finish (hidden at start)
    ICON_LAYER_IDS.forEach((id) => {
      if (!map.getLayer(id)) return;
      if (id === 'marks-finish-mark') {
        map.setPaintProperty(id, 'icon-opacity', 0);
        try { map.setPaintProperty(id, 'text-opacity', 0); } catch (_) {}
      } else {
        map.setPaintProperty(id, 'icon-opacity', 1);
        try { map.setPaintProperty(id, 'text-opacity', 1); } catch (_) {}
      }
    });

    startVisible = true;
    finishVisible = false;
  }

  /**
   * Called every animation frame with the current head position and phase.
   * Handles start/finish visibility and proximity-based icon scaling.
   *
   * @param {number} lng - Head longitude
   * @param {number} lat - Head latitude
   * @param {number} phase - Animation phase (0–1)
   */
  function updateHeadPosition(lng, lat, phase) {
    // ── Start / Finish visibility ────────────────────────────────
    // Show Salida only while phase < 0.05, show Llegada when phase > 0.95
    const shouldShowStart = phase < 0.05;
    const shouldShowFinish = phase > 0.95;

    if (shouldShowStart !== startVisible) {
      startVisible = shouldShowStart;
      const startLayer = 'marks-start-mark';
      if (map.getLayer(startLayer)) {
        const op = startVisible ? 1 : 0;
        map.setPaintProperty(startLayer, 'icon-opacity', op);
        try { map.setPaintProperty(startLayer, 'text-opacity', op); } catch (_) {}
      }
    }

    if (shouldShowFinish !== finishVisible) {
      finishVisible = shouldShowFinish;
      const finishLayer = 'marks-finish-mark';
      if (map.getLayer(finishLayer)) {
        const op = finishVisible ? 1 : 0;
        map.setPaintProperty(finishLayer, 'icon-opacity', op);
        try { map.setPaintProperty(finishLayer, 'text-opacity', op); } catch (_) {}
      }
    }

    // ── Proximity scaling ────────────────────────────────────────
    // For each proximity-eligible layer, check if any of its marks are near head
    PROXIMITY_LAYER_IDS.forEach((lid) => {
      const indices = layerIndices[lid];
      if (!indices || indices.length === 0) return;

      let isNear = false;
      for (let i = 0; i < indices.length; i++) {
        const pt = markPoints[indices[i]];
        const dLng = pt.lng - lng;
        const dLat = pt.lat - lat;
        if (dLng * dLng + dLat * dLat < PROXIMITY_THRESHOLD * PROXIMITY_THRESHOLD) {
          isNear = true;
          break;
        }
      }

      if (isNear !== layerNear[lid]) {
        layerNear[lid] = isNear;
        if (map.getLayer(lid)) {
          const targetSize = isNear ? BASE_SIZES[lid] * 2 : BASE_SIZES[lid];
          map.setLayoutProperty(lid, 'icon-size', targetSize);
        }
      }
    });
  }

  return { showOverviewMarks, showAnimationMarks, updateHeadPosition };
}
