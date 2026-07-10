import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Bell, Edit2, Trash2, ToggleLeft, ToggleRight, Mail, MessageSquare, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = "/api";

const EVENTS = [
  "contract.expiring_30d",
  "contract.expiring_60d",
  "contract.expiring_90d",
  "contract.expired",
  "contract.submitted_for_approval",
  "contract.approved",
  "contract.rejected",
  "contract.activated",
  "contract.terminated",
  "review.assigned",
  "review.overdue",
  "signer.reminder",
  "all_signers.completed",
  "renewal.decision_required",
  "redline.received",
];

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="w-3 h-3" />,
  slack: <MessageSquare className="w-3 h-3" />,
  sms: <Smartphone className="w-3 h-3" />,
};

type NotificationRule = {
  id: number;
  name: string;
  event: string;
  recipients: string;
  channels: string;
  trigger_days_before: number | null;
  message_template: string | null;
  active: boolean;
  created_at: string;
};

function parseJson(s: string): unknown[] {
  try { return JSON.parse(s) ?? []; } catch { return []; }
}

function RuleForm({ initial, onSave, onClose }: { initial?: NotificationRule; onSave: (d: Record<string, unknown>) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [event, setEvent] = useState(initial?.event ?? EVENTS[0]);
  const [recipientStr, setRecipientStr] = useState(
    initial?.recipients ? (parseJson(initial.recipients) as string[]).join(", ") : "owner, account_team"
  );
  const [channels, setChannels] = useState<string[]>(
    initial?.channels ? (parseJson(initial.channels) as string[]) : ["email"]
  );
  const [triggerDaysBefore, setTriggerDaysBefore] = useState(initial?.trigger_days_before?.toString() ?? "");
  const [messageTemplate, setMessageTemplate] = useState(initial?.message_template ?? "");
  const [saving, setSaving] = useState(false);

  const toggleChannel = (ch: string) =>
    setChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const recipients = recipientStr.split(",").map((s) => s.trim()).filter(Boolean);
      await onSave({
        name, event, recipients, channels,
        triggerDaysBefore: triggerDaysBefore ? parseInt(triggerDaysBefore) : null,
        messageTemplate: messageTemplate || null,
      });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Rule Name *</Label>
          <Input className="bg-muted border-border mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Contract Expiry 30-Day Alert" />
        </div>
        <div>
          <Label>Trigger Event *</Label>
          <select className="w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm mt-1"
            value={event} onChange={(e) => setEvent(e.target.value)}>
            {EVENTS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Recipients (comma-separated roles or emails)</Label>
          <Input className="bg-muted border-border mt-1" value={recipientStr} onChange={(e) => setRecipientStr(e.target.value)}
            placeholder="owner, account_team, legal@company.com" />
        </div>
        <div>
          <Label>Days Before (for expiry events)</Label>
          <Input type="number" min="0" className="bg-muted border-border mt-1" value={triggerDaysBefore}
            onChange={(e) => setTriggerDaysBefore(e.target.value)} placeholder="e.g. 30" />
        </div>
      </div>
      <div>
        <Label>Channels</Label>
        <div className="flex gap-3 mt-2">
          {["email", "slack", "sms"].map((ch) => (
            <button key={ch} type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm transition-colors ${channels.includes(ch) ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              onClick={() => toggleChannel(ch)}>
              {CHANNEL_ICONS[ch]} {ch}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Message Template</Label>
        <textarea className="w-full h-24 px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm mt-1 resize-y"
          value={messageTemplate} onChange={(e) => setMessageTemplate(e.target.value)}
          placeholder="The contract {{contract_name}} for {{account_name}} expires on {{end_date}}. Please review." />
        <p className="text-xs text-muted-foreground mt-1">
          Available vars: <code className="bg-muted px-1 rounded">{"{{contract_name}}"}</code> <code className="bg-muted px-1 rounded">{"{{account_name}}"}</code> <code className="bg-muted px-1 rounded">{"{{end_date}}"}</code> <code className="bg-muted px-1 rounded">{"{{owner_name}}"}</code>
        </p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} className="border-border">Cancel</Button>
        <Button onClick={handleSave} disabled={saving || !name} className="bg-primary hover:bg-primary/90 text-foreground">
          {saving ? "Saving..." : initial ? "Update Rule" : "Create Rule"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function ClmNotifications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRule, setEditRule] = useState<NotificationRule | null>(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["clm-notification-rules"],
    queryFn: () => fetch(`${API}/clm/notification-rules`).then((r) => r.json()) as Promise<NotificationRule[]>,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["clm-notification-rules"] });

  const createMut = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch(`${API}/clm/notification-rules`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { refresh(); toast({ title: "Notification rule created" }); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      fetch(`${API}/clm/notification-rules/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { refresh(); toast({ title: "Notification rule updated" }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`${API}/clm/notification-rules/${id}`, { method: "DELETE" }),
    onSuccess: () => { refresh(); toast({ title: "Notification rule deleted" }); },
  });

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notification Rules</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configure alerts and notifications for CLM events (UC-020)</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-foreground gap-1.5">
            <Plus className="w-4 h-4" /> New Rule
          </Button>
        </div>

        {isLoading ? (
          <div className="flex gap-1.5 py-16 justify-center">
            {[0, 1, 2].map((i) => <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
        ) : rules.length === 0 ? (
          <Card className="glass-panel border-border p-12 text-center">
            <Bell className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No notification rules yet. Add your first rule.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => {
              const recipients = parseJson(rule.recipients) as string[];
              const channels = parseJson(rule.channels) as string[];
              return (
                <Card key={rule.id} className="glass-panel border-border p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bell className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{rule.name}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">{rule.event}</Badge>
                        {rule.trigger_days_before != null && (
                          <Badge variant="outline" className="text-[10px]">{rule.trigger_days_before}d before</Badge>
                        )}
                        {!rule.active && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>To: <span className="text-foreground">{recipients.join(", ") || "—"}</span></span>
                        <div className="flex gap-1">
                          {channels.map((ch) => (
                            <span key={ch} className="flex items-center gap-1 bg-muted border border-border px-1.5 py-0.5 rounded">
                              {CHANNEL_ICONS[ch]} {ch}
                            </span>
                          ))}
                        </div>
                      </div>
                      {rule.message_template && (
                        <p className="mt-1.5 text-xs text-muted-foreground italic line-clamp-1">"{rule.message_template}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => updateMut.mutate({ id: rule.id, data: { active: !rule.active } })} className="text-muted-foreground hover:text-primary p-1">
                        {rule.active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditRule(rule)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => deleteMut.mutate(rule.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader><DialogTitle>Create Notification Rule</DialogTitle></DialogHeader>
          <RuleForm onSave={(d) => createMut.mutateAsync(d)} onClose={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRule} onOpenChange={(v) => { if (!v) setEditRule(null); }}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader><DialogTitle>Edit Notification Rule</DialogTitle></DialogHeader>
          {editRule && (
            <RuleForm
              initial={editRule}
              onSave={(d) => updateMut.mutateAsync({ id: editRule.id, data: d })}
              onClose={() => setEditRule(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
