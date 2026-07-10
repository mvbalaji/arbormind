import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { Crown, Plus, Pencil, Check, X, Loader2, UserPlus, ShieldAlert } from "lucide-react";

interface OrgAdmin {
  id: number;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
}

interface Organization {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
  admins: OrgAdmin[];
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

function OrganizationsPageContent() {
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<Organization[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createAdminEmail, setCreateAdminEmail] = useState("");
  const [createAdminName, setCreateAdminName] = useState("");
  const [creating, setCreating] = useState(false);

  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  const [addAdminOrgId, setAddAdminOrgId] = useState<number | null>(null);
  const [addAdminEmail, setAddAdminEmail] = useState("");
  const [addAdminName, setAddAdminName] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ organizations: Organization[] }>("/api/admin/organizations");
      setOrgs(data.organizations);
    } catch (err) {
      toast({ title: "Could not load organizations", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleCreate = async () => {
    if (!createName.trim()) {
      toast({ title: "Organization name is required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await apiJson("/api/admin/organizations", {
        method: "POST",
        body: JSON.stringify({
          name: createName.trim(),
          adminEmail: createAdminEmail.trim() || undefined,
          adminName: createAdminName.trim() || undefined,
        }),
      });
      toast({ title: "Organization created" });
      setCreateOpen(false);
      setCreateName(""); setCreateAdminEmail(""); setCreateAdminName("");
      await load();
    } catch (err) {
      toast({ title: "Failed to create organization", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const startRename = (org: Organization) => {
    setRenamingId(org.id);
    setRenameValue(org.name);
  };

  const handleRename = async (id: number) => {
    if (!renameValue.trim()) return;
    setRenaming(true);
    try {
      await apiJson(`/api/admin/organizations/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      toast({ title: "Organization renamed" });
      setRenamingId(null);
      await load();
    } catch (err) {
      toast({ title: "Rename failed", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setRenaming(false);
    }
  };

  const handleAddAdmin = async (orgId: number) => {
    if (!addAdminEmail.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    setAddingAdmin(true);
    try {
      await apiJson(`/api/admin/organizations/${orgId}/admins`, {
        method: "POST",
        body: JSON.stringify({ email: addAdminEmail.trim(), name: addAdminName.trim() || undefined }),
      });
      toast({ title: "Admin added" });
      setAddAdminOrgId(null);
      setAddAdminEmail(""); setAddAdminName("");
      await load();
    } catch (err) {
      toast({ title: "Failed to add admin", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setAddingAdmin(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight flex items-center gap-2">
            <Crown className="w-7 h-7 text-purple-600" />
            Organizations
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every tenant on this platform, and their administrators. Super Admin only.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="rounded-xl bg-gradient-to-r from-primary to-accent border-0 text-foreground hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Organization
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : !orgs || orgs.length === 0 ? (
        <Card className="glass-panel border-border p-8 text-center text-sm text-muted-foreground">
          No organizations yet.
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {orgs.map((org) => (
            <Card key={org.id} className="glass-panel border-border">
              <div className="p-5 border-b border-border flex items-center justify-between gap-4 flex-wrap">
                {renamingId === org.id ? (
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="max-w-xs"
                      autoFocus
                      disabled={renaming}
                    />
                    <Button size="icon" variant="ghost" onClick={() => handleRename(org.id)} disabled={renaming}>
                      {renaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-green-600" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setRenamingId(null)} disabled={renaming}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="font-semibold text-foreground">{org.name}</div>
                      <div className="text-xs text-muted-foreground">/{org.slug} · created {new Date(org.createdAt).toLocaleDateString()}</div>
                    </div>
                    <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => startRename(org)} title="Rename">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setAddAdminOrgId(addAdminOrgId === org.id ? null : org.id); setAddAdminEmail(""); setAddAdminName(""); }}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Admin
                </Button>
              </div>

              {addAdminOrgId === org.id && (
                <div className="p-4 bg-muted/30 border-b border-border flex items-end gap-2 flex-wrap">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Email</Label>
                    <Input value={addAdminEmail} onChange={(e) => setAddAdminEmail(e.target.value)} placeholder="admin@company.com" className="w-56" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Name (optional)</Label>
                    <Input value={addAdminName} onChange={(e) => setAddAdminName(e.target.value)} placeholder="Full name" className="w-48" />
                  </div>
                  <Button size="sm" onClick={() => handleAddAdmin(org.id)} disabled={addingAdmin}>
                    {addingAdmin ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddAdminOrgId(null)}>Cancel</Button>
                </div>
              )}

              <div className="p-5">
                <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Administrators</div>
                {org.admins.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No admins yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {org.admins.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-foreground truncate">{a.name ?? a.email}</span>
                          <span className="text-muted-foreground truncate">{a.email}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className={a.role === "super_admin" ? "border-purple-400/60 text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-950" : "border-accent/50 text-primary bg-accent/10"}>
                            {a.role === "super_admin" && <Crown className="w-3 h-3 mr-1" />}
                            {a.role === "super_admin" ? "Super Admin" : "Admin"}
                          </Badge>
                          {!a.isActive && <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Organization</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-org-name">Organization name</Label>
              <Input id="new-org-name" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Acme Corp" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-org-admin-email">First admin's email (optional)</Label>
              <Input id="new-org-admin-email" value={createAdminEmail} onChange={(e) => setCreateAdminEmail(e.target.value)} placeholder="admin@acme.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-org-admin-name">Admin's name (optional)</Label>
              <Input id="new-org-admin-name" value={createAdminName} onChange={(e) => setCreateAdminName(e.target.value)} placeholder="Jane Doe" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-gradient-to-r from-primary to-accent border-0 text-foreground">
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OrganizationsPage() {
  const { user } = useAuth();
  return (
    <Layout>
      {user?.role !== "super_admin" ? (
        <Card className="glass-panel border-border p-8 flex flex-col items-center gap-3 text-center max-w-md mx-auto mt-12">
          <ShieldAlert className="w-8 h-8 text-muted-foreground" />
          <div>
            <h2 className="font-semibold text-foreground">Super Admin only</h2>
            <p className="text-sm text-muted-foreground mt-1">Only Super Administrators can manage organizations.</p>
          </div>
        </Card>
      ) : (
        <OrganizationsPageContent />
      )}
    </Layout>
  );
}
