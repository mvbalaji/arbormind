import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface PipelineStage {
  id: string;
  label: string;
  enteredAt?: Date | null;
  days?: number | null;
  note?: string;
}

export interface StageAdvanceAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  tone?: "blue" | "emerald";
}

type CurrentTone = "blue" | "red" | "amber" | "emerald";

interface StagePipelineProps {
  ariaLabel: string;
  stages: PipelineStage[];
  currentId: string;
  currentTone?: CurrentTone;
  advance?: StageAdvanceAction | null;
}

const CURRENT_BG: Record<CurrentTone, string> = {
  blue: "bg-blue-600 text-white",
  red: "bg-red-600 text-white",
  amber: "bg-amber-500 text-white",
  emerald: "bg-emerald-600 text-white",
};

const ADVANCE_BG: Record<"blue" | "emerald", string> = {
  blue: "bg-blue-600 hover:bg-blue-700 text-white",
  emerald: "bg-emerald-600 hover:bg-emerald-700 text-white",
};

const CURRENT_DOT: Record<CurrentTone, string> = {
  blue: "bg-blue-400",
  red: "bg-red-400",
  amber: "bg-amber-400",
  emerald: "bg-emerald-400",
};

const CHEVRON_MID =
  "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)";
const CHEVRON_LAST = "polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)";

export function StagePipeline({
  ariaLabel,
  stages,
  currentId,
  currentTone = "blue",
  advance,
}: StagePipelineProps) {
  const idx = stages.findIndex((s) => s.id === currentId);
  if (idx < 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-2">
      <TooltipProvider delayDuration={150}>
        <div className="flex-1 overflow-x-auto">
        <ol
          role="list"
          aria-label={ariaLabel}
          className="flex items-stretch rounded-md border border-border bg-muted/30 list-none p-0 m-0 min-w-max w-full"
        >
          {stages.map((s, i) => {
            const done = i < idx;
            const current = i === idx;
            const isLast = i === stages.length - 1;
            const stateLabel = done
              ? "Completed"
              : current
                ? "Current"
                : "Upcoming";
            return (
              <Tooltip key={s.id}>
                <TooltipTrigger asChild>
                  <li
                    role="listitem"
                    tabIndex={0}
                    aria-current={current ? "step" : undefined}
                    aria-label={`${s.label} — ${stateLabel}`}
                    className={`relative flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium min-w-0 cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset ${
                      done
                        ? "bg-emerald-500 text-white"
                        : current
                          ? CURRENT_BG[currentTone]
                          : "bg-muted/50 text-muted-foreground"
                    }`}
                    style={{ clipPath: isLast ? CHEVRON_LAST : CHEVRON_MID }}
                  >
                    {done ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          aria-hidden="true"
                          className="flex items-center justify-center w-4 h-4 rounded-full bg-white/20"
                        >
                          <Check className="w-3 h-3" />
                        </span>
                        {s.days != null && (
                          <span className="text-[9px] leading-none opacity-90 font-normal">
                            {s.days}d
                          </span>
                        )}
                        <span className="sr-only">{s.label}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5 min-w-0 w-full">
                        <span className="truncate max-w-full text-center">{s.label}</span>
                        {s.days != null && current && (
                          <span className="text-[9px] leading-none opacity-80 font-normal">
                            {s.days}d so far
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="bg-foreground text-background border-border max-w-xs"
                >
                  <div className="text-xs">
                    <div className="font-semibold mb-1">{s.label}</div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${
                          done
                            ? "bg-emerald-400"
                            : current
                              ? CURRENT_DOT[currentTone]
                              : "bg-muted-foreground/60"
                        }`}
                      />
                      <span>Status: {stateLabel}</span>
                    </div>
                    {s.enteredAt && (
                      <div className="opacity-80">
                        Entered: {format(s.enteredAt, "MMM d, yyyy")}
                      </div>
                    )}
                    {s.days != null && (
                      <div className="mt-0.5">
                        {current ? `${s.days} day${s.days === 1 ? "" : "s"} in this stage so far`
                          : done ? `Spent ${s.days} day${s.days === 1 ? "" : "s"} here`
                          : ""}
                      </div>
                    )}
                    {s.note && <div className="mt-1 opacity-80">{s.note}</div>}
                    {!s.enteredAt && !s.note && !done && !current && (
                      <div className="opacity-70">Not yet reached</div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </ol>
        </div>
      </TooltipProvider>
      {advance && (
        <Button
          size="sm"
          onClick={advance.onClick}
          disabled={advance.disabled}
          className={`shrink-0 self-start sm:self-center h-8 gap-1.5 text-xs ${ADVANCE_BG[advance.tone ?? "blue"]}`}
        >
          <advance.icon className="w-3.5 h-3.5" />
          {advance.label}
        </Button>
      )}
    </div>
  );
}
