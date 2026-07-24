import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Search, Edit2, Trash2, FileText, ToggleLeft, ToggleRight, X, ChevronDown, ChevronRight, Eye, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const API = "/api";

const CATEGORIES = ["MSA", "NDA", "SOW", "Order Form", "Amendment", "Addendum", "License Agreement", "SLA", "Vendor Agreement"];

const CRM_FIELD_GROUPS: { group: string; fields: { label: string; variable: string }[] }[] = [
  {
    group: "Customer / Party",
    fields: [
      { label: "Company Name", variable: "company_name" },
      { label: "Company Address", variable: "company_address" },
      { label: "Company City", variable: "company_city" },
      { label: "Company Country", variable: "company_country" },
      { label: "Contact Full Name", variable: "contact_name" },
      { label: "Contact Title", variable: "contact_title" },
      { label: "Contact Email", variable: "contact_email" },
      { label: "Contact Phone", variable: "contact_phone" },
    ],
  },
  {
    group: "Contract Dates",
    fields: [
      { label: "Effective Date", variable: "effective_date" },
      { label: "Expiry Date", variable: "expiry_date" },
      { label: "Renewal Date", variable: "renewal_date" },
      { label: "Execution Date", variable: "execution_date" },
      { label: "Notice Period (days)", variable: "notice_period_days" },
    ],
  },
  {
    group: "Financial Terms",
    fields: [
      { label: "Contract Value", variable: "contract_value" },
      { label: "Currency", variable: "currency" },
      { label: "Payment Terms", variable: "payment_terms" },
      { label: "Liability Cap", variable: "liability_cap" },
      { label: "Discount (%)", variable: "discount_percent" },
      { label: "Tax Rate (%)", variable: "tax_rate" },
    ],
  },
  {
    group: "Legal & Compliance",
    fields: [
      { label: "Governing Law / Jurisdiction", variable: "jurisdiction" },
      { label: "Dispute Resolution", variable: "dispute_resolution" },
      { label: "Confidentiality Period", variable: "confidentiality_period" },
      { label: "Termination Clause", variable: "termination_clause" },
    ],
  },
  {
    group: "Our Company",
    fields: [
      { label: "Our Company Name", variable: "our_company_name" },
      { label: "Our Company Address", variable: "our_company_address" },
      { label: "Signatory Name", variable: "signatory_name" },
      { label: "Signatory Title", variable: "signatory_title" },
      { label: "Signatory Email", variable: "signatory_email" },
    ],
  },
  {
    group: "Deal / Opportunity",
    fields: [
      { label: "Deal Name", variable: "deal_name" },
      { label: "Deal Value", variable: "deal_value" },
      { label: "Product / Service Name", variable: "product_name" },
      { label: "Scope of Work", variable: "scope_of_work" },
      { label: "Deliverables", variable: "deliverables" },
    ],
  },
];

