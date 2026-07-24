import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/context/currency";
import { useCpqEnabled } from "@/context/cpq-feature";
import { cn } from "@/lib/utils";
import {
  ChevronRight, ChevronLeft, CheckCircle2, Package,
  ShoppingCart, GitBranch, Lock, Info, AlertTriangle, Star, Loader2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface GuidedOption { id: string; label: string; icon: string; hint: string; }
interface GuidedStep {
  id: string; label: string; question: string; hint: string;
  type: "single" | "multi"; options: GuidedOption[];
}
interface GuidedFlow {
  id: string; name: string; icon: string; description: string; steps: GuidedStep[];
}
interface GuidedSellingConfig { flows: GuidedFlow[]; }

// ── Helpers ───────────────────────────────────────────────────────────────────
function hasAnswer(answers: Record<string, any>, stepId: string, optId: string): boolean {
  const v = answers[stepId];
  return Array.isArray(v) ? v.includes(optId) : v === optId;
}

// ── Contextual insights ───────────────────────────────────────────────────────
function buildInsights(answers: Record<string, any>, steps: GuidedStep[], flowId: string): string[] {
  const tips: string[] = [];
  const has = (s: string, o: string) => hasAnswer(answers, s, o);

  if (flowId === "steel") {
    if (has("sector", "automotive") && has("product", "flat_cr"))
      tips.push("Automotive CRC: specify surface quality class (A/B/C), oiling and coil OD/ID to avoid forming issues.");
    if (has("sector", "oil_gas") && has("product", "tube_pipe"))
      tips.push("For Oil & Gas pipe confirm PSL1 vs PSL2 (API 5L) and whether seamless or ERW is acceptable upstream of the weld seam inspection clause.");
    if (has("spec", "certification"))
      tips.push("3.2 certificates require a notified body witness — add 3–5 working days to lead time and confirm the NB is on the customer's approved list.");
    if (has("spec", "tolerance") && !has("services", "cut_length"))
      tips.push("Tight tolerance on length usually requires precision cut-to-length — consider adding this to the service scope.");
    if (has("services", "heat_treat") && has("product", "stainless"))
      tips.push("Stainless heat treatment (solution anneal) requires controlled atmosphere furnace — confirm capability before committing.");
    if (has("sector", "aerospace"))
      tips.push("Aerospace orders typically require NADCAP/AS9100 supply chain traceability. Confirm material origin and documentation chain.");
    if (has("spec", "corrosion") && !has("services", "shot_blast"))
      tips.push("Corrosion-resistant coating systems need surface preparation to Sa 2.5 as a minimum — include Shot Blast & Prime in scope.");
  }

  if (flowId === "it") {
    if (has("customer_size", "healthcare") && has("solution", "saas_apps"))
      tips.push("Healthcare SaaS must confirm data residency, HIPAA BAA, and PHI encryption at rest and in transit before contracting.");
    if (has("customer_size", "financial") && has("solution", "cybersecurity"))
      tips.push("FCA/PRA regulated firms require penetration test evidence and security controls mapping — build this into the delivery schedule.");
    if (has("driver", "security") && has("services", "security_assess"))
      tips.push("Penetration test remediation window needs to be factored into the go-live date — allow 4–6 weeks minimum between test and production.");
    if (has("solution", "ai_automation"))
      tips.push("Enterprise AI deployments need data governance guardrails and LLM usage policies agreed before rollout — plan a governance workshop.");
    if (has("term", "annual") || has("term", "three_year"))
      tips.push("Annual and multi-year cloud commitments typically unlock 30–40% savings vs pay-as-you-go — build reserved instance costs into the TCO comparison.");
    if (has("solution", "saas_apps") && has("services", "integration_dev"))
      tips.push("SaaS integration projects typically take 3× longer than estimated — scope the API discovery phase separately to avoid scope creep.");
    if (has("customer_size", "public") && has("deployment", "cloud_saas"))
      tips.push("Public sector cloud deployments often require IL2/IL3 data classification assessment and sovereign cloud options — confirm before scoping.");
  }

  // Generic fallback from option hints
  if (tips.length === 0) {
    for (const step of steps) {
      const val = answers[step.id];
      if (!val) continue;
      const ids = Array.isArray(val) ? val : [val];
      for (const id of ids) {
        const opt = step.options.find(o => o.id === id);
        if (opt?.hint) { tips.push(`${step.label}: ${opt.hint}`); }
        if (tips.length >= 3) break;
      }
      if (tips.length >= 3) break;
    }
  }
  return tips;
}

// ── Product scoring ───────────────────────────────────────────────────────────
function productScore(product: any, answers: Record<string, any>, flowId: string): number {
  const name = (product.name ?? "").toLowerCase();
  const cat = (product.category ?? "").toLowerCase();
  let score = 0;

  if (flowId === "it") {
    const sol = answers["solution"] ?? "";
    const driver = answers["driver"] ?? "";
    const services: string[] = answers["services"] ?? [];
    if (sol === "cybersecurity" && (cat === "security" || name.includes("security") || name.includes("cyber"))) score += 5;
    if (sol === "data_bi" && (cat === "software" || name.includes("analytic") || name.includes("dashboard"))) score += 5;
    if (sol === "ai_automation" && (name.includes("ai") || name.includes("automation") || cat === "software")) score += 5;
    if (sol === "cloud_infra" && (cat === "cloud" || name.includes("cloud") || name.includes("server"))) score += 4;
    if (sol === "managed_it" && (cat === "services" || name.includes("managed") || name.includes("support"))) score += 4;
    if (driver === "cost" && (name.includes("optimis") || name.includes("efficien"))) score += 3;
    if (services.includes("training") && (cat === "training" || name.includes("training"))) score += 4;
    if (services.includes("security_assess") && (name.includes("assess") || name.includes("audit"))) score += 4;
    if (cat === "software") score += 2;
    if (cat === "services") score += 1;
  } else {
    // Steel scoring
    const spec = answers["spec"] ?? "";
    const services: string[] = answers["services"] ?? [];
    if (spec === "tolerance" && (cat === "metrology" || cat === "calibration")) score += 5;
    if (spec === "tolerance" && cat === "machining") score += 4;
    if (spec === "certification" && (cat === "metrology" || name.includes("cmm") || name.includes("inspection"))) score += 5;
    if (spec === "surface" && (name.includes("roughness") || name.includes("surface"))) score += 4;
    if (spec === "mechanical" && (cat === "metrology" || name.includes("gauge"))) score += 3;
    if (services.includes("inspection") && (cat === "metrology" || name.includes("cmm") || name.includes("gauge"))) score += 4;
    if (services.includes("cut_length") && cat === "tooling") score += 2;
    if (services.includes("heat_treat") && cat === "machining") score += 2;
    if (services.includes("technical") && cat === "software") score += 3;
    if (services.includes("certs") && (name.includes("gauge") || name.includes("calibration"))) score += 4;
    if (answers["product"] === "stainless" && (cat === "machining" || name.includes("stainless"))) score += 3;
    if (cat === "fixturing" || cat === "tooling") score += 1;
  }
  score += Math.random() * 0.3;
  return score;
}

function bundleScore(bundle: any, answers: Record<string, any>, flowId: string): number {
  const name = (bundle.name ?? "").toLowerCase();
  let score = 0;
  if (flowId === "it") {
    const sol = answers["solution"] ?? "";
    if (sol === "cybersecurity" && name.includes("security")) score += 5;
    if (sol === "data_bi" && (name.includes("analytic") || name.includes("data"))) score += 4;
    if (sol === "ai_automation" && name.includes("digital")) score += 4;
    if (sol === "cloud_infra" && name.includes("cloud")) score += 4;
  } else {
    const spec = answers["spec"] ?? "";
    const services: string[] = answers["services"] ?? [];
    if (spec === "certification" && name.includes("metrology")) score += 5;
    if (spec === "tolerance" && (name.includes("5-axis") || name.includes("aerospace") || name.includes("metrology"))) score += 4;
    if (spec === "tolerance" && name.includes("toolroom")) score += 3;
    if (services.includes("inspection") && name.includes("metrology")) score += 4;
    if (services.includes("technical") && name.includes("digital")) score += 3;
  }
  score += Math.random() * 0.3;
  return score;
}

function recommendReason(product: any, answers: Record<string, any>, flowId: string): string {
  const name = (product.name ?? "").toLowerCase();
  const cat = (product.category ?? "").toLowerCase();
  if (flowId === "it") {
    const sol = answers["solution"] ?? "";
    if (sol === "cybersecurity" && (cat === "security" || name.includes("security"))) return "Matches cybersecurity solution scope";
    if (sol === "data_bi" && cat === "software") return "Supports data & analytics workloads";
    if (sol === "ai_automation") return "Enables AI & automation capability";
    if (cat === "software") return "Digital solution for IT environment";
    if (cat === "services") return "Professional services for implementation";
    if (cat === "training") return "Knowledge transfer & capability building";
    return "Recommended for your IT configuration";
  }
  const spec = answers["spec"] ?? "";
  const services: string[] = answers["services"] ?? [];
  if (spec === "tolerance" && cat === "metrology") return "Matches precision spec requirement";
  if (spec === "certification" && name.includes("cmm")) return "Supports 3.1/3.2 certification workflow";
  if (services.includes("inspection") && cat === "metrology") return "Required for 3rd-party inspection scope";
  if (services.includes("technical") && cat === "software") return "Enables SPC & quality reporting";
  if (cat === "machining") return "Precision component manufacturing";
  if (cat === "tooling") return "Cutting tool for steel processing";
  if (cat === "calibration") return "UKAS-traceable calibration standard";
  if (cat === "fixturing") return "Work-holding for machining operations";
  if (cat === "software") return "Digital quality management";
  return "Recommended for your configuration";
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CpqGuidedSelling() {
  const [, navigate] = useLocation();
  const { format: fmtMoney } = useCurrency();
  const { cpqEnabled, isLoading: cpqLoading } = useCpqEnabled();
  const urlParams = new URLSearchParams(window.location.search);
  const contextQuoteId = urlParams.get("quoteId");
  const fromQuote = urlParams.get("from") === "quote";

  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [selectedBundles, setSelectedBundles] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);

  const { data: config, isLoading: configLoading } = useQuery<GuidedSellingConfig>({
    queryKey: ["cpq-guided-selling-config"],
    queryFn: () => fetch("/api/settings/cpq/guided-selling", { credentials: "include" }).then(r => r.json()),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetch("/api/products?limit=200", { credentials: "include" }).then(r => r.json()),
  });
  const { data: bundlesData } = useQuery({
    queryKey: ["product-bundles"],
    queryFn: () => fetch("/api/product-bundles", { credentials: "include" }).then(r => r.json()),
  });

  const flows: GuidedFlow[] = config?.flows ?? [];
  const selectedFlow = selectedFlowId ? flows.find(f => f.id === selectedFlowId) ?? null : null;
  const steps: GuidedStep[] = selectedFlow?.steps ?? [];
  const products: any[] = productsData?.data ?? [];
  const bundles: any[] = Array.isArray(bundlesData) ? bundlesData : [];

  const recommended = done
    ? [...products].sort((a, b) => productScore(b, answers, selectedFlowId!) - productScore(a, answers, selectedFlowId!)).slice(0, 6)
    : [];
  const recommendedBundles = done
    ? [...bundles].sort((a, b) => bundleScore(b, answers, selectedFlowId!) - bundleScore(a, answers, selectedFlowId!)).slice(0, 3)
    : [];
  const insights = done && selectedFlowId ? buildInsights(answers, steps, selectedFlowId) : [];
  const progress = steps.length > 0 ? ((currentStep + (done ? 1 : 0)) / steps.length) * 100 : 0;
  const currentStepDef = steps[currentStep];
  const canAdvance = currentStepDef
    ? (currentStepDef.type === "multi" ? true : !!answers[currentStepDef.id])
    : false;

  function selectionLabel(step: GuidedStep): string | null {
    const val = answers[step.id];
    if (!val) return null;
    if (Array.isArray(val)) {
      const labels = val.map(id => step.options.find(o => o.id === id)?.label ?? id);
      return labels.length > 0 ? labels.join(", ") : null;
    }
    return step.options.find(o => o.id === val)?.label ?? val;
  }

  function selectFlow(flowId: string) {
    setSelectedFlowId(flowId);
    setCurrentStep(0);
    setAnswers({});
    setSelectedProducts(new Set());
    setDone(false);
  }

  function selectSingle(stepId: string, optId: string) {
    setAnswers(prev => ({ ...prev, [stepId]: optId }));
  }
  function toggleMulti(stepId: string, optId: string) {
    setAnswers(prev => {
      const existing: string[] = prev[stepId] ?? [];
      return { ...prev, [stepId]: existing.includes(optId) ? existing.filter(s => s !== optId) : [...existing, optId] };
    });
  }
  function next() {
    if (currentStep < steps.length - 1) setCurrentStep(s => s + 1);
    else setDone(true);
  }
  function back() {
    if (done) setDone(false);
    else if (currentStep > 0) setCurrentStep(s => s - 1);
    else {
      // back to flow picker
      setSelectedFlowId(null);
      setAnswers({});
      setSelectedProducts(new Set());
      setSelectedBundles(new Set());
    }
  }
  function toggleBundle(id: number) {
    setSelectedBundles(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleProduct(id: number) {
    setSelectedProducts(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  if (!cpqLoading && !cpqEnabled) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">CPQ Module Not Enabled</h2>
          <p className="text-muted-foreground text-sm text-center max-w-sm">The Configure-Price-Quote module is not enabled for your account.</p>
          <Button variant="outline" onClick={() => navigate("/quotes")}>Go to Standard Quoting</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-2">
        {fromQuote && contextQuoteId && (
          <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5 mb-5 text-sm">
            <span className="text-blue-800"><span className="font-semibold">Guided Selling</span> — adding products to Quote #{contextQuoteId}</span>
            <a href={`/quotes/${contextQuoteId}`} className="text-blue-600 hover:underline text-xs font-medium">← Back to Quote</a>
          </div>
        )}

        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {selectedFlow ? selectedFlow.name : "Guided Selling"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {selectedFlow ? selectedFlow.description : "Select an industry to start your guided product selection."}
            </p>
          </div>
        </div>

        {configLoading ? (
          <div className="flex items-center gap-2 py-16 justify-center text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading wizard configuration…
          </div>
        ) : !selectedFlow ? (
          /* ── Flow Picker ── */
          <div>
            <p className="text-sm text-muted-foreground mb-4">Choose the industry that best matches your customer to get tailored product recommendations and specification watchpoints.</p>
            {flows.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">
                No guided selling flows configured.{" "}
                <a href="/cpq/admin" className="underline text-blue-600">Go to CPQ Admin</a> to set up the wizard.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {flows.map(flow => (
                  <button key={flow.id} onClick={() => selectFlow(flow.id)}
                    className="border border-border rounded-xl p-5 text-left hover:border-blue-400 hover:bg-blue-50/40 transition-all group">
                    <div className="text-3xl mb-3">{flow.icon}</div>
                    <p className="font-semibold text-base group-hover:text-blue-700">{flow.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">{flow.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{flow.steps.length} steps</span>
                      <span className="text-xs text-blue-600 font-medium group-hover:underline">Start →</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── Wizard ── */
          <>
            <div className="mb-5">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>{done ? "Recommendations" : `Step ${currentStep + 1} of ${steps.length} — ${currentStepDef?.label}`}</span>
                <span>{Math.round(progress)}% complete</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="flex gap-6">
              {/* Sidebar */}
              <div className="hidden lg:flex flex-col w-60 shrink-0 gap-1.5">
                <button onClick={() => setSelectedFlowId(null)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-blue-600 mb-2">
                  <ChevronLeft className="w-3.5 h-3.5" /> Change industry
                </button>
                {steps.map((step, i) => {
                  const isActive = !done && i === currentStep;
                  const isDone = done || i < currentStep;
                  return (
                    <div key={step.id} className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive ? "bg-blue-50 text-blue-700 font-semibold" : isDone ? "text-muted-foreground" : "text-muted-foreground/60")}>
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        isDone || isActive ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground")}>
                        {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      {step.label}
                    </div>
                  );
                })}
                {steps.some(s => selectionLabel(s)) && (
                  <div className="mt-4 border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Your selections</p>
                    {steps.map(step => {
                      const lbl = selectionLabel(step);
                      if (!lbl) return null;
                      return (
                        <div key={step.id}>
                          <p className="text-[10px] text-muted-foreground">{step.label}</p>
                          <p className="text-xs font-medium">{lbl}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Main */}
              <div className="flex-1 min-w-0">
                {done ? (
                  <div className="space-y-5">
                    {insights.length > 0 && (
                      <Card className="border-amber-200 bg-amber-50/60 shadow-sm">
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <h3 className="text-sm font-semibold text-amber-800">Specification Insights & Watchpoints</h3>
                          </div>
                          <ul className="space-y-1.5">
                            {insights.map((tip, i) => (
                              <li key={i} className="flex gap-2 text-xs text-amber-800">
                                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />{tip}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    <Card className="shadow-sm">
                      <CardContent className="pt-5">
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="w-4 h-4 text-blue-600" />
                          <h2 className="text-base font-semibold">Recommended Products & Services</h2>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">Matched to your customer's profile, solution category, and service requirements.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {recommended.map((p: any) => {
                            const selected = selectedProducts.has(p.id);
                            return (
                              <div key={p.id} className={cn("border rounded-lg p-3 flex flex-col transition-all",
                                selected ? "border-blue-500 bg-blue-50/60" : "border-border hover:border-blue-300")}>
                                <div className="flex items-start justify-between gap-1 mb-1">
                                  <Package className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                  <Badge className="text-[10px] bg-muted text-muted-foreground px-1.5">{p.category || "General"}</Badge>
                                </div>
                                <p className="font-semibold text-sm mt-1 leading-tight">{p.name}</p>
                                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 flex-1">{p.description}</p>
                                <div className="mt-2">
                                  <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                                    {recommendReason(p, answers, selectedFlowId!)}
                                  </span>
                                </div>
                                <p className="text-base font-bold text-blue-700 mt-2">{fmtMoney(parseFloat(p.unitPrice) || 0)}</p>
                                <Button size="sm" className={cn("w-full mt-2 text-xs h-7", selected ? "bg-blue-600 hover:bg-blue-700" : "")}
                                  variant={selected ? "default" : "outline"} onClick={() => toggleProduct(p.id)}>
                                  {selected ? "Added ✓" : "Add to Quote"}
                                </Button>
                              </div>
                            );
                          })}
                          {recommended.length === 0 && (
                            <div className="col-span-3 py-8 text-center text-muted-foreground text-sm">No products found — ensure the product catalogue is populated.</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {recommendedBundles.length > 0 && (
                      <Card className="shadow-sm">
                        <CardContent className="pt-5">
                          <h2 className="text-base font-semibold mb-1">Recommended Solution Bundles</h2>
                          <p className="text-xs text-muted-foreground mb-4">Pre-packaged combinations — typically faster to configure.</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {recommendedBundles.map((b: any) => {
                              const bSelected = selectedBundles.has(b.id);
                              return (
                                <div key={b.id} className={cn("border rounded-lg p-3 transition-all", bSelected ? "border-blue-500 bg-blue-50/60" : "border-border hover:border-blue-300")}>
                                  <p className="font-semibold text-sm">{b.name}</p>
                                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-3">{b.description}</p>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    {b.bundle_discount_pct > 0 && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{b.bundle_discount_pct}% bundle saving</Badge>}
                                    {b.items?.length > 0 && <Badge className="bg-muted text-muted-foreground text-[10px]">{b.items.length} items</Badge>}
                                  </div>
                                  <Button size="sm" className={cn("w-full mt-3 text-xs h-7", bSelected ? "bg-blue-600 hover:bg-blue-700" : "")}
                                    variant={bSelected ? "default" : "outline"} onClick={() => toggleBundle(b.id)}>
                                    {bSelected ? "Added ✓" : "Add Bundle"}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Card className="shadow-sm bg-muted/20">
                      <CardContent className="pt-4 pb-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Quote Configuration Summary</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 text-xs">
                          {steps.map(step => {
                            const lbl = selectionLabel(step);
                            if (!lbl) return null;
                            return [
                              <span key={`k-${step.id}`} className="text-muted-foreground">{step.label}</span>,
                              <span key={`v-${step.id}`} className="font-medium col-span-1 sm:col-span-2">{lbl}</span>,
                            ];
                          })}
                          <span className="text-muted-foreground">Products added</span>
                          <span className="font-medium col-span-1 sm:col-span-2">{selectedProducts.size + selectedBundles.size}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={back}><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
                      <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => {
                        const selectedProductObjs = recommended.filter(p => selectedProducts.has(p.id));
                        const selectedBundleObjs = recommendedBundles.filter((b: any) => selectedBundles.has(b.id)).flatMap((b: any) =>
                          (b.items ?? []).map((item: any) => ({
                            id: item.product_id,
                            name: item.product_name,
                            unitPrice: String(item.unit_price_override ?? item.default_unit_price ?? 0),
                            sku: item.product_code ?? "",
                            category: item.product_category ?? "",
                            costPrice: "0",
                            bundleId: b.id,
                            bundleName: b.name,
                          }))
                        );
                        sessionStorage.setItem("cpq_guided_products", JSON.stringify([...selectedProductObjs, ...selectedBundleObjs]));
                        sessionStorage.setItem("cpq_guided_answers", JSON.stringify(answers));
                        navigate(contextQuoteId ? `/cpq/qle/${contextQuoteId}?from=guided` : "/cpq/qle?from=guided");
                      }}>
                        <ShoppingCart className="w-4 h-4" />
                        {(() => { const total = selectedProducts.size + selectedBundles.size; return contextQuoteId
                          ? `Add ${total} Item${total !== 1 ? "s" : ""} to Quote`
                          : `Create Quote with ${total} Item${total !== 1 ? "s" : ""}`;
                        })()}
                      </Button>
                    </div>
                  </div>
                ) : currentStepDef ? (
                  <Card className="shadow-sm">
                    <CardContent className="pt-7 pb-6">
                      <h2 className="text-lg font-semibold mb-0.5">{currentStepDef.question}</h2>
                      <p className="text-sm text-muted-foreground mb-5">{currentStepDef.hint}</p>

                      {currentStepDef.type === "multi" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {currentStepDef.options.map(opt => {
                            const sel = (answers[currentStepDef.id] ?? []).includes(opt.id);
                            return (
                              <button key={opt.id} onClick={() => toggleMulti(currentStepDef.id, opt.id)}
                                className={cn("border rounded-lg p-3 text-left flex items-start gap-3 transition-all hover:border-blue-400",
                                  sel ? "border-blue-500 bg-blue-50" : "border-border")}>
                                <div className={cn("w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center mt-0.5",
                                  sel ? "border-blue-500 bg-blue-500" : "border-muted-foreground")}>
                                  {sel && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    {opt.icon && <span className="text-base">{opt.icon}</span>}
                                    <span className={cn("font-medium text-sm", sel ? "text-blue-700" : "text-foreground")}>{opt.label}</span>
                                  </div>
                                  {opt.hint && <p className="text-[11px] text-muted-foreground mt-0.5">{opt.hint}</p>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {currentStepDef.options.map(opt => {
                            const sel = answers[currentStepDef.id] === opt.id;
                            return (
                              <button key={opt.id} onClick={() => selectSingle(currentStepDef.id, opt.id)}
                                className={cn("border rounded-lg p-4 text-left transition-all hover:border-blue-400",
                                  sel ? "border-blue-500 bg-blue-50" : "border-border")}>
                                <div className="flex items-center gap-2 mb-1">
                                  {opt.icon && <span className="text-xl">{opt.icon}</span>}
                                  <span className={cn("font-semibold text-sm", sel ? "text-blue-700" : "text-foreground")}>{opt.label}</span>
                                </div>
                                {opt.hint && <p className="text-[11px] text-muted-foreground ml-7">{opt.hint}</p>}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-7 pt-5 border-t border-border">
                        <Button variant="outline" onClick={back}>
                          <ChevronLeft className="w-4 h-4 mr-1" /> {currentStep === 0 ? "Change Industry" : "Back"}
                        </Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={next} disabled={!canAdvance}>
                          {currentStep === steps.length - 1 ? "See Recommendations" : "Next"}
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
