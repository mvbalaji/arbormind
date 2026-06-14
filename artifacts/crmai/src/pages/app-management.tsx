import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, FileText, ShoppingCart, FileSignature,
  CheckCircle2, Lock, Layers, Zap, RefreshCw,
} from "lucide-react";

interface AppModule {
  key: string;
  label: string;
  description: string;
  isEnabled: boolean;
  isCore: boolean;
  sortOrder: number;
}

const MODULE_META: Record<string, {
  icon: React.ElementType;
  color: string;
  screens: string[];
  features: string[];
}> = {
  crm_sales: {
    icon: LayoutDashboard,
    color: "text-blue-600 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800",
    screens: ["Dashboard", "Leads", "Contacts", "Accounts", "Opportunities", "Activities", "Campaigns", "Reports", "AI Assistant"],
    features: ["Lead capture & nurturing", "Contact & account management", "Pipeline & forecasting", "Activity tracking", "Campaign management", "AI-powered insights"],
  },
  quotes: {
    icon: FileText,
    color: "text-amber-600 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800",
    screens: ["Quotes"],
    features: ["Quote creation & templating", "Line-item pricing", "Approval workflows", "PDF generation & delivery"],
  },
  orders: {
    icon: ShoppingCart,
    color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800",
    screens: ["Orders"],
    features: ["Order placement & tracking", "Fulfilment status", "Quote-to-order conversion", "Delivery management"],
  },
  contracts: {
    icon: FileSignature,
    color: "text-purple-600 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800",
    screens: ["Contracts"],
    features: ["Full lifecycle: Draft → Review → Active → Expired", "Automated expiry notifications", "E-signature support", "Renewal workflows"],
  },
};

export function AppManagementInline() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [toggling, setToggling] = useState<string | null>(null);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const { data, isLoading } = useQuery<{ modules: AppModule[] }>({
    queryKey: ["app-modules"],
    queryFn: async () => {
      const r = await fetch("/api/admin/app-modules", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load modules");
      return r.json();
    },
    enabled: isAdmin,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ key, isEnabled }: { key: string; isEnabled: boolean }) => {
      const r = await fetch(`/api/admin/app-modules/${encodeURIComponent(key)}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({})) as { error?: string };
        throw new Error(e.error ?? "Update failed");
      }
      return r.json() as Promise<{ module: AppModule }>;
    },
    onMutate: ({ key }) => setToggling(key),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ["app-modules"] });
      // Trigger a refetch of auth/me so nav filters update immediately
      void fetch("/api/auth/me", { credentials: "include" })
        .then(r => r.json())
        .then(() => window.dispatchEvent(new Event("focus")));
      toast({
        title: vars.isEnabled ? "Module enabled" : "Module disabled",
        description: `${vars.key.replace("_", " ")} has been ${vars.isEnabled ? "activated" : "deactivated"}.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
    onSettled: () => setToggling(null),
  });

  if (!isAdmin) return null;

  const modules = data?.modules ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Layers className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Application Management</h2>
          <p className="text-sm text-muted-foreground">
            Enable or disable application modules. Disabled modules hide their screens and workflows from all users.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {modules.map((mod) => {
            const meta = MODULE_META[mod.key];
            if (!meta) return null;
            const Icon = meta.icon;
            const isToggling = toggling === mod.key;

            return (
              <Card
                key={mod.key}
                className={`glass-panel border-2 transition-all duration-200 ${
                  mod.isEnabled
                    ? "border-border shadow-sm"
                    : "border-border/50 opacity-70"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${meta.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {mod.label}
                          {mod.isCore && (
                            <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 bg-blue-50 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300">
                              <Lock className="w-2.5 h-2.5 mr-1" />
                              Core
                            </Badge>
                          )}
                          {mod.isEnabled ? (
                            <Badge variant="outline" className="text-xs border-green-300 text-green-600 bg-green-50 dark:bg-green-950 dark:border-green-700 dark:text-green-300">
                              <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-gray-300 text-gray-500 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
                              Disabled
                            </Badge>
                          )}
                        </CardTitle>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isToggling && <RefreshCw className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
                      <Switch
                        checked={mod.isEnabled}
                        disabled={mod.isCore || isToggling}
                        onCheckedChange={(val) =>
                          toggleMutation.mutate({ key: mod.key, isEnabled: val })
                        }
                        title={mod.isCore ? "Core modules cannot be disabled" : undefined}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    {mod.description}
                  </p>

                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-1">
                      {meta.screens.map((s) => (
                        <span
                          key={s}
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
                            mod.isEnabled
                              ? "bg-muted/60 text-foreground border-border"
                              : "bg-muted/20 text-muted-foreground border-border/40 line-through"
                          }`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    {mod.key === "contracts" && mod.isEnabled && (
                      <div className="mt-2 p-2 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex items-start gap-2">
                        <Zap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-purple-700 dark:text-purple-300">
                          <strong>Full Contract Lifecycle active:</strong> Draft → Under Review → Active → Expired → Terminated
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="p-4 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">How it works</p>
        <p>• <strong>Enabled</strong> modules are visible in the navigation and accessible based on each user's role permissions.</p>
        <p>• <strong>Disabled</strong> modules hide their screens from all users — data is preserved and the module can be re-enabled at any time.</p>
        <p>• <strong>Core</strong> modules (CRM Sales) are always active and cannot be disabled.</p>
        <p>• Enabling <strong>Contract Management</strong> automatically activates the full contract lifecycle workflow.</p>
      </div>
    </div>
  );
}
