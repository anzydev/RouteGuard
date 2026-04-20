/**
 * Simulation Store — controls the simulation lifecycle.
 */
import { create } from 'zustand';

const useSimulationStore = create((set) => ({
  // State
  isRunning: false,
  mode: 'simulated',       // 'live' | 'simulated'
  speedMultiplier: 1,      // 1x, 2x, 5x
  tickCount: 0,
  whatIfMode: false,

  // Actions
  start: () => set({ isRunning: true }),
  pause: () => set({ isRunning: false }),
  toggle: () => set((state) => ({ isRunning: !state.isRunning })),

  setMode: (mode) => set({ mode }),
  setSpeedMultiplier: (speedMultiplier) => set({ speedMultiplier }),
  toggleWhatIfMode: () => set((state) => ({ whatIfMode: !state.whatIfMode })),

  tick: () => set((state) => ({ tickCount: state.tickCount + 1 })),

  reset: () =>
    set({
      isRunning: false,
      speedMultiplier: 1,
      tickCount: 0,
      whatIfMode: false,
    }),
}));

export default useSimulationStore;
