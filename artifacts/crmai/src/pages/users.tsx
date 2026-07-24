import React, { useState, useEffect, useCallback } from "react";
import { useListUsers } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import {
  Settings, Shield, UserPlus, Trash2, Loader2, Users as UsersIcon, Upload,
  Mail, RefreshCw, CheckCircle, XCircle, Wifi, WifiOff, Clock, Play, UserCog, ShieldCheck,
  Pencil, Crown, Star, Building2, GitBranch, Settings2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { DataImport } from "@/components/data-import";
import { cn } from "@/lib/utils";
import { AccessControlInline } from "./access-control";
import { ApprovalConfigInline } from "@/components/approval-config-inline";
import { AppManagementInline } from "./app-management";
import { LeadScoringAdmin } from "@/components/lead-scoring-admin";
import { ProductRulesAdmin } from "@/components/product-rules-admin";
import { OrganizationSettingsInline } from "@/components/organization-settings-inline";
import { QuoteWorkflowAdminInline } from "@/pages/quote-workflow-admin";
import { QuoteStagesAdmin } from "@/components/quote-stages-admin";
import { IntegrationsInline } from "./integrations";

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

const ALL_ROLES = [
  { value: "super_admin", label: "Super Administrator" },
  { value: "admin", label: "System Administrator" },
  { value: "md", label: "Managing Director" },
  { value: "vp", label: "Vice President" },
  { value: "sales_director", label: "Sales Director" },
  { value: "sales_manager", label: "Sales Manager" },
  { value: "sales_rep", label: "Sales Rep" },
];

function getRoleBadgeClass(role: string) {
  switch (role) {
    case "super_admin": return "border-purple-400/60 text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-950 dark:border-purple-600";
    case "admin": return "border-accent/50 text-primary bg-accent/10";
    default: return "border-border text-muted-foreground";
  }
}

function getRoleLabel(role: string) {
  return ALL_ROLES.find((r) => r.value === role)?.label ?? role;
}

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant="outline" className={`capitalize text-xs ${getRoleBadgeClass(role)}`}>
      {role === "super_admin" && <Crown className="w-3 h-3 mr-1" />}
      {role === "admin" && <Shield className="w-3 h-3 mr-1" />}
      {getRoleLabel(role)}
    </Badge>
  );
}

