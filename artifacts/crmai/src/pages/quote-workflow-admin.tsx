import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, ListTodo, Mail, CheckCircle, ToggleLeft, ToggleRight,
  ChevronRight, Activity, Bell,
} from "lucide-react";
import { WORKFLOW_STAGES as STAGES_FALLBACK } from "@/lib/quote-stages";
import { QuoteStagesAdmin } from "@/components/quote-stages-admin";

const ACTIVITY_TYPES = ["task", "call", "email", "meeting"];

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Sales Manager" },
  { value: "rep", label: "Sales Rep" },
  { value: "super_admin", label: "Super Admin" },
];

type RuleType = "activity" | "approval";

interface Rule {
  id: number;
  stage: string;
  ruleType: RuleType;
  activityType?: string;
  activityTitle?: string;
  activityDueDays?: number;
  assignToRole?: string;
  assignToUserId?: number;
  assignUserName?: string;
  approvalRequired?: boolean;
  approvalEmailSubject?: string;
  approvalEmailBody?: string;
  approverRole?: string;
  approverUserId?: number;
  approverUserName?: string;
  advanceToStage?: string;
  enabled: boolean;
}

const EMPTY_ACTIVITY: Partial<Rule> = {
  ruleType: "activity", activityType: "task", activityDueDays: 1, enabled: true,
};
const EMPTY_APPROVAL: Partial<Rule> = {
  ruleType: "approval", approvalRequired: true, enabled: true,
};

