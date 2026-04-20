/**
 * Risk Engine — calculates risk scores for shipments based on nearby disruptions.
 * 
 * Formula: risk = (weather * 0.4) + (traffic * 0.3) + (delayHistory * 0.2) + (speedDrop * 0.1)
 */

import { closestPointOnRoute } from '@/utils/geoUtils';
import { RISK_WEIGHTS, SIM_DEFAULTS } from '@/utils/constants';

/**
 * Calculate the risk score for a single shipment given active disruptions.
 * @param {Object} shipment — shipment object with route, progress, speed
 * @param {Array} disruptions — array of active disruption objects
 * @param {Object} history — optional { delayCount, originalSpeed }
 * @returns {number} risk score between 0 and 1
 */
export function calculateRiskScore(shipment, disruptions, history = {}) {
  let weatherFactor = 0;
  let trafficFactor = 0;
  let delayHistoryFactor = history.delayCount ? Math.min(history.delayCount * 0.15, 1) : 0;
  let speedDropFactor = 0;

  if (history.originalSpeed && shipment.speed < history.originalSpeed) {
    speedDropFactor = Math.min(
      (history.originalSpeed - shipment.speed) / history.originalSpeed,
      1
    );
  }

  // Check each disruption's proximity to the shipment route
  for (const disruption of disruptions) {
    if (!disruption.active) continue;

    const { distance } = closestPointOnRoute(shipment.route, disruption.position);
    const effectiveRadius = disruption.radius || SIM_DEFAULTS.DISRUPTION_RADIUS;

    // If route is within disruption radius, apply its effect
    if (distance <= effectiveRadius) {
      // Intensity scales inversely with distance (closer = stronger)
      const proximityFactor = 1 - (distance / effectiveRadius);
      const effectiveIntensity = disruption.intensity * proximityFactor;

      switch (disruption.type) {
        case 'weather':
          weatherFactor = Math.max(weatherFactor, effectiveIntensity);
          break;
        case 'traffic':
          trafficFactor = Math.max(trafficFactor, effectiveIntensity);
          break;
        case 'roadblock':
          // Roadblock acts as maximum weather + traffic
          weatherFactor = Math.max(weatherFactor, effectiveIntensity * 0.8);
          trafficFactor = Math.max(trafficFactor, effectiveIntensity);
          break;
      }
    }
  }

  // Apply formula
  const risk =
    weatherFactor * RISK_WEIGHTS.WEATHER +
    trafficFactor * RISK_WEIGHTS.TRAFFIC +
    delayHistoryFactor * RISK_WEIGHTS.DELAY_HISTORY +
    speedDropFactor * RISK_WEIGHTS.SPEED_DROP;

  return Math.min(Math.max(risk, 0), 1);
}

/**
 * Calculate risk scores for all shipments.
 * Returns a map of shipmentId → riskScore.
 */
export function calculateAllRisks(shipments, disruptions) {
  const risks = {};
  for (const shipment of shipments) {
    risks[shipment.id] = calculateRiskScore(shipment, disruptions);
  }
  return risks;
}
