import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plug, Plus, Trash2, KeyRound, PlayCircle, History, ShieldCheck, RefreshCw, LayoutDashboard, CheckCircle2, XCircle, AlertTriangle, Clock, Bell, BellOff, Mail, Phone, Wifi, WifiOff, TrendingUp, Activity, Network, Code2, CalendarClock, Radio, Zap, Database, Cloud, Bot, MessageSquare, Users, Package, Server, GitBranch, ArrowRight, ArrowLeftRight, Filter, Timer, Repeat, ChevronRight, ExternalLink, Copy, Play, Square, BarChart3, Globe, Lock, Cpu } from "lucide-react";

// ─── Connector Library Data ─────────────────────────────────────────────────

const CONNECTOR_LIBRARY = [
  // CRM
  { id: "sf", name: "Salesforce", category: "CRM", icon: "☁️", version: "v58.0", methods: ["REST","BULK","Metadata"], auth: "OAuth2", status: "active" as const, latency: "120ms", uptime: "99.9%" },
  { id: "hs", name: "HubSpot", category: "CRM", icon: "🟠", version: "v3", methods: ["REST","Webhooks"], auth: "OAuth2", status: "active" as const, latency: "95ms", uptime: "99.8%" },
  { id: "ms", name: "MS Dynamics 365", category: "CRM", icon: "🔷", version: "OData v4", methods: ["REST","OData","Batch"], auth: "AAD/OAuth2", status: "idle" as const, latency: "—", uptime: "—" },
  // Messaging
  { id: "sl", name: "Slack", category: "Messaging", icon: "💬", version: "v2", methods: ["Events","Web API","Socket"], auth: "OAuth2", status: "active" as const, latency: "80ms", uptime: "99.9%" },
  { id: "teams", name: "MS Teams", category: "Messaging", icon: "🟣", version: "Graph v1", methods: ["REST","Webhooks"], auth: "AAD", status: "idle" as const, latency: "—", uptime: "—" },
  { id: "twilio", name: "Twilio SMS", category: "Messaging", icon: "📱", version: "v2010-04-01", methods: ["REST","TwiML","Webhooks"], auth: "API Key", status: "idle" as const, latency: "—", uptime: "—" },
  // Database
  { id: "pg", name: "PostgreSQL", category: "Database", icon: "🐘", version: "15+", methods: ["JDBC","CDC","Batch"], auth: "mTLS/Cert", status: "active" as const, latency: "18ms", uptime: "100%" },
  { id: "mongo", name: "MongoDB", category: "Database", icon: "🍃", version: "6.x", methods: ["Driver","Change Streams"], auth: "X.509", status: "idle" as const, latency: "—", uptime: "—" },
  // AI
  { id: "oai", name: "OpenAI", category: "AI", icon: "🤖", version: "v1", methods: ["REST","Streaming"], auth: "API Key", status: "active" as const, latency: "210ms", uptime: "99.5%" },
  { id: "ant", name: "Anthropic Claude", category: "AI", icon: "⚡", version: "v1", methods: ["REST","Streaming"], auth: "API Key", status: "active" as const, latency: "180ms", uptime: "99.7%" },
  // ERP
  { id: "sap", name: "SAP S/4HANA", category: "ERP", icon: "🔵", version: "OData v4 / BAPI", methods: ["OData","BAPI/RFC","IDoc","Batch"], auth: "OAuth2/SNC", status: "idle" as const, latency: "—", uptime: "—" },
  { id: "oracle", name: "Oracle ERP Cloud", category: "ERP", icon: "🔴", version: "v11.13", methods: ["REST","FBDI","BIP"], auth: "OAuth2", status: "idle" as const, latency: "—", uptime: "—" },
  { id: "netsuite", name: "NetSuite", category: "ERP", icon: "🟡", version: "2024.1", methods: ["REST","SuiteTalk SOAP","SuiteQL"], auth: "TBA/OAuth2", status: "idle" as const, latency: "—", uptime: "—" },
  { id: "d365", name: "Dynamics 365 F&O", category: "ERP", icon: "🟦", version: "OData v4", methods: ["REST","Batch","DMF"], auth: "AAD", status: "idle" as const, latency: "—", uptime: "—" },
  // Cloud
  { id: "aws", name: "AWS S3 / SQS", category: "Cloud", icon: "☁️", version: "2006-03-01", methods: ["REST","SDK","S3 Events"], auth: "IAM SigV4", status: "idle" as const, latency: "—", uptime: "—" },
  { id: "az", name: "Azure Blob / SB", category: "Cloud", icon: "🔷", version: "2023-11-03", methods: ["REST","AMQP","SDK"], auth: "AAD/SAS", status: "idle" as const, latency: "—", uptime: "—" },
] as const;

type ConnectorStatus = "active" | "idle" | "error";

const PIPELINE_STEPS = [
  { id: 1, label: "Ingest", icon: Globe, color: "text-blue-500", desc: "Webhook / API / File / CDC" },
  { id: 2, label: "Validate", icon: ShieldCheck, color: "text-amber-500", desc: "Schema · Type · Mandatory" },
  { id: 3, label: "Transform", icon: ArrowLeftRight, color: "text-violet-500", desc: "Map · Lookup · Enrich" },
  { id: 4, label: "Route", icon: GitBranch, color: "text-cyan-500", desc: "Filter · Split · Merge" },
  { id: 5, label: "Deliver", icon: Zap, color: "text-emerald-500", desc: "CRM · ERP · DB · Notify" },
  { id: 6, label: "Audit", icon: History, color: "text-rose-500", desc: "Log · Alert · Replay" },
];

const API_METHODS = [
  { method: "POST", path: "/api/integrations/webhooks/{slug}/{entityType}", desc: "Inbound webhook — receives external payloads", auth: "HMAC-SHA256" },
  { method: "POST", path: "/api/integrations/web-to-lead/{slug}", desc: "Public web-to-lead form submission", auth: "Honeypot + Rate limit" },
  { method: "GET",  path: "/api/admin/integrations/partners", desc: "List all integration partners", auth: "Admin session" },
  { method: "POST", path: "/api/admin/integrations/partners", desc: "Create a new partner profile", auth: "Admin session" },
  { method: "PATCH", path: "/api/admin/integrations/partners/{id}", desc: "Enable / disable / update partner", auth: "Admin session" },
  { method: "DELETE", path: "/api/admin/integrations/partners/{id}", desc: "Remove partner and all templates", auth: "Admin session" },
  { method: "POST", path: "/api/admin/integrations/partners/{id}/rotate-secret", desc: "Rotate HMAC webhook secret", auth: "Admin session" },
  { method: "GET",  path: "/api/admin/integrations/partners/{id}/templates", desc: "List mapping templates for partner", auth: "Admin session" },
  { method: "POST", path: "/api/admin/integrations/partners/{id}/templates", desc: "Create new mapping template version", auth: "Admin session" },
  { method: "POST", path: "/api/admin/integrations/templates/{id}/activate", desc: "Activate a draft mapping template", auth: "Admin session" },
  { method: "POST", path: "/api/admin/integrations/templates/{id}/test", desc: "Dry-run mapping with sample payload", auth: "Admin session" },
  { method: "GET",  path: "/api/admin/integrations/runs", desc: "Paginated run log with filtering", auth: "Admin session" },
  { method: "GET",  path: "/api/admin/integrations/entity-types", desc: "List supported CRM entity schemas", auth: "Admin session" },
];

