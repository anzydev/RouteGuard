/**
 * Shipment Store — manages all shipment state.
 */
import { create } from 'zustand';
import { mockShipments } from '@/data/mockShipments';
import { getStatusFromRisk } from '@/utils/constants';

const useShipmentStore = create((set, get) => ({
  // State
  shipments: mockShipments.map((s) => ({ ...s })),
  selectedShipmentId: null,

  // Actions
  selectShipment: (id) => set({ selectedShipmentId: id }),

  /**
   * Move all shipments forward by a small progress increment.
   */
  advanceShipments: (increment = 0.008) => {
    set((state) => ({
      shipments: state.shipments.map((ship) => {
        if (ship.progress >= 1) return ship; // Already delivered

        const newProgress = Math.min(ship.progress + increment, 1);
        return {
          ...ship,
          progress: newProgress,
          status: newProgress >= 1 ? 'delivered' : ship.status,
        };
      }),
    }));
  },

  /**
   * Update risk scores for all shipments.
   */
  updateRiskScores: (riskMap) => {
    set((state) => ({
      shipments: state.shipments.map((ship) => {
        const newRisk = riskMap[ship.id] ?? ship.riskScore;
        const newStatus = ship.progress >= 1 ? 'delivered' : getStatusFromRisk(newRisk);
        return {
          ...ship,
          riskScore: newRisk,
          status: newStatus,
        };
      }),
    }));
  },

  /**
   * Apply a route change to a specific shipment.
   */
  applyReroute: (shipmentId, newRoute) => {
    set((state) => ({
      shipments: state.shipments.map((ship) =>
        ship.id === shipmentId
          ? { ...ship, route: newRoute, status: 'rerouted', riskScore: Math.max(ship.riskScore - 0.3, 0.05) }
          : ship
      ),
    }));
  },

  /**
   * Apply delay to a shipment (freeze progress temporarily).
   */
  applyDelay: (shipmentId) => {
    set((state) => ({
      shipments: state.shipments.map((ship) =>
        ship.id === shipmentId
          ? { ...ship, status: 'delayed', speed: 0 }
          : ship
      ),
    }));
  },

  /**
   * Reset all shipments to initial state.
   */
  resetShipments: () => {
    set({
      shipments: mockShipments.map((s) => ({ ...s, progress: 0, riskScore: s.riskScore, status: 'on-time' })),
      selectedShipmentId: null,
    });
  },

  /**
   * Get the currently selected shipment.
   */
  getSelectedShipment: () => {
    const state = get();
    return state.shipments.find((s) => s.id === state.selectedShipmentId) || null;
  },
}));

export default useShipmentStore;
