'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';

import LeftSidebar from '@/components/LeftSidebar/LeftSidebar';
import RightPanel from '@/components/RightPanel/RightPanel';
import ToastContainer, { showToast } from '@/components/Toast/Toast';
import SplashScreen from '@/components/SplashScreen/SplashScreen';
import useSimulationStore from '@/stores/useSimulationStore';
import useShipmentStore from '@/stores/useShipmentStore';
import useDisruptionStore from '@/stores/useDisruptionStore';
import useAlertStore from '@/stores/useAlertStore';
import { calculateAllRisks } from '@/engines/riskEngine';
import { identifyAffectedNodes, cascadeRisk } from '@/engines/cascadeEngine';
import { CITIES } from '@/data/mockShipments';
import { SIM_DEFAULTS, RISK_THRESHOLDS } from '@/utils/constants';
import { playWarning, playCritical, playTick } from '@/utils/soundEffects';

// Dynamic imports for SSR-incompatible components
const MapArea = dynamic(() => import('@/components/MapArea/MapArea'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', background: '#1a1a2e',
      color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-family)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px', animation: 'pulse 2s infinite' }}>🗺️</div>
        <div style={{ fontSize: '14px', letterSpacing: '0.05em' }}>LOADING MAP ENGINE...</div>
      </div>
    </div>
  ),
});

const MetricsBar = dynamic(() => import('@/components/MetricsBar/MetricsBar'), { ssr: false });

