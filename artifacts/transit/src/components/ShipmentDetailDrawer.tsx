import { 
  useGetShipment, 
  getGetShipmentQueryKey,
  useAcceptReroute,
  getGetSummaryQueryKey,
  getListShipmentsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { X, ArrowRight, ShieldAlert, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ShipmentDetailDrawerProps {
  shipmentId: string;
  onClose: () => void;
}

export default function ShipmentDetailDrawer({ shipmentId, onClose }: ShipmentDetailDrawerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: detail, isLoading } = useGetShipment(shipmentId, { 
    query: { enabled: !!shipmentId, queryKey: getGetShipmentQueryKey(shipmentId) } 
  });

  const acceptReroute = useAcceptReroute();

  const handleAccept = (recommendationId: string) => {
    acceptReroute.mutate({ id: shipmentId, data: { recommendationId } }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListShipmentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetShipmentQueryKey(shipmentId) });
        
        toast({
          title: "REROUTE ACCEPTED",
          description: `Saved $${res.dollarsSaved.toLocaleString()} | Score +${res.score}`,
          className: "bg-primary text-primary-foreground border-none rounded-none font-display uppercase",
        });
        
        // onClose(); // Optional: close drawer after accepting
      }
    });
  };

  return (
    <motion.div 
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute bottom-0 left-0 right-0 h-2/3 bg-card border-t-4 border-primary shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-50 flex flex-col"
    >
      <div className="flex justify-between items-center p-4 border-b-2 border-border bg-surface-2">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-display uppercase text-primary">
            {detail?.shipment.refCode || "LOADING..."}
          </h2>
          {detail?.shipment && (
            <div className="px-2 py-1 bg-border text-xs font-mono uppercase">
              {detail.shipment.status.replace("_", " ")}
            </div>
          )}
        </div>
        <button onClick={onClose} className="p-2 hover:bg-foreground/10 transition-colors" aria-label="Close drawer">
          <X className="w-6 h-6 text-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {isLoading ? (
          <div className="text-center font-mono text-muted-foreground animate-pulse mt-10">RETRIEVING DATA...</div>
        ) : detail ? (
          <>
            {/* Metadata */}
            <div className="grid grid-cols-4 gap-4">
              <div className="brutalist-card p-4 bg-surface-2">
                <div className="text-xs font-mono text-muted-foreground uppercase mb-1">Route</div>
                <div className="text-sm font-bold flex items-center gap-2">
                  <span className="truncate">{detail.shipment.originName}</span>
                  <ArrowRight className="w-3 h-3 shrink-0" />
                  <span className="truncate">{detail.shipment.destinationName}</span>
                </div>
              </div>
              <div className="brutalist-card p-4 bg-surface-2">
                <div className="text-xs font-mono text-muted-foreground uppercase mb-1">Risk Score</div>
                <div className={`text-xl font-display ${detail.shipment.riskScore > 70 ? 'text-destructive' : 'text-primary'}`}>
                  {detail.shipment.riskScore}/100
                </div>
              </div>
              <div className="brutalist-card p-4 bg-surface-2">
                <div className="text-xs font-mono text-muted-foreground uppercase mb-1">Value</div>
                <div className="text-xl font-display">${(detail.shipment.cargoValueUsd).toLocaleString()}</div>
              </div>
              <div className="brutalist-card p-4 bg-surface-2">
                <div className="text-xs font-mono text-muted-foreground uppercase mb-1">Delay</div>
                <div className={`text-xl font-display ${detail.shipment.etaDeltaHours > 0 ? 'text-destructive' : 'text-primary'}`}>
                  {detail.shipment.etaDeltaHours > 0 ? `+${detail.shipment.etaDeltaHours}H` : 'NONE'}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {detail.recommendations && detail.recommendations.length > 0 && (
              <div>
                <h3 className="text-lg font-display uppercase mb-4 flex items-center gap-2 text-accent">
                  <Zap className="w-5 h-5" /> Tactical Reroutes Available
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {detail.recommendations.map(rec => (
                    <div key={rec.id} className="brutalist-card p-4 flex flex-col border-accent">
                      <div className="text-sm font-bold uppercase mb-2 text-accent">{rec.label}</div>
                      
                      <div className="flex flex-wrap gap-1 mb-4">
                        {rec.viaHubNames.map((name, i) => (
                          <span key={i} className="text-[10px] font-mono bg-border px-1 py-0.5 uppercase truncate max-w-[120px]">
                            {name}
                          </span>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-4 text-xs font-mono">
                        <div>
                          <div className="text-muted-foreground">ETA DELTA</div>
                          <div className={rec.etaDeltaHours > 0 ? 'text-destructive' : 'text-primary'}>
                            {rec.etaDeltaHours > 0 ? `+${rec.etaDeltaHours}h` : `${rec.etaDeltaHours}h`}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">COST</div>
                          <div className={rec.costDeltaUsd > 0 ? 'text-destructive' : 'text-primary'}>
                            {rec.costDeltaUsd > 0 ? `+$${rec.costDeltaUsd}` : `-$${Math.abs(rec.costDeltaUsd)}`}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mb-4 flex-1">{rec.justification}</p>

                      <Button 
                        onClick={() => handleAccept(rec.id)}
                        disabled={acceptReroute.isPending}
                        className="brutalist-button rounded-none w-full bg-accent text-black border-black shadow-[4px_4px_0px_0px_#000] hover:bg-accent/90"
                      >
                        {acceptReroute.isPending ? "EXECUTING..." : "ACCEPT REROUTE"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </motion.div>
  );
}
