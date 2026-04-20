/**
 * Disruption Store — manages disruptions (weather, traffic, roadblocks).
 */
import { create } from 'zustand';

let disruptionCounter = 0;

const useDisruptionStore = create((set, get) => ({
  // State
  disruptions: [],
  pendingDisruptionType: null,  // For click-to-add on map

  // Weather/Traffic global controls
  globalWeather: 0,     // 0–1 slider
  globalTraffic: 'low', // 'low' | 'medium' | 'high'

  // Actions
  addDisruption: (disruption) => {
    disruptionCounter++;
    const newDisruption = {
      id: `DIS-${String(disruptionCounter).padStart(3, '0')}`,
      active: true,
      createdAt: new Date().toISOString(),
      radius: 80,
      intensity: 0.7,
      ...disruption,
    };
    set((state) => ({
      disruptions: [...state.disruptions, newDisruption],
    }));
    return newDisruption;
  },

  removeDisruption: (id) => {
    set((state) => ({
      disruptions: state.disruptions.filter((d) => d.id !== id),
    }));
  },

  toggleDisruption: (id) => {
    set((state) => ({
      disruptions: state.disruptions.map((d) =>
        d.id === id ? { ...d, active: !d.active } : d
      ),
    }));
  },

  updateDisruptionIntensity: (id, intensity) => {
    set((state) => ({
      disruptions: state.disruptions.map((d) =>
        d.id === id ? { ...d, intensity } : d
      ),
    }));
  },

  setGlobalWeather: (value) => set({ globalWeather: value }),
  setGlobalTraffic: (value) => set({ globalTraffic: value }),
  setPendingDisruptionType: (type) => set({ pendingDisruptionType: type }),

  clearAllDisruptions: () => {
    disruptionCounter = 0;
    set({ disruptions: [], globalWeather: 0, globalTraffic: 'low', pendingDisruptionType: null });
  },

  getActiveDisruptions: () => {
    return get().disruptions.filter((d) => d.active);
  },
}));

export default useDisruptionStore;
