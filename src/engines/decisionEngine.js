/**
 * Decision Engine — generates action recommendations when risk is high.
 * Suggests reroute, delay, or split based on disruption context.
 */

import { findShortestPath, routeGraph } from '@/data/graphNodes';
import { CITIES } from '@/data/mockShipments';
import { RISK_THRESHOLDS } from '@/utils/constants';

/**
 * Generate decision suggestions for a high-risk shipment.
 * @param {Object} shipment — the at-risk shipment
 * @param {Array} disruptions — active disruptions
 * @param {Object} cascadedNodeRisks — risk levels at graph nodes
 * @returns {Array} array of decision objects, sorted by priority
 */
export function generateDecisions(shipment, disruptions, cascadedNodeRisks = {}) {
  const decisions = [];
  const riskScore = shipment.riskScore;

  if (riskScore < RISK_THRESHOLDS.SAFE) return decisions;

  // Identify which nodes to avoid (high risk in cascade)
  const avoidNodes = Object.entries(cascadedNodeRisks)
    .filter(([_, risk]) => risk > 0.6)
    .map(([node]) => node);

  // 1. REROUTE — find alternative path avoiding high-risk areas
  const originKey = findCityKey(shipment.origin);
  const destKey = findCityKey(shipment.destination);

  if (originKey && destKey) {
    const altPath = findShortestPath(routeGraph, originKey, destKey, avoidNodes);
    const directPath = findShortestPath(routeGraph, originKey, destKey, []);

    if (altPath.path.length > 0 && altPath.distance < Infinity) {
      const extraDistance = altPath.distance - directPath.distance;
      const extraTime = Math.round((extraDistance / 50) * 60); // at 50 km/h avg
      const costDelta = Math.round(extraDistance * 12); // ₹12/km

      decisions.push({
        id: `DEC-R-${shipment.id}`,
        shipmentId: shipment.id,
        type: 'reroute',
        title: 'Reroute Shipment',
        description: `Reroute via ${altPath.path.map(n => capitalize(n)).join(' → ')} to avoid disruption zones.`,
        impact: {
          delaySaved: riskScore > 0.7 ? Math.round(120 * riskScore) : Math.round(60 * riskScore),
          costDelta: costDelta,
          extraDistance: Math.round(extraDistance),
          extraTime: extraTime,
        },
        alternativePath: altPath.path,
        confidence: riskScore > 0.7 ? 0.9 : 0.7,
        priority: riskScore > 0.6 ? 1 : 2,
        applied: false,
      });
    }
  }

  // 2. DELAY — hold shipment until disruption clears
  if (riskScore >= RISK_THRESHOLDS.SAFE) {
    const delayMinutes = riskScore > 0.7 ? 180 : riskScore > 0.5 ? 120 : 60;
    decisions.push({
      id: `DEC-D-${shipment.id}`,
      shipmentId: shipment.id,
      type: 'delay',
      title: 'Delay Shipment',
      description: `Hold shipment for ~${delayMinutes} minutes until conditions improve. Estimated weather clearance in ${Math.round(delayMinutes * 0.8)}m.`,
      impact: {
        delaySaved: 0,
        costDelta: Math.round(delayMinutes * 5), // ₹5/min holding cost
        extraTime: delayMinutes,
      },
      confidence: 0.6,
      priority: 2,
      applied: false,
    });
  }

  // 3. SPLIT — divide cargo across multiple routes
  if (riskScore >= RISK_THRESHOLDS.WARNING && shipment.priority === 'critical') {
    decisions.push({
      id: `DEC-S-${shipment.id}`,
      shipmentId: shipment.id,
      type: 'split',
      title: 'Split Shipment',
      description: `Split cargo into 2 shipments via different routes. Critical items take the safer route, rest delayed.`,
      impact: {
        delaySaved: Math.round(90 * riskScore),
        costDelta: Math.round(2500 + 500 * riskScore),
        extraDistance: 0,
      },
      confidence: 0.5,
      priority: 3,
      applied: false,
    });
  }

  // Sort by priority (lower = more recommended)
  decisions.sort((a, b) => a.priority - b.priority);

  return decisions;
}

/**
 * Find the city key in CITIES matching a location.
 */
function findCityKey(location) {
  for (const [key, city] of Object.entries(CITIES)) {
    if (
      city.name.toLowerCase() === location.name.toLowerCase() ||
      (Math.abs(city.lat - location.lat) < 0.1 &&
        Math.abs(city.lng - location.lng) < 0.1)
    ) {
      return key;
    }
  }
  return null;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