export default function Dashboard() {
  const [showSplash, setShowSplash] = useState(true);
  const intervalRef = useRef(null);
  const prevRiskRef = useRef({});

  // Store selectors
  const isRunning = useSimulationStore((s) => s.isRunning);
  const speedMultiplier = useSimulationStore((s) => s.speedMultiplier);
  const tick = useSimulationStore((s) => s.tick);

  const shipments = useShipmentStore((s) => s.shipments);
  const advanceShipments = useShipmentStore((s) => s.advanceShipments);
  const updateRiskScores = useShipmentStore((s) => s.updateRiskScores);

  const disruptions = useDisruptionStore((s) => s.disruptions);
  const globalWeather = useDisruptionStore((s) => s.globalWeather);
  const globalTraffic = useDisruptionStore((s) => s.globalTraffic);

  const addAlert = useAlertStore((s) => s.addAlert);

  /**
   * Build effective disruptions list including global controls.
   */
  const getEffectiveDisruptions = useCallback(() => {
    const effective = [...disruptions.filter((d) => d.active)];

    if (globalWeather > 0.1) {
      const weatherCities = ['mumbai', 'delhi', 'kolkata', 'chennai'];
      weatherCities.forEach((city) => {
        const pos = CITIES[city];
        if (pos) {
          effective.push({
            id: `GLOBAL-W-${city}`, type: 'weather', position: pos,
            radius: 120 + globalWeather * 80, intensity: globalWeather, active: true,
          });
        }
      });
    }

    if (globalTraffic !== 'low') {
      const intensity = globalTraffic === 'medium' ? 0.5 : 0.9;
      const trafficCities = ['pune', 'bangalore', 'hyderabad', 'nagpur'];
      trafficCities.forEach((city) => {
        const pos = CITIES[city];
        if (pos) {
          effective.push({
            id: `GLOBAL-T-${city}`, type: 'traffic', position: pos,
            radius: 60 + intensity * 40, intensity, active: true,
          });
        }
      });
    }

    return effective;
  }, [disruptions, globalWeather, globalTraffic]);

  /**
   * Main simulation tick.
   */
  const simulationTick = useCallback(() => {
    const increment = SIM_DEFAULTS.PROGRESS_INCREMENT * speedMultiplier;
    advanceShipments(increment);

    const effectiveDisruptions = getEffectiveDisruptions();
    const currentShipments = useShipmentStore.getState().shipments;
    const riskMap = calculateAllRisks(currentShipments, effectiveDisruptions);

    // Cascade effect
    const nodeRisks = identifyAffectedNodes(effectiveDisruptions, CITIES);
    const cascadedRisks = cascadeRisk(nodeRisks);

    for (const ship of currentShipments) {
      const originKey = findCityKey(ship.origin);
      const destKey = findCityKey(ship.destination);
      if (originKey && cascadedRisks[originKey]) {
        riskMap[ship.id] = Math.min(1, (riskMap[ship.id] || 0) + cascadedRisks[originKey] * 0.15);
      }
      if (destKey && cascadedRisks[destKey]) {
        riskMap[ship.id] = Math.min(1, (riskMap[ship.id] || 0) + cascadedRisks[destKey] * 0.1);
      }
    }

    updateRiskScores(riskMap);

    // Generate alerts + toast notifications + sound effects for risk changes
    for (const ship of currentShipments) {
      const prevRisk = prevRiskRef.current[ship.id] || 0;
      const newRisk = riskMap[ship.id] || 0;

      if (prevRisk < RISK_THRESHOLDS.SAFE && newRisk >= RISK_THRESHOLDS.SAFE) {
        addAlert({
          type: 'risk', severity: 'medium',
          message: `${ship.id} (${ship.cargo}) is now at risk — ${Math.round(newRisk * 100)}% risk score`,
          shipmentId: ship.id,
        });
        playWarning();
        showToast({
          title: `⚠️ ${ship.id} At Risk`,
          message: `${ship.cargo} shipment risk rose to ${Math.round(newRisk * 100)}%`,
          severity: 'warning',
        });
      }

      if (prevRisk < RISK_THRESHOLDS.WARNING && newRisk >= RISK_THRESHOLDS.WARNING) {
        addAlert({
          type: 'risk', severity: 'high',
          message: `⚠️ ${ship.id} is now DELAYED — ${Math.round(newRisk * 100)}% risk. Action recommended!`,
          shipmentId: ship.id,
        });
        playCritical();
        showToast({
          title: `🚨 ${ship.id} DELAYED`,
          message: `${ship.cargo}: ${Math.round(newRisk * 100)}% risk — immediate action needed!`,
          severity: 'critical',
          duration: 6000,
        });
      }

      if (prevRisk < RISK_THRESHOLDS.DANGER && newRisk >= RISK_THRESHOLDS.DANGER) {
        addAlert({
          type: 'risk', severity: 'critical',
          message: `🚨 CRITICAL: ${ship.id} at ${Math.round(newRisk * 100)}% risk! Cargo: ${ship.cargo}`,
          shipmentId: ship.id,
        });
        playCritical();
        showToast({
          title: `💀 CRITICAL — ${ship.id}`,
          message: `${ship.cargo} at ${Math.round(newRisk * 100)}% risk! Intervention required!`,
          severity: 'critical',
          duration: 8000,
        });
      }
    }

    prevRiskRef.current = riskMap;

    // Subtle tick sound every 5th tick
    const currentTick = useSimulationStore.getState().tickCount;
    if (currentTick % 5 === 0) playTick();

    tick();
  }, [speedMultiplier, advanceShipments, getEffectiveDisruptions, updateRiskScores, addAlert, tick]);

  // Simulation interval
  useEffect(() => {
    if (isRunning) {
      const interval = SIM_DEFAULTS.UPDATE_INTERVAL / speedMultiplier;
      intervalRef.current = setInterval(simulationTick, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, speedMultiplier, simulationTick]);

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <ToastContainer />
      <div className="dashboard">
        <div className="dashboard__sidebar">
          <LeftSidebar />
        </div>
        <div className="dashboard__map">
          <MapArea />
        </div>
        <div className="dashboard__rightpanel">
          <RightPanel />
        </div>
      </div>
      <MetricsBar />
    </>
  );
}

function findCityKey(location) {
  for (const [key, city] of Object.entries(CITIES)) {
    if (city.name.toLowerCase() === location.name.toLowerCase() ||
        (Math.abs(city.lat - location.lat) < 0.1 && Math.abs(city.lng - location.lng) < 0.1)) {
      return key;
    }
  }
  return null;
}
