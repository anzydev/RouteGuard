import { 
  useListEvents, 
  getListEventsQueryKey 
} from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DisruptionFeedProps {
  onSelectShipment: (id: string) => void;
}

export default function DisruptionFeed({ onSelectShipment }: DisruptionFeedProps) {
  const { data: events } = useListEvents({ limit: 20 }, { query: { queryKey: getListEventsQueryKey({ limit: 20 }) } });

  return (
    <div className="brutalist-card flex-1 flex flex-col overflow-hidden">
      <div className="bg-destructive text-destructive-foreground p-1 text-xs font-display overflow-hidden whitespace-nowrap border-b-2 border-border">
        <div className="animate-marquee inline-block uppercase">
          BREAKING: MULTIPLE DISRUPTIONS DETECTED ACROSS GLOBAL SUPPLY CHAIN • HIGH RISK OF CASCADING DELAYS • 
        </div>
      </div>
      <ScrollArea className="flex-1 p-2">
        <div className="flex flex-col gap-2">
          {events?.map((event) => (
            <div 
              key={event.id} 
              className={`p-3 border-2 ${
                event.severity === "critical" ? "border-destructive bg-destructive/10" : 
                event.severity === "high" ? "border-orange-500 bg-orange-500/10" : 
                "border-border bg-surface-2"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">
                  {formatDistanceToNow(new Date(event.at), { addSuffix: true })}
                </div>
                {event.relatedShipmentId && (
                  <button 
                    onClick={() => onSelectShipment(event.relatedShipmentId!)}
                    className="text-[10px] font-mono bg-primary text-primary-foreground px-1 uppercase hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    View
                  </button>
                )}
              </div>
              <div className={`text-sm font-display uppercase mb-1 ${
                event.severity === "critical" ? "text-destructive" : 
                event.severity === "high" ? "text-orange-500" : 
                "text-primary"
              }`}>
                {event.headline}
              </div>
              <div className="text-xs text-muted-foreground font-sans">
                {event.body}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
