import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, History, Lock, Database } from "lucide-react";
import { format } from "date-fns";

type AccessLevel = "none" | "view" | "read_only" | "edit";

interface Screen { key: string; name: string; category: string; sortOrder: number; }
interface Role { key: string; label: string; sortOrder: number; }
interface MatrixResponse {
  screens: Screen[];
  roles: Role[];
  matrix: Record<string, Record<string, AccessLevel>>;
}
interface AuditRow {
  id: number;
  screenKey: string;
  roleKey: string;
  previousLevel: string | null;
  newLevel: string;
  changedByName: string | null;
  createdAt: string;
}

type RecordPerms = { canView: boolean; canReadOnly: boolean; canEdit: boolean; canCreate: boolean; canDelete: boolean };
const PERM_COLS: Array<{ key: keyof RecordPerms; label: string }> = [
  { key: "canView", label: "View" },
  { key: "canReadOnly", label: "Read-Only" },
  { key: "canEdit", label: "Edit" },
  { key: "canCreate", label: "Create" },
  { key: "canDelete", label: "Delete" },
];
interface RecordType { key: string; name: string; sortOrder: number }
interface RecordMatrixResponse {
  recordTypes: RecordType[];
  roles: Role[];
  matrix: Record<string, Record<string, RecordPerms>>;
}
interface RecordAuditRow {
  id: number;
  recordTypeKey: string;
  roleKey: string;
  previousPermissions: RecordPerms | null;
  newPermissions: RecordPerms;
  changedByName: string | null;
  createdAt: string;
}

const LEVEL_LABEL: Record<AccessLevel, string> = {
  none: "No Access",
  view: "View Only",
  read_only: "Read-Only",
  edit: "Edit",
};

const LEVEL_BADGE: Record<AccessLevel, string> = {
  none: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
  view: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700",
  read_only: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700",
  edit: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700",
};

