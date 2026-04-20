'use client';

import styles from './TopBar.module.css';
import useSimulationStore from '@/stores/useSimulationStore';

export default function TopBar() {
  const isRunning = useSimulationStore((s) => s.isRunning);
  const whatIfMode = useSimulationStore((s) => s.whatIfMode);
  const mode = useSimulationStore((s) => s.mode);

  return (
    <header className={styles.topbar}>
      <div className={styles.topbar__blur} aria-hidden="true" />

      <div className={styles.topbar__left}>
        <div className={styles.topbar__icon}>⚡</div>
        <div>
          <div className={styles.topbar__title}>RouteGuard</div>
          <div className={styles.topbar__subtitle}>AI-Powered Supply Chain Simulator</div>
        </div>
      </div>

      <div className={styles.topbar__right}>
        <span className={`badge ${isRunning ? 'badge--safe' : 'badge--primary'}`}>
          {isRunning ? '🟢 Running' : '⏸ Paused'}
        </span>
        <span className={`badge ${whatIfMode ? 'badge--warning' : 'badge--live'}`}>
          {whatIfMode ? '⚗️ What-If' : mode === 'live' ? '🟢 Live' : '🔵 Simulated'}
        </span>
      </div>
    </header>
  );
}
