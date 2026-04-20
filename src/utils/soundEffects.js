/**
 * Sound Effects Engine — generates UI sounds using Web Audio API.
 * No external audio files needed. Synthesizes tones programmatically.
 */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Play a short tone.
 * @param {number} frequency - Hz
 * @param {number} duration - seconds
 * @param {string} type - 'sine' | 'square' | 'triangle' | 'sawtooth'
 * @param {number} volume - 0 to 1
 */
function playTone(frequency, duration = 0.15, type = 'sine', volume = 0.12) {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Smooth envelope to avoid clicks
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio not available — silently ignore
  }
}

/**
 * Play two tones in sequence for a richer sound.
 */
function playChord(freq1, freq2, duration = 0.2, volume = 0.08) {
  playTone(freq1, duration, 'sine', volume);
  setTimeout(() => playTone(freq2, duration * 0.8, 'triangle', volume * 0.6), 30);
}

// ── Pre-built sound effects ──

/** Soft click for button interactions */
export function playClick() {
  playTone(800, 0.06, 'sine', 0.08);
}

/** Navigation / tab switch */
export function playNav() {
  playTone(600, 0.08, 'triangle', 0.06);
}

/** Success confirmation (applying a decision) */
export function playSuccess() {
  playChord(523, 659, 0.2, 0.1); // C5 + E5
  setTimeout(() => playTone(784, 0.3, 'sine', 0.08), 120); // G5
}

/** Warning alert — rising tone */
export function playWarning() {
  playTone(440, 0.1, 'square', 0.06); // A4
  setTimeout(() => playTone(554, 0.15, 'square', 0.06), 100); // C#5
}

/** Critical alert — urgent double beep */
export function playCritical() {
  playTone(880, 0.08, 'square', 0.1);
  setTimeout(() => playTone(880, 0.08, 'square', 0.1), 150);
  setTimeout(() => playTone(1100, 0.15, 'sawtooth', 0.06), 300);
}

/** Disruption placed on map */
export function playDisruptionPlace() {
  playTone(300, 0.15, 'sine', 0.1);
  setTimeout(() => playTone(200, 0.3, 'sine', 0.08), 80);
}

/** Simulation start */
export function playSimStart() {
  playTone(392, 0.1, 'sine', 0.08); // G4
  setTimeout(() => playTone(523, 0.1, 'sine', 0.08), 100); // C5
  setTimeout(() => playTone(659, 0.15, 'sine', 0.1), 200); // E5
}

/** Simulation pause */
export function playSimPause() {
  playTone(659, 0.1, 'sine', 0.08);
  setTimeout(() => playTone(523, 0.15, 'sine', 0.06), 100);
}

/** Reset — descending sweep */
export function playReset() {
  playTone(700, 0.08, 'triangle', 0.06);
  setTimeout(() => playTone(500, 0.08, 'triangle', 0.06), 80);
  setTimeout(() => playTone(350, 0.15, 'triangle', 0.06), 160);
}

/** Subtle tick for simulation updates */
export function playTick() {
  playTone(1200, 0.02, 'sine', 0.02);
}

/** Shipment selected */
export function playSelect() {
  playTone(900, 0.05, 'sine', 0.05);
  setTimeout(() => playTone(1100, 0.06, 'sine', 0.04), 40);
}
