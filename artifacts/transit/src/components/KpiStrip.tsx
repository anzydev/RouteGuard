import { DashboardSummary } from "@workspace/api-client-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ThemeToggle from "@/components/ThemeToggle";

interface KpiStripProps {
  summary?: DashboardSummary;
  crisisMode: boolean;
  setCrisisMode: (val: boolean) => void;
}

export default function KpiStrip({ summary, crisisMode, setCrisisMode }: KpiStripProps) {
  if (!summary) return null;

  return (
    <div className="flex gap-2 w-full h-24 shrink-0">
      {/* Brand block + theme toggle */}
      <div className="brutalist-card w-56 flex flex-col justify-center px-4 py-2">
        <div className="flex items-center justify-between mb-1">
          <div className="font-display text-xl uppercase leading-none text-primary tracking-wider">
            Transit
          </div>
          <ThemeToggle compact />
        </div>
        <div className="text-[10px] font-mono text-muted-foreground uppercase mt-1">
          Control Tower v1
        </div>
      </div>

      <div className="brutalist-card flex-1 flex flex-col justify-center p-4">
        <div className="text-xs text-muted-foreground font-mono mb-1 uppercase">Shipments Dying</div>
        <div className="text-3xl font-display text-destructive">
          {summary.atRiskCount}
        </div>
      </div>

      <div className="brutalist-card flex-1 flex flex-col justify-center p-4">
        <div className="text-xs text-muted-foreground font-mono mb-1 uppercase">Value at Risk</div>
        <div className="text-3xl font-display text-primary">
          ${(summary.totalValueAtRiskUsd / 1000000).toFixed(1)}M
        </div>
      </div>

      <div className="brutalist-card flex-1 flex flex-col justify-center p-4 transform -rotate-1 origin-center">
        <div className="text-xs text-muted-foreground font-mono mb-1 uppercase">Avg Delay</div>
        <div className="text-3xl font-display text-accent">
          +{summary.avgEtaDeltaHours.toFixed(1)}H
        </div>
      </div>

      <div className="brutalist-card flex-1 flex flex-col justify-center p-4">
        <div className="text-xs text-muted-foreground font-mono mb-1 uppercase">Active Disruptions</div>
        <div className="text-3xl font-display text-destructive">
          {summary.activeDisruptions}
        </div>
      </div>

      {/* Crisis Mode & Score */}
      <div className={`brutalist-card w-64 flex flex-col justify-center p-4 ${crisisMode ? "brutalist-border-destructive" : ""}`}>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-mono uppercase text-muted-foreground">Crisis Mode</Label>
          <Switch
            checked={crisisMode}
            onCheckedChange={setCrisisMode}
            className="data-[state=checked]:bg-destructive"
          />
        </div>
        <div className="flex justify-between items-end">
          <div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase">Score</div>
            <div className={`text-xl font-display ${crisisMode ? "text-primary" : "text-foreground"}`}>{summary.score}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono text-muted-foreground uppercase">Saved Today</div>
            <div className={`text-xl font-display ${crisisMode ? "text-primary" : "text-foreground"}`}>
              ${(summary.savedDollarsToday / 1000).toFixed(0)}k
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
