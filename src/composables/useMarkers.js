/**
 * useMarkers  Composable for race marks layer management and popup interaction.
 *
 * Behavior:
 *  - Orange KM circle markers are always visible on the map (no play/pause mode switching).
 *  - During animation, a proximity-based popup appears when the race head approaches
 *    any mark (KM, water, gatorade, going, start, finish).
 *  - Nearby marks are clustered only when consecutive in the data array (preserves route order).
 *  - Only one popup is visible at a time.
 *
 * @param {mapboxgl.Map} map - Mapbox map instance
 * @param {Object} marksData - GeoJSON FeatureCollection of Point features
 * @param {boolean} showMarks - Whether to activate marks rendering
 * @returns {{ updateHeadPosition: Function, resetPopup: Function }}
 */

import { useMarkPopup, classifyMark } from '@/composables/useMarkPopup';
import tokens from '@/theme/tokens';

/** Mapbox expression filter: only features whose name starts with "KM". */
const KM_FILTER = ['match', ['slice', ['get', 'name'], 0, 2], ['KM'], true, false];

/**
 * Distance threshold (degrees) for grouping nearby marks into a single cluster.
 * ~0.0005 deg ~ 55 m at the equator.
 */
const CLUSTER_THRESHOLD = 0.0005;

/**
 * Distance threshold (degrees) for triggering the popup when the head approaches.
 * ~0.002 deg ~ 220 m  provides a few seconds of visual lead time before the head
 * reaches the exact mark position.
 */
const POPUP_THRESHOLD = 0.002;

/** Squared Euclidean distance between two coordinate pairs (in degrees). */
function sqDist(lng1, lat1, lng2, lat2) {
  const dLng = lng1 - lng2;
  const dLat = lat1 - lat2;
  return dLng * dLng + dLat * dLat;
}

/**
 * Group marks into clusters of consecutive entries that are spatially close.
 * Only adjacent marks in the original array order are merged — a mark at
 * index j is added to the current cluster only if it is within
 * CLUSTER_THRESHOLD of the mark at index j-1. When a gap is found a new
 * cluster starts.
 *
 * @param {Array<{lng:number, lat:number, name:string, type:string}>} marks
 * @returns {Array<{center:[number,number], marks:Array}>}
 */
function computeClusters(marks) {
  if (marks.length === 0) return [];

  const threshold2 = CLUSTER_THRESHOLD * CLUSTER_THRESHOLD;
  const clusters = [];
  let group = [marks[0]];

  for (let i = 1; i < marks.length; i++) {
    const prev = marks[i - 1];
    const curr = marks[i];

    if (sqDist(prev.lng, prev.lat, curr.lng, curr.lat) < threshold2) {
      // Consecutive and close — extend current cluster
      group.push(curr);
    } else {
      // Gap — finalise current cluster, start a new one
      clusters.push(finaliseCluster(group));
      group = [curr];
    }
  }

  // Don't forget the last group
  clusters.push(finaliseCluster(group));
  return clusters;
}

/**
 * Compute cluster center (centroid) from a group of marks.
 * @param {Array} group
 * @returns {{center:[number,number], marks:Array}}
 */
function finaliseCluster(group) {
  const center = [
    group.reduce((s, m) => s + m.lng, 0) / group.length,
    group.reduce((s, m) => s + m.lat, 0) / group.length,
  ];
  return { center, marks: group };
}

