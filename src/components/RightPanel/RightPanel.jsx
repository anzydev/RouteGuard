'use client';

import { useState, useMemo } from 'react';
import styles from './RightPanel.module.css';
import useDisruptionStore from '@/stores/useDisruptionStore';
import useAlertStore from '@/stores/useAlertStore';
import useShipmentStore from '@/stores/useShipmentStore';
import { generateDecisions } from '@/engines/decisionEngine';
import { generateAlternativeRoute } from '@/engines/routeOptimizer';
import { timeAgo } from '@/utils/formatters';
import { playNav, playClick, playSuccess, playDisruptionPlace } from '@/utils/soundEffects';
import { showToast } from '@/components/Toast/Toast';

const TABS = [
  { id: 'controls', label: 'Controls', icon: '🎛️' },
  { id: 'alerts', label: 'Alerts', icon: '🔔' },
  { id: 'decisions', label: 'AI Decisions', icon: '🧠' },
];

export default function RightPanel() {
  const [activeTab, setActiveTab] = useState('controls');

  const alerts = useAlertStore((s) => s.alerts);
  const unackCount = alerts.filter((a) => !a.acknowledged).length;
  const shipments = useShipmentStore((s) => s.shipments);
  const atRiskShipments = shipments.filter((s) => s.riskScore >= 0.3);

  return (
    <aside className={styles.panel}>
      <div className={styles.panel__blur} aria-hidden="true" />

      {/* Tabs */}
      <div className={styles.panel__tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.panel__tab} ${
              activeTab === tab.id ? styles.panel__tab_active : ''
            }`}
            onClick={() => { playNav(); setActiveTab(tab.id); }}
          >
            {tab.icon} {tab.label}
            {tab.id === 'alerts' && unackCount > 0 && (
              <span className={styles.panel__tab_badge}>{unackCount}</span>
            )}
            {tab.id === 'decisions' && atRiskShipments.length > 0 && (
              <span className={styles.panel__tab_badge}>{atRiskShipments.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={styles.panel__content}>
        {activeTab === 'controls' && <ControlsTab />}
        {activeTab === 'alerts' && <AlertsTab />}
        {activeTab === 'decisions' && <DecisionsTab />}
      </div>
    </aside>
  );
}

/* ════════════════════════════════════════════════════
   Controls Tab
   ════════════════════════════════════════════════════ */
function ControlsTab() {
  const globalWeather = useDisruptionStore((s) => s.globalWeather);
  const setGlobalWeather = useDisruptionStore((s) => s.setGlobalWeather);
  const globalTraffic = useDisruptionStore((s) => s.globalTraffic);
  const setGlobalTraffic = useDisruptionStore((s) => s.setGlobalTraffic);
  const pendingType = useDisruptionStore((s) => s.pendingDisruptionType);
  const setPendingType = useDisruptionStore((s) => s.setPendingDisruptionType);
  const disruptions = useDisruptionStore((s) => s.disruptions);
  const removeDisruption = useDisruptionStore((s) => s.removeDisruption);
  const toggleDisruption = useDisruptionStore((s) => s.toggleDisruption);

  return (
    <div>
      {/* Weather Control */}
      <div className={styles.controls__section}>
        <div className={styles.controls__label}>🌧️ Weather Intensity</div>
        <div className={styles.controls__sublabel}>
          Simulates rain / storm intensity across routes
        </div>
        <div className={styles.controls__slider_row}>
          <input
            type="range"
            className="slider"
            min="0"
            max="1"
            step="0.05"
            value={globalWeather}
            onChange={(e) => setGlobalWeather(parseFloat(e.target.value))}
          />
          <span className={styles.controls__slider_value}>
            {Math.round(globalWeather * 100)}%
          </span>
        </div>
      </div>

      {/* Traffic Control */}
      <div className={styles.controls__section}>
        <div className={styles.controls__label}>🚗 Traffic Level</div>
        <div className={styles.controls__traffic_btns}>
          {['low', 'medium', 'high'].map((level) => (
            <button
              key={level}
              className={`btn btn--sm ${
                globalTraffic === level ? 'btn--primary' : 'btn--tonal'
              }`}
              onClick={() => { playClick(); setGlobalTraffic(level); }}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Map Click Disruptions */}
      <div className={styles.controls__section}>
        <div className={styles.controls__label}>📍 Add Disruption on Map</div>
        <div className={styles.controls__sublabel}>
          Select a type, then click on the map to place it
        </div>
        <div className={styles.controls__map_btns}>
          {[
            { type: 'weather', icon: '🌧️', label: 'Add Weather Zone' },
            { type: 'traffic', icon: '🚗', label: 'Add Traffic Zone' },
            { type: 'roadblock', icon: '🚧', label: 'Add Roadblock' },
          ].map((item) => (
            <button
              key={item.type}
              className={`${styles.controls__map_btn} ${
                pendingType === item.type ? styles.controls__map_btn_active : ''
              }`}
              onClick={() => {
                playClick();
                setPendingType(pendingType === item.type ? null : item.type);
              }}
            >
              {item.icon} {item.label}
              {pendingType === item.type && (
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--md-primary)', fontWeight: 500 }}>
                  Placing...
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Active Disruptions List */}
      {disruptions.length > 0 && (
        <div className={styles.controls__section}>
          <div className={styles.controls__label}>
            ⚡ Active Disruptions ({disruptions.length})
          </div>
          <div className={styles.disruption_list}>
            {disruptions.map((dis) => (
              <div key={dis.id} className={styles.disruption_item}>
                <div className={styles.disruption_item__info}>
                  <span>
                    {dis.type === 'weather' ? '🌧️' : dis.type === 'traffic' ? '🚗' : '🚧'}
                  </span>
                  <span>{dis.id}</span>
                  <span className={`badge ${dis.active ? 'badge--warning' : 'badge--primary'}`} style={{ fontSize: '10px' }}>
                    {dis.active ? 'Active' : 'Off'}
                  </span>
                </div>
                <div className={styles.disruption_item__actions}>
                  <button
                    className="btn btn--ghost btn--sm btn--icon"
                    onClick={() => toggleDisruption(dis.id)}
                    title={dis.active ? 'Disable' : 'Enable'}
                  >
                    {dis.active ? '⏸' : '▶'}
                  </button>
                  <button
                    className="btn btn--ghost btn--sm btn--icon"
                    onClick={() => removeDisruption(dis.id)}
                    title="Remove"
                    style={{ color: 'var(--md-error)' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   Alerts Tab
   ════════════════════════════════════════════════════ */
function AlertsTab() {
  const alerts = useAlertStore((s) => s.alerts);
  const acknowledgeAlert = useAlertStore((s) => s.acknowledgeAlert);

  if (alerts.length === 0) {
    return (
      <div className={styles.panel__empty}>
        <div className={styles.panel__empty_icon}>🔔</div>
        <div className={styles.panel__empty_text}>
          No alerts yet.<br />
          Start the simulation and add disruptions to see alerts.
        </div>
      </div>
    );
  }

  return (
    <div>
      {alerts.map((alert) => {
        const severityIcon =
          alert.severity === 'high' || alert.severity === 'critical'
            ? '🔴'
            : alert.severity === 'medium'
            ? '🟡'
            : '🟢';

        return (
          <div
            key={alert.id}
            className={`${styles.alert_item} ${
              alert.acknowledged ? styles.alert_item_acknowledged : ''
            }`}
            onClick={() => acknowledgeAlert(alert.id)}
          >
            <div className={`${styles.alert_item__icon} ${styles[`alert_item__icon_${alert.severity}`] || ''}`}>
              {severityIcon}
            </div>
            <div className={styles.alert_item__body}>
              <div className={styles.alert_item__msg}>{alert.message}</div>
              <div className={styles.alert_item__time}>{timeAgo(alert.timestamp)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   Decisions Tab
   ════════════════════════════════════════════════════ */
function DecisionsTab() {
  const shipments = useShipmentStore((s) => s.shipments);
  const applyReroute = useShipmentStore((s) => s.applyReroute);
  const applyDelay = useShipmentStore((s) => s.applyDelay);
  const disruptions = useDisruptionStore((s) => s.disruptions);
  const addAlert = useAlertStore((s) => s.addAlert);

  const atRiskShipments = shipments.filter((s) => s.riskScore >= 0.3);

  const allDecisions = useMemo(() => {
    const decisions = [];
    for (const ship of atRiskShipments) {
      const shipDecisions = generateDecisions(ship, disruptions);
      decisions.push(...shipDecisions);
    }
    return decisions;
  }, [atRiskShipments, disruptions]);

  const handleApplyDecision = (decision) => {
    playSuccess();

    if (decision.type === 'reroute' && decision.alternativePath) {
      const altRoute = generateAlternativeRoute(decision.alternativePath);
      if (altRoute.length > 0) {
        applyReroute(decision.shipmentId, altRoute);
      }
    } else if (decision.type === 'delay') {
      applyDelay(decision.shipmentId);
    }

    addAlert({
      type: 'decision',
      severity: 'low',
      message: `✅ Applied "${decision.title}" for ${decision.shipmentId}`,
      shipmentId: decision.shipmentId,
    });

    showToast({
      title: `✅ ${decision.title} Applied`,
      message: `${decision.shipmentId} — ${decision.type === 'reroute' ? 'New route calculated' : decision.type === 'delay' ? 'Shipment held' : 'Cargo split initiated'}`,
      severity: 'success',
      duration: 3000,
    });
  };

  if (allDecisions.length === 0) {
    return (
      <div className={styles.panel__empty}>
        <div className={styles.panel__empty_icon}>🧠</div>
        <div className={styles.panel__empty_text}>
          No decisions needed.<br />
          All shipments are running smoothly. Add disruptions to trigger AI suggestions.
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="section-title" style={{ marginBottom: '12px' }}>
        {allDecisions.length} recommendation{allDecisions.length !== 1 ? 's' : ''}
      </p>

      {allDecisions.map((dec, i) => {
        const typeIcon =
          dec.type === 'reroute' ? '🔀' : dec.type === 'delay' ? '⏱️' : '✂️';

        return (
          <div
            key={dec.id}
            className={styles.decision_card}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className={styles.decision_card__header}>
              <div className={styles.decision_card__title}>
                {typeIcon} {dec.title}
              </div>
              <span className={styles.decision_card__confidence}>
                {Math.round(dec.confidence * 100)}% conf.
              </span>
            </div>

            <div className={styles.decision_card__desc}>
              <strong>{dec.shipmentId}</strong> — {dec.description}
            </div>

            <div className={styles.decision_card__impact}>
              {dec.impact.delaySaved > 0 && (
                <div className={styles.decision_card__impact_item}>
                  ⏱️ Delay saved:{' '}
                  <span className={styles.decision_card__impact_value}>
                    {dec.impact.delaySaved}m
                  </span>
                </div>
              )}
              <div className={styles.decision_card__impact_item}>
                💰 Cost:{' '}
                <span className={styles.decision_card__impact_value}>
                  ₹{dec.impact.costDelta?.toLocaleString()}
                </span>
              </div>
              {dec.impact.extraTime > 0 && (
                <div className={styles.decision_card__impact_item}>
                  🕐 Extra time:{' '}
                  <span className={styles.decision_card__impact_value}>
                    {dec.impact.extraTime}m
                  </span>
                </div>
              )}
            </div>

            <div className={styles.decision_card__actions}>
              <button
                className="btn btn--primary btn--sm"
                onClick={() => handleApplyDecision(dec)}
              >
                ✓ Apply
              </button>
              <button className="btn btn--outlined btn--sm">
                Dismiss
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