export default function AccessControlPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const isAdmin = user?.role === "admin";

  const { data, isLoading } = useQuery<MatrixResponse>({
    queryKey: ["access-control", "matrix"],
    queryFn: async () => {
      const r = await fetch("/api/admin/access-control/screens", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load access matrix");
      return r.json();
    },
    enabled: isAdmin,
  });

  const { data: audit } = useQuery<{ data: AuditRow[] }>({
    queryKey: ["access-control", "audit"],
    queryFn: async () => {
      const r = await fetch("/api/admin/access-control/audit?limit=200", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load audit log");
      return r.json();
    },
    enabled: isAdmin,
  });

  const { data: recordData, isLoading: recordLoading } = useQuery<RecordMatrixResponse>({
    queryKey: ["record-access", "matrix"],
    queryFn: async () => {
      const r = await fetch("/api/admin/record-access/matrix", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load record access matrix");
      return r.json();
    },
    enabled: isAdmin,
  });

  const { data: recordAudit } = useQuery<{ data: RecordAuditRow[] }>({
    queryKey: ["record-access", "audit"],
    queryFn: async () => {
      const r = await fetch("/api/admin/record-access/audit?limit=200", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load record audit log");
      return r.json();
    },
    enabled: isAdmin,
  });

  const recordMutate = useMutation({
    mutationFn: async (input: { recordTypeKey: string; roleKey: string; column: keyof RecordPerms; value: boolean }) => {
      const r = await fetch(
        `/api/admin/record-access/types/${encodeURIComponent(input.recordTypeKey)}/roles/${encodeURIComponent(input.roleKey)}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [input.column]: input.value }),
        }
      );
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || "Save failed");
      }
      return r.json();
    },
    onMutate: ({ recordTypeKey, roleKey, column }) => {
      setPending((p) => ({ ...p, [`r:${recordTypeKey}:${roleKey}:${column}`]: true }));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["record-access"] });
      toast({ title: "Record access updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
    onSettled: (_d, _e, vars) => {
      setPending((p) => {
        const next = { ...p };
        delete next[`r:${vars.recordTypeKey}:${vars.roleKey}:${vars.column}`];
        return next;
      });
    },
  });

  const mutate = useMutation({
    mutationFn: async (input: { screenKey: string; roleKey: string; accessLevel: AccessLevel }) => {
      const r = await fetch(
        `/api/admin/access-control/screens/${encodeURIComponent(input.screenKey)}/roles/${encodeURIComponent(input.roleKey)}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessLevel: input.accessLevel }),
        }
      );
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || "Save failed");
      }
      return r.json();
    },
    onMutate: ({ screenKey, roleKey }) => {
      setPending((p) => ({ ...p, [`${screenKey}:${roleKey}`]: true }));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["access-control"] });
      toast({ title: "Access updated", description: "The new access level is now in effect." });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
    onSettled: (_d, _e, vars) => {
      setPending((p) => {
        const next = { ...p };
        delete next[`${vars.screenKey}:${vars.roleKey}`];
        return next;
      });
    },
  });

  if (!isAdmin) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto mt-20 text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Restricted Area</h2>
          <p className="text-muted-foreground text-sm">
            The Access Control Configuration Screen is visible to System Administrators only.
          </p>
        </div>
      </Layout>
    );
  }

  const grouped = (data?.screens ?? []).reduce<Record<string, Screen[]>>((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {});

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Access Control</h1>
            <p className="text-sm text-muted-foreground">
              Define which roles can view, read, or edit each screen. Administrator role always has full edit access.
            </p>
          </div>
        </div>

        <Tabs defaultValue="matrix" className="space-y-4">
          <TabsList>
            <TabsTrigger value="matrix">
              <Shield className="w-4 h-4 mr-1.5" /> Screen Access
            </TabsTrigger>
            <TabsTrigger value="records">
              <Database className="w-4 h-4 mr-1.5" /> Record Access
            </TabsTrigger>
            <TabsTrigger value="audit">
              <History className="w-4 h-4 mr-1.5" /> Audit Trail
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matrix">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Screen × Role Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
                ) : !data ? (
                  <div className="text-sm text-destructive py-8 text-center">Failed to load matrix.</div>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-b border-blue-800 divide-x divide-blue-500/40">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap">Screen</th>
                          {data.roles.map((r) => (
                            <th key={r.key} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap">
                              {r.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {Object.entries(grouped).map(([category, screens]) => (
                          <React.Fragment key={category}>
                            <tr className="bg-muted/40">
                              <td colSpan={data.roles.length + 1} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {category}
                              </td>
                            </tr>
                            {screens.map((s) => (
                              <tr key={s.key} className="hover:bg-muted/20">
                                <td className="px-4 py-2 font-medium text-foreground whitespace-nowrap">{s.name}</td>
                                {data.roles.map((r) => {
                                  const lvl = data.matrix[s.key]?.[r.key] ?? "none";
                                  const isLocked = r.key === "admin";
                                  const key = `${s.key}:${r.key}`;
                                  return (
                                    <td key={r.key} className="px-3 py-2">
                                      <select
                                        disabled={isLocked || pending[key]}
                                        value={lvl}
                                        onChange={(e) =>
                                          mutate.mutate({
                                            screenKey: s.key,
                                            roleKey: r.key,
                                            accessLevel: e.target.value as AccessLevel,
                                          })
                                        }
                                        className="text-xs h-8 rounded-md border border-border bg-background text-foreground px-2 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      >
                                        <option value="none">No Access</option>
                                        <option value="view">View Only</option>
                                        <option value="read_only">Read-Only</option>
                                        <option value="edit">Edit</option>
                                      </select>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {(["none", "view", "read_only", "edit"] as AccessLevel[]).map((l) => (
                    <Badge key={l} variant="outline" className={LEVEL_BADGE[l]}>{LEVEL_LABEL[l]}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Record Type × Role Permissions</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Control which roles can View, Read-Only, Edit, Create, or Delete each record type. Administrator always has full access.
                </p>
              </CardHeader>
              <CardContent>
                {recordLoading ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
                ) : !recordData ? (
                  <div className="text-sm text-destructive py-8 text-center">Failed to load record access matrix.</div>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-700 dark:to-indigo-800 border-b border-indigo-800 divide-x divide-indigo-500/40">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap" rowSpan={2}>Record Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap" rowSpan={2}>Role</th>
                          {PERM_COLS.map((c) => (
                            <th key={c.key} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap">{c.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {recordData.recordTypes.map((rt) => (
                          <React.Fragment key={rt.key}>
                            {recordData.roles.map((role, idx) => {
                              const perms = recordData.matrix[rt.key]?.[role.key];
                              const isAdmin = role.key === "admin";
                              return (
                                <tr key={`${rt.key}:${role.key}`} className="hover:bg-muted/20">
                                  {idx === 0 ? (
                                    <td className="px-4 py-2 font-medium text-foreground whitespace-nowrap align-top" rowSpan={recordData.roles.length}>
                                      {rt.name}
                                    </td>
                                  ) : null}
                                  <td className="px-4 py-2 text-foreground whitespace-nowrap">{role.label}</td>
                                  {PERM_COLS.map((c) => {
                                    const checked = perms?.[c.key] ?? false;
                                    const pendKey = `r:${rt.key}:${role.key}:${c.key}`;
                                    return (
                                      <td key={c.key} className="px-3 py-2 text-center">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          disabled={isAdmin || pending[pendKey]}
                                          onChange={(e) =>
                                            recordMutate.mutate({
                                              recordTypeKey: rt.key,
                                              roleKey: role.key,
                                              column: c.key,
                                              value: e.target.checked,
                                            })
                                          }
                                          className="w-4 h-4 rounded border-border accent-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                          aria-label={`${c.label} ${rt.name} for ${role.label}`}
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {recordAudit?.data?.length ? (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Recent Record Access Changes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">When</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Record Type</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Changes</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Changed By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {recordAudit.data.map((row) => {
                          const diffs: string[] = [];
                          for (const c of PERM_COLS) {
                            const prev = row.previousPermissions?.[c.key] ?? false;
                            const next = row.newPermissions[c.key];
                            if (prev !== next) diffs.push(`${c.label}: ${prev ? "✓" : "✗"} → ${next ? "✓" : "✗"}`);
                          }
                          return (
                            <tr key={row.id}>
                              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(row.createdAt), "dd MMM yyyy HH:mm")}</td>
                              <td className="px-3 py-2 text-foreground">{row.recordTypeKey}</td>
                              <td className="px-3 py-2 text-foreground">{row.roleKey}</td>
                              <td className="px-3 py-2 text-foreground text-xs">{diffs.join(", ") || "—"}</td>
                              <td className="px-3 py-2 text-foreground">{row.changedByName ?? "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Configuration Changes</CardTitle>
              </CardHeader>
              <CardContent>
                {!audit?.data?.length ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">No changes recorded yet.</div>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">When</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Screen</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">From → To</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Changed By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {audit.data.map((row) => {
                          const prev = (row.previousLevel ?? "none") as AccessLevel;
                          const next = row.newLevel as AccessLevel;
                          return (
                            <tr key={row.id}>
                              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                                {format(new Date(row.createdAt), "dd MMM yyyy HH:mm")}
                              </td>
                              <td className="px-3 py-2 text-foreground">{row.screenKey}</td>
                              <td className="px-3 py-2 text-foreground">{row.roleKey}</td>
                              <td className="px-3 py-2">
                                <span className="inline-flex items-center gap-1.5">
                                  <Badge variant="outline" className={`text-xs ${LEVEL_BADGE[prev] ?? ""}`}>{LEVEL_LABEL[prev] ?? prev}</Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge variant="outline" className={`text-xs ${LEVEL_BADGE[next] ?? ""}`}>{LEVEL_LABEL[next] ?? next}</Badge>
                                </span>
                              </td>
                              <td className="px-3 py-2 text-foreground">{row.changedByName ?? "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
