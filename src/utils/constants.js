/**
 * Utility constants for the supply chain simulator.
 */

// Risk score thresholds
export const RISK_THRESHOLDS = {
  SAFE: 0.3,
  WARNING: 0.6,
  DANGER: 0.8,
  CRITICAL: 1.0,
};

// Risk factor weights
export const RISK_WEIGHTS = {
  WEATHER: 0.4,
  TRAFFIC: 0.3,
  DELAY_HISTORY: 0.2,
  SPEED_DROP: 0.1,
};

// Disruption types
export const DISRUPTION_TYPES = {
  WEATHER: 'weather',
  TRAFFIC: 'traffic',
  ROADBLOCK: 'roadblock',
};

// Traffic levels
export const TRAFFIC_LEVELS = {
  LOW: { value: 0.2, label: 'Low' },
  MEDIUM: { value: 0.5, label: 'Medium' },
  HIGH: { value: 0.9, label: 'High' },
};

// Decision types
export const DECISION_TYPES = {
  REROUTE: 'reroute',
  DELAY: 'delay',
  SPLIT: 'split',
};

// Simulation defaults
export const SIM_DEFAULTS = {
  UPDATE_INTERVAL: 2000,  // ms
  SPEED_MULTIPLIER: 1,
  CASCADE_DECAY: 0.5,
  DISRUPTION_RADIUS: 80,  // km
  PROGRESS_INCREMENT: 0.008,
};

// Map defaults
export const MAP_DEFAULTS = {
  CENTER: [22.5, 79.0],  // Center of India
  ZOOM: 5,
  MIN_ZOOM: 4,
  MAX_ZOOM: 12,
};

/**
 * Get risk level label and color from a risk score.
 */
export function getRiskLevel(score) {
  if (score < RISK_THRESHOLDS.SAFE) {
    return { level: 'safe', label: 'On-time', color: '#4CAF50' };
  }
  if (score < RISK_THRESHOLDS.WARNING) {
    return { level: 'warning', label: 'At Risk', color: '#FF9800' };
  }
  if (score < RISK_THRESHOLDS.DANGER) {
    return { level: 'danger', label: 'Delayed', color: '#F44336' };
  }
  return { level: 'critical', label: 'Critical', color: '#B71C1C' };
}

/**
 * Get status from risk score.
 */
export function getStatusFromRisk(score) {
  if (score < RISK_THRESHOLDS.SAFE) return 'on-time';
  if (score < RISK_THRESHOLDS.WARNING) return 'at-risk';
  if (score < RISK_THRESHOLDS.DANGER) return 'delayed';
  return 'critical';
}
