'use client';

import styles from './TopBar.module.css';
import useSimulationStore from '@/stores/useSimulationStore';
import useShipmentStore from '@/stores/useShipmentStore';
import useDisruptionStore from '@/stores/useDisruptionStore';
import useAlertStore from '@/stores/useAlertStore';
import { playClick, playSimStart, playSimPause, playReset } from '@/utils/soundEffects';
import { showToast } from '@/components/Toast/Toast';

export default function TopBar() {
  const {
    isRunning, toggle, speedMultiplier, setSpeedMultiplier,
    mode, whatIfMode, toggleWhatIfMode, reset: resetSim,
  } = useSimulationStore();

  const resetShipments = useShipmentStore((s) => s.resetShipments);
  const clearDisruptions = useDisruptionStore((s) => s.clearAllDisruptions);
  const clearAlerts = useAlertStore((s) => s.clearAlerts);

  const handleToggle = () => {
    if (isRunning) {
      playSimPause();
      showToast({ title: '⏸ Simulation Paused', message: 'All shipments frozen in place', severity: 'info', duration: 2000 });
    } else {
      playSimStart();
      showToast({ title: '▶ Simulation Started', message: `Running at ${speedMultiplier}x speed`, severity: 'success', duration: 2000 });
    }
    toggle();
  };

  const handleReset = () => {
    playReset();
    resetSim();
    resetShipments();
    clearDisruptions();
    clearAlerts();
    showToast({ title: '↻ Simulation Reset', message: 'All shipments, disruptions, and alerts cleared', severity: 'info', duration: 3000 });
  };

  const handleSpeedChange = (speed) => {
    playClick();
    setSpeedMultiplier(speed);
  };

  const handleWhatIf = () => {
    playClick();
    toggleWhatIfMode();
    showToast({
      title: whatIfMode ? '🔵 Normal Mode' : '⚗️ What-If Mode',
      message: whatIfMode ? 'Returned to live simulation' : 'Sandbox active — experiment freely!',
      severity: whatIfMode ? 'info' : 'warning',
      duration: 2500,
    });
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.topbar__blur} aria-hidden="true" />

      <div className={styles.topbar__left}>
        <div className={styles.topbar__icon}>⚡</div>
        <div>
          <div className={styles.topbar__title}>Supply Chain Simulator</div>
          <div className={styles.topbar__subtitle}>AI-Powered Decision Engine</div>
        </div>
      </div>

      <div className={styles.topbar__center}>
        {/* Speed Controls */}
        <div className={styles.topbar__speed}>
          {[1, 2, 5].map((speed) => (
            <button
              key={speed}
              className={`${styles.topbar__speed_btn} ${
                speedMultiplier === speed ? styles.topbar__speed_btn_active : ''
              }`}
              onClick={() => handleSpeedChange(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* What-If Toggle */}
        <div className={styles.topbar__whatif}>
          <span>What-if</span>
          <button
            className={`toggle ${whatIfMode ? 'toggle--active' : ''}`}
            onClick={handleWhatIf}
            aria-label="Toggle what-if mode"
          />
        </div>
      </div>

      <div className={styles.topbar__right}>
        <span className={`badge ${whatIfMode ? 'badge--warning' : 'badge--live'}`}>
          {whatIfMode ? '⚗️ What-If' : mode === 'live' ? '🟢 Live' : '🔵 Simulated'}
        </span>

        <button className="btn btn--tonal btn--sm" onClick={handleToggle}>
          {isRunning ? '⏸ Pause' : '▶ Start'}
        </button>

        <button className="btn btn--outlined btn--sm" onClick={handleReset}>
          ↻ Reset
        </button>
      </div>
    </header>
  );
}
