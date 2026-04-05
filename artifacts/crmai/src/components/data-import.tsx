import React, { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileSpreadsheet, FileText, X, CheckCircle2, AlertCircle,
  ChevronDown, Download, ArrowRight, RefreshCw, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ENTITIES = [
  {
    id: "leads",
    label: "Leads",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    required: ["firstName", "lastName"],
    columns: ["firstName", "lastName", "email", "phone", "company", "title", "status", "source", "industry", "description"],
    sample: [
      { firstName: "Priya", lastName: "Sharma", email: "priya@techcorp.in", phone: "+91 9876543210", company: "TechCorp India", title: "VP Sales", status: "new", source: "LinkedIn", industry: "SaaS" },
      { firstName: "Arjun", lastName: "Mehta", email: "arjun@globalfin.com", phone: "+91 9123456789", company: "GlobalFin", title: "Director Operations", status: "new", source: "Website", industry: "Finance" },
    ],
  },
  {
    id: "contacts",
    label: "Contacts",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    required: ["firstName", "lastName"],
    columns: ["firstName", "lastName", "email", "phone", "mobile", "title", "department", "leadSource", "city", "country", "description"],
    sample: [
      { firstName: "Neha", lastName: "Gupta", email: "neha@acme.com", phone: "+91 8765432100", title: "CTO", department: "Engineering", city: "Bangalore", country: "India" },
    ],
  },
  {
    id: "accounts",
    label: "Accounts",
    color: "bg-green-50 text-green-700 border-green-200",
    required: ["name"],
    columns: ["name", "industry", "website", "phone", "email", "city", "country", "employees", "annualRevenue", "description"],
    sample: [
      { name: "Infosys Ltd", industry: "IT Services", website: "https://infosys.com", phone: "+91 80 2852 0261", city: "Bangalore", country: "India", employees: 335000, annualRevenue: 16311000000 },
    ],
  },
  {
    id: "opportunities",
    label: "Opportunities",
    color: "bg-orange-50 text-orange-700 border-orange-200",
    required: ["name"],
    columns: ["name", "stage", "amount", "probability", "closeDate", "leadSource", "nextStep", "forecastCategory", "description"],
    sample: [
      { name: "Enterprise License - TechCorp", stage: "proposal", amount: 125000, probability: 65, closeDate: "2025-06-30", leadSource: "LinkedIn", forecastCategory: "best case" },
    ],
  },
  {
    id: "campaigns",
    label: "Campaigns",
    color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    required: ["name"],
    columns: ["name", "type", "status", "startDate", "endDate", "budget", "expectedRevenue", "description", "goals", "channels"],
    sample: [
      { name: "Q2 Email Blast 2025", type: "email", status: "planning", startDate: "2025-04-01", endDate: "2025-06-30", budget: 5000, expectedRevenue: 50000, goals: "Generate 100 MQLs" },
    ],
  },
];

interface ImportResult {
  inserted: number;
  skipped: number;
  skippedRows?: number[];
}

type ParsedRow = Record<string, string | number | null>;

export function DataImport() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedEntity, setSelectedEntity] = useState(ENTITIES[0]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const PREVIEW_ROWS = 8;

  const parseFile = useCallback((file: File) => {
    setResult(null);
    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "binary", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonRows = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: null, raw: false });

        if (!jsonRows.length) { setError("The file is empty or has no data rows."); return; }
        setHeaders(Object.keys(jsonRows[0]));
        setRows(jsonRows);
      } catch (ex) {
        setError(`Failed to parse file: ${String(ex)}`);
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch(`/api/import/${selectedEntity.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ records: rows }),
      });
      const data = await res.json() as { success?: boolean; inserted?: number; skipped?: number; skippedRows?: number[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setResult({ inserted: data.inserted ?? 0, skipped: data.skipped ?? 0, skippedRows: data.skippedRows });
      toast({ title: `Import complete — ${data.inserted} records inserted` });
    } catch (ex) {
      setError(String(ex));
      toast({ title: "Import failed", description: String(ex), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setRows([]);
    setHeaders([]);
    setFileName(null);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadTemplate = () => {
    const sample = selectedEntity.sample;
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedEntity.label);
    XLSX.writeFile(wb, `${selectedEntity.id}_template.xlsx`);
  };

  const entity = selectedEntity;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Data Import</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Upload Excel (.xlsx) or CSV files to bulk-import records into any CRM entity.</p>
        </div>
      </div>

      {/* Entity Selector */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">1. Select Entity to Import Into</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {ENTITIES.map((e) => (
            <button
              key={e.id}
              onClick={() => { setSelectedEntity(e); reset(); }}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all",
                selectedEntity.id === e.id
                  ? cn("border-2", e.color)
                  : "border-border text-muted-foreground hover:border-white/20 hover:text-white bg-muted/50"
              )}
            >
              <FileSpreadsheet className="w-4 h-4" />
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Required fields info */}
      <Card className="glass-panel border-border p-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Supported Columns for <span className="text-white">{entity.label}</span></p>
            <div className="flex flex-wrap gap-1.5">
              {entity.columns.map((col) => (
                <Badge key={col} variant="outline" className={cn("text-xs", entity.required.includes(col) ? entity.color : "border-border text-muted-foreground")}>
                  {col}
                  {entity.required.includes(col) && <span className="ml-0.5 text-red-600">*</span>}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-red-600">*</span> Required fields. Column headers in your file can be camelCase, snake_case, or "Title Case".
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={downloadTemplate} className="border-border gap-1.5 shrink-0">
            <Download className="w-3.5 h-3.5" /> Download Template
          </Button>
        </div>
      </Card>

      {/* Upload Area */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">2. Upload Your File</p>
        {!rows.length ? (
          <div
            className={cn(
              "relative rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-3 py-16",
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-white/20 hover:bg-muted/50"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-colors", isDragging ? "bg-primary/20" : "bg-muted/50")}>
              <Upload className={cn("w-7 h-7 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div className="text-center">
              <p className="text-white font-medium">{isDragging ? "Drop your file here" : "Drag & drop or click to upload"}</p>
              <p className="text-sm text-muted-foreground mt-1">Supports .xlsx, .xls, .csv</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              {fileName?.endsWith(".csv") ? <FileText className="w-5 h-5 text-primary" /> : <FileSpreadsheet className="w-5 h-5 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground">{rows.length.toLocaleString()} rows · {headers.length} columns detected</p>
            </div>
            <Button size="sm" variant="ghost" onClick={reset} className="text-muted-foreground hover:text-red-600 h-8 px-2">
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-600">Import Error</p>
              <p className="text-xs text-red-300/80 mt-0.5">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Success Result */}
      {result && (
        <Card className="border-green-500/30 bg-green-500/5 p-5">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-sm font-semibold text-green-600">Import Successful</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-green-500/10 rounded-xl">
              <p className="text-2xl font-bold text-green-600">{result.inserted}</p>
              <p className="text-xs text-muted-foreground">Records Inserted</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-xl">
              <p className="text-2xl font-bold text-muted-foreground">{result.skipped}</p>
              <p className="text-xs text-muted-foreground">Rows Skipped</p>
            </div>
          </div>
          {result.skipped > 0 && result.skippedRows?.length && (
            <p className="text-xs text-muted-foreground mt-3">
              Skipped rows (missing required fields): {result.skippedRows.slice(0, 10).join(", ")}{result.skippedRows.length > 10 ? ` +${result.skippedRows.length - 10} more` : ""}
            </p>
          )}
          <Button size="sm" variant="outline" onClick={reset} className="mt-3 border-border gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Import Another File
          </Button>
        </Card>
      )}

      {/* Data Preview */}
      {rows.length > 0 && !result && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">3. Preview (first {Math.min(PREVIEW_ROWS, rows.length)} of {rows.length} rows)</p>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={importing}
              className="gap-1.5 bg-primary hover:bg-primary/90 text-foreground"
            >
              {importing ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing...</>
              ) : (
                <><ArrowRight className="w-3.5 h-3.5" /> Import {rows.length} Record{rows.length !== 1 ? "s" : ""}</>
              )}
            </Button>
          </div>

          <Card className="glass-panel border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-muted-foreground font-medium">#</th>
                    {headers.map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className={cn(entity.columns.includes(h) ? "text-white" : "text-muted-foreground")}>{h}</span>
                          {entity.required.includes(h) && <span className="text-red-600">*</span>}
                          {entity.columns.includes(h) ? (
                            <CheckCircle2 className="w-3 h-3 text-green-600 ml-0.5" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-yellow-600 ml-0.5" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                    <tr key={i} className="hover:bg-muted/50 transition-colors">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      {headers.map((h) => (
                        <td key={h} className="px-3 py-2 text-muted-foreground max-w-[160px] truncate">
                          {row[h] != null ? String(row[h]) : <span className="text-white/20">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > PREVIEW_ROWS && (
              <div className="p-3 text-center text-xs text-muted-foreground border-t border-border">
                +{rows.length - PREVIEW_ROWS} more rows not shown in preview
              </div>
            )}
          </Card>

          {/* Column mapping info */}
          {headers.some((h) => !entity.columns.includes(h)) && (
            <div className="mt-2 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-xs text-yellow-600/80">
                Columns marked <AlertCircle className="inline w-3 h-3" /> are not recognized for {entity.label} and will be ignored during import.
                Recognized: {entity.columns.join(", ")}.
              </p>
            </div>
          )}
        </div>
      )}

      {/* How it works */}
      {!rows.length && !result && (
        <Card className="glass-panel border-border p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-4">How It Works</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { step: "1", title: "Choose Entity", desc: "Select which CRM object you want to import (Leads, Contacts, etc.)" },
              { step: "2", title: "Download Template", desc: "Get the Excel template with the correct column headers for your entity" },
              { step: "3", title: "Fill & Upload", desc: "Fill in your data and upload the .xlsx or .csv file" },
              { step: "4", title: "Preview & Import", desc: "Review the preview, then click Import to insert all records" },
            ].map((s) => (
              <div key={s.step} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {s.step}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
