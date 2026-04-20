/**
 * Geo-spatial utility functions for distance and proximity calculations.
 */

/**
 * Calculate the Haversine distance between two lat/lng points in km.
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Check if a point is within a given radius (km) of a center point.
 */
export function isWithinRadius(point, center, radiusKm) {
  const distance = haversineDistance(
    point.lat || point[0],
    point.lng || point[1],
    center.lat || center[0],
    center.lng || center[1]
  );
  return distance <= radiusKm;
}

/**
 * Find the closest point on a route to a disruption center.
 * Returns { distance, index, point }.
 */
export function closestPointOnRoute(route, center) {
  let minDist = Infinity;
  let closestIndex = 0;
  let closestPoint = route[0];

  for (let i = 0; i < route.length; i++) {
    const point = route[i];
    const dist = haversineDistance(
      point[0], point[1],
      center.lat, center.lng
    );
    if (dist < minDist) {
      minDist = dist;
      closestIndex = i;
      closestPoint = point;
    }
  }

  return { distance: minDist, index: closestIndex, point: closestPoint };
}

/**
 * Interpolate a position along a route based on progress (0–1).
 */
export function interpolatePosition(route, progress) {
  if (!route || route.length === 0) return [0, 0];
  if (progress <= 0) return route[0];
  if (progress >= 1) return route[route.length - 1];

  const totalSegments = route.length - 1;
  const segmentProgress = progress * totalSegments;
  const segmentIndex = Math.floor(segmentProgress);
  const t = segmentProgress - segmentIndex;

  const start = route[Math.min(segmentIndex, totalSegments)];
  const end = route[Math.min(segmentIndex + 1, totalSegments)];

  return [
    start[0] + (end[0] - start[0]) * t,
    start[1] + (end[1] - start[1]) * t,
  ];
}

/**
 * Calculate total route distance in km.
 */
export function routeDistance(route) {
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    total += haversineDistance(
      route[i - 1][0], route[i - 1][1],
      route[i][0], route[i][1]
    );
  }
  return total;
}
