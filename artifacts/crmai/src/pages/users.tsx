import React, { useState, useEffect } from "react";
import { useListUsers } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Settings, Shield, UserPlus, Trash2, Loader2, Users as UsersIcon, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { DataImport } from "@/components/data-import";
import { cn } from "@/lib/utils";

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
  const [activeTab, setActiveTab] = useState<"team" | "import">("team");

  const fetchAppUsers = async () => {
    if (!isAdmin) return;
    setAppUsersLoading(true);
    try {
      const res = await fetch("/api/auth/users", { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as { users: AppUser[] };
        setAppUsers(data.users);
      }
    } finally {
      setAppUsersLoading(false);
    }
  };

  useEffect(() => { void fetchAppUsers(); }, [isAdmin]);

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
        setNewEmail("");
        setNewName("");
        setNewRole("sales");
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

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Team & Data</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage team members, access control, and bulk data imports.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit border border-white/10">
          {([
            { id: "team", label: "Team Settings", icon: UsersIcon },
            { id: "import", label: "Data Import", icon: Upload },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Data Import Tab */}
        {activeTab === "import" && (
          <DataImport />
        )}

        {/* Team Settings Tab */}
        {activeTab === "team" && <>

        {/* App Access Management - Admin Only */}
        {isAdmin && (
          <Card className="glass-panel border-white/5">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                <div>
                  <h2 className="font-semibold text-white">App Access Control</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage who can sign in with Google</p>
                </div>
              </div>
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="rounded-xl bg-gradient-to-r from-primary to-accent border-0 text-white hover:opacity-90"
                size="sm"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Access
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-medium">User</th>
                    <th className="px-6 py-4 font-medium">Role</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Last Login</th>
                    <th className="px-6 py-4 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {appUsersLoading ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                  ) : appUsers.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No users yet</td></tr>
                  ) : appUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 border border-white/10">
                            {u.avatarUrl && <img src={u.avatarUrl} alt={u.name ?? u.email} />}
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">
                              {(u.name ?? u.email).substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-white">{u.name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={`capitalize ${u.role === "admin" ? "border-accent/50 text-accent bg-accent/10" : "border-white/10 text-muted-foreground"}`}>
                          {u.role === "admin" && <Shield className="w-3 h-3 mr-1" />}
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.isActive ? "text-green-400" : "text-muted-foreground"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" : "bg-gray-500"}`} />
                          {u.isActive ? "Active" : "Revoked"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-6 py-4">
                        {u.email !== currentUser?.email && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-400"
                            onClick={() => setRemoveId(u.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* CRM Team Members */}
        <Card className="glass-panel border-white/5">
          <div className="p-6 border-b border-white/5 flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-semibold text-white">CRM Team Members</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Sales reps, managers and their roles</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Team</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data?.data?.map(user => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 border border-white/10">
                          <AvatarImage src={user.avatarUrl || ''} />
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-white">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`capitalize ${user.role === 'admin' ? 'border-accent/50 text-accent bg-accent/10' : 'border-white/10 text-muted-foreground bg-black/40'}`}>
                        {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{user.team || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.isActive ? 'text-green-400' : 'text-muted-foreground'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-gray-500'}`} />
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        </>}
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
              <Input
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                type="email"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Display name</label>
              <Input
                placeholder="Optional"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Role</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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

      {/* Remove Confirmation */}
      <AlertDialog open={removeId !== null} onOpenChange={(o) => { if (!o) setRemoveId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke access?</AlertDialogTitle>
            <AlertDialogDescription>
              This user will no longer be able to sign in. You can re-grant access at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => removeId && void handleRemoveUser(removeId)}>
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