export function useMarkers(map, marksData, showMarks) {
  const noop = () => {};
  if (!showMarks || !marksData || !marksData.features || marksData.features.length === 0) {
    return { updateHeadPosition: noop, resetPopup: noop };
  }

  // -- Classify all marks (preserve original index for sequence tracking) --
  const marks = marksData.features
    .map((f, i) => ({
      idx: i,
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      name: f.properties.name,
      type: classifyMark(f.properties.name),
    }))
    .filter((m) => m.type !== null);

  // -- Pre-compute spatial clusters (consecutive only) --
  const clusters = computeClusters(marks);
  const popupThreshold2 = POPUP_THRESHOLD * POPUP_THRESHOLD;

  // Assign each cluster a sequence fraction (0-1) based on the average
  // original index of its marks. This maps cluster order to approximate
  // animation phase, allowing cursor recalibration after seek/resume.
  const lastIdx = marks.length - 1 || 1;
  clusters.forEach((cluster) => {
    const avgIdx = cluster.marks.reduce((s, m) => s + m.idx, 0) / cluster.marks.length;
    cluster.seqFraction = avgIdx / lastIdx;
  });

  // -- GeoJSON source (shared by all layers) --
  map.addSource('marks', { type: 'geojson', data: marksData });

  // -- KM circle layer  always visible, orange dots --
  map.addLayer({
    id: 'marks-km-dots',
    type: 'circle',
    source: 'marks',
    filter: KM_FILTER,
    paint: {
      'circle-radius': 5,
      'circle-color': tokens.colors.route.markDot,
      'circle-opacity': 1,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#FFFFFF',
      'circle-stroke-opacity': 1,
    },
  });

  // -- Popup instance --
  const { show: showPopup, hide: hidePopup } = useMarkPopup(map);

  // -- Sequential cursor state --
  // The cursor tracks which cluster the head should encounter next.
  // It only advances forward, preventing popups from triggering for
  // geographically-close-but-wrong-section clusters when the route
  // doubles back near itself.
  let nextClusterIdx = 0;
  let activeClusterIdx = -1;
  let wasInactive = true;

  /**
   * Recalibrate the sequential cursor using the animation phase.
   * Called when transitioning from inactive (paused/seeked) to active so the
   * cursor points to the correct cluster for the current route position.
   *
   * @param {number} phase - Current animation phase (0-1)
   */
  function recalibrateCursor(phase) {
    // Find the first cluster whose seqFraction is at or just past the
    // current phase. This is the next cluster the head will encounter.
    nextClusterIdx = clusters.length; // default: all visited
    for (let i = 0; i < clusters.length; i++) {
      if (clusters[i].seqFraction >= phase - 0.02) {
        nextClusterIdx = i;
        break;
      }
    }
    activeClusterIdx = -1;
  }

  /**
   * Called every animation frame with the current head position.
   * Uses a sequential cursor so only the next expected cluster in route
   * order can trigger. When the head enters proximity of that cluster the
   * popup appears; when it moves away the popup hides and the cursor
   * advances to the following cluster.
   *
   * @param {number} lng    - Head longitude
   * @param {number} lat    - Head latitude
   * @param {number} phase  - Animation phase (0-1)
   * @param {boolean} active - Whether popup interaction is active (false when paused)
   */
  function updateHeadPosition(lng, lat, phase, active = true) {
    if (!active) {
      if (activeClusterIdx >= 0) {
        hidePopup();
        activeClusterIdx = -1;
      }
      wasInactive = true;
      return;
    }

    // Recalibrate cursor on transition from inactive to active (resume/seek)
    if (wasInactive) {
      wasInactive = false;
      recalibrateCursor(phase);
    }

    // All clusters visited
    if (nextClusterIdx >= clusters.length) return;

    // If a popup is currently showing, check whether head moved away
    if (activeClusterIdx >= 0) {
      const ac = clusters[activeClusterIdx];
      if (sqDist(lng, lat, ac.center[0], ac.center[1]) >= popupThreshold2) {
        hidePopup();
        nextClusterIdx = activeClusterIdx + 1;
        activeClusterIdx = -1;
      }
      return;
    }

    // No popup showing — check the next expected cluster
    if (nextClusterIdx < clusters.length) {
      const c = clusters[nextClusterIdx];
      if (sqDist(lng, lat, c.center[0], c.center[1]) < popupThreshold2) {
        showPopup(c.center, c.marks);
        activeClusterIdx = nextClusterIdx;
      }
    }
  }

  /**
   * Hide the popup and reset cursor to the beginning.
   * Called on pause or animation completion/restart.
   */
  function resetPopup() {
    hidePopup();
    activeClusterIdx = -1;
    nextClusterIdx = 0;
    wasInactive = true;
  }

  return { updateHeadPosition, resetPopup };
}
