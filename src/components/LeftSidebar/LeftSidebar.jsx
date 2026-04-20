'use client';

import styles from './LeftSidebar.module.css';
import useShipmentStore from '@/stores/useShipmentStore';
import { getRiskLevel } from '@/utils/constants';
import { formatRiskPercent } from '@/utils/formatters';
import { playSelect } from '@/utils/soundEffects';

export default function LeftSidebar() {
  const shipments = useShipmentStore((s) => s.shipments);
  const selectedId = useShipmentStore((s) => s.selectedShipmentId);
  const selectShipment = useShipmentStore((s) => s.selectShipment);

  const atRiskCount = shipments.filter((s) => s.riskScore >= 0.3).length;
  const delayedCount = shipments.filter((s) => s.riskScore >= 0.6).length;

  const handleSelect = (id) => {
    playSelect();
    selectShipment(id);
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebar__blur} aria-hidden="true" />

      <div className={styles.sidebar__header}>
        <h2 className={styles.sidebar__title}>Shipments</h2>
        <p className={styles.sidebar__count}>
          {shipments.length} total
          {atRiskCount > 0 && <> · <span style={{ color: 'var(--risk-warning)' }}>{atRiskCount} at risk</span></>}
          {delayedCount > 0 && <> · <span style={{ color: 'var(--risk-danger)' }}>{delayedCount} delayed</span></>}
        </p>
      </div>

      <div className={styles.sidebar__list}>
        {shipments.map((ship) => {
          const risk = getRiskLevel(ship.riskScore);
          const isSelected = selectedId === ship.id;

          return (
            <div
              key={ship.id}
              className={`${styles.shipcard} ${isSelected ? styles.shipcard_selected : ''}`}
              onClick={() => handleSelect(ship.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleSelect(ship.id)}
            >
              <div className={styles.shipcard__top}>
                <span className={styles.shipcard__id}>{ship.id}</span>
                <span className={`badge badge--${risk.level}`}>{risk.label}</span>
              </div>

              <div className={styles.shipcard__route}>
                <span>{ship.origin.name}</span>
                <span className={styles.shipcard__arrow}>→</span>
                <span>{ship.destination.name}</span>
              </div>

              <div className={styles.shipcard__meta}>
                <span className={styles.shipcard__cargo}>📦 {ship.cargo}</span>
                <span className={`${styles.shipcard__priority} ${
                  ship.priority === 'critical' ? styles.shipcard__priority_critical :
                  ship.priority === 'high' ? styles.shipcard__priority_high : ''
                }`}>
                  {ship.priority}
                </span>
              </div>

              <div className={styles.shipcard__risk}>
                <span className={styles.shipcard__risk_label}>{formatRiskPercent(ship.riskScore)}</span>
                <div className="progress-bar" style={{ flex: 1 }}>
                  <div
                    className={`progress-bar__fill progress-bar__fill--${risk.level}`}
                    style={{ width: `${ship.progress * 100}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
