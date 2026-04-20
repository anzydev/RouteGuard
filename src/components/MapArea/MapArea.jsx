'use client';

import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Circle,
  Popup,
  Marker,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import styles from './MapArea.module.css';
import useShipmentStore from '@/stores/useShipmentStore';
import useDisruptionStore from '@/stores/useDisruptionStore';
import useAlertStore from '@/stores/useAlertStore';
import { getRiskLevel, MAP_DEFAULTS } from '@/utils/constants';
import { interpolatePosition } from '@/utils/geoUtils';
import { formatRiskPercent } from '@/utils/formatters';
import { playDisruptionPlace } from '@/utils/soundEffects';
import { showToast } from '@/components/Toast/Toast';

/* Fix default Leaflet icon issue with Next.js bundling */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/** Creates a colored truck icon for shipment markers. */
function createShipmentIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:26px;height:26px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 2px 10px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      font-size:11px;color:white;font-weight:700;
      transition:transform 300ms cubic-bezier(0.2,0,0,1);
    ">🚛</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

/** Creates a disruption marker icon. */
function createDisruptionIcon(type) {
  const emoji = type === 'weather' ? '🌧️' : type === 'traffic' ? '🚗' : '🚧';
  const bg = type === 'weather' ? 'rgba(33,150,243,0.9)' : type === 'traffic' ? 'rgba(255,152,0,0.9)' : 'rgba(244,67,54,0.9)';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:32px;height:32px;border-radius:50%;
      background:${bg};border:2px solid white;
      box-shadow:0 2px 12px ${bg};
      display:flex;align-items:center;justify-content:center;
      font-size:16px;
      animation:pulse 2s ease-in-out infinite;
    ">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

/** Handles map click events for adding disruptions. */
function MapClickHandler() {
  const pendingType = useDisruptionStore((s) => s.pendingDisruptionType);
  const addDisruption = useDisruptionStore((s) => s.addDisruption);
  const setPending = useDisruptionStore((s) => s.setPendingDisruptionType);
  const addAlert = useAlertStore((s) => s.addAlert);

  useMapEvents({
    click(e) {
      if (!pendingType) return;
      playDisruptionPlace();
      addDisruption({
        type: pendingType,
        position: { lat: e.latlng.lat, lng: e.latlng.lng },
        intensity: pendingType === 'roadblock' ? 0.9 : 0.7,
        radius: pendingType === 'roadblock' ? 40 : 80,
      });
      addAlert({
        type: 'disruption',
        severity: 'medium',
        message: `New ${pendingType} disruption added at [${e.latlng.lat.toFixed(2)}, ${e.latlng.lng.toFixed(2)}]`,
        shipmentId: null,
      });
      showToast({
        title: `📍 ${pendingType.charAt(0).toUpperCase() + pendingType.slice(1)} Placed`,
        message: `Disruption zone active — radius ${pendingType === 'roadblock' ? 40 : 80}km`,
        severity: 'warning',
        duration: 3000,
      });
      setPending(null);
    },
  });
  return null;
}

/** Flies to selected shipment on the map. */
function FlyToSelected() {
  const map = useMap();
  const selectedId = useShipmentStore((s) => s.selectedShipmentId);
  const shipments = useShipmentStore((s) => s.shipments);

  useEffect(() => {
    if (!selectedId) return;
    const ship = shipments.find((s) => s.id === selectedId);
    if (!ship) return;
    const pos = interpolatePosition(ship.route, ship.progress);
    map.flyTo(pos, 7, { duration: 0.8 });
  }, [selectedId, map, shipments]);

  return null;
}

/** Main interactive Map component. */
export default function MapArea() {
  const shipments = useShipmentStore((s) => s.shipments);
  const selectedId = useShipmentStore((s) => s.selectedShipmentId);
  const selectShipment = useShipmentStore((s) => s.selectShipment);
  const disruptions = useDisruptionStore((s) => s.disruptions);
  const pendingType = useDisruptionStore((s) => s.pendingDisruptionType);

  const disruptionFillColors = {
    weather: 'rgba(33, 150, 243, 0.12)',
    traffic: 'rgba(255, 152, 0, 0.15)',
    roadblock: 'rgba(244, 67, 54, 0.18)',
  };
  const disruptionBorderColors = {
    weather: '#2196F3',
    traffic: '#FF9800',
    roadblock: '#F44336',
  };

  return (
    <div className={styles.mapwrap}>
      {/* Pending disruption indicator */}
      {pendingType && (
        <div className={styles.mapwrap__mode_indicator}>
          🎯 Click on map to place {pendingType} disruption
        </div>
      )}

      <MapContainer
        center={MAP_DEFAULTS.CENTER}
        zoom={MAP_DEFAULTS.ZOOM}
        minZoom={MAP_DEFAULTS.MIN_ZOOM}
        maxZoom={MAP_DEFAULTS.MAX_ZOOM}
        className={styles.mapwrap__container}
        zoomControl={true}
        style={{ cursor: pendingType ? 'crosshair' : 'grab' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapClickHandler />
        <FlyToSelected />

        {/* ── Route Polylines ── */}
        {shipments.map((ship) => {
          const risk = getRiskLevel(ship.riskScore);
          const isSelected = selectedId === ship.id;
          return (
            <Polyline
              key={`route-${ship.id}`}
              positions={ship.route}
              pathOptions={{
                color: risk.color,
                weight: isSelected ? 5 : 3,
                opacity: isSelected ? 1 : 0.6,
                dashArray: ship.status === 'rerouted' ? '10 6' : undefined,
              }}
              eventHandlers={{ click: () => selectShipment(ship.id) }}
            />
          );
        })}

        {/* ── Origin dots ── */}
        {shipments.map((ship) => (
          <CircleMarker
            key={`origin-${ship.id}`}
            center={[ship.origin.lat, ship.origin.lng]}
            radius={5}
            pathOptions={{ fillColor: '#6750A4', fillOpacity: 0.8, color: 'white', weight: 2 }}
          >
            <Popup>
              <div className={styles.map_popup}>
                <div className={styles.map_popup__title}>📍 {ship.origin.name}</div>
                <div className={styles.map_popup__info}>Origin for {ship.id}<br />Cargo: {ship.cargo}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* ── Destination dots ── */}
        {shipments.map((ship) => (
          <CircleMarker
            key={`dest-${ship.id}`}
            center={[ship.destination.lat, ship.destination.lng]}
            radius={5}
            pathOptions={{ fillColor: '#7D5260', fillOpacity: 0.8, color: 'white', weight: 2 }}
          >
            <Popup>
              <div className={styles.map_popup}>
                <div className={styles.map_popup__title}>🏁 {ship.destination.name}</div>
                <div className={styles.map_popup__info}>Destination for {ship.id}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* ── Moving Shipment Markers ── */}
        {shipments.map((ship) => {
          const risk = getRiskLevel(ship.riskScore);
          const pos = interpolatePosition(ship.route, ship.progress);
          return (
            <Marker
              key={`ship-${ship.id}`}
              position={pos}
              icon={createShipmentIcon(risk.color)}
              eventHandlers={{ click: () => selectShipment(ship.id) }}
            >
              <Popup>
                <div className={styles.map_popup}>
                  <div className={styles.map_popup__title}>{ship.id} — {ship.cargo}</div>
                  <div className={styles.map_popup__info}>
                    {ship.origin.name} → {ship.destination.name}<br />
                    Risk: {formatRiskPercent(ship.riskScore)} · Status: {ship.status}<br />
                    Progress: {Math.round(ship.progress * 100)}%
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* ── Disruption Radius Circles ── */}
        {disruptions.map((dis) => (
          <Circle
            key={`dis-circle-${dis.id}`}
            center={[dis.position.lat, dis.position.lng]}
            radius={dis.radius * 1000}
            pathOptions={{
              fillColor: disruptionFillColors[dis.type] || 'rgba(244,67,54,0.15)',
              fillOpacity: dis.active ? 0.5 : 0.1,
              color: disruptionBorderColors[dis.type] || '#F44336',
              weight: 2,
              dashArray: '8 4',
              opacity: dis.active ? 0.8 : 0.3,
            }}
          />
        ))}

        {/* ── Disruption Center Icons ── */}
        {disruptions.map((dis) => (
          <Marker
            key={`dis-marker-${dis.id}`}
            position={[dis.position.lat, dis.position.lng]}
            icon={createDisruptionIcon(dis.type)}
          >
            <Popup>
              <div className={styles.map_popup}>
                <div className={styles.map_popup__title}>
                  {dis.type === 'weather' ? '🌧️ Weather' : dis.type === 'traffic' ? '🚗 Traffic' : '🚧 Roadblock'}
                </div>
                <div className={styles.map_popup__info}>
                  Intensity: {Math.round(dis.intensity * 100)}%<br />
                  Radius: {dis.radius}km · {dis.active ? 'Active' : 'Inactive'}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* ── Legend ── */}
      <div className={styles.mapwrap__overlay}>
        <div className={styles.mapwrap__legend}>
          {[
            { color: '#4CAF50', label: 'Safe' },
            { color: '#FF9800', label: 'At Risk' },
            { color: '#F44336', label: 'Delayed' },
            { color: '#B71C1C', label: 'Critical' },
          ].map((item) => (
            <div key={item.label} className={styles.mapwrap__legend_item}>
              <div className={styles.mapwrap__legend_dot} style={{ background: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