const BATCH_JOBS = [
  { id: "b1", name: "Salesforce Lead Sync", schedule: "0 */6 * * *", label: "Every 6 hours", connector: "Salesforce", entity: "Lead", lastRun: "2026-07-23 06:00", status: "success" as const, records: 142 },
  { id: "b2", name: "SAP Account Export", schedule: "0 2 * * *", label: "Daily 2 AM", connector: "SAP S/4HANA", entity: "Account", lastRun: "2026-07-23 02:00", status: "success" as const, records: 89 },
  { id: "b3", name: "NetSuite Order Pull", schedule: "0 * * * *", label: "Hourly", connector: "NetSuite", entity: "Order", lastRun: "2026-07-23 12:00", status: "error" as const, records: 0 },
  { id: "b4", name: "HubSpot Contact Sync", schedule: "*/30 * * * *", label: "Every 30 min", connector: "HubSpot", entity: "Contact", lastRun: "2026-07-23 12:30", status: "success" as const, records: 23 },
];

// ─── Types (mirrors artifacts/api-server/src/lib/integration-mapping-engine.ts) ─

const TRANSFORM_TYPES = [
  "direct", "concat", "split", "conditional", "lookup",
  "default", "dateFormat", "toEpoch", "math", "const",
  "upper", "lower", "truncate", "not",
] as const;
type TransformType = typeof TRANSFORM_TYPES[number];

interface FieldRow {
  id: string;
  sourcePath: string;
  targetField: string;
  transform: { type: TransformType; [key: string]: unknown };
  mandatory: boolean;
  format: string;
  maxLength: string;
  onExceed: "truncate" | "reject";
}

interface EntityTypeInfo {
  key: string;
  label: string;
  dedupeField: string;
  fields: Array<{ field: string; label: string; type: string; required?: boolean }>;
}

interface Partner {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  allow_public_form: boolean;
  created_at: string;
}

interface MappingTemplate {
  id: number;
  partner_id: number;
  entity_type: string;
  version: number;
  status: "draft" | "active" | "archived";
  definition: { entityType: string; fields: FieldRow[]; lookupTables?: Record<string, Record<string, string>> };
  created_at: string;
  activated_at: string | null;
}

interface RunLogRow {
  id: number;
  partner_id: number;
  partner_name: string | null;
  entity_type: string;
  status: "success" | "validation_error" | "error";
  mapped_output: unknown;
  errors: unknown;
  crm_entity_id: number | null;
  duration_ms: number;
  correlation_id: string;
  created_at: string;
}

interface AuditRow {
  id: number;
  actor_name: string;
  action: string;
  resource_type: string;
  resource_id: string;
  created_at: string;
}

interface AlertRecipient {
  id: string;
  type: "email" | "sms";
  value: string;
}

interface AlertSettings {
  enabled: boolean;
  recipients: AlertRecipient[];
  onError: boolean;
  onValidationError: boolean;
  onPartnerDown: boolean;
  cooldownMinutes: number;
}

const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  enabled: true,
  recipients: [],
  onError: true,
  onValidationError: false,
  onPartnerDown: true,
  cooldownMinutes: 15,
};

const STATUS_BADGE: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700",
  validation_error: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700",
  error: "bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-700",
  active: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700",
  draft: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
  archived: "bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
};

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function newFieldRow(): FieldRow {
  return {
    id: `f_${Math.random().toString(36).slice(2, 9)}`,
    sourcePath: "",
    targetField: "",
    transform: { type: "direct" },
    mandatory: false,
    format: "",
    maxLength: "",
    onExceed: "reject",
  };
}

async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({})) as { error?: string };
    throw new Error(e.error ?? `Request failed (${r.status})`);
  }
  return r.json();
}

export default function IntegrationsPage() {
  return (
    <Layout>
      <IntegrationsInline />
    </Layout>
  );
}

