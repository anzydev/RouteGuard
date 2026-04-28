import { useState, useEffect } from "react";
import { 
  useGetSummary, 
  getGetSummaryQueryKey,
  useListShipments,
  getListShipmentsQueryKey,
  useListDisruptions,
  getListDisruptionsQueryKey,
  useListEvents,
  getListEventsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Map from "@/components/Map";
import KpiStrip from "@/components/KpiStrip";
import DisruptionFeed from "@/components/DisruptionFeed";
import AiBriefing from "@/components/AiBriefing";
import ShipmentList from "@/components/ShipmentList";
import CommandBar from "@/components/CommandBar";
import ShipmentDetailDrawer from "@/components/ShipmentDetailDrawer";

export default function Home() {
  const queryClient = useQueryClient();
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [crisisMode, setCrisisMode] = useState(false);
  const [booting, setBooting] = useState(false);

  const { data: summary } = useGetSummary({ query: { queryKey: getGetSummaryQueryKey() } });
  
  // Live tick every 4s
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListShipmentsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListDisruptionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
    }, 4000);
    return () => clearInterval(interval);
  }, [queryClient]);

  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (booting) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background text-primary font-mono relative overflow-hidden">
        <div className="scanline" />
        <div className="text-center z-10">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0, 1] }}
            transition={{ duration: 0.5, times: [0, 0.2, 0.4, 1] }}
            className="text-4xl font-display uppercase tracking-widest mb-4"
          >
            Booting Transit...
          </motion.div>
          <div className="text-sm opacity-70">INITIALIZING GLOBAL UPLINK [OK]</div>
          <div className="text-sm opacity-70">ESTABLISHING SATELLITE COMM [OK]</div>
          <div className="text-sm opacity-70">LOADING SHIPMENT DATA [WAIT]</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden p-2 gap-2 bg-background">
      {/* Top KPI Strip */}
      <KpiStrip summary={summary} crisisMode={crisisMode} setCrisisMode={setCrisisMode} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-row gap-2 min-h-0">
        
        {/* Left Rail */}
        <div className="w-80 flex flex-col gap-2 min-h-0">
          <AiBriefing />
          <DisruptionFeed onSelectShipment={setSelectedShipmentId} />
        </div>

        {/* Center Map */}
        <div className="flex-1 relative brutalist-border rounded-none overflow-hidden flex flex-col">
          <Map onSelectShipment={setSelectedShipmentId} selectedShipmentId={selectedShipmentId} />
        </div>

        {/* Right Rail */}
        <div className="w-96 flex flex-col gap-2 min-h-0">
          <ShipmentList 
            summary={summary} 
            onSelectShipment={setSelectedShipmentId}
            selectedShipmentId={selectedShipmentId} 
          />
        </div>

      </div>

      {/* Bottom Command Bar */}
      <CommandBar />

      {/* Drawer */}
      <AnimatePresence>
        {selectedShipmentId && (
          <ShipmentDetailDrawer 
            shipmentId={selectedShipmentId} 
            onClose={() => setSelectedShipmentId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
