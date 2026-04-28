import { DashboardSummary, useListShipments, getListShipmentsQueryKey } from "@workspace/api-client-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Ship, Plane, Truck, Train } from "lucide-react";

interface ShipmentListProps {
  summary?: DashboardSummary;
  onSelectShipment: (id: string) => void;
  selectedShipmentId: string | null;
}

const ModeIcon = ({ mode, className }: { mode: string, className?: string }) => {
  switch (mode) {
    case "sea": return <Ship className={className} />;
    case "air": return <Plane className={className} />;
    case "road": return <Truck className={className} />;
    case "rail": return <Train className={className} />;
    default: return <Truck className={className} />;
  }
};

export default function ShipmentList({ summary, onSelectShipment, selectedShipmentId }: ShipmentListProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: shipments } = useListShipments(
    statusFilter !== "all" ? { status: statusFilter as any } : undefined,
    { query: { queryKey: getListShipmentsQueryKey(statusFilter !== "all" ? { status: statusFilter as any } : undefined) } }
  );

  return (
    <div className="brutalist-card flex-1 flex flex-col overflow-hidden">
      <div className="p-3 border-b-2 border-border flex justify-between items-center bg-surface-2">
        <h2 className="font-display uppercase text-primary text-sm">Active Shipments</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8 text-xs font-mono rounded-none brutalist-border bg-input text-foreground">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent className="rounded-none brutalist-border bg-card">
            <SelectItem value="all" className="font-mono text-xs rounded-none focus:bg-primary focus:text-primary-foreground">ALL</SelectItem>
            <SelectItem value="at_risk" className="font-mono text-xs rounded-none focus:bg-primary focus:text-primary-foreground">AT RISK</SelectItem>
            <SelectItem value="delayed" className="font-mono text-xs rounded-none focus:bg-primary focus:text-primary-foreground">DELAYED</SelectItem>
            <SelectItem value="on_track" className="font-mono text-xs rounded-none focus:bg-primary focus:text-primary-foreground">ON TRACK</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col p-2 gap-2">
          {shipments?.map((s) => {
            const isTopRisk = summary?.topAtRiskShipmentIds.includes(s.id);
            const isSelected = selectedShipmentId === s.id;
            
            return (
              <div 
                key={s.id}
                onClick={() => onSelectShipment(s.id)}
                className={`p-2 border-2 cursor-pointer transition-colors ${
                  isSelected ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground bg-surface-2"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    {isTopRisk && <span className="bg-destructive text-destructive-foreground text-[9px] px-1 font-display uppercase">Top Risk</span>}
                    <span className="font-mono text-xs font-bold">{s.refCode}</span>
                  </div>
                  <ModeIcon mode={s.mode} className="w-4 h-4 text-muted-foreground" />
                </div>
                
                <div className="flex justify-between text-xs text-muted-foreground mb-2 truncate">
                  <span className="truncate flex-1">{s.originName}</span>
                  <span className="mx-2">→</span>
                  <span className="truncate flex-1 text-right">{s.destinationName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-border relative overflow-hidden">
                    <div 
                      className={`absolute top-0 left-0 h-full ${
                        s.riskScore > 70 ? "bg-destructive" : s.riskScore > 30 ? "bg-yellow-500" : "bg-primary"
                      }`}
                      style={{ width: `${s.riskScore}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-mono ${s.etaDeltaHours > 0 ? 'text-destructive' : 'text-primary'}`}>
                    {s.etaDeltaHours > 0 ? `+${s.etaDeltaHours}H` : 'ON TIME'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