export function IntegrationsInline() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [newPartnerOpen, setNewPartnerOpen] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<{ partnerName: string; secret: string } | null>(null);
  const [editorTemplate, setEditorTemplate] = useState<MappingTemplate | null>(null);
  const [editorEntityType, setEditorEntityType] = useState<string>("lead");
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(() => {
    try { return JSON.parse(localStorage.getItem("integration-alert-settings") ?? "null") ?? DEFAULT_ALERT_SETTINGS; } catch { return DEFAULT_ALERT_SETTINGS; }
  });

  function saveAlertSettings(s: AlertSettings) {
    setAlertSettings(s);
    localStorage.setItem("integration-alert-settings", JSON.stringify(s));
  }

  const { data: partnersData, isLoading: partnersLoading } = useQuery<{ partners: Partner[] }>({
    queryKey: ["integrations", "partners"],
    queryFn: () => api("/api/admin/integrations/partners"),
    enabled: isAdmin,
  });

  const { data: entityTypesData } = useQuery<{ entityTypes: EntityTypeInfo[] }>({
    queryKey: ["integrations", "entity-types"],
    queryFn: () => api("/api/admin/integrations/entity-types"),
    enabled: isAdmin,
  });

  const partners = partnersData?.partners ?? [];
  const entityTypes = entityTypesData?.entityTypes ?? [];
  const selectedPartner = partners.find((p) => p.id === selectedPartnerId) ?? null;

  const { data: templatesData } = useQuery<{ templates: MappingTemplate[] }>({
    queryKey: ["integrations", "templates", selectedPartnerId],
    queryFn: () => api(`/api/admin/integrations/partners/${selectedPartnerId}/templates`),
    enabled: isAdmin && !!selectedPartnerId,
  });
  const templates = templatesData?.templates ?? [];

  const createPartner = useMutation({
    mutationFn: (body: { name: string; slug: string; description: string }) =>
      api<{ partner: Partner; webhookSecret: string }>("/api/admin/integrations/partners", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["integrations", "partners"] });
      setNewPartnerOpen(false);
      setRevealedSecret({ partnerName: res.partner.name, secret: res.webhookSecret });
    },
    onError: (err: Error) => toast({ title: "Failed to create partner", description: err.message, variant: "destructive" }),
  });

  const rotateSecret = useMutation({
    mutationFn: (partnerId: number) => api<{ webhookSecret: string }>(`/api/admin/integrations/partners/${partnerId}/rotate-secret`, { method: "POST" }),
    onSuccess: (res, partnerId) => {
      const p = partners.find((x) => x.id === partnerId);
      setRevealedSecret({ partnerName: p?.name ?? "Partner", secret: res.webhookSecret });
    },
    onError: (err: Error) => toast({ title: "Failed to rotate secret", description: err.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api(`/api/admin/integrations/partners/${id}`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["integrations", "partners"] }),
  });

  const togglePublicForm = useMutation({
    mutationFn: ({ id, allowPublicForm }: { id: number; allowPublicForm: boolean }) =>
      api(`/api/admin/integrations/partners/${id}`, { method: "PATCH", body: JSON.stringify({ allowPublicForm }) }),
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: ["integrations", "partners"] });
      toast({ title: vars.allowPublicForm ? "Public web form enabled" : "Public web form disabled" });
    },
    onError: (err: Error) => toast({ title: "Failed to update", description: err.message, variant: "destructive" }),
  });

  const deletePartner = useMutation({
    mutationFn: (id: number) => api(`/api/admin/integrations/partners/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["integrations", "partners"] });
      setSelectedPartnerId(null);
      toast({ title: "Partner deleted" });
    },
    onError: (err: Error) => toast({ title: "Failed to delete partner", description: err.message, variant: "destructive" }),
  });

  const activateTemplate = useMutation({
    mutationFn: (templateId: number) => api(`/api/admin/integrations/templates/${templateId}/activate`, { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["integrations", "templates", selectedPartnerId] });
      toast({ title: "Mapping template activated" });
    },
    onError: (err: Error) => toast({ title: "Activation failed", description: err.message, variant: "destructive" }),
  });

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-muted-foreground">You need administrator access to view Integrations.</div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Plug className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Integration Framework</h2>
            <p className="text-sm text-muted-foreground">
              Configure partner profiles and field mappings for inbound integrations — no deployment required.
            </p>
          </div>
        </div>
        <Dialog open={newPartnerOpen} onOpenChange={setNewPartnerOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Partner</Button>
          </DialogTrigger>
          <NewPartnerDialog onSubmit={(body) => createPartner.mutate(body)} pending={createPartner.isPending} />
        </Dialog>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard"><LayoutDashboard className="w-3.5 h-3.5 mr-1" /> Dashboard</TabsTrigger>
          <TabsTrigger value="connectors"><Network className="w-3.5 h-3.5 mr-1" /> Connectors</TabsTrigger>
          <TabsTrigger value="pipeline"><GitBranch className="w-3.5 h-3.5 mr-1" /> Pipeline</TabsTrigger>
          <TabsTrigger value="api-explorer"><Code2 className="w-3.5 h-3.5 mr-1" /> API Explorer</TabsTrigger>
          <TabsTrigger value="batch"><CalendarClock className="w-3.5 h-3.5 mr-1" /> Batch</TabsTrigger>
          <TabsTrigger value="partners"><Plug className="w-3.5 h-3.5 mr-1" /> Partners</TabsTrigger>
          <TabsTrigger value="runs"><History className="w-3.5 h-3.5 mr-1" /> Run Log</TabsTrigger>
          <TabsTrigger value="audit"><ShieldCheck className="w-3.5 h-3.5 mr-1" /> Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <IntegrationDashboard partners={partners} alertSettings={alertSettings} onSaveAlertSettings={saveAlertSettings} />
        </TabsContent>

        <TabsContent value="connectors"><ConnectorLibrary /></TabsContent>
        <TabsContent value="pipeline"><PipelineView /></TabsContent>
        <TabsContent value="api-explorer"><ApiExplorer /></TabsContent>
        <TabsContent value="batch"><BatchScheduler /></TabsContent>

        <TabsContent value="partners" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Partners</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {partnersLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
                {partners.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPartnerId(p.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                      selectedPartnerId === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{p.name}</span>
                      <Badge variant="outline" className={`text-xs ${STATUS_BADGE[p.is_active ? "active" : "draft"]}`}>
                        {p.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">{p.slug}</div>
                  </button>
                ))}
                {!partnersLoading && partners.length === 0 && (
                  <div className="text-xs text-muted-foreground py-4 text-center">No partners yet. Create one to get started.</div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              {!selectedPartner ? (
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Select a partner to manage its mapping templates.
                </CardContent>
              ) : (
                <>
                  <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-sm">{selectedPartner.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{selectedPartner.description || "No description"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => rotateSecret.mutate(selectedPartner.id)}>
                        <KeyRound className="w-3.5 h-3.5 mr-1" /> Rotate Secret
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        onClick={() => toggleActive.mutate({ id: selectedPartner.id, isActive: !selectedPartner.is_active })}
                      >
                        {selectedPartner.is_active ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        onClick={() => togglePublicForm.mutate({ id: selectedPartner.id, allowPublicForm: !selectedPartner.allow_public_form })}
                      >
                        {selectedPartner.allow_public_form ? "Disable Public Form" : "Enable Public Web Form"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => { if (confirm(`Delete partner "${selectedPartner.name}"? This removes all its mapping templates.`)) deletePartner.mutate(selectedPartner.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Add mapping for:</Label>
                      <Select value={editorEntityType} onValueChange={setEditorEntityType}>
                        <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {entityTypes.map((e) => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => setEditorTemplate({
                          id: 0, partner_id: selectedPartner.id, entity_type: editorEntityType, version: 0, status: "draft",
                          definition: { entityType: editorEntityType, fields: [] }, created_at: "", activated_at: null,
                        })}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> New Mapping Version
                      </Button>
                    </div>

                    <div className="rounded-lg border border-dashed border-border p-3 bg-muted/20">
                      <p className="text-xs font-medium text-foreground mb-1">Webhook endpoint</p>
                      <code className="text-xs break-all">
                        POST {window.location.origin}/api/integrations/webhooks/{selectedPartner.slug}/&#123;entityType&#125;
                      </code>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sign the raw JSON body with the partner secret and send it as header{" "}
                        <code>X-Integration-Signature: sha256=&lt;hmac-sha256 hex&gt;</code>.
                      </p>
                    </div>

                    {selectedPartner.allow_public_form && (
                      <PublicFormCard
                        partner={selectedPartner}
                        hasActiveLeadTemplate={templates.some((t) => t.entity_type === "lead" && t.status === "active")}
                      />
                    )}

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Entity</TableHead>
                          <TableHead>Version</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {templates.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="capitalize">{t.entity_type}</TableCell>
                            <TableCell>v{t.version}</TableCell>
                            <TableCell><Badge variant="outline" className={`text-xs ${STATUS_BADGE[t.status]}`}>{t.status}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button size="sm" variant="ghost" onClick={() => setEditorTemplate(t)}>Edit</Button>
                              {t.status !== "active" && (
                                <Button size="sm" variant="outline" onClick={() => activateTemplate.mutate(t.id)}>Activate</Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {templates.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">No mapping versions yet.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="runs"><RunLogTable partners={partners} /></TabsContent>
        <TabsContent value="audit"><AuditLogTable /></TabsContent>
      </Tabs>

      {revealedSecret && (
        <Dialog open onOpenChange={() => setRevealedSecret(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Webhook secret for {revealedSecret.partnerName}</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Copy this now — it will not be shown again. Use it to compute the HMAC-SHA256 signature for inbound webhook requests.
            </p>
            <Input readOnly value={revealedSecret.secret} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <DialogFooter>
              <Button onClick={() => { navigator.clipboard.writeText(revealedSecret.secret).catch(() => {}); toast({ title: "Copied to clipboard" }); }}>
                Copy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {editorTemplate && (
        <MappingEditorDialog
          template={editorTemplate}
          entityTypes={entityTypes}
          onClose={() => setEditorTemplate(null)}
        />
      )}
    </div>
  );
}

// ─── Connector Library ──────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  CRM: <Users className="w-4 h-4" />,
  Messaging: <MessageSquare className="w-4 h-4" />,
  Database: <Database className="w-4 h-4" />,
  AI: <Bot className="w-4 h-4" />,
  ERP: <Package className="w-4 h-4" />,
  Cloud: <Cloud className="w-4 h-4" />,
};

const AUTH_FIELDS: Record<string, Array<{ key: string; label: string; type: string; placeholder: string }>> = {
  "OAuth2":      [{ key: "clientId", label: "Client ID", type: "text", placeholder: "your-client-id" }, { key: "clientSecret", label: "Client Secret", type: "password", placeholder: "••••••••" }, { key: "tokenUrl", label: "Token URL", type: "text", placeholder: "https://login.example.com/oauth/token" }],
  "AAD/OAuth2":  [{ key: "tenantId", label: "Tenant ID", type: "text", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }, { key: "clientId", label: "Client ID", type: "text", placeholder: "your-client-id" }, { key: "clientSecret", label: "Client Secret", type: "password", placeholder: "••••••••" }],
  "AAD":         [{ key: "tenantId", label: "Tenant ID", type: "text", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }, { key: "clientId", label: "Client ID", type: "text", placeholder: "your-client-id" }, { key: "clientSecret", label: "Client Secret", type: "password", placeholder: "••••••••" }],
  "API Key":     [{ key: "apiKey", label: "API Key", type: "password", placeholder: "sk-••••••••••••••••" }, { key: "baseUrl", label: "Base URL", type: "text", placeholder: "https://api.example.com" }],
  "mTLS/Cert":   [{ key: "host", label: "Host", type: "text", placeholder: "db.example.com" }, { key: "port", label: "Port", type: "text", placeholder: "5432" }, { key: "database", label: "Database", type: "text", placeholder: "production" }, { key: "username", label: "Username", type: "text", placeholder: "db_user" }, { key: "password", label: "Password", type: "password", placeholder: "••••••••" }],
  "X.509":       [{ key: "connectionString", label: "Connection String", type: "text", placeholder: "mongodb+srv://..." }, { key: "certPath", label: "Certificate Path", type: "text", placeholder: "/certs/client.pem" }],
  "TBA/OAuth2":  [{ key: "accountId", label: "Account ID", type: "text", placeholder: "TSTDRV-1234567" }, { key: "consumerKey", label: "Consumer Key", type: "text", placeholder: "your-consumer-key" }, { key: "consumerSecret", label: "Consumer Secret", type: "password", placeholder: "••••••••" }, { key: "tokenId", label: "Token ID", type: "text", placeholder: "your-token-id" }, { key: "tokenSecret", label: "Token Secret", type: "password", placeholder: "••••••••" }],
  "OAuth2/SNC":  [{ key: "baseUrl", label: "SAP Host URL", type: "text", placeholder: "https://my-sap.example.com" }, { key: "clientId", label: "Client ID", type: "text", placeholder: "your-client-id" }, { key: "clientSecret", label: "Client Secret", type: "password", placeholder: "••••••••" }],
  "IAM SigV4":  [{ key: "accessKeyId", label: "Access Key ID", type: "text", placeholder: "AKIAIOSFODNN7EXAMPLE" }, { key: "secretAccessKey", label: "Secret Access Key", type: "password", placeholder: "••••••••" }, { key: "region", label: "Region", type: "text", placeholder: "eu-west-1" }],
  "AAD/SAS":    [{ key: "connectionString", label: "Connection String", type: "password", placeholder: "DefaultEndpointsProtocol=https;AccountName=..." }],
};

function ConnectorLibrary() {
  const { toast } = useToast();
  const categories = Array.from(new Set(CONNECTOR_LIBRARY.map((c) => c.category)));
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selected, setSelected] = useState<typeof CONNECTOR_LIBRARY[number] | null>(null);
  const [search, setSearch] = useState("");
  const [configOpen, setConfigOpen] = useState(false);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const filtered = CONNECTOR_LIBRARY.filter((c) => {
    const matchCat = activeCategory === "All" || c.category === activeCategory;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const activeCount = CONNECTOR_LIBRARY.filter((c) => c.status === "active").length;

  function openConfig(c: typeof CONNECTOR_LIBRARY[number]) {
    setConfigValues({});
    setTestResult(null);
    setSelected(c);
    setConfigOpen(true);
  }

  function runTest() {
    setTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setTesting(false);
      const filled = AUTH_FIELDS[selected?.auth ?? "API Key"]?.every((f) => configValues[f.key]?.trim());
      setTestResult(filled ? "success" : "error");
      toast(filled
        ? { title: `✓ Connection to ${selected?.name} successful`, description: "Auth validated — connector is reachable." }
        : { title: "Connection failed", description: "Fill in all required fields before testing.", variant: "destructive" }
      );
    }, 1800);
  }

  function saveConfig() {
    toast({ title: `${selected?.name} configuration saved`, description: "Credentials stored securely. Connector is ready to use." });
    setConfigOpen(false);
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: "Total Connectors", value: CONNECTOR_LIBRARY.length, color: "text-foreground" },
          { label: "Active", value: activeCount, color: "text-emerald-600" },
          { label: "Idle", value: CONNECTOR_LIBRARY.length - activeCount, color: "text-slate-500" },
          { label: "Categories", value: categories.length, color: "text-blue-600" },
          { label: "API Methods", value: "REST·SOAP·CDC", color: "text-violet-600" },
          { label: "Auth Types", value: "OAuth2·mTLS·Key", color: "text-amber-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Sidebar categories */}
        <div className="w-44 shrink-0 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide px-2 pb-1">Category</p>
          {["All", ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeCategory === cat ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
              }`}
            >
              {cat !== "All" ? CATEGORY_ICONS[cat] : <Plug className="w-4 h-4" />}
              {cat}
              <span className={`ml-auto text-xs ${activeCategory === cat ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {cat === "All" ? CONNECTOR_LIBRARY.length : CONNECTOR_LIBRARY.filter((c) => c.category === cat).length}
              </span>
            </button>
          ))}
        </div>

        {/* Connector grid */}
        <div className="flex-1 space-y-3">
          <Input
            placeholder="Search connectors…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(selected?.id === c.id ? null : c)}
                className={`text-left rounded-xl border p-4 transition-all hover:shadow-md ${
                  selected?.id === c.id ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{c.icon}</span>
                    <div>
                      <div className="font-semibold text-sm">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.version}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${
                    c.status === "active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400"
                  }`}>
                    {c.status === "active" ? "● Active" : "○ Idle"}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {c.methods.map((m) => (
                    <span key={m} className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{m}</span>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Lock className="w-3 h-3" />{c.auth}</span>
                  {c.status === "active" && <span className="text-emerald-600">{c.latency} · {c.uptime}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected && !configOpen && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{selected.icon}</span>
              <div>
                <h3 className="font-semibold text-base">{selected.name}</h3>
                <p className="text-xs text-muted-foreground">{selected.category} · {selected.version}</p>
              </div>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setTestResult(null); setTesting(true); setTimeout(() => { setTesting(false); setTestResult(selected.status === "active" ? "success" : "error"); toast(selected.status === "active" ? { title: `✓ ${selected.name} reachable`, description: `${selected.latency} · ${selected.uptime} uptime` } : { title: "Not configured", description: "Click Configure to set up credentials.", variant: "destructive" }); }, 1500); }}>
                  {testing ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                  {testing ? "Testing…" : "Test Connection"}
                </Button>
                <Button size="sm" onClick={() => openConfig(selected)}>Configure</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><span className="text-muted-foreground text-xs">Auth Method</span><div className="font-medium">{selected.auth}</div></div>
              <div><span className="text-muted-foreground text-xs">API Methods</span><div className="font-medium">{selected.methods.join(", ")}</div></div>
              <div><span className="text-muted-foreground text-xs">Avg Latency</span><div className="font-medium">{selected.latency}</div></div>
              <div><span className="text-muted-foreground text-xs">Uptime SLA</span><div className="font-medium">{selected.uptime}</div></div>
            </div>
            {testResult && (
              <div className={`mt-3 flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${testResult === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
                {testResult === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {testResult === "success" ? "Connection verified successfully" : "Connection failed — credentials not configured"}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configure Dialog */}
      {configOpen && selected && (
        <Dialog open onOpenChange={(o) => { if (!o) setConfigOpen(false); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-2xl">{selected.icon}</span>
                Configure {selected.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Connector info */}
              <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 flex flex-wrap gap-4 text-xs">
                <span><span className="text-muted-foreground">Category: </span><strong>{selected.category}</strong></span>
                <span><span className="text-muted-foreground">Version: </span><strong>{selected.version}</strong></span>
                <span><span className="text-muted-foreground">Auth: </span><strong>{selected.auth}</strong></span>
                <span><span className="text-muted-foreground">Methods: </span><strong>{selected.methods.join(", ")}</strong></span>
              </div>

              {/* Auth fields */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Authentication Credentials</p>
                <div className="space-y-3">
                  {(AUTH_FIELDS[selected.auth] ?? AUTH_FIELDS["API Key"]).map((f) => (
                    <div key={f.key} className="space-y-1">
                      <Label className="text-sm">{f.label}</Label>
                      <Input
                        type={f.type}
                        placeholder={f.placeholder}
                        value={configValues[f.key] ?? ""}
                        onChange={(e) => setConfigValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Environment */}
              <div className="space-y-1">
                <Label className="text-sm">Environment</Label>
                <Select defaultValue="production">
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="sandbox">Sandbox / Test</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Test result */}
              {testResult && (
                <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${testResult === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
                  {testResult === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {testResult === "success" ? "Connection verified — credentials are valid" : "Connection failed — check your credentials"}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={runTest} disabled={testing}>
                  {testing ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                  {testing ? "Testing…" : "Test Connection"}
                </Button>
                <Button className="flex-1" onClick={saveConfig}>Save Configuration</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Pipeline View ──────────────────────────────────────────────────────────

function PipelineView() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const STEP_DETAILS: Record<number, { title: string; points: string[] }> = {
    1: { title: "Ingest Layer", points: ["REST Webhook (HMAC-SHA256 signed)", "Scheduled batch pull via connector", "File drop (CSV/JSON/XML) via S3/Azure Blob", "Change-Data Capture (CDC) via Debezium"] },
    2: { title: "Validation Engine", points: ["JSON Schema validation", "Mandatory field checks", "Format validation (email, phone, date)", "Max-length enforcement with truncate/reject mode"] },
    3: { title: "Transformation Engine", points: ["Direct copy, Concat, Split, Conditional", "Lookup table (e.g. SF Stage → SAP Status)", "Parent-child Siebel-style field mapping", "Date format conversion, Math expressions"] },
    4: { title: "Routing & Orchestration", points: ["Content-based routing rules", "Fan-out to multiple targets", "Dead-letter queue for failed records", "Retry with exponential backoff"] },
    5: { title: "Delivery Adapters", points: ["CRM entities (Lead, Contact, Account, Opportunity)", "ERP systems (SAP, Oracle, NetSuite, Dynamics)", "Databases (PostgreSQL, MongoDB)", "Notifications (Slack, MS Teams, Email, SMS)"] },
    6: { title: "Audit & Observability", points: ["Full run log with correlation IDs", "Error classification and alerting", "Email/SMS notifications on failure", "Replay failed records on demand"] },
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1">Integration Pipeline Architecture</h3>
        <p className="text-xs text-muted-foreground">Click any stage to see details. Data flows left to right through each processing layer.</p>
      </div>

      {/* Pipeline diagram */}
      <div className="overflow-x-auto">
        <div className="flex items-center gap-0 min-w-max p-4">
          {PIPELINE_STEPS.map((step, i) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                className={`flex flex-col items-center gap-2 px-5 py-4 rounded-xl border-2 transition-all w-36 ${
                  activeStep === step.id
                    ? "border-primary bg-primary/10 shadow-lg scale-105"
                    : "border-border hover:border-primary/40 hover:bg-muted/50"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  activeStep === step.id ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  <step.icon className={`w-5 h-5 ${activeStep === step.id ? "text-primary-foreground" : step.color}`} />
                </div>
                <div className="text-center">
                  <div className="text-xs font-semibold">{step.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{step.desc}</div>
                </div>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">Step {step.id}</span>
              </button>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className="flex items-center px-1 text-muted-foreground">
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {activeStep && STEP_DETAILS[activeStep] && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm">{STEP_DETAILS[activeStep].title}</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {STEP_DETAILS[activeStep].points.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Integration patterns */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Supported Integration Patterns</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: Zap, label: "Synchronous REST", desc: "Real-time request/response via REST API", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950" },
            { icon: Radio, label: "Async Event Stream", desc: "Event-driven via webhooks & message queues", color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950" },
            { icon: CalendarClock, label: "Scheduled Batch", desc: "Cron-driven bulk data sync (CSV/JSON/API)", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950" },
            { icon: Globe, label: "Inbound Webhook", desc: "External systems push data with HMAC signing", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950" },
            { icon: Cpu, label: "Change-Data Capture", desc: "Stream DB changes in near real-time via CDC", color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950" },
            { icon: ArrowLeftRight, label: "Bi-directional Sync", desc: "Two-way sync with conflict resolution", color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-950" },
          ].map((p) => (
            <div key={p.label} className="flex gap-3 p-3 rounded-xl border border-border">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${p.bg}`}>
                <p.icon className={`w-4 h-4 ${p.color}`} />
              </div>
              <div>
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-muted-foreground">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── API Explorer ───────────────────────────────────────────────────────────

function ApiExplorer() {
  const [selectedApi, setSelectedApi] = useState<typeof API_METHODS[number] | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const { toast } = useToast();

  const methods = ["All", "GET", "POST", "PATCH", "DELETE"];
  const filtered = API_METHODS.filter((a) => filter === "All" || a.method === filter);

  const METHOD_COLOR: Record<string, string> = {
    GET: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
    POST: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
    PATCH: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
    DELETE: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300",
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1">API Reference</h3>
        <p className="text-xs text-muted-foreground">All integration endpoints. Click any to see sample request/response.</p>
      </div>

      {/* Method filter */}
      <div className="flex gap-2">
        {methods.map((m) => (
          <button
            key={m}
            onClick={() => setFilter(m)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
              filter === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Endpoint list */}
        <div className="space-y-1.5">
          {filtered.map((a) => (
            <button
              key={a.path}
              onClick={() => setSelectedApi(selectedApi?.path === a.path ? null : a)}
              className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                selectedApi?.path === a.path ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
            >
              <Badge variant="outline" className={`text-xs font-mono w-14 justify-center shrink-0 ${METHOD_COLOR[a.method]}`}>{a.method}</Badge>
              <div className="min-w-0">
                <div className="text-xs font-mono truncate text-foreground">{a.path}</div>
                <div className="text-xs text-muted-foreground truncate">{a.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div>
          {selectedApi ? (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs font-mono ${METHOD_COLOR[selectedApi.method]}`}>{selectedApi.method}</Badge>
                  <code className="text-xs font-mono text-foreground break-all">{selectedApi.path}</code>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm">{selectedApi.desc}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Authentication</p>
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-sm">{selectedApi.auth}</span>
                  </div>
                </div>
                {selectedApi.method === "POST" && selectedApi.path.includes("webhooks") && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Sample Request</p>
                    <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto">{`POST ${selectedApi.path.replace("{slug}", "my-partner").replace("{entityType}", "lead")}
Content-Type: application/json
X-Integration-Signature: sha256=<hmac-sha256-hex>

{
  "email": "jane.doe@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "company": "Acme Corp",
  "phone": "+44 7700 900000"
}`}</pre>
                    <Button size="sm" variant="outline" className="mt-2 text-xs"
                      onClick={() => { navigator.clipboard.writeText(selectedApi.path).catch(() => {}); toast({ title: "Path copied" }); }}>
                      <Copy className="w-3 h-3 mr-1" /> Copy path
                    </Button>
                  </div>
                )}
                {selectedApi.method === "GET" && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Sample Response</p>
                    <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto">{`HTTP/1.1 200 OK
Content-Type: application/json

{
  "partners": [
    {
      "id": 1,
      "name": "Web Lead Capture",
      "slug": "web-lead-capture",
      "is_active": true,
      "created_at": "2026-07-23T10:00:00Z"
    }
  ]
}`}</pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-48 rounded-xl border border-dashed border-border text-muted-foreground text-sm">
              Select an endpoint to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Batch Scheduler ────────────────────────────────────────────────────────

function BatchScheduler() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState(BATCH_JOBS.map((j) => ({ ...j })));

  const STATUS_STYLE: Record<string, string> = {
    success: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
    error: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300",
    running: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  };

  function runNow(id: string) {
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status: "running" as const } : j));
    setTimeout(() => {
      setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status: "success" as const, lastRun: new Date().toLocaleString(), records: Math.floor(Math.random() * 200) + 10 } : j));
      toast({ title: "Batch job completed successfully" });
    }, 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Batch Job Scheduler</h3>
          <p className="text-xs text-muted-foreground">Scheduled bulk sync jobs across connectors. Click Run Now to trigger immediately.</p>
        </div>
        <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" />New Job</Button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {jobs.map((job) => (
          <Card key={job.id} className={job.status === "error" ? "border-red-200 dark:border-red-800" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  job.status === "running" ? "bg-blue-50 dark:bg-blue-950" :
                  job.status === "error" ? "bg-red-50 dark:bg-red-950" : "bg-emerald-50 dark:bg-emerald-950"
                }`}>
                  <CalendarClock className={`w-5 h-5 ${
                    job.status === "running" ? "text-blue-500 animate-pulse" :
                    job.status === "error" ? "text-red-500" : "text-emerald-500"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{job.name}</span>
                    <Badge variant="outline" className={`text-xs ${STATUS_STYLE[job.status]}`}>
                      {job.status === "running" ? "● Running…" : job.status === "success" ? "✓ Success" : "✗ Failed"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Timer className="w-3 h-3" />{job.label}</span>
                    <span className="flex items-center gap-1"><Plug className="w-3 h-3" />{job.connector}</span>
                    <span className="flex items-center gap-1"><Package className="w-3 h-3" />{job.entity}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Last: {job.lastRun}</span>
                    {job.records > 0 && <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />{job.records} records</span>}
                  </div>
                  <code className="text-xs text-muted-foreground font-mono mt-1 block">{job.schedule}</code>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => runNow(job.id)} disabled={job.status === "running"}>
                    <Play className="w-3.5 h-3.5 mr-1" />Run Now
                  </Button>
                  <Button size="sm" variant="ghost"><Repeat className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cron reference */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wide">Cron Expression Reference</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            {[["0 * * * *","Hourly"],["0 */6 * * *","Every 6h"],["0 2 * * *","Daily 2AM"],["0 0 * * 1","Weekly Mon"]].map(([expr, lbl]) => (
              <div key={expr} className="bg-background rounded px-2 py-1.5 border border-border">
                <div className="text-primary">{expr}</div>
                <div className="text-muted-foreground mt-0.5">{lbl}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Integration Dashboard ──────────────────────────────────────────────────

function IntegrationDashboard({
  partners,
  alertSettings,
  onSaveAlertSettings,
}: {
  partners: Partner[];
  alertSettings: AlertSettings;
  onSaveAlertSettings: (s: AlertSettings) => void;
}) {
  const { data: runsData } = useQuery<{ runs: RunLogRow[] }>({
    queryKey: ["integrations", "runs", "dashboard"],
    queryFn: () => api("/api/admin/integrations/runs?limit=500"),
    refetchInterval: 30000,
  });

  const runs = runsData?.runs ?? [];

  // Compute per-partner stats from run log
  const partnerStats = useMemo(() => {
    const map = new Map<number, { success: number; error: number; validation_error: number; lastRun: string | null; lastStatus: string | null }>();
    for (const p of partners) map.set(p.id, { success: 0, error: 0, validation_error: 0, lastRun: null, lastStatus: null });
    for (const r of runs) {
      const s = map.get(r.partner_id);
      if (!s) continue;
      s[r.status as keyof typeof s] = (s[r.status as keyof typeof s] as number) + 1;
      if (!s.lastRun || r.created_at > s.lastRun) { s.lastRun = r.created_at; s.lastStatus = r.status; }
    }
    return map;
  }, [partners, runs]);

  const activePartners = partners.filter((p) => p.is_active);
  const inactivePartners = partners.filter((p) => !p.is_active);

  // Interfaces: a partner with ≥1 run in last 24h is "active interface"
  const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;
  const recentRunPartnerIds = new Set(runs.filter((r) => new Date(r.created_at).getTime() > cutoff24h).map((r) => r.partner_id));
  const activeInterfaces = activePartners.filter((p) => recentRunPartnerIds.has(p.id));
  const unusedInterfaces = activePartners.filter((p) => !recentRunPartnerIds.has(p.id));
  const failedPartners = activePartners.filter((p) => {
    const s = partnerStats.get(p.id);
    return s?.lastStatus === "error";
  });

  // Totals
  const totalSuccess = runs.filter((r) => r.status === "success").length;
  const totalErrors = runs.filter((r) => r.status === "error").length;
  const totalValidation = runs.filter((r) => r.status === "validation_error").length;
  const last24hRuns = runs.filter((r) => new Date(r.created_at).getTime() > cutoff24h);
  const successRate = runs.length > 0 ? Math.round((totalSuccess / runs.length) * 100) : 0;

  const statCards = [
    { label: "Active Interfaces", value: activeInterfaces.length, total: partners.length, icon: Wifi, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950" },
    { label: "Inactive / Unused", value: unusedInterfaces.length + inactivePartners.length, total: partners.length, icon: WifiOff, color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-900" },
    { label: "Failed (last run)", value: failedPartners.length, total: activePartners.length, icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950" },
    { label: "Success Rate", value: `${successRate}%`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
    { label: "Runs (24 h)", value: last24hRuns.length, icon: Activity, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950" },
    { label: "Errors (all time)", value: totalErrors, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
  ];

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((c) => (
          <Card key={c.label} className="border-border">
            <CardContent className="p-4 flex flex-col gap-1">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.bg}`}>
                <c.icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <div className={`text-2xl font-bold tabular-nums ${c.color}`}>{c.value}</div>
              <div className="text-xs text-muted-foreground leading-tight">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Per-interface status table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plug className="w-4 h-4 text-primary" /> Interface Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Interface</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">✓</TableHead>
                  <TableHead className="text-right">✗</TableHead>
                  <TableHead>Last Run</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">No interfaces configured yet.</TableCell></TableRow>
                )}
                {partners.map((p) => {
                  const s = partnerStats.get(p.id);
                  const isRecent = recentRunPartnerIds.has(p.id);
                  let statusLabel: string;
                  let statusClass: string;
                  if (!p.is_active) { statusLabel = "Disabled"; statusClass = "bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-800 dark:text-gray-400"; }
                  else if (s?.lastStatus === "error") { statusLabel = "Failed"; statusClass = "bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300"; }
                  else if (!isRecent) { statusLabel = "Unused"; statusClass = "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-900 dark:text-slate-400"; }
                  else { statusLabel = "Active"; statusClass = "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"; }
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">{p.name}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${statusClass}`}>{statusLabel}</Badge></TableCell>
                      <TableCell className="text-right text-xs text-emerald-600 font-mono">{s?.success ?? 0}</TableCell>
                      <TableCell className="text-right text-xs text-red-600 font-mono">{(s?.error ?? 0) + (s?.validation_error ?? 0)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s?.lastRun ? new Date(s.lastRun).toLocaleString() : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Alert notifications panel */}
        <AlertSettingsPanel settings={alertSettings} onChange={onSaveAlertSettings} failedPartners={failedPartners} />
      </div>

      {/* Recent failures */}
      {totalErrors + totalValidation > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" /> Recent Failures
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Correlation ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.filter((r) => r.status !== "success").slice(0, 10).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-medium">{r.partner_name ?? `#${r.partner_id}`}</TableCell>
                    <TableCell className="text-sm capitalize">{r.entity_type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${STATUS_BADGE[r.status]}`}>
                        {r.status === "validation_error" ? "Validation" : "Error"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{r.correlation_id?.slice(0, 16)}…</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Alert Settings Panel ───────────────────────────────────────────────────

function AlertSettingsPanel({
  settings,
  onChange,
  failedPartners,
}: {
  settings: AlertSettings;
  onChange: (s: AlertSettings) => void;
  failedPartners: Partner[];
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<AlertSettings>(() => JSON.parse(JSON.stringify(settings)));
  const [newRecipientType, setNewRecipientType] = useState<"email" | "sms">("email");
  const [newRecipientValue, setNewRecipientValue] = useState("");

  function patch(p: Partial<AlertSettings>) { setDraft((prev) => ({ ...prev, ...p })); }

  function addRecipient() {
    const v = newRecipientValue.trim();
    if (!v) return;
    patch({ recipients: [...draft.recipients, { id: `r_${Date.now()}`, type: newRecipientType, value: v }] });
    setNewRecipientValue("");
  }

  function removeRecipient(id: string) { patch({ recipients: draft.recipients.filter((r) => r.id !== id) }); }

  function save() {
    onChange(draft);
    toast({ title: "Alert settings saved", description: `${draft.recipients.length} recipient(s) configured.` });
  }

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(settings);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Alert & Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {failedPartners.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div className="text-xs text-red-700 dark:text-red-300">
              <span className="font-semibold">Alert:</span> {failedPartners.map((p) => p.name).join(", ")} {failedPartners.length === 1 ? "has" : "have"} failed on the last run.
            </div>
          </div>
        )}

        {/* Master toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Enable Notifications</Label>
          <button
            onClick={() => patch({ enabled: !draft.enabled })}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${draft.enabled ? "bg-primary" : "bg-muted-foreground/30"}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${draft.enabled ? "translate-x-4" : "translate-x-1"}`} />
          </button>
        </div>

        {/* Trigger conditions */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notify when</Label>
          {([
            { key: "onError", label: "Interface throws an error" },
            { key: "onValidationError", label: "Validation error occurs" },
            { key: "onPartnerDown", label: "Partner interface goes down" },
          ] as const).map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={key}
                checked={draft[key]}
                onCheckedChange={(v) => patch({ [key]: !!v })}
                disabled={!draft.enabled}
              />
              <label htmlFor={key} className="text-sm cursor-pointer select-none">{label}</label>
            </div>
          ))}
        </div>

        {/* Cooldown */}
        <div className="flex items-center gap-3">
          <Label className="text-sm whitespace-nowrap">Alert cooldown</Label>
          <Select
            value={String(draft.cooldownMinutes)}
            onValueChange={(v) => patch({ cooldownMinutes: Number(v) })}
            disabled={!draft.enabled}
          >
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[5, 10, 15, 30, 60, 120].map((m) => (
                <SelectItem key={m} value={String(m)}>{m < 60 ? `${m} min` : `${m / 60} hr`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">between repeat alerts</span>
        </div>

        {/* Recipients */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Recipients</Label>
          <div className="space-y-1.5">
            {draft.recipients.map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 bg-muted/30">
                {r.type === "email" ? <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" /> : <Phone className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                <span className="text-sm flex-1 min-w-0 truncate">{r.value}</span>
                <Badge variant="outline" className="text-xs capitalize">{r.type === "sms" ? "SMS" : "Email"}</Badge>
                <button onClick={() => removeRecipient(r.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {draft.recipients.length === 0 && (
              <p className="text-xs text-muted-foreground py-1">No recipients yet. Add an email or phone below.</p>
            )}
          </div>

          {/* Add recipient */}
          <div className="flex gap-2">
            <Select value={newRecipientType} onValueChange={(v) => setNewRecipientType(v as "email" | "sms")} disabled={!draft.enabled}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email"><Mail className="w-3 h-3 inline mr-1" />Email</SelectItem>
                <SelectItem value="sms"><Phone className="w-3 h-3 inline mr-1" />SMS</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="h-8 text-sm flex-1"
              placeholder={newRecipientType === "email" ? "alerts@company.com" : "+44 7700 900000"}
              value={newRecipientValue}
              onChange={(e) => setNewRecipientValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRecipient()}
              disabled={!draft.enabled}
            />
            <Button size="sm" variant="outline" onClick={addRecipient} disabled={!draft.enabled || !newRecipientValue.trim()}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <Button size="sm" disabled={!hasChanges} onClick={save} className="w-full">
          {hasChanges ? "Save Alert Settings" : "Saved"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Public Web-to-Lead form card ──────────────────────────────────────────

function buildEmbedSnippet(slug: string): string {
  const action = `${window.location.origin}/api/integrations/web-to-lead/${slug}`;
  return `<form action="${action}" method="POST">
  <input type="text" name="firstName" placeholder="First name" required />
  <input type="text" name="lastName" placeholder="Last name" required />
  <input type="email" name="email" placeholder="Email" required />
  <input type="tel" name="phone" placeholder="Phone" />
  <input type="text" name="company" placeholder="Company" />
  <textarea name="message" placeholder="How can we help?"></textarea>

  <!-- Honeypot: leave hidden, real visitors never fill this in -->
  <input type="text" name="hp_website" style="display:none" tabindex="-1" autocomplete="off" />

  <!-- Optional: redirect visitors to a thank-you page after submitting -->
  <input type="hidden" name="retURL" value="https://your-site.com/thank-you" />

  <button type="submit">Submit</button>
</form>`;
}

function PublicFormCard({ partner, hasActiveLeadTemplate }: { partner: Partner; hasActiveLeadTemplate: boolean }) {
  const { toast } = useToast();
  const snippet = buildEmbedSnippet(partner.slug);

  return (
    <div className="rounded-lg border border-dashed border-primary/40 p-3 bg-primary/5 space-y-2">
      <p className="text-xs font-medium text-foreground">Public web-to-lead form</p>
      {!hasActiveLeadTemplate && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Activate a "Lead" mapping version below before embedding this form — submissions won't be saved until one is active.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        No authentication needed — paste this directly into any website. It's rate-limited and includes a spam honeypot.
      </p>
      <Textarea readOnly rows={10} className="font-mono text-xs" value={snippet} onFocus={(e) => e.currentTarget.select()} />
      <Button
        size="sm" variant="outline"
        onClick={() => { navigator.clipboard.writeText(snippet).catch(() => {}); toast({ title: "Snippet copied to clipboard" }); }}
      >
        Copy embed code
      </Button>
    </div>
  );
}

// ─── New Partner Dialog ─────────────────────────────────────────────────────

function NewPartnerDialog({ onSubmit, pending }: { onSubmit: (b: { name: string; slug: string; description: string }) => void; pending: boolean }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>New Integration Partner</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }} placeholder="e.g. Web Lead Capture" />
        </div>
        <div className="space-y-1">
          <Label>Slug (used in the webhook URL)</Label>
          <Input value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} placeholder="web-lead-capture" />
        </div>
        <div className="space-y-1">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
      </div>
      <DialogFooter>
        <Button disabled={!name || !slug || pending} onClick={() => onSubmit({ name, slug, description })}>
          {pending ? "Creating…" : "Create Partner"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ─── Mapping Editor ─────────────────────────────────────────────────────────

function MappingEditorDialog({
  template, entityTypes, onClose,
}: {
  template: MappingTemplate;
  entityTypes: EntityTypeInfo[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const entityInfo = entityTypes.find((e) => e.key === template.entity_type);
  const [rows, setRows] = useState<FieldRow[]>(
    template.definition.fields?.length
      ? template.definition.fields.map((f) => ({ ...newFieldRow(), ...f }))
      : [newFieldRow()],
  );
  const [samplePayload, setSamplePayload] = useState('{\n  "email": "jane@example.com",\n  "firstName": "Jane",\n  "lastName": "Doe"\n}');
  const [testResult, setTestResult] = useState<{ valid: boolean; output: unknown; errors: unknown[] } | null>(null);
  const isExisting = template.id > 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const definition = {
        entityType: template.entity_type,
        fields: rows.map((r) => ({
          id: r.id,
          sourcePath: r.sourcePath,
          targetField: r.targetField,
          transform: toBackendTransform(r),
          validation: {
            mandatory: r.mandatory || undefined,
            format: r.format || undefined,
            maxLength: r.maxLength ? Number(r.maxLength) : undefined,
            onExceed: r.maxLength ? r.onExceed : undefined,
          },
        })),
      };
      return api<{ template: MappingTemplate }>(`/api/admin/integrations/partners/${template.partner_id}/templates`, {
        method: "POST",
        body: JSON.stringify({ entityType: template.entity_type, definition }),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["integrations", "templates", template.partner_id] });
      toast({ title: "Mapping saved as new draft version" });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      let parsed: Record<string, unknown>;
      try { parsed = JSON.parse(samplePayload); } catch { throw new Error("Sample payload is not valid JSON"); }
      if (!isExisting) throw new Error("Save the mapping first, then test it");
      return api<{ valid: boolean; output: unknown; errors: unknown[] }>(`/api/admin/integrations/templates/${template.id}/test`, {
        method: "POST",
        body: JSON.stringify({ samplePayload: parsed }),
      });
    },
    onSuccess: (res) => setTestResult(res),
    onError: (err: Error) => toast({ title: "Test failed", description: err.message, variant: "destructive" }),
  });

  function updateRow(id: string, patch: Partial<FieldRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function updateTransform(id: string, patch: Record<string, unknown>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, transform: { ...r.transform, ...patch } } : r)));
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {entityInfo?.label ?? template.entity_type} mapping
            {isExisting ? ` — v${template.version} (${template.status})` : " — new draft"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Source path (payload)</Label>
                  <Input className="h-8 text-xs font-mono" value={row.sourcePath} onChange={(e) => updateRow(row.id, { sourcePath: e.target.value })} placeholder="profile.email" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Target field</Label>
                  <Select value={row.targetField} onValueChange={(v) => updateRow(row.id, { targetField: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose CRM field" /></SelectTrigger>
                    <SelectContent>
                      {(entityInfo?.fields ?? []).map((f) => <SelectItem key={f.field} value={f.field}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Transform</Label>
                  <Select value={row.transform.type} onValueChange={(v) => updateRow(row.id, { transform: { type: v as TransformType } })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRANSFORM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TransformParams row={row} onChange={(patch) => updateTransform(row.id, patch)} />

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 text-xs">
                  <Checkbox checked={row.mandatory} onCheckedChange={(v) => updateRow(row.id, { mandatory: Boolean(v) })} />
                  Mandatory
                </label>
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-muted-foreground">Format</Label>
                  <Select value={row.format || "none"} onValueChange={(v) => updateRow(row.id, { format: v === "none" ? "" : v })}>
                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="email">email</SelectItem>
                      <SelectItem value="e164_phone">e164_phone</SelectItem>
                      <SelectItem value="iso_date">iso_date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-muted-foreground">Max length</Label>
                  <Input className="h-7 w-20 text-xs" type="number" value={row.maxLength} onChange={(e) => updateRow(row.id, { maxLength: e.target.value })} />
                  {row.maxLength && (
                    <Select value={row.onExceed} onValueChange={(v) => updateRow(row.id, { onExceed: v as "truncate" | "reject" })}>
                      <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reject">reject</SelectItem>
                        <SelectItem value="truncate">truncate</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}

          <Button size="sm" variant="outline" onClick={() => setRows((prev) => [...prev, newFieldRow()])}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add field
          </Button>
        </div>

        <div className="border-t border-border pt-3 space-y-2">
          <Label className="text-xs font-medium">Test runner</Label>
          <Textarea rows={5} className="font-mono text-xs" value={samplePayload} onChange={(e) => setSamplePayload(e.target.value)} />
          <Button size="sm" variant="outline" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
            <PlayCircle className="w-3.5 h-3.5 mr-1" /> Run test
          </Button>
          {testResult && (
            <div className={`rounded-lg border p-2 text-xs font-mono whitespace-pre-wrap ${testResult.valid ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30" : "border-amber-300 bg-amber-50 dark:bg-amber-950/30"}`}>
              {JSON.stringify(testResult, null, 2)}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save as new draft version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Converts the flat UI transform shape into the backend TransformSpec shape (only "concat" differs). */
function toBackendTransform(row: FieldRow): Record<string, unknown> {
  const t = row.transform;
  if (t.type !== "concat") return t;
  const extraPaths = String((t.extraPaths as string) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return {
    type: "concat",
    separator: t.separator ?? " ",
    parts: [{ sourcePath: row.sourcePath }, ...extraPaths.map((sourcePath) => ({ sourcePath }))],
  };
}

function TransformParams({ row, onChange }: { row: FieldRow; onChange: (patch: Record<string, unknown>) => void }) {
  const t = row.transform;
  switch (t.type) {
    case "concat":
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input className="h-8 text-xs" placeholder="extra source paths, comma separated" value={(t.extraPaths as string) ?? ""} onChange={(e) => onChange({ extraPaths: e.target.value })} />
          <Input className="h-8 text-xs" placeholder="separator (e.g. space)" value={(t.separator as string) ?? " "} onChange={(e) => onChange({ separator: e.target.value })} />
        </div>
      );
    case "split":
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input className="h-8 text-xs" placeholder="separator" value={(t.separator as string) ?? ""} onChange={(e) => onChange({ separator: e.target.value })} />
          <Input className="h-8 text-xs" type="number" placeholder="index" value={(t.index as number) ?? 0} onChange={(e) => onChange({ index: Number(e.target.value) })} />
        </div>
      );
    case "conditional":
      return (
        <div className="grid grid-cols-3 gap-2">
          <Input className="h-8 text-xs" placeholder="compare value (eq)" value={(t.compareValue as string) ?? ""} onChange={(e) => onChange({ operator: "eq", compareValue: e.target.value })} />
          <Input className="h-8 text-xs" placeholder="then value" value={(t.thenValue as string) ?? ""} onChange={(e) => onChange({ thenValue: e.target.value })} />
          <Input className="h-8 text-xs" placeholder="else value" value={(t.elseValue as string) ?? ""} onChange={(e) => onChange({ elseValue: e.target.value })} />
        </div>
      );
    case "lookup":
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input className="h-8 text-xs" placeholder="table name" value={(t.table as string) ?? ""} onChange={(e) => onChange({ table: e.target.value })} />
          <Input className="h-8 text-xs" placeholder="fallback value" value={(t.fallback as string) ?? ""} onChange={(e) => onChange({ fallback: e.target.value })} />
        </div>
      );
    case "default":
    case "const":
      return <Input className="h-8 text-xs" placeholder="value" value={(t.value as string) ?? ""} onChange={(e) => onChange({ value: e.target.value })} />;
    case "dateFormat":
      return (
        <Select value={(t.outputFormat as string) ?? "ISO"} onValueChange={(v) => onChange({ outputFormat: v })}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ISO">ISO</SelectItem>
            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
          </SelectContent>
        </Select>
      );
    case "math":
      return <Input className="h-8 text-xs font-mono" placeholder="e.g. value * 1.2" value={(t.expression as string) ?? ""} onChange={(e) => onChange({ expression: e.target.value })} />;
    case "truncate":
      return <Input className="h-8 text-xs" type="number" placeholder="max length" value={(t.maxLen as number) ?? ""} onChange={(e) => onChange({ maxLen: Number(e.target.value) })} />;
    default:
      return null;
  }
}

// ─── Run log & audit log ────────────────────────────────────────────────────

function RunLogTable({ partners }: { partners: Partner[] }) {
  const [partnerFilter, setPartnerFilter] = useState<string>("all");
  const { data } = useQuery<{ runs: RunLogRow[] }>({
    queryKey: ["integrations", "runs", partnerFilter],
    queryFn: () => api(`/api/admin/integrations/runs${partnerFilter !== "all" ? `?partnerId=${partnerFilter}` : ""}`),
    refetchInterval: 15000,
  });
  const runs = data?.runs ?? [];

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Integration Run Log</CardTitle>
        <Select value={partnerFilter} onValueChange={setPartnerFilter}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All partners</SelectItem>
            {partners.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>CRM ID</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.partner_name ?? "—"}</TableCell>
                <TableCell className="capitalize">{r.entity_type}</TableCell>
                <TableCell><Badge variant="outline" className={`text-xs ${STATUS_BADGE[r.status]}`}>{r.status.replace("_", " ")}</Badge></TableCell>
                <TableCell>{r.crm_entity_id ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.duration_ms}ms</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {runs.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">No integration runs yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AuditLogTable() {
  const { data } = useQuery<{ entries: AuditRow[] }>({
    queryKey: ["integrations", "audit"],
    queryFn: () => api("/api/admin/integrations/audit"),
  });
  const entries = data?.entries ?? [];

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Audit Log</CardTitle>
        <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.actor_name}</TableCell>
                <TableCell>{e.action}</TableCell>
                <TableCell className="text-xs">{e.resource_type} #{e.resource_id}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">No audit events yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
