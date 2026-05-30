import type { LucideIcon } from "lucide-react";
import { Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AISummary } from "@/components/ai-summary";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ListViewOption {
  label: string;
  value: string;
}

interface ListPageHeaderProps {
  icon: LucideIcon;
  title: string;
  /** Secondary line under the title (e.g. "All Accounts"). */
  viewLabel?: string;
  /** When provided (with onViewChange), the view label becomes an interactive dropdown. */
  viewOptions?: ListViewOption[];
  activeView?: string;
  onViewChange?: (value: string) => void;
  /** Search box rendered on the right. Omit to hide. */
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  /** Entity type for the compact AI summary button. Omit to hide. */
  aiEntityType?: string;
  /** New-record handler. Omit to hide the primary button. */
  onNew?: () => void;
  newLabel?: string;
  /** Extra controls placed between the search box and the AI/New buttons. */
  children?: React.ReactNode;
}

export function ListPageHeader({
  icon: Icon,
  title,
  viewLabel,
  viewOptions,
  activeView,
  onViewChange,
  search,
  aiEntityType,
  onNew,
  newLabel = "New",
  children,
}: ListPageHeaderProps) {
  const hasViewDropdown = Boolean(viewOptions && viewOptions.length > 0 && onViewChange);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-xl bg-primary/10 shrink-0">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-display font-bold text-foreground tracking-tight leading-tight truncate">
            {title}
          </h1>
          {hasViewDropdown ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {viewOptions!.find((v) => v.value === activeView)?.label ?? viewLabel}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {viewOptions!.map((v) => (
                  <DropdownMenuItem
                    key={v.value}
                    onClick={() => onViewChange!(v.value)}
                    className={cn(
                      "cursor-pointer text-sm",
                      activeView === v.value && "text-primary font-medium",
                    )}
                  >
                    {v.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : viewLabel ? (
            <p className="text-sm text-muted-foreground truncate">{viewLabel}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        {search && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={search.placeholder ?? "Search this list..."}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              className="pl-8 h-8 w-48 text-sm bg-card border-border"
            />
          </div>
        )}

        {children}

        {aiEntityType && <AISummary entityType={aiEntityType} compact />}

        {onNew && (
          <Button
            size="sm"
            onClick={onNew}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-8"
          >
            {newLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
