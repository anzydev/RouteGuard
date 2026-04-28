import { useState } from "react";
import { useGenerateBriefing } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function AiBriefing() {
  const generateBriefing = useGenerateBriefing();
  const [briefing, setBriefing] = useState<{text: string, keyPoints: string[]} | null>(null);

  const handleGenerate = () => {
    generateBriefing.mutate({ data: {} }, {
      onSuccess: (data) => {
        setBriefing(data);
      }
    });
  };

  return (
    <div className="brutalist-card p-4 flex flex-col shrink-0 min-h-48 max-h-64">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-display text-lg uppercase text-primary">Mission Briefing</h2>
        <Button 
          onClick={handleGenerate} 
          disabled={generateBriefing.isPending}
          variant="outline"
          size="sm"
          className="brutalist-button text-xs h-7 px-2"
        >
          {generateBriefing.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Request"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto text-sm font-mono text-muted-foreground">
        {briefing ? (
          <div className="space-y-3">
            <p>{briefing.text}</p>
            <ul className="list-disc pl-4 space-y-1 text-xs text-foreground">
              {briefing.keyPoints.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center opacity-50">
            Awaiting commander request for tactical summary.
          </div>
        )}
      </div>
    </div>
  );
}
