import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { Building2, Loader2, Save } from "lucide-react";

interface Organization {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export function OrganizationSettingsInline() {
  const { user, refetch } = useAuth();
  const { toast } = useToast();
  const isOrgAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [org, setOrg] = useState<Organization | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/organizations/current", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load organization");
        const data = await res.json() as { organization: Organization };
        if (!cancelled) {
          setOrg(data.organization);
          setName(data.organization.name);
        }
      } catch {
        if (!cancelled) toast({ title: "Could not load organization", variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [toast]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: "Organization name can't be empty", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/organizations/current", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Save failed");
      }
      const data = await res.json() as { organization: Organization };
      setOrg(data.organization);
      setName(data.organization.name);
      await refetch();
      toast({ title: "Organization name updated" });
    } catch (err) {
      toast({ title: "Update failed", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="glass-panel border-border max-w-xl">
      <div className="p-6 border-b border-border flex items-center gap-2">
        <Building2 className="w-5 h-5 text-primary" />
        <div>
          <h2 className="font-semibold text-foreground">Organization</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isOrgAdmin ? "Rename your organization — this appears next to the logo on every page." : "Your organization details."}
          </p>
        </div>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : !org ? (
          <p className="text-sm text-muted-foreground">Could not load organization details.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="org-name">Organization name</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isOrgAdmin || saving}
                maxLength={100}
              />
            </div>
            {isOrgAdmin && (
              <div>
                <Button
                  onClick={handleSave}
                  disabled={saving || name.trim() === org.name}
                  size="sm"
                  className="rounded-xl bg-gradient-to-r from-primary to-accent border-0 text-foreground hover:opacity-90"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
