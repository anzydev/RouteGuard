import { useState } from "react";
import { 
  useSimulateDisruption, 
  useResetDisruptions, 
  useAiCommand,
  getGetSummaryQueryKey,
  getListShipmentsQueryKey,
  getListDisruptionsQueryKey,
  getListEventsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Terminal, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CommandBar() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [cmdText, setCmdText] = useState("");

  const simulateDisruption = useSimulateDisruption();
  const resetDisruptions = useResetDisruptions();
  const aiCommand = useAiCommand();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListShipmentsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListDisruptionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
  };

  const handleSimulate = (scenario: "suez_blocked" | "china_export_freeze" | "eu_port_strike" | "global_weather_chaos") => {
    simulateDisruption.mutate({ data: { scenario } }, {
      onSuccess: () => {
        invalidateAll();
        toast({
          title: "CHAOS INJECTED",
          description: `Scenario: ${scenario.replace(/_/g, " ").toUpperCase()}`,
          className: "bg-destructive text-destructive-foreground border-none rounded-none font-display uppercase",
          duration: 2000,
        });
      }
    });
  };

  const handleReset = () => {
    resetDisruptions.mutate(undefined, {
      onSuccess: () => {
        invalidateAll();
      }
    });
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmdText.trim()) return;

    aiCommand.mutate({ data: { text: cmdText } }, {
      onSuccess: (res) => {
        invalidateAll();
        setCmdText("");
        toast({
          title: "COMMAND EXECUTED",
          description: res.interpretation,
          className: "bg-primary text-primary-foreground border-none rounded-none font-display uppercase",
          duration: 2000,
        });
      }
    });
  };

  return (
    <div className="h-16 shrink-0 flex gap-2">
      <div className="brutalist-card flex-1 flex items-center px-4 gap-4">
        <Terminal className="text-primary w-5 h-5 shrink-0" />
        <form onSubmit={handleCommand} className="flex-1 flex gap-2">
          <Input 
            value={cmdText}
            onChange={(e) => setCmdText(e.target.value)}
            placeholder="Try: 'Reroute all Asia shipments away from Manila'"
            className="flex-1 bg-input brutalist-border text-foreground font-mono rounded-none focus-visible:ring-primary"
            disabled={aiCommand.isPending}
          />
          <Button 
            type="submit" 
            className="brutalist-button rounded-none"
            disabled={aiCommand.isPending || !cmdText.trim()}
          >
            {aiCommand.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "EXECUTE"}
          </Button>
        </form>
      </div>

      <div className="brutalist-card flex items-center p-2 gap-2 border-destructive">
        <div className="text-xs font-display text-destructive uppercase px-2 flex items-center gap-1">
          <AlertTriangle className="w-4 h-4" /> Global Chaos
        </div>
        
        <Button 
          onClick={() => handleSimulate("suez_blocked")}
          className="brutalist-button-red text-xs h-8 px-2 rounded-none"
          disabled={simulateDisruption.isPending}
        >SUEZ</Button>
        <Button 
          onClick={() => handleSimulate("china_export_freeze")}
          className="brutalist-button-red text-xs h-8 px-2 rounded-none"
          disabled={simulateDisruption.isPending}
        >CHINA</Button>
        <Button 
          onClick={() => handleSimulate("eu_port_strike")}
          className="brutalist-button-red text-xs h-8 px-2 rounded-none"
          disabled={simulateDisruption.isPending}
        >EU</Button>
        <Button 
          onClick={() => handleSimulate("global_weather_chaos")}
          className="brutalist-button-red text-xs h-8 px-2 rounded-none"
          disabled={simulateDisruption.isPending}
        >WEATHER</Button>

        <div className="w-px h-8 bg-border mx-1" />

        <Button 
          onClick={handleReset}
          variant="outline"
          className="border-2 border-border text-xs h-8 px-2 rounded-none font-display uppercase bg-card hover:bg-destructive hover:text-destructive-foreground transition-colors"
          disabled={resetDisruptions.isPending}
        >RESET</Button>
      </div>
    </div>
  );
}