export default function Users() {
  const { data, isLoading, refetch: refetchCrmUsers } = useListUsers();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = currentUser?.role === "super_admin";
  const isAdmin = currentUser?.role === "admin" || isSuperAdmin;

  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [appUsersLoading, setAppUsersLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("sales_rep");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"team" | "access" | "approvals" | "import" | "mail" | "apps" | "scoring" | "product-rules" | "organization" | "quote-workflow" | "integrations">("team");

  // Edit dialog state
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);

  // Add Member (CRM team) dialog state
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [memberRole, setMemberRole] = useState("sales_rep");
  const [memberTeam, setMemberTeam] = useState("");
  const [memberSaving, setMemberSaving] = useState(false);

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

  // Check if the current user can edit/delete a target user
  const canModifyUser = (target: AppUser) => {
    if (!isAdmin) return false;
    if (target.email === currentUser?.email) return false;
    // Only super_admin can touch super_admin users
    if (target.role === "super_admin" && !isSuperAdmin) return false;
    return true;
  };

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
        setNewEmail(""); setNewName(""); setNewRole("sales_rep");
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
      } else {
        const err = await res.json() as { error?: string };
        toast({ title: "Error", description: err.error ?? "Failed to revoke access", variant: "destructive" });
      }
    } finally {
      setRemoveId(null);
    }
  };

  const handleAddMember = async () => {
    if (!memberEmail || !memberPassword) return;
    setMemberSaving(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: memberEmail, password: memberPassword, name: memberName || undefined, role: memberRole, team: memberTeam || undefined }),
      });
      if (res.ok) {
        toast({ title: "Member added", description: `${memberName || memberEmail} has been added to the team.` });
        setAddMemberOpen(false);
        setMemberName(""); setMemberEmail(""); setMemberPassword(""); setMemberRole("sales_rep"); setMemberTeam("");
        void fetchAppUsers();
      } else {
        const err = await res.json() as { error?: string };
        toast({ title: "Error", description: err.error ?? "Failed to add member", variant: "destructive" });
      }
    } finally {
      setMemberSaving(false);
    }
  };

  const openEditDialog = (u: AppUser) => {
    setEditUser(u);
    setEditName(u.name ?? "");
    setEditRole(u.role);
    setEditActive(u.isActive);
  };

  const handleEditUser = async () => {
    if (!editUser) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/auth/users/${editUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: editName || undefined, role: editRole, isActive: editActive }),
      });
      if (res.ok) {
        toast({ title: "User updated", description: `${editUser.email} has been updated.` });
        setEditUser(null);
        void fetchAppUsers();
      } else {
        const err = await res.json() as { error?: string };
        toast({ title: "Error", description: err.error ?? "Failed to update user", variant: "destructive" });
      }
    } finally {
      setEditSaving(false);
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

  // Available roles for the add/edit dialogs based on current user's role
  const availableRoles = ALL_ROLES.filter((r) => {
    if (r.value === "super_admin") return isSuperAdmin;
    return true;
  });

  return (
    <Layout>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">System Admin</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage team members, access control, data imports and mail configuration.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit border border-border flex-wrap">
          {([
            { id: "team", label: "Team Settings", icon: UsersIcon },
            { id: "organization", label: "Organization", icon: Building2 },
            { id: "apps", label: "App Management", icon: Settings },
            { id: "access", label: "Access Control", icon: Shield },
            { id: "approvals", label: "Approval Config", icon: ShieldCheck },
            { id: "scoring", label: "Lead Scoring", icon: Star },
            { id: "product-rules", label: "Product Rules", icon: ShieldCheck },
            { id: "quote-workflow", label: "Quote Workflow", icon: GitBranch },
            { id: "integrations", label: "Admin Integration", icon: Settings2 },
            { id: "import", label: "Data Import", icon: Upload },
            { id: "mail", label: "Mail Settings", icon: Mail },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-sky-100 text-sky-700 hover:bg-sky-200"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Organization Tab */}
        {activeTab === "organization" && <OrganizationSettingsInline />}

        {/* App Management Tab */}
        {activeTab === "apps" && <AppManagementInline />}

        {/* Access Control Tab */}
        {activeTab === "access" && <AccessControlInline />}

        {/* Approval Config Tab */}
        {activeTab === "approvals" && <ApprovalConfigInline />}

        {/* Lead Scoring Tab */}
        {activeTab === "scoring" && <LeadScoringAdmin />}

        {/* Admin Integration Tab */}
        {activeTab === "integrations" && <IntegrationsInline />}

        {/* Product Rules Tab */}
        {activeTab === "product-rules" && <ProductRulesAdmin />}

        {/* Quote Workflow Tab (includes Stage Config sub-tab) */}
        {activeTab === "quote-workflow" && <QuoteWorkflowAdminInline />}

        {/* Data Import Tab */}
        {activeTab === "import" && <DataImport />}

        {/* Team Settings Tab */}
        {activeTab === "team" && <>
          {isAdmin && (
            <Card className="glass-panel border-border">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isSuperAdmin ? <Crown className="w-5 h-5 text-purple-600" /> : <Shield className="w-5 h-5 text-primary" />}
                  <div>
                    <h2 className="font-semibold text-foreground">App Access Control</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isSuperAdmin ? "Super Admin — full control over all users and roles" : "Manage who can sign in with Google"}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setAddDialogOpen(true)}
                  className="rounded-xl bg-gradient-to-r from-primary to-accent border-0 text-foreground hover:opacity-90"
                  size="sm"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                    <tr className="divide-x divide-border">
                      <th className="px-3 py-2 font-medium">User</th>
                      <th className="px-3 py-2 font-medium">Role</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Last Login</th>
                      <th className="px-3 py-2 font-medium w-32 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {appUsersLoading ? (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                    ) : appUsers.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No users yet</td></tr>
                    ) : appUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-3 py-2">
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
                        <td className="px-3 py-2">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" : "bg-gray-500"}`} />
                            {u.isActive ? "Active" : "Revoked"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1">
                            {/* Login As */}
                            {u.email !== currentUser?.email && u.isActive && (
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
                                      toast({ title: "Could not switch user", description: (data as any).error ?? "Try again.", variant: "destructive" });
                                      return;
                                    }
                                    window.location.href = "/#/dashboard";
                                    setTimeout(() => window.location.reload(), 50);
                                  } catch {
                                    toast({ title: "Network error", description: "Could not start impersonation.", variant: "destructive" });
                                  }
                                }}
                              >
                                <UserCog className="w-3.5 h-3.5 mr-1" />
                                Login as
                              </Button>
                            )}
                            {/* Edit */}
                            {canModifyUser(u) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                                title="Edit user"
                                onClick={() => openEditDialog(u)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            {/* Delete */}
                            {canModifyUser(u) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                title="Revoke access"
                                onClick={() => setRemoveId(u.id)}
                              >
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
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="font-semibold text-foreground">CRM Team Members</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Sales reps, managers and their roles</p>
                </div>
              </div>
              {isAdmin && (
                <Button
                  size="sm"
                  className="rounded-xl bg-gradient-to-r from-primary to-accent border-0 text-foreground hover:opacity-90"
                  onClick={() => setAddMemberOpen(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr className="divide-x divide-border">
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Role</th>
                    <th className="px-3 py-2 font-medium">Team</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    {isAdmin && <th className="px-3 py-2 font-medium w-28 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr><td colSpan={isAdmin ? 5 : 4} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                  ) : data?.data?.map(user => (
                    <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-3 py-2">
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
                      <td className="px-3 py-2">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{user.team || '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.isActive ? 'text-green-600' : 'text-muted-foreground'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-gray-500'}`} />
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
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
                                      toast({ title: "Could not switch user", description: (data as any).error ?? "Try again.", variant: "destructive" });
                                      return;
                                    }
                                    window.location.href = "/#/dashboard";
                                    setTimeout(() => window.location.reload(), 50);
                                  } catch {
                                    toast({ title: "Network error", description: "Could not start impersonation.", variant: "destructive" });
                                  }
                                }}
                              >
                                <UserCog className="w-3.5 h-3.5 mr-1" />
                                Login as
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Add Member Dialog */}
          <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="member-name">Full Name</Label>
                  <Input id="member-name" placeholder="Jane Smith" value={memberName} onChange={e => setMemberName(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="member-email">Email <span className="text-destructive">*</span></Label>
                  <Input id="member-email" type="email" placeholder="jane@company.com" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="member-password">Password <span className="text-destructive">*</span></Label>
                  <Input id="member-password" type="password" placeholder="Temporary password" value={memberPassword} onChange={e => setMemberPassword(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="member-role">Role</Label>
                  <Select value={memberRole} onValueChange={setMemberRole}>
                    <SelectTrigger id="member-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_ROLES.filter(r => isSuperAdmin || r.value !== "super_admin").map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="member-team">Team</Label>
                  <Input id="member-team" placeholder="e.g. North America Sales" value={memberTeam} onChange={e => setMemberTeam(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddMemberOpen(false)}>Cancel</Button>
                <Button onClick={handleAddMember} disabled={memberSaving || !memberEmail || !memberPassword}>
                  {memberSaving ? "Adding..." : "Add Member"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>}

        {/* Mail Settings Tab */}
        {activeTab === "mail" && !isAdmin && (
          <Card className="glass-panel border-border p-12 text-center text-muted-foreground">
            <Shield className="w-10 h-8 mx-auto mb-3 opacity-30" />
            <p>Mail settings are restricted to administrators.</p>
          </Card>
        )}

        {activeTab === "mail" && isAdmin && (
          <div className="flex flex-col gap-3">
            {/* Sync status banner */}
            <Card className="glass-panel border-border">
              <div className="p-5 flex flex-wrap items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-8 rounded-xl flex items-center justify-center",
                    mailSettings.lastSyncStatus === "ok" ? "bg-green-500/10" :
                    mailSettings.lastSyncStatus === "error" ? "bg-red-500/10" : "bg-muted"
                  )}>
                    {mailSettings.lastSyncStatus === "ok" ? <CheckCircle className="w-5 h-5 text-green-500" /> :
                     mailSettings.lastSyncStatus === "error" ? <XCircle className="w-5 h-5 text-red-500" /> :
                     <Clock className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {mailSettings.lastSyncStatus === "ok" ? "Last sync successful" :
                       mailSettings.lastSyncStatus === "error" ? "Last sync failed" : "No sync yet"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {mailSettings.lastSyncAt
                        ? `${new Date(mailSettings.lastSyncAt).toLocaleString()} · ${mailSettings.emailsProcessed ?? 0} emails processed`
                        : mailSettings.lastSyncMessage ?? "Configure IMAP below to begin syncing"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleManualSync} disabled={mailSyncing} className="h-8">
                    {mailSyncing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                    Sync Now
                  </Button>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* IMAP */}
              <Card className="glass-panel border-border">
                <div className="p-5 border-b border-border flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground text-sm">IMAP (Incoming)</h3>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Host</Label>
                      <Input value={mailSettings.imapHost} onChange={e => setMail("imapHost", e.target.value)} className="h-8 text-sm" placeholder="mail.example.com" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Port</Label>
                      <Input type="number" value={mailSettings.imapPort} onChange={e => setMail("imapPort", parseInt(e.target.value))} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Username</Label>
                    <Input value={mailSettings.imapUser} onChange={e => setMail("imapUser", e.target.value)} className="h-8 text-sm" placeholder="user@example.com" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Password</Label>
                    <Input type="password" value={mailSettings.imapPassword} onChange={e => setMail("imapPassword", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">SSL/TLS</Label>
                    <Switch checked={mailSettings.imapSecure} onCheckedChange={v => setMail("imapSecure", v)} />
                  </div>
                </div>
              </Card>

              {/* SMTP */}
              <Card className="glass-panel border-border">
                <div className="p-5 border-b border-border flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground text-sm">SMTP (Outgoing)</h3>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Host</Label>
                      <Input value={mailSettings.smtpHost} onChange={e => setMail("smtpHost", e.target.value)} className="h-8 text-sm" placeholder="mail.example.com" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Port</Label>
                      <Input type="number" value={mailSettings.smtpPort} onChange={e => setMail("smtpPort", parseInt(e.target.value))} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Username</Label>
                    <Input value={mailSettings.smtpUser} onChange={e => setMail("smtpUser", e.target.value)} className="h-8 text-sm" placeholder="user@example.com" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Password</Label>
                    <Input type="password" value={mailSettings.smtpPassword} onChange={e => setMail("smtpPassword", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">From Name</Label>
                    <Input value={mailSettings.smtpFromName} onChange={e => setMail("smtpFromName", e.target.value)} className="h-8 text-sm" placeholder="ArborMind CRM" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">SSL/TLS</Label>
                    <Switch checked={mailSettings.smtpSecure} onCheckedChange={v => setMail("smtpSecure", v)} />
                  </div>
                </div>
              </Card>
            </div>

            {/* Sync settings */}
            <Card className="glass-panel border-border">
              <div className="p-5 border-b border-border flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Sync Settings</h3>
              </div>
              <div className="p-5 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <Switch checked={mailSettings.syncEnabled} onCheckedChange={v => setMail("syncEnabled", v)} />
                  <Label className="text-sm">Enable automatic sync</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-xs whitespace-nowrap">Interval (minutes)</Label>
                  <Input
                    type="number"
                    value={mailSettings.syncIntervalMinutes}
                    onChange={e => setMail("syncIntervalMinutes", parseInt(e.target.value))}
                    className="h-8 text-sm w-24"
                    min={5}
                    max={1440}
                    disabled={!mailSettings.syncEnabled}
                  />
                </div>
              </div>
            </Card>

            {/* Test result */}
            {testResult && (
              <div className={cn(
                "flex items-center gap-3 p-4 rounded-xl border text-sm",
                testResult.ok ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400" : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400"
              )}>
                {testResult.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                {testResult.msg}
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={handleSaveMailSettings} disabled={mailSaving} className="bg-primary text-white">
                {mailSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Settings
              </Button>
              <Button variant="outline" onClick={handleTestConnection} disabled={mailTesting}>
                {mailTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                Test IMAP Connection
              </Button>
            </div>
          </div>
        )}

        {/* ── Add User Dialog ── */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Add User Access
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-1.5">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && void handleAddUser()}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Name</Label>
                <Input
                  placeholder="Full name (optional)"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddUser} disabled={saving || !newEmail}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Grant Access
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Edit User Dialog ── */}
        <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-primary" />
                Edit User
              </DialogTitle>
            </DialogHeader>
            {editUser && (
              <div className="flex flex-col gap-4 py-2">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Avatar className="w-9 h-9 border border-border">
                    {editUser.avatarUrl && <img src={editUser.avatarUrl} alt={editUser.name ?? editUser.email} />}
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {(editUser.name ?? editUser.email).substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium text-foreground">{editUser.email}</div>
                    <div className="text-xs text-muted-foreground">Member since {new Date(editUser.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Name</Label>
                  <Input
                    placeholder="Full name"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Role</Label>
                  <Select value={editRole} onValueChange={setEditRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <Label className="text-sm">Active Status</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Inactive users cannot sign in</p>
                  </div>
                  <Switch checked={editActive} onCheckedChange={setEditActive} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button onClick={handleEditUser} disabled={editSaving}>
                {editSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Remove Confirmation ── */}
        <AlertDialog open={removeId !== null} onOpenChange={(open) => { if (!open) setRemoveId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke Access</AlertDialogTitle>
              <AlertDialogDescription>
                This will prevent the user from signing in. You can re-grant access later by adding them again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => removeId !== null && void handleRemoveUser(removeId)}
              >
                Revoke Access
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
