/**
 * Route Optimizer — wrapper around graph pathfinding for the UI layer.
 * Generates alternative route waypoints from Dijkstra path results.
 */

import { findShortestPath, routeGraph } from '@/data/graphNodes';
import { CITIES } from '@/data/mockShipments';

/**
 * Generate waypoints for an alternative route.
 * Converts city names from Dijkstra path into lat/lng coordinates
 * with smooth intermediate waypoints.
 */
export function generateAlternativeRoute(pathCityKeys) {
  if (!pathCityKeys || pathCityKeys.length < 2) return [];

  const waypoints = [];

  for (let i = 0; i < pathCityKeys.length - 1; i++) {
    const startCity = CITIES[pathCityKeys[i]];
    const endCity = CITIES[pathCityKeys[i + 1]];

    if (!startCity || !endCity) continue;

    // Generate smooth waypoints between each pair
    const segmentPoints = 4;
    for (let j = 0; j <= segmentPoints; j++) {
      // Skip first point of subsequent segments to avoid duplicates
      if (i > 0 && j === 0) continue;

      const t = j / segmentPoints;
      const curve = Math.sin(t * Math.PI) * 0.3;

      const lat = startCity.lat + (endCity.lat - startCity.lat) * t +
                  curve * (Math.random() * 0.2 - 0.1);
      const lng = startCity.lng + (endCity.lng - startCity.lng) * t +
                  curve * (Math.random() * 0.2 - 0.1);

      waypoints.push([lat, lng]);
    }
  }

  return waypoints;
}

/**
 * Find the best alternative route between two city keys,
 * avoiding specified nodes.
 */
export function findAlternativeRoute(originKey, destKey, avoidNodes = []) {
  const result = findShortestPath(routeGraph, originKey, destKey, avoidNodes);

  if (result.path.length < 2) return null;

  return {
    path: result.path,
    distance: result.distance,
    waypoints: generateAlternativeRoute(result.path),
    via: result.path.slice(1, -1).map(n => n.charAt(0).toUpperCase() + n.slice(1)),
  };
}
