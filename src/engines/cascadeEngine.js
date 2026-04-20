/**
 * Cascade Engine — propagates risk through connected route nodes.
 * If a node has risk > threshold, connected nodes get increased risk.
 */

import { routeGraph } from '@/data/graphNodes';
import { SIM_DEFAULTS } from '@/utils/constants';

/**
 * Identify which graph nodes are affected by disruptions.
 * Returns a map of nodeName → riskLevel (0–1).
 */
export function identifyAffectedNodes(disruptions, cityPositions) {
  const nodeRisks = {};

  for (const [cityName, cityPos] of Object.entries(cityPositions)) {
    let maxRisk = 0;

    for (const disruption of disruptions) {
      if (!disruption.active) continue;

      const dLat = cityPos.lat - disruption.position.lat;
      const dLng = cityPos.lng - disruption.position.lng;
      const distApprox = Math.sqrt(dLat * dLat + dLng * dLng) * 111; // rough km

      const radius = disruption.radius || SIM_DEFAULTS.DISRUPTION_RADIUS;
      if (distApprox <= radius) {
        const proximity = 1 - distApprox / radius;
        maxRisk = Math.max(maxRisk, disruption.intensity * proximity);
      }
    }

    if (maxRisk > 0) {
      nodeRisks[cityName] = maxRisk;
    }
  }

  return nodeRisks;
}

/**
 * Propagate risk from high-risk nodes to their neighbors.
 * Uses iterative cascade with decay factor.
 * 
 * @param {Object} nodeRisks — initial node risks from identifyAffectedNodes
 * @param {number} decayFactor — how much risk decays per hop (default 0.5)
 * @param {number} maxIterations — max cascade depth
 * @returns {Object} updated nodeRisks with cascaded values
 */
export function cascadeRisk(
  nodeRisks,
  decayFactor = SIM_DEFAULTS.CASCADE_DECAY,
  maxIterations = 3
) {
  const cascaded = { ...nodeRisks };

  for (let i = 0; i < maxIterations; i++) {
    const updates = {};

    for (const [node, risk] of Object.entries(cascaded)) {
      if (risk < 0.4) continue; // Only cascade from significant risks

      const neighbors = routeGraph[node];
      if (!neighbors) continue;

      for (const neighbor of Object.keys(neighbors)) {
        const cascadeRisk = risk * decayFactor;
        const currentRisk = cascaded[neighbor] || 0;

        if (cascadeRisk > currentRisk) {
          updates[neighbor] = cascadeRisk;
        }
      }
    }

    // Apply updates
    let changed = false;
    for (const [node, risk] of Object.entries(updates)) {
      if (!cascaded[node] || risk > cascaded[node]) {
        cascaded[node] = risk;
        changed = true;
      }
    }

    if (!changed) break; // No more cascading needed
  }

  return cascaded;
}
