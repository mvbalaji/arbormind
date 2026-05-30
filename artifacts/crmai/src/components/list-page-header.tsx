import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Search, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AISummary } from "@/components/ai-summary";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ListViewOption {
  label: string;
  value: string;
  /** When true, the view is grouped under "Pinned List Views". */
  pinned?: boolean;
}

interface ListPageHeaderProps {
  icon: LucideIcon;
  title: string;
  /** Secondary line under the title (e.g. "All Accounts"). */
  viewLabel?: string;
  /** When provided (with onViewChange), the view label becomes an interactive picker. */
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  const hasViewDropdown = Boolean(
    viewOptions && viewOptions.length > 0 && onViewChange,
  );

  const activeLabel =
    viewOptions?.find((v) => v.value === activeView)?.label ?? viewLabel;

  const hasFlags = (viewOptions ?? []).some((v) => v.pinned);
  const pinnedViews = hasFlags
    ? (viewOptions ?? []).filter((v) => v.pinned)
    : (viewOptions ?? []);
  const otherViews = hasFlags
    ? (viewOptions ?? []).filter((v) => !v.pinned)
    : [];

  const matches = (v: ListViewOption) =>
    !pickerSearch || v.label.toLowerCase().includes(pickerSearch.toLowerCase());
  const filteredPinned = pinnedViews.filter(matches);
  const filteredOther = otherViews.filter(matches);

  const renderViewButton = (view: ListViewOption) => (
    <button
      key={view.value}
      role="option"
      aria-selected={activeView === view.value}
      onClick={() => {
        onViewChange!(view.value);
        setPickerOpen(false);
        setPickerSearch("");
      }}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-1 text-sm text-left hover:bg-muted transition-colors",
        activeView === view.value && "text-primary font-medium",
      )}
    >
      {activeView === view.value ? (
        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      {view.label}
    </button>
  );

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
            <Popover
              open={pickerOpen}
              onOpenChange={(open) => {
                setPickerOpen(open);
                if (!open) setPickerSearch("");
              }}
            >
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {activeLabel}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" sideOffset={6} className="w-64 p-0">
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      aria-label="Search list views"
                      placeholder="Search list views..."
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 text-sm bg-transparent border border-border rounded-md outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
                      autoFocus
                    />
                  </div>
                </div>
                <div
                  className="max-h-72 overflow-y-auto py-1"
                  role="listbox"
                  aria-label="List views"
                >
                  {filteredPinned.length === 0 && filteredOther.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                      No matching views found.
                    </div>
                  ) : (
                    <>
                      {filteredPinned.length > 0 && (
                        <>
                          <div className="px-3 pt-1 pb-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Pinned List Views
                            </span>
                          </div>
                          {filteredPinned.map(renderViewButton)}
                        </>
                      )}
                      {filteredOther.length > 0 && (
                        <>
                          <div className="border-t border-border mt-1" />
                          <div className="px-3 pt-2 pb-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              All Other Views
                            </span>
                          </div>
                          {filteredOther.map(renderViewButton)}
                        </>
                      )}
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
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
