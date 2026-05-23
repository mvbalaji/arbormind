import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS, type PageSize } from "@/hooks/use-pagination";

interface Props {
  page: number;
  totalPages: number;
  pageSize: PageSize;
  total: number;
  pageStart: number;
  pageEnd: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: PageSize) => void;
  className?: string;
}

export function TablePagination({
  page, totalPages, pageSize, total, pageStart, pageEnd,
  onPageChange, onPageSizeChange, className,
}: Props) {
  if (total === 0) return null;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-xs text-muted-foreground border-t border-border ${className ?? ""}`}>
      <div className="flex items-center gap-2">
        <span>Rows per page</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v) as PageSize)}>
          <SelectTrigger className="h-7 w-[72px] text-xs bg-muted border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map(n => (
              <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <span>
          {pageStart.toLocaleString()}–{pageEnd.toLocaleString()} of {total.toLocaleString()}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7 border-border" disabled={page <= 1} onClick={() => onPageChange(1)} aria-label="First page">
            <ChevronsLeft className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7 border-border" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="px-1.5">Page {page} of {totalPages}</span>
          <Button variant="outline" size="icon" className="h-7 w-7 border-border" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7 border-border" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} aria-label="Last page">
            <ChevronsRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
