import { useMemo } from "react";
import { ComposableMap, Geographies, Geography, Marker, Line } from "react-simple-maps";
import {
  useListHubs,
  useListLanes,
  useListShipments,
  useListDisruptions,
  getListHubsQueryKey,
  getListLanesQueryKey,
  getListShipmentsQueryKey,
  getListDisruptionsQueryKey,
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface MapProps {
  onSelectShipment: (id: string) => void;
  selectedShipmentId: string | null;
}

const PALETTE = {
  dark: {
    landFill: "#1a2238",
    landHover: "#243056",
    landStroke: "#3a4a72",
    laneStroke: "#3a4a72",
    hubFill: "#7a8aa6",
    shipmentStroke: "#0b1326",
    shipmentLow: "#a3ff5b",
    shipmentMid: "#ffd23f",
    shipmentHigh: "#ff5870",
    disruptionFill: "rgba(255, 88, 112, 0.18)",
    disruptionStroke: "#ff5870",
  },
  light: {
    landFill: "#f4efe2",
    landHover: "#ece4cb",
    landStroke: "#a39780",
    laneStroke: "#9a8e74",
    hubFill: "#3a3520",
    shipmentStroke: "#1a1a1a",
    shipmentLow: "#5a8b1a",
    shipmentMid: "#c98e0a",
    shipmentHigh: "#cc1f3a",
    disruptionFill: "rgba(204, 31, 58, 0.16)",
    disruptionStroke: "#cc1f3a",
  },
} as const;

export default function Map({ onSelectShipment, selectedShipmentId }: MapProps) {
  const { theme } = useTheme();
  const colors = PALETTE[theme];

  const { data: hubs } = useListHubs({ query: { queryKey: getListHubsQueryKey() } });
  const { data: lanes } = useListLanes({ query: { queryKey: getListLanesQueryKey() } });
  const { data: shipments } = useListShipments(undefined, { query: { queryKey: getListShipmentsQueryKey() } });
  const { data: disruptions } = useListDisruptions({ query: { queryKey: getListDisruptionsQueryKey() } });

  const activeShipments = useMemo(() => {
    if (!shipments) return [];
    return shipments.filter((s) => s.status !== "delivered");
  }, [shipments]);

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden map-container">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <div className="bg-card/85 backdrop-blur-sm brutalist-border p-2 text-xs font-mono text-primary flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse glow-primary" /> LIVE TRACKING
        </div>
      </div>

      {/* Risk legend */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-card/85 backdrop-blur-sm brutalist-border px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-foreground flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: colors.shipmentLow }} /> ok
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: colors.shipmentMid }} /> watch
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: colors.shipmentHigh }} /> at-risk
          </span>
        </div>
      </div>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 120 }}
        className="w-full h-full"
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={colors.landFill}
                stroke={colors.landStroke}
                strokeWidth={0.5}
                style={{
                  default: { outline: "none" },
                  hover: { outline: "none", fill: colors.landHover },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {/* Lanes */}
        {lanes?.map((lane) => {
          const origin = hubs?.find((h) => h.id === lane.originHubId);
          const dest = hubs?.find((h) => h.id === lane.destinationHubId);
          if (!origin || !dest) return null;
          return (
            <Line
              key={lane.id}
              from={[origin.lng, origin.lat]}
              to={[dest.lng, dest.lat]}
              stroke={colors.laneStroke}
              strokeWidth={1}
              strokeLinecap="round"
              className={lane.active ? "opacity-60" : "opacity-15"}
            />
          );
        })}

        {/* Hubs */}
        {hubs?.map((hub) => (
          <Marker key={hub.id} coordinates={[hub.lng, hub.lat]}>
            <circle r={2} fill={colors.hubFill} />
          </Marker>
        ))}

        {/* Disruptions */}
        {disruptions?.filter((d) => d.active).map((disruption) => (
          <Marker key={disruption.id} coordinates={[disruption.lng, disruption.lat]}>
            <motion.circle
              r={disruption.radiusKm / 100}
              fill={colors.disruptionFill}
              stroke={colors.disruptionStroke}
              strokeWidth={1}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <circle r={3} fill={colors.disruptionStroke} />
          </Marker>
        ))}

        {/* Shipments */}
        {activeShipments.map((shipment) => {
          const isSelected = shipment.id === selectedShipmentId;
          const color =
            shipment.riskScore > 70 ? colors.shipmentHigh :
            shipment.riskScore > 30 ? colors.shipmentMid :
            colors.shipmentLow;

          return (
            <Marker
              key={shipment.id}
              coordinates={[shipment.currentLng, shipment.currentLat]}
              onClick={() => onSelectShipment(shipment.id)}
              className="cursor-pointer"
            >
              <circle
                r={isSelected ? 6 : 4}
                fill={color}
                stroke={colors.shipmentStroke}
                strokeWidth={1}
                className="transition-all"
              />
            </Marker>
          );
        })}
      </ComposableMap>
    </div>
  );
}
