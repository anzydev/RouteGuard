/**
 * Alert Store — manages the real-time alert feed.
 */
import { create } from 'zustand';

let alertCounter = 0;

const useAlertStore = create((set, get) => ({
  // State
  alerts: [],
  maxAlerts: 50,

  // Actions
  addAlert: (alert) => {
    alertCounter++;
    const newAlert = {
      id: `ALT-${String(alertCounter).padStart(3, '0')}`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      ...alert,
    };
    set((state) => ({
      alerts: [newAlert, ...state.alerts].slice(0, state.maxAlerts),
    }));
  },

  acknowledgeAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, acknowledged: true } : a
      ),
    }));
  },

  clearAlerts: () => {
    alertCounter = 0;
    set({ alerts: [] });
  },

  getUnacknowledged: () => {
    return get().alerts.filter((a) => !a.acknowledged);
  },
}));

export default useAlertStore;
