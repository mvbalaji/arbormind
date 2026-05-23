import React, { useState, useEffect, useCallback } from "react";
import { useListUsers } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import {
  Settings, Shield, UserPlus, Trash2, Loader2, Users as UsersIcon, Upload,
  Mail, RefreshCw, CheckCircle, XCircle, Wifi, WifiOff, Clock, Play, UserCog, ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { DataImport } from "@/components/data-import";
import { cn } from "@/lib/utils";
import { AccessControlInline } from "./access-control";
import { ApprovalConfigInline } from "@/components/approval-config-inline";

interface AppUser {
  id: number;
  email: string;
  name: string | null;
  role: string;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface MailSettings {
  id?: number;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
  smtpFromName: string;
  syncEnabled: boolean;
  syncIntervalMinutes: number;
  lastSyncAt?: string | null;
  lastSyncStatus?: string | null;
  lastSyncMessage?: string | null;
  emailsProcessed?: number;
}

const defaultSettings: MailSettings = {
  imapHost: "mail.spacemail.com",
  imapPort: 993,
  imapUser: "",
  imapPassword: "",
  imapSecure: true,
  smtpHost: "mail.spacemail.com",
  smtpPort: 465,
  smtpUser: "",
  smtpPassword: "",
  smtpSecure: true,
  smtpFromName: "",
  syncEnabled: false,
  syncIntervalMinutes: 15,
};

export default function Users() {
  const { data, isLoading } = useListUsers();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const isAdmin = currentUser?.role === "admin";

  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [appUsersLoading, setAppUsersLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("sales");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"team" | "access" | "approvals" | "import" | "mail">("team");

  // Mail settings state
  const [mailSettings, setMailSettings] = useState<MailSettings>(defaultSettings);
  const [mailLoading, setMailLoading] = useState(false);
  const [mailSaving, setMailSaving] = useState(false);
  const [mailTesting, setMailTesting] = useState(false);
  const [mailSyncing, setMailSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const fetchAppUsers = async () => {
    if (!isAdmin) return;
    setAppUsersLoading(true);
    try {
      const res = await fetch("/api/auth/users", { credentials: "include" });
      if (res.ok) {
        const d = await res.json() as { users: AppUser[] };
        setAppUsers(d.users);
      }
    } finally {
      setAppUsersLoading(false);
    }
  };

  const fetchMailSettings = useCallback(async () => {
    if (!isAdmin) return;
    setMailLoading(true);
    try {
      const res = await fetch("/api/admin/email-settings", { credentials: "include" });
      if (res.ok) {
        const d = await res.json() as { settings: MailSettings };
        setMailSettings(prev => ({ ...prev, ...d.settings }));
      }
    } finally {
      setMailLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { void fetchAppUsers(); }, [isAdmin]);
  useEffect(() => { if (activeTab === "mail") void fetchMailSettings(); }, [activeTab, fetchMailSettings]);

  const handleAddUser = async () => {
    if (!newEmail) return;
    setSaving(true);
    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: newEmail, name: newName || undefined, role: newRole }),
      });
      if (res.ok) {
        toast({ title: "Access granted", description: `${newEmail} can now sign in.` });
        setAddDialogOpen(false);
        setNewEmail(""); setNewName(""); setNewRole("sales");
        void fetchAppUsers();
      } else {
        const err = await res.json() as { error?: string };
        toast({ title: "Error", description: err.error ?? "Failed to add user", variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveUser = async (id: number) => {
    try {
      const res = await fetch(`/api/auth/users/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        toast({ title: "Access revoked" });
        void fetchAppUsers();
      }
    } finally {
      setRemoveId(null);
    }
  };

  const handleSaveMailSettings = async () => {
    setMailSaving(true);
    try {
      const res = await fetch("/api/admin/email-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(mailSettings),
      });
      const d = await res.json() as { success?: boolean; settings?: MailSettings; error?: string };
      if (d.success && d.settings) {
        setMailSettings(prev => ({ ...prev, ...d.settings }));
        toast({ title: "Mail settings saved", description: "IMAP/SMTP configuration updated." });
      } else {
        toast({ title: "Save failed", description: d.error ?? "Unknown error", variant: "destructive" });
      }
    } finally {
      setMailSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setMailTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/email-settings/test", {
        method: "POST",
        credentials: "include",
      });
      const d = await res.json() as { success: boolean; messages?: number; unseen?: number; error?: string };
      if (d.success) {
        setTestResult({ ok: true, msg: `Connected! ${d.messages ?? 0} messages, ${d.unseen ?? 0} unread.` });
      } else {
        setTestResult({ ok: false, msg: d.error ?? "Connection failed" });
      }
    } catch {
      setTestResult({ ok: false, msg: "Network error" });
    } finally {
      setMailTesting(false);
    }
  };

  const handleManualSync = async () => {
    setMailSyncing(true);
    try {
      const res = await fetch("/api/admin/email-sync", {
        method: "POST",
        credentials: "include",
      });
      const d = await res.json() as { success?: boolean; processed?: number; error?: string };
      if (d.success) {
        toast({ title: "Sync complete", description: `${d.processed ?? 0} email(s) processed.` });
        void fetchMailSettings();
      } else {
        toast({ title: "Sync failed", description: d.error ?? "Unknown error", variant: "destructive" });
      }
    } finally {
      setMailSyncing(false);
    }
  };

  const setMail = (key: keyof MailSettings, val: string | number | boolean) => {
    setMailSettings(prev => ({ ...prev, [key]: val }));
    setTestResult(null);
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">System Admin</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage team members, access control, data imports and mail configuration.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit border border-border">
          {([
            { id: "team", label: "Team Settings", icon: UsersIcon },
            { id: "access", label: "Access Control", icon: Shield },
            { id: "approvals", label: "Approval Config", icon: ShieldCheck },
            { id: "import", label: "Data Import", icon: Upload },
            { id: "mail", label: "Mail Settings", icon: Mail },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Access Control Tab */}
        {activeTab === "access" && <AccessControlInline />}

        {/* Approval Config Tab */}
        {activeTab === "approvals" && <ApprovalConfigInline />}

        {/* Data Import Tab */}
        {activeTab === "import" && <DataImport />}

        {/* Team Settings Tab */}
        {activeTab === "team" && <>
          {isAdmin && (
            <Card className="glass-panel border-border">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="font-semibold text-foreground">App Access Control</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage who can sign in with Google</p>
                  </div>
                </div>
                <Button
                  onClick={() => setAddDialogOpen(true)}
                  className="rounded-xl bg-gradient-to-r from-primary to-accent border-0 text-foreground hover:opacity-90"
                  size="sm"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Access
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                    <tr className="divide-x divide-border">
                      <th className="px-3 py-1.5 font-medium">User</th>
                      <th className="px-3 py-1.5 font-medium">Role</th>
                      <th className="px-3 py-1.5 font-medium">Status</th>
                      <th className="px-3 py-1.5 font-medium">Last Login</th>
                      <th className="px-3 py-1.5 font-medium w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {appUsersLoading ? (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                    ) : appUsers.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No users yet</td></tr>
                    ) : appUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 border border-border">
                              {u.avatarUrl && <img src={u.avatarUrl} alt={u.name ?? u.email} />}
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                {(u.name ?? u.email).substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-foreground">{u.name ?? "—"}</div>
                              <div className="text-xs text-muted-foreground">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          <Badge variant="outline" className={`capitalize ${u.role === "admin" ? "border-accent/50 text-primary bg-accent/10" : "border-border text-muted-foreground"}`}>
                            {u.role === "admin" && <Shield className="w-3 h-3 mr-1" />}
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" : "bg-gray-500"}`} />
                            {u.isActive ? "Active" : "Revoked"}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground text-xs">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center justify-end gap-1">
                            {isAdmin && u.email !== currentUser?.email && u.isActive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs text-muted-foreground hover:text-primary"
                                title={`Login as ${u.name ?? u.email} to test their view`}
                                onClick={async () => {
                                  try {
                                    const res = await fetch("/api/auth/impersonate", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      credentials: "include",
                                      body: JSON.stringify({ userId: u.id }),
                                    });
                                    if (!res.ok) {
                                      const data = await res.json().catch(() => ({}));
                                      toast({
                                        title: "Could not switch user",
                                        description: data.error ?? "Try again.",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    window.location.href = "/#/dashboard";
                                    setTimeout(() => window.location.reload(), 50);
                                  } catch {
                                    toast({
                                      title: "Network error",
                                      description: "Could not start impersonation.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <UserCog className="w-3.5 h-3.5 mr-1" />
                                Login as
                              </Button>
                            )}
                            {u.email !== currentUser?.email && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => setRemoveId(u.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Card className="glass-panel border-border">
            <div className="p-6 border-b border-border flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-primary" />
              <div>
                <h2 className="font-semibold text-foreground">CRM Team Members</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Sales reps, managers and their roles</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr className="divide-x divide-border">
                    <th className="px-3 py-1.5 font-medium">User</th>
                    <th className="px-3 py-1.5 font-medium">Role</th>
                    <th className="px-3 py-1.5 font-medium">Team</th>
                    <th className="px-3 py-1.5 font-medium">Status</th>
                    {isAdmin && <th className="px-3 py-1.5 font-medium w-28 text-right"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr><td colSpan={isAdmin ? 5 : 4} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                  ) : data?.data?.map(user => (
                    <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 border border-border">
                            <AvatarImage src={user.avatarUrl || ''} />
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-foreground">{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <Badge variant="outline" className={`capitalize ${user.role === 'admin' ? 'border-accent/50 text-primary bg-accent/10' : 'border-border text-muted-foreground bg-muted'}`}>
                          {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">{user.team || '-'}</td>
                      <td className="px-3 py-1.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.isActive ? 'text-green-600' : 'text-muted-foreground'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-gray-500'}`} />
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-1.5 text-right">
                          {user.email !== currentUser?.email && user.isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs hover:border-primary hover:text-primary"
                              title={`Login as ${user.name} to test the app as a ${user.role}`}
                              onClick={async () => {
                                try {
                                  const res = await fetch("/api/auth/impersonate", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    credentials: "include",
                                    body: JSON.stringify({ email: user.email }),
                                  });
                                  if (!res.ok) {
                                    const data = await res.json().catch(() => ({}));
                                    toast({
                                      title: "Could not switch user",
                                      description: data.error ?? "Try again.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  window.location.href = "/#/dashboard";
                                  setTimeout(() => window.location.reload(), 50);
                                } catch {
                                  toast({
                                    title: "Network error",
                                    description: "Could not start impersonation.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <UserCog className="w-3.5 h-3.5 mr-1" />
                              Login as
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>}

        {/* Mail Settings Tab */}
        {activeTab === "mail" && !isAdmin && (
          <Card className="glass-panel border-border p-12 text-center text-muted-foreground">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Mail settings are restricted to administrators.</p>
          </Card>
        )}

        {activeTab === "mail" && isAdmin && (
          <div className="flex flex-col gap-6">
            {/* Sync status banner */}
            <Card className="glass-panel border-border">
              <div className="p-5 flex flex-wrap items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    mailSettings.lastSyncStatus === "ok" ? "bg-green-500/10" :
                    mailSettings.lastSyncStatus === "error" ? "bg-red-500/10" : "bg-muted"
                  )}>
                    {mailSettings.lastSyncStatus === "ok" ? <CheckCircle className="w-5 h-5 text-green-500" /> :
                     mailSettings.lastSyncStatus === "error" ? <XCircle className="w-5 h-5 text-red-500" /> :
                     <Mail className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {mailSettings.syncEnabled ? "Auto-sync enabled" : "Auto-sync disabled"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {mailSettings.lastSyncAt
                        ? `Last sync: ${new Date(mailSettings.lastSyncAt).toLocaleString()} — ${mailSettings.lastSyncMessage ?? ""}`
                        : "Never synced"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {mailSettings.emailsProcessed !== undefined && mailSettings.emailsProcessed > 0 && (
                    <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
                      {mailSettings.emailsProcessed} email{mailSettings.emailsProcessed !== 1 ? "s" : ""} processed total
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => void handleManualSync()}
                    disabled={mailSyncing || !mailSettings.imapUser}
                  >
                    {mailSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    Sync Now
                  </Button>
                </div>
              </div>
            </Card>

            {/* IMAP Settings */}
            <Card className="glass-panel border-border">
              <div className="p-5 border-b border-border flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="font-semibold text-foreground">Incoming Mail (IMAP)</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Connect to your Spacemail inbox to fetch incoming emails</p>
                </div>
              </div>
              {mailLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">IMAP Host</label>
                    <Input
                      value={mailSettings.imapHost}
                      onChange={e => setMail("imapHost", e.target.value)}
                      placeholder="mail.spacemail.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">IMAP Port</label>
                    <Input
                      type="number"
                      value={mailSettings.imapPort}
                      onChange={e => setMail("imapPort", Number(e.target.value))}
                      placeholder="993"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Email Address</label>
                    <Input
                      type="email"
                      value={mailSettings.imapUser}
                      onChange={e => setMail("imapUser", e.target.value)}
                      placeholder="crm@yourcompany.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Password</label>
                    <Input
                      type="password"
                      value={mailSettings.imapPassword}
                      onChange={e => setMail("imapPassword", e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="flex items-center gap-3 col-span-full">
                    <Switch
                      checked={mailSettings.imapSecure}
                      onCheckedChange={val => setMail("imapSecure", val)}
                    />
                    <span className="text-sm text-foreground">Use SSL/TLS (recommended — port 993)</span>
                  </div>
                  <div className="col-span-full">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => void handleTestConnection()}
                      disabled={mailTesting || !mailSettings.imapUser || !mailSettings.imapPassword}
                    >
                      {mailTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                      Test IMAP Connection
                    </Button>
                    {testResult && (
                      <div className={cn(
                        "mt-3 flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border",
                        testResult.ok
                          ? "border-green-500/30 bg-green-500/10 text-green-600"
                          : "border-red-500/30 bg-red-500/10 text-red-500"
                      )}>
                        {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                        {testResult.msg}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* SMTP Settings */}
            <Card className="glass-panel border-border">
              <div className="p-5 border-b border-border flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="font-semibold text-foreground">Outgoing Mail (SMTP)</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Used when sending emails from the CRM</p>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">SMTP Host</label>
                  <Input
                    value={mailSettings.smtpHost}
                    onChange={e => setMail("smtpHost", e.target.value)}
                    placeholder="mail.spacemail.com"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">SMTP Port</label>
                  <Input
                    type="number"
                    value={mailSettings.smtpPort}
                    onChange={e => setMail("smtpPort", Number(e.target.value))}
                    placeholder="465"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Email Address</label>
                  <Input
                    type="email"
                    value={mailSettings.smtpUser}
                    onChange={e => setMail("smtpUser", e.target.value)}
                    placeholder="crm@yourcompany.com"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Password</label>
                  <Input
                    type="password"
                    value={mailSettings.smtpPassword}
                    onChange={e => setMail("smtpPassword", e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">From Name</label>
                  <Input
                    value={mailSettings.smtpFromName}
                    onChange={e => setMail("smtpFromName", e.target.value)}
                    placeholder="ArborMind CRM"
                  />
                </div>
                <div className="flex items-center gap-3 self-end pb-0.5">
                  <Switch
                    checked={mailSettings.smtpSecure}
                    onCheckedChange={val => setMail("smtpSecure", val)}
                  />
                  <span className="text-sm text-foreground">Use SSL/TLS (port 465)</span>
                </div>
              </div>
            </Card>

            {/* Sync Schedule */}
            <Card className="glass-panel border-border">
              <div className="p-5 border-b border-border flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="font-semibold text-foreground">Auto-Sync Schedule</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Automatically check inbox and create leads/opportunities</p>
                </div>
              </div>
              <div className="p-6 flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={mailSettings.syncEnabled}
                    onCheckedChange={val => setMail("syncEnabled", val)}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">Enable auto-sync</p>
                    <p className="text-xs text-muted-foreground">CRM will poll your inbox automatically</p>
                  </div>
                </div>
                <div className="max-w-xs">
                  <label className="text-sm text-muted-foreground mb-1.5 block">Check every</label>
                  <Select
                    value={String(mailSettings.syncIntervalMinutes)}
                    onValueChange={val => setMail("syncIntervalMinutes", Number(val))}
                    disabled={!mailSettings.syncEnabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-xl bg-muted/40 border border-border p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1.5">How it works</p>
                  <ul className="space-y-1 text-xs list-disc list-inside">
                    <li>Emails from <strong>known contacts</strong> automatically create an <strong>Opportunity</strong></li>
                    <li>Emails from <strong>unknown senders</strong> automatically create a <strong>Lead</strong></li>
                    <li>Processed emails are marked as read in your inbox</li>
                    <li>All emails are logged in the Inbox view for review</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                className="rounded-xl bg-gradient-to-r from-primary to-accent border-0 text-primary-foreground px-8"
                onClick={() => void handleSaveMailSettings()}
                disabled={mailSaving}
              >
                {mailSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Save Mail Settings
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Grant App Access</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Email address *</label>
              <Input placeholder="user@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Display name</label>
              <Input placeholder="Optional" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Role</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleAddUser()} disabled={!newEmail || saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Grant Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove User Confirm */}
      <AlertDialog open={removeId !== null} onOpenChange={() => setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke access?</AlertDialogTitle>
            <AlertDialogDescription>This user will no longer be able to sign in.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 text-destructive-foreground hover:bg-red-700" onClick={() => removeId && void handleRemoveUser(removeId)}>
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