type Template = {
  id: number;
  name: string;
  category: string;
  description: string | null;
  content: string | null;
  variables: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

function fetchTemplates() {
  return fetch(`${API}/clm/templates`).then((r) => r.json()) as Promise<Template[]>;
}

function getFieldLabel(variable: string): string {
  for (const g of CRM_FIELD_GROUPS) {
    const f = g.fields.find((f) => f.variable === variable);
    if (f) return f.label;
  }
  return variable;
}

function parseVars(raw: string): string[] {
  try {
    let p = JSON.parse(raw);
    // handle double-encoded: JSON.parse again if result is a string
    if (typeof p === "string") p = JSON.parse(p);
    return Array.isArray(p) ? p : [];
  } catch { return []; }
}

// â”€â”€ Field Picker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FieldPicker({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ "Customer / Party": true, "Contract Dates": true });

  const toggle = (variable: string) =>
    onChange(selected.includes(variable) ? selected.filter((v) => v !== variable) : [...selected, variable]);

  const toggleGroup = (g: string) => setOpenGroups((p) => ({ ...p, [g]: !p[g] }));

  return (
    <div className="border border-border rounded-md overflow-hidden divide-y divide-border">
      {CRM_FIELD_GROUPS.map((g) => (
        <div key={g.group}>
          <button type="button" onClick={() => toggleGroup(g.group)}
            className="w-full flex items-center justify-between px-3 py-2 bg-muted/60 hover:bg-muted text-sm font-medium text-foreground transition-colors">
            <span className="flex items-center gap-2">
              {openGroups[g.group] ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              {g.group}
            </span>
            <span className="text-[10px] text-muted-foreground font-normal">
              {g.fields.filter((f) => selected.includes(f.variable)).length}/{g.fields.length} selected
            </span>
          </button>
          {openGroups[g.group] && (
            <div className="grid grid-cols-2 gap-1 p-2 bg-card">
              {g.fields.map((f) => {
                const checked = selected.includes(f.variable);
                return (
                  <button key={f.variable} type="button" onClick={() => toggle(f.variable)}
                    className={`flex items-center gap-2 text-left px-2.5 py-1.5 rounded text-sm transition-colors ${checked ? "bg-primary/10 text-primary border border-primary/30" : "text-foreground hover:bg-muted border border-transparent"}`}>
                    <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${checked ? "bg-primary border-primary text-white" : "border-border"}`}>
                      {checked && "âœ“"}
                    </span>
                    <span className="truncate leading-tight">{f.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// â”€â”€ Content Editor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ContentEditor({ value, onChange, variables }: { value: string; onChange: (v: string) => void; variables: string[] }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const insert = (v: string) => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const next = value.slice(0, s) + `{{${v}}}` + value.slice(e);
    onChange(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(s + v.length + 4, s + v.length + 4); }, 0);
  };

  return (
    <div className="space-y-2">
      {variables.length > 0 && (
        <div className="p-2.5 rounded-md bg-muted/50 border border-border space-y-1.5">
          <p className="text-[11px] text-muted-foreground font-medium">Click a field to insert at cursor:</p>
          <div className="flex flex-wrap gap-1.5">
            {variables.map((v) => (
              <button key={v} type="button" onClick={() => insert(v)}
                className="text-[11px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded hover:bg-primary/20 transition-colors">
                {getFieldLabel(v)}
              </button>
            ))}
          </div>
        </div>
      )}
      <textarea ref={ref}
        className="w-full h-52 px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm resize-y font-mono leading-relaxed"
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="Paste or type the contract template here. Click a field above to insert it at your cursor." />
    </div>
  );
}

// â”€â”€ Template Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TemplateForm({ initial, onSave, onClose }: { initial?: Template; onSave: (d: Partial<Template>) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "MSA");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [variables, setVariables] = useState<string[]>(() => parseVars(initial?.variables ?? "[]"));
  const [tab, setTab] = useState<"fields" | "content">("fields");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), category, description: description.trim() || null, content: content.trim() || null, variables: variables as unknown as string });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-4 max-h-[80vh]">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Template Name <span className="text-red-500">*</span></Label>
          <Input className="bg-muted border-border" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard MSA v2" />
        </div>
        <div className="space-y-1.5">
          <Label>Category <span className="text-red-500">*</span></Label>
          <select className="w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Description <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
        <Input className="bg-muted border-border" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of when to use this template…" />
      </div>

      <div className="flex border-b border-border gap-4">
        {(["fields", "content"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "fields" ? "Step 1 — Select Fields" : "Step 2 — Write Content"}
            {t === "fields" && variables.length > 0 && <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{variables.length}</span>}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto flex-1 min-h-0">
        {tab === "fields" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select the CRM fields that will be filled in when this template is used to generate a contract.</p>
            <FieldPicker selected={variables} onChange={setVariables} />
            {variables.length > 0 && (
              <div className="p-3 rounded-md bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Selected ({variables.length}):</p>
                <div className="flex flex-wrap gap-1.5">
                  {variables.map((v) => (
                    <span key={v} className="flex items-center gap-1 text-[11px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">
                      {getFieldLabel(v)}
                      <button type="button" onClick={() => setVariables(variables.filter((x) => x !== v))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <button type="button" onClick={() => setTab("content")} className="mt-2 text-xs text-primary underline">
                  Done → Go to Step 2 to write content
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Write the contract body. Click any field button to insert it at your cursor.</p>
            <ContentEditor value={content} onChange={setContent} variables={variables} />
          </div>
        )}
      </div>

      <DialogFooter className="pt-3 border-t border-border">
        <Button variant="outline" onClick={onClose} className="border-border">Cancel</Button>
        <Button onClick={handleSave} disabled={saving || !name.trim()} className="bg-primary hover:bg-primary/90 text-foreground">
          {saving ? "Saving…" : initial ? "Update Template" : "Create Template"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// â”€â”€ Template Detail View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TemplateDetail({
  template,
  onBack,
  onEdit,
  onToggle,
}: {
  template: Template;
  onBack: () => void;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const vars = parseVars(template.variables);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Templates
        </button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{template.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{template.category}</Badge>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${template.active ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
              {template.active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="border-border gap-1.5" onClick={onToggle}>
            {template.active ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4 text-green-500" />}
            {template.active ? "Deactivate" : "Activate"}
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-foreground gap-1.5" onClick={onEdit}>
            <Edit2 className="w-3.5 h-3.5" /> Edit Template
          </Button>
        </div>
      </div>

      {template.description && (
        <Card className="glass-panel border-border p-4">
          <p className="text-sm text-muted-foreground">{template.description}</p>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3 text-sm">
        <Card className="glass-panel border-border p-3">
          <p className="text-xs text-muted-foreground mb-1">Created</p>
          <p className="font-medium text-foreground">{format(new Date(template.created_at), "MMM d, yyyy")}</p>
        </Card>
        <Card className="glass-panel border-border p-3">
          <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
          <p className="font-medium text-foreground">{format(new Date(template.updated_at), "MMM d, yyyy")}</p>
        </Card>
        <Card className="glass-panel border-border p-3">
          <p className="text-xs text-muted-foreground mb-1">Fields Used</p>
          <p className="font-medium text-foreground">{vars.length} fields</p>
        </Card>
      </div>

      {vars.length > 0 && (
        <Card className="glass-panel border-border p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Dynamic Fields</h3>
          <div className="flex flex-wrap gap-2">
            {vars.map((v) => (
              <span key={v} className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded">
                <span className="font-medium">{getFieldLabel(v)}</span>
                <span className="text-primary/60 font-mono text-[10px]">{`{{${v}}}`}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {template.content && (
        <Card className="glass-panel border-border p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Contract Content</h3>
          <pre className="text-sm text-foreground whitespace-pre-wrap font-mono bg-muted rounded-md p-3 border border-border max-h-96 overflow-y-auto leading-relaxed">
            {template.content}
          </pre>
        </Card>
      )}
    </div>
  );
}

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function ClmTemplates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [detailTemplate, setDetailTemplate] = useState<Template | null>(null);

  const { data: templates = [], isLoading } = useQuery({ queryKey: ["clm-templates"], queryFn: fetchTemplates });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["clm-templates"] });

  const createMut = useMutation({
    mutationFn: (data: Partial<Template>) =>
      fetch(`${API}/clm/templates`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { refresh(); toast({ title: "Template created" }); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Template> }) =>
      fetch(`${API}/clm/templates/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: (updated) => {
      refresh();
      toast({ title: "Template updated" });
      if (detailTemplate?.id === updated.id) setDetailTemplate(updated);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`${API}/clm/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => { refresh(); toast({ title: "Template deleted" }); setDetailTemplate(null); },
  });

  const toggleActive = (t: Template) => updateMut.mutate({ id: t.id, data: { active: !t.active } });

  const filtered = templates.filter((t) => {
    const q = search.toLowerCase();
    return (!q || t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q))
      && (!categoryFilter || t.category === categoryFilter);
  });

  // Detail view
  if (detailTemplate) {
    const live = templates.find((t) => t.id === detailTemplate.id) ?? detailTemplate;
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <TemplateDetail
            template={live}
            onBack={() => setDetailTemplate(null)}
            onEdit={() => setEditTemplate(live)}
            onToggle={() => toggleActive(live)}
          />
        </div>
        <Dialog open={!!editTemplate} onOpenChange={(v) => { if (!v) setEditTemplate(null); }}>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh]">
            <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
            {editTemplate && (
              <TemplateForm
                initial={editTemplate}
                onSave={(d) => updateMut.mutateAsync({ id: editTemplate.id, data: d })}
                onClose={() => setEditTemplate(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </Layout>
    );
  }

  // List view
  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Template Library</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage reusable contract templates</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-foreground gap-1.5">
            <Plus className="w-4 h-4" /> New Template
          </Button>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 bg-muted border-border" placeholder="Search templates…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm min-w-[140px]"
            value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="flex gap-1.5 py-16 justify-center">
            {[0, 1, 2].map((i) => <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="glass-panel border-border p-12 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">{templates.length === 0 ? "No templates yet. Create your first template." : "No templates match the filters."}</p>
          </Card>
        ) : (
          <Card className="glass-panel border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Template Name</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Category</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Fields</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Updated</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((t) => {
                  const vars = parseVars(t.variables);
                  return (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div>
                            <button onClick={() => setDetailTemplate(t)} className="font-medium text-foreground hover:text-primary transition-colors text-left">
                              {t.name}
                            </button>
                            {t.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{t.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {vars.length > 0 ? `${vars.length} field${vars.length !== 1 ? "s" : ""}` : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button onClick={() => toggleActive(t)} className="flex items-center gap-1.5 text-xs font-medium" title="Click to toggle">
                          {t.active
                            ? <><ToggleRight className="w-4 h-4 text-green-500" /><span className="text-green-600">Active</span></>
                            : <><ToggleLeft className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Inactive</span></>}
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                        {format(new Date(t.updated_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={() => setDetailTemplate(t)}>
                            <Eye className="w-3.5 h-3.5" /> View
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => setEditTemplate(t)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-600" title="Delete"
                            onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteMut.mutate(t.id); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Create Contract Template</DialogTitle></DialogHeader>
          <TemplateForm onSave={(d) => createMut.mutateAsync(d)} onClose={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTemplate} onOpenChange={(v) => { if (!v) setEditTemplate(null); }}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
          {editTemplate && (
            <TemplateForm
              initial={editTemplate}
              onSave={(d) => updateMut.mutateAsync({ id: editTemplate.id, data: d })}
              onClose={() => setEditTemplate(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

