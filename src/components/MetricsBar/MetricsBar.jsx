'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import styles from './MetricsBar.module.css';
import useShipmentStore from '@/stores/useShipmentStore';
import useDisruptionStore from '@/stores/useDisruptionStore';
import useSimulationStore from '@/stores/useSimulationStore';

/**
 * Animated counter that smoothly transitions between values.
 */
function AnimatedValue({ value, prefix = '', suffix = '', decimals = 0, colorClass = '' }) {
  const [displayed, setDisplayed] = useState(value);
  const ref = useRef(null);

  useEffect(() => {
    const start = displayed;
    const end = value;
    const duration = 600;
    const startTime = performance.now();

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(start + (end - start) * eased);

      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    }

    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);

  return (
    <span className={`${styles.metrics__value} ${colorClass}`}>
      {prefix}{decimals > 0 ? displayed.toFixed(decimals) : Math.round(displayed)}{suffix}
    </span>
  );
}

/**
 * Live metrics bar shown at the bottom of the map.
 */
export default function MetricsBar() {
  const shipments = useShipmentStore((s) => s.shipments);
  const disruptions = useDisruptionStore((s) => s.disruptions);
  const tickCount = useSimulationStore((s) => s.tickCount);
  const [riskHistory, setRiskHistory] = useState([]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = shipments.length;
    const onTime = shipments.filter((s) => s.riskScore < 0.3).length;
    const atRisk = shipments.filter((s) => s.riskScore >= 0.3 && s.riskScore < 0.6).length;
    const delayed = shipments.filter((s) => s.riskScore >= 0.6).length;
    const avgRisk = shipments.reduce((sum, s) => sum + s.riskScore, 0) / total;
    const avgProgress = shipments.reduce((sum, s) => sum + s.progress, 0) / total;
    const activeDisruptions = disruptions.filter((d) => d.active).length;

    // Estimated cost impact (simulated)
    const costImpact = delayed * 2500 + atRisk * 800;
    // Estimated delay (minutes)
    const delayImpact = delayed * 120 + atRisk * 45;

    return { total, onTime, atRisk, delayed, avgRisk, avgProgress, activeDisruptions, costImpact, delayImpact };
  }, [shipments, disruptions]);

  // Track risk history for sparkline
  useEffect(() => {
    if (tickCount > 0) {
      setRiskHistory((prev) => [...prev.slice(-19), metrics.avgRisk]);
    }
  }, [tickCount, metrics.avgRisk]);

  return (
    <div className={styles.metrics}>
      {/* On-Time */}
      <div className={styles.metrics__item}>
        <AnimatedValue
          value={metrics.onTime}
          suffix={`/${metrics.total}`}
          colorClass={styles.metrics__value_safe}
        />
        <span className={styles.metrics__label}>On Time</span>
      </div>

      <div className={styles.metrics__divider} />

      {/* At Risk */}
      <div className={styles.metrics__item}>
        <AnimatedValue
          value={metrics.atRisk}
          colorClass={metrics.atRisk > 0 ? styles.metrics__value_warning : styles.metrics__value_white}
        />
        <span className={styles.metrics__label}>At Risk</span>
      </div>

      <div className={styles.metrics__divider} />

      {/* Delayed */}
      <div className={styles.metrics__item}>
        <AnimatedValue
          value={metrics.delayed}
          colorClass={metrics.delayed > 0 ? styles.metrics__value_danger : styles.metrics__value_white}
        />
        <span className={styles.metrics__label}>Delayed</span>
      </div>

      <div className={styles.metrics__divider} />

      {/* Average Risk */}
      <div className={styles.metrics__item}>
        <AnimatedValue
          value={metrics.avgRisk * 100}
          suffix="%"
          colorClass={
            metrics.avgRisk > 0.5 ? styles.metrics__value_danger :
            metrics.avgRisk > 0.25 ? styles.metrics__value_warning :
            styles.metrics__value_safe
          }
        />
        <span className={styles.metrics__label}>Avg Risk</span>
      </div>

      <div className={styles.metrics__divider} />

      {/* Disruptions */}
      <div className={styles.metrics__item}>
        <AnimatedValue
          value={metrics.activeDisruptions}
          colorClass={metrics.activeDisruptions > 0 ? styles.metrics__value_warning : styles.metrics__value_white}
        />
        <span className={styles.metrics__label}>Disruptions</span>
      </div>

      <div className={styles.metrics__divider} />

      {/* Cost Impact */}
      <div className={styles.metrics__item}>
        <AnimatedValue
          value={metrics.costImpact}
          prefix="₹"
          colorClass={metrics.costImpact > 0 ? styles.metrics__value_danger : styles.metrics__value_safe}
        />
        <span className={styles.metrics__label}>Cost Impact</span>
      </div>

      <div className={styles.metrics__divider} />

      {/* Delay Impact */}
      <div className={styles.metrics__item}>
        <AnimatedValue
          value={metrics.delayImpact}
          suffix="m"
          colorClass={metrics.delayImpact > 0 ? styles.metrics__value_warning : styles.metrics__value_safe}
        />
        <span className={styles.metrics__label}>Delay Est.</span>
      </div>

      <div className={styles.metrics__divider} />

      {/* Risk Sparkline */}
      <div className={styles.metrics__sparkline}>
        {(riskHistory.length > 0 ? riskHistory : [0]).map((risk, i) => (
          <div
            key={i}
            className={styles.metrics__spark_bar}
            style={{
              height: `${Math.max(risk * 100, 4)}%`,
              background: risk > 0.5 ? '#F44336' : risk > 0.25 ? '#FF9800' : '#4CAF50',
              opacity: 0.5 + (i / riskHistory.length) * 0.5,
            }}
          />
        ))}
      </div>

      <div className={styles.metrics__divider} />

      {/* Fleet Progress */}
      <div className={styles.metrics__item}>
        <AnimatedValue
          value={metrics.avgProgress * 100}
          suffix="%"
          colorClass={styles.metrics__value_primary}
        />
        <span className={styles.metrics__label}>Fleet Progress</span>
      </div>
    </div>
  );
}