async function apiFetch(url: string, opts?: RequestInit) {
  const r = await fetch(url, { credentials: "include", ...opts });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export function QuoteWorkflowAdminInline() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<RuleType | "stages">("activity");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Rule> | null>(null);

  const { data: rulesData } = useQuery<{ data: Rule[] }>({
    queryKey: ["quote-workflow-rules"],
    queryFn: () => apiFetch("/api/admin/quote-workflow-rules"),
  });
  const { data: usersData } = useQuery<{ data: { id: number; name: string; role: string }[] }>({
    queryKey: ["quote-workflow-users"],
    queryFn: () => apiFetch("/api/admin/quote-workflow-rules/users"),
  });
  const { data: stagesData } = useQuery<{ data: { stage_id: string; label: string; description: string; is_active: boolean }[] }>({
    queryKey: ["quote-stages-public"],
    queryFn: () => apiFetch("/api/admin/quote-stages"),
  });
  const STAGES = stagesData?.data
    ? stagesData.data.filter(s => s.is_active && s.stage_id !== "draft").map(s => ({ id: s.stage_id, label: s.label, desc: s.description }))
    : STAGES_FALLBACK;

  const allRules = rulesData?.data ?? [];
  const users = usersData?.data ?? [];
  const activityRules = allRules.filter(r => r.ruleType === "activity");
  const approvalRules = allRules.filter(r => r.ruleType === "approval");
  const shownRules = activeTab === "activity" ? activityRules : approvalRules;

  const saveMutation = useMutation({
    mutationFn: async (rule: Partial<Rule>) => {
      if (rule.id) {
        return apiFetch(`/api/admin/quote-workflow-rules/${rule.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rule),
        });
      }
      return apiFetch("/api/admin/quote-workflow-rules", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rule),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote-workflow-rules"] });
      toast({ title: "Rule saved" });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/quote-workflow-rules/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote-workflow-rules"] });
      toast({ title: "Rule deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (rule: Rule) => apiFetch(`/api/admin/quote-workflow-rules/${rule.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rule, enabled: !rule.enabled }),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote-workflow-rules"] }),
  });

  const openNew = (type: RuleType) => {
    setEditing(type === "activity" ? { ...EMPTY_ACTIVITY } : { ...EMPTY_APPROVAL });
    setDialogOpen(true);
  };
  const openEdit = (r: Rule) => { setEditing({ ...r }); setDialogOpen(true); };

  const stageLabel = (id: string) => STAGES.find(s => s.id === id)?.label ?? id;

  return (
    <>
    <div className="p-4 sm:p-6 max-w-5xl mx-auto flex flex-col gap-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Quote Workflow Rules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define what happens automatically when a quote moves through each stage — activities to create and approval emails to send.
          </p>
        </div>

        {/* Stage pipeline reference */}
        <Card className="glass-panel border-border px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Stage Flow</p>
          <div className="flex flex-wrap items-center gap-1 text-xs text-foreground">
            {STAGES.map((s, i) => (
              <React.Fragment key={s.id}>
                <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">{s.label}</span>
                {i < STAGES.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/50" />}
              </React.Fragment>
            ))}
          </div>
        </Card>

        {/* Tab switcher — clearly separated */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
              activeTab === "activity"
                ? "border-blue-500 bg-blue-500/10 text-blue-600"
                : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${activeTab === "activity" ? "bg-blue-600 text-white" : "bg-muted"}`}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Activity Rules</p>
              <p className="text-xs text-muted-foreground">{activityRules.length} rule{activityRules.length !== 1 ? "s" : ""} — tasks, calls, emails, meetings</p>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("approval")}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
              activeTab === "approval"
                ? "border-amber-500 bg-amber-500/10 text-amber-600"
                : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${activeTab === "approval" ? "bg-amber-500 text-white" : "bg-muted"}`}>
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Approval &amp; Email Rules</p>
              <p className="text-xs text-muted-foreground">{approvalRules.length} rule{approvalRules.length !== 1 ? "s" : ""} — approver assignment &amp; email triggers</p>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("stages")}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
              activeTab === "stages"
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${activeTab === "stages" ? "bg-emerald-500 text-white" : "bg-muted"}`}>
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Stage Config</p>
              <p className="text-xs text-muted-foreground">Add, reorder &amp; manage pipeline stages</p>
            </div>
          </button>
        </div>

        {/* Stage Config tab content */}
        {activeTab === "stages" && <QuoteStagesAdmin />}

        {/* Section header + Add button — only for rules tabs */}
        {activeTab !== "stages" && <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeTab === "activity"
              ? <Activity className="w-4 h-4 text-blue-600" />
              : <Bell className="w-4 h-4 text-amber-500" />}
            <h2 className="text-base font-semibold text-foreground">
              {activeTab === "activity" ? "Activity Rules" : "Approval & Email Rules"}
            </h2>
            <Badge variant="outline" className="text-xs">{shownRules.length}</Badge>
          </div>
          <Button size="sm" onClick={() => activeTab !== "stages" && openNew(activeTab)}
            className={activeTab === "activity" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Rule
          </Button>
        </div>}

        {/* Rules grouped by stage */}
        {activeTab !== "stages" && shownRules.length === 0 && (
          <Card className="glass-panel border-border py-12 flex flex-col items-center gap-2 text-center">
            {activeTab === "activity"
              ? <ListTodo className="w-8 h-8 text-muted-foreground/40" />
              : <Mail className="w-8 h-8 text-muted-foreground/40" />}
            <p className="text-sm text-muted-foreground">No {activeTab === "activity" ? "activity" : "approval"} rules yet.</p>
            <Button size="sm" variant="outline" onClick={() => activeTab !== "stages" && openNew(activeTab)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add your first rule
            </Button>
          </Card>
        )}
        {activeTab !== "stages" && shownRules.length > 0 && (
          <div className="flex flex-col gap-3">
            {STAGES.map(stage => {
              const stageRules = shownRules.filter(r => r.stage === stage.id);
              if (stageRules.length === 0) return null;
              return (
                <Card key={stage.id} className="glass-panel border-border overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wide">{stage.label}</span>
                    <span className="text-xs text-muted-foreground">— {stage.desc}</span>
                    <Badge variant="outline" className="text-xs ml-auto">{stageRules.length}</Badge>
                  </div>
                  <div className="divide-y divide-border">
                    {stageRules.map(rule => (
                      <RuleRow key={rule.id} rule={rule} users={users}
                        onEdit={() => openEdit(rule)}
                        onDelete={() => deleteMutation.mutate(rule.id)}
                        onToggle={() => toggleMutation.mutate(rule)}
                        activeTab={activeTab}
                      />
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); setEditing(null); } }}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing?.ruleType === "activity"
                ? <><Activity className="w-4 h-4 text-blue-600" /> {editing.id ? "Edit" : "Add"} Activity Rule</>
                : <><Bell className="w-4 h-4 text-amber-500" /> {editing?.id ? "Edit" : "Add"} Approval &amp; Email Rule</>}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <RuleForm
              rule={editing}
              users={users}
              onChange={setEditing}
              onSave={() => saveMutation.mutate(editing)}
              onCancel={() => { setDialogOpen(false); setEditing(null); }}
              saving={saveMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function QuoteWorkflowAdmin() {
  return (
    <Layout>
      <QuoteWorkflowAdminInline />
    </Layout>
  );
}

function RuleRow({ rule, users, onEdit, onDelete, onToggle, activeTab }: {
  rule: Rule; users: { id: number; name: string }[];
  onEdit: () => void; onDelete: () => void; onToggle: () => void; activeTab: RuleType;
}) {
  const assignName = rule.assignUserName ?? users.find(u => u.id === rule.assignToUserId)?.name ?? rule.assignToRole ?? "—";
  const approverName = rule.approverUserName ?? users.find(u => u.id === rule.approverUserId)?.name ?? rule.approverRole ?? "—";

  return (
    <div className={`px-4 py-3 flex items-start gap-3 ${!rule.enabled ? "opacity-50" : ""}`}>
      <div className={`mt-0.5 w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
        activeTab === "activity" ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600"}`}>
        {activeTab === "activity"
          ? <ListTodo className="w-3.5 h-3.5" />
          : <Mail className="w-3.5 h-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        {activeTab === "activity" ? (
          <>
            <p className="text-sm font-medium text-foreground">
              {rule.activityTitle || `[${rule.activityType ?? "task"}]`}
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge variant="outline" className="text-xs capitalize">{rule.activityType ?? "task"}</Badge>
              <span className="text-xs text-muted-foreground">Assign to: <span className="text-foreground font-medium">{assignName}</span></span>
              {rule.activityDueDays != null && (
                <span className="text-xs text-muted-foreground">Due in <span className="text-foreground font-medium">{rule.activityDueDays}d</span></span>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground">
              {rule.approvalEmailSubject || "Approval Email"}
              {rule.approvalRequired && <Badge className="ml-2 text-[10px] bg-amber-500/15 text-amber-700 border-amber-500/30">Approval Required</Badge>}
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="text-xs text-muted-foreground">Approver: <span className="text-foreground font-medium">{approverName}</span></span>
              {rule.advanceToStage && (
                <span className="text-xs text-muted-foreground">Advances to: <span className="text-foreground font-medium capitalize">{rule.advanceToStage.replace(/_/g, " ")}</span></span>
              )}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onToggle} className="p-1 text-muted-foreground hover:text-foreground" title={rule.enabled ? "Disable" : "Enable"}>
          {rule.enabled
            ? <ToggleRight className="w-4 h-4 text-emerald-500" />
            : <ToggleLeft className="w-4 h-4" />}
        </button>
        <button onClick={onEdit} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="p-1 text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

function RuleForm({ rule, users, onChange, onSave, onCancel, saving }: {
  rule: Partial<Rule>; users: { id: number; name: string; role: string }[];
  onChange: (r: Partial<Rule>) => void; onSave: () => void; onCancel: () => void; saving: boolean;
}) {
  const set = (patch: Partial<Rule>) => onChange({ ...rule, ...patch });
  const isActivity = rule.ruleType === "activity";

  return (
    <div className="flex flex-col gap-4 mt-2">
      {/* Trigger stage */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-semibold">Trigger Stage *</Label>
        <Select value={rule.stage ?? ""} onValueChange={v => set({ stage: v })}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select stage…" /></SelectTrigger>
          <SelectContent>
            {STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">This rule fires when a quote enters this stage.</p>
      </div>

      {isActivity ? (
        <>
          {/* Activity type */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">Activity Type *</Label>
            <Select value={rule.activityType ?? "task"} onValueChange={v => set({ activityType: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Activity title */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">Activity Title *</Label>
            <Input
              className="h-9 text-sm" placeholder="e.g. Follow up call with customer"
              value={rule.activityTitle ?? ""}
              onChange={e => set({ activityTitle: e.target.value })}
            />
          </div>
          {/* Due days */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">Due in (days)</Label>
            <Input
              type="number" min={1} max={30} className="h-9 text-sm w-28"
              value={rule.activityDueDays ?? 1}
              onChange={e => set({ activityDueDays: parseInt(e.target.value) || 1 })}
            />
          </div>
          {/* Assign to */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Assign to Role</Label>
              <Select value={rule.assignToRole ?? "_none"} onValueChange={v => set({ assignToRole: v === "_none" ? undefined : v, assignToUserId: undefined })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Any role…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— No role filter —</SelectItem>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Or specific user</Label>
              <Select value={rule.assignToUserId ? String(rule.assignToUserId) : "_none"}
                onValueChange={v => set({ assignToUserId: v === "_none" ? undefined : parseInt(v), assignToRole: v !== "_none" ? undefined : rule.assignToRole })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Specific user…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— By role —</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Approver */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Approver Role</Label>
              <Select value={rule.approverRole ?? "_none"} onValueChange={v => set({ approverRole: v === "_none" ? undefined : v, approverUserId: undefined })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="By role…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— No role filter —</SelectItem>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Or specific approver</Label>
              <Select value={rule.approverUserId ? String(rule.approverUserId) : "_none"}
                onValueChange={v => set({ approverUserId: v === "_none" ? undefined : parseInt(v), approverRole: v !== "_none" ? undefined : rule.approverRole })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Specific user…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— By role —</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Advance to stage on approval */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">Advance to stage on email APPROVE</Label>
            <Select value={rule.advanceToStage ?? "_none"} onValueChange={v => set({ advanceToStage: v === "_none" ? undefined : v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="No auto-advance…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— No auto-advance —</SelectItem>
                {STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">When the approver replies APPROVE, quote moves to this stage automatically.</p>
          </div>
          {/* Email subject */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">Approval Email Subject *</Label>
            <Input
              className="h-9 text-sm"
              placeholder="e.g. Approval required: {quote_number} — {stage}"
              value={rule.approvalEmailSubject ?? ""}
              onChange={e => set({ approvalEmailSubject: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Tokens: {"{"}<code>quote_number</code>{"}"} {"{"}<code>quote_name</code>{"}"} {"{"}<code>stage</code>{"}"} {"{"}<code>approval_id</code>{"}"}</p>
          </div>
          {/* Email body */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">Email Body</Label>
            <Textarea
              className="text-sm resize-none min-h-[100px]"
              placeholder={"Please review {quote_number} — {quote_name}.\n\nReply APPROVE to approve or REJECT: reason to decline.\n\nRef: [APPROVAL-{approval_id}]"}
              value={rule.approvalEmailBody ?? ""}
              onChange={e => set({ approvalEmailBody: e.target.value })}
            />
          </div>
        </>
      )}

      {/* Enabled toggle */}
      <div className="flex items-center gap-2 pt-1">
        <button type="button" onClick={() => set({ enabled: !rule.enabled })} className="flex items-center gap-2">
          {rule.enabled
            ? <ToggleRight className="w-5 h-5 text-emerald-500" />
            : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
          <span className="text-sm text-foreground">{rule.enabled ? "Rule enabled" : "Rule disabled"}</span>
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-2 border-t border-border mt-1">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" disabled={saving || !rule.stage || (isActivity ? !rule.activityTitle : !rule.approvalEmailSubject)}
          onClick={onSave}
          className={isActivity ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"}>
          {saving ? "Saving…" : "Save Rule"}
        </Button>
      </div>
    </div>
  );
}
