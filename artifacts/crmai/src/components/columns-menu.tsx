import { Columns3, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type ColumnDef<K extends string> = { key: K; label: string };

type Props<K extends string> = {
  columns: ReadonlyArray<ColumnDef<K>>;
  isVisible: (key: K) => boolean;
  toggle: (key: K) => void;
  showAll: () => void;
};

export function ColumnsMenu<K extends string>({ columns, isVisible, toggle, showAll }: Props<K>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          title="Show or hide columns"
        >
          <Columns3 className="w-3.5 h-3.5" />
          Columns
          <ChevronDown className="w-3 h-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((c) => (
          <DropdownMenuCheckboxItem
            key={c.key}
            checked={isVisible(c.key)}
            onCheckedChange={() => toggle(c.key)}
            onSelect={(e) => e.preventDefault()}
            className="text-sm cursor-pointer"
          >
            {c.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={showAll} className="text-xs cursor-pointer">
          Show all
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
