/**
 * Formatting utilities for the supply chain simulator.
 */

/**
 * Format minutes to a human-readable duration string.
 */
export function formatDuration(minutes) {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}

/**
 * Format a timestamp to relative time (e.g., "2m ago").
 */
export function timeAgo(timestamp) {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

/**
 * Format risk score as percentage.
 */
export function formatRiskPercent(score) {
  return `${Math.round(score * 100)}%`;
}

/**
 * Format a number with commas.
 */
export function formatNumber(num) {
  return num.toLocaleString('en-IN');
}

/**
 * Capitalize first letter.
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
