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
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Package,
  ShoppingCart,
  GitBranch,
  Lock,
} from "lucide-react";

const STEPS = ["Industry", "Use Case", "Company Size", "Features", "Budget"];

const INDUSTRY_OPTIONS = ["Manufacturing", "Finance", "Healthcare", "Retail", "Technology", "Other"];

const USE_CASE_MAP: Record<string, string[]> = {
  Manufacturing: ["Supply Chain Optimisation", "Quality Management", "Asset Tracking", "ERP Integration"],
  Finance: ["Risk Management", "Compliance Reporting", "Client Onboarding", "Portfolio Analytics"],
  Healthcare: ["Patient Management", "Clinical Workflows", "Billing & Coding", "Telehealth"],
  Retail: ["Inventory Management", "Omnichannel Sales", "Customer Loyalty", "Analytics"],
  Technology: ["DevOps Automation", "SaaS Management", "API Platform", "Data Engineering"],
  Other: ["CRM", "HR Management", "Marketing Automation", "Business Intelligence"],
};

const SIZE_OPTIONS = [
  { label: "Startup", sub: "1 – 50 employees" },
  { label: "SMB", sub: "51 – 500 employees" },
  { label: "Enterprise", sub: "500+ employees" },
];

const FEATURE_OPTIONS = [
  "Real-time Analytics",
  "API Integration",
  "Custom Workflows",
  "Advanced Reporting",
  "SSO",
  "Mobile Access",
];

const BUDGET_OPTIONS = [
  { label: "Under £10k", max: 10000 },
  { label: "£10k – £50k", max: 50000 },
  { label: "£50k – £200k", max: 200000 },
  { label: "Over £200k", max: Infinity },
];

function productScore(product: any, answers: Record<string, any>): number {
  let score = 0;
  const name = (product.name ?? "").toLowerCase();
  const category = (product.category ?? "").toLowerCase();
  const industry = (answers.industry ?? "").toLowerCase();
  const size = (answers.size ?? "").toLowerCase();
  const features: string[] = answers.features ?? [];
  const budgetMax: number = answers.budgetMax ?? Infinity;

  if (parseFloat(product.unitPrice) <= budgetMax) score += 2;
  if (category.includes(industry) || name.includes(industry)) score += 3;
  if (size === "enterprise" && parseFloat(product.unitPrice) > 5000) score += 1;
  if (size === "startup" && parseFloat(product.unitPrice) < 2000) score += 1;
  if (features.includes("API Integration") && (name.includes("api") || name.includes("integration"))) score += 2;
  if (features.includes("Real-time Analytics") && (name.includes("analyt") || name.includes("report"))) score += 2;
  if (features.includes("SSO") && name.includes("sso")) score += 2;
  score += Math.random() * 0.5;
  return score;
}

export default function CpqGuidedSelling() {
  const [, navigate] = useLocation();
  const { format: fmtMoney } = useCurrency();
  const { cpqEnabled, isLoading: cpqLoading } = useCpqEnabled();
  const urlParams = new URLSearchParams(window.location.search);
  const contextQuoteId = urlParams.get("quoteId");
  const fromQuote = urlParams.get("from") === "quote";
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetch("/api/products?limit=200", { credentials: "include" }).then((r) => r.json()),
  });
  const { data: bundlesData } = useQuery({
    queryKey: ["product-bundles"],
    queryFn: () => fetch("/api/product-bundles", { credentials: "include" }).then((r) => r.json()),
  });

  const products: any[] = productsData?.data ?? [];
  const bundles: any[] = Array.isArray(bundlesData) ? bundlesData : [];

  const recommended = done
    ? [...products].sort((a, b) => productScore(b, answers) - productScore(a, answers)).slice(0, 6)
    : [];
  const recommendedBundles = done ? bundles.slice(0, 3) : [];
  const progress = ((currentStep + (done ? 1 : 0)) / STEPS.length) * 100;

  if (!cpqLoading && !cpqEnabled) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">CPQ Module Not Enabled</h2>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            The Configure-Price-Quote module is not enabled for your account. Contact your administrator to enable CPQ.
          </p>
          <Button variant="outline" onClick={() => navigate("/quotes")}>
            Go to Standard Quoting
          </Button>
        </div>
      </Layout>
    );
  }

  function selectSingle(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function toggleFeature(feat: string) {
    setAnswers((prev) => {
      const existing: string[] = prev.features ?? [];
      return {
        ...prev,
        features: existing.includes(feat) ? existing.filter((f) => f !== feat) : [...existing, feat],
      };
    });
  }

  function next() {
    if (currentStep < STEPS.length - 1) setCurrentStep((s) => s + 1);
    else setDone(true);
  }

  function back() {
    if (done) setDone(false);
    else if (currentStep > 0) setCurrentStep((s) => s - 1);
  }

  function toggleProduct(id: number) {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const useCaseOptions = USE_CASE_MAP[answers.industry ?? "Other"] ?? USE_CASE_MAP["Other"];

  const ANSWER_LABELS: [string, string][] = [
    ["industry", "Industry"],
    ["useCase", "Use Case"],
    ["size", "Company Size"],
    ["features", "Features"],
    ["budget", "Budget"],
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Quote context banner */}
        {fromQuote && contextQuoteId && (
          <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5 mb-5 text-sm">
            <span className="text-blue-800">
              <span className="font-semibold">Guided Selling</span> — adding products to Quote #{contextQuoteId}
            </span>
            <a href={`/quotes/${contextQuoteId}`} className="text-blue-600 hover:underline text-xs font-medium">← Back to Quote</a>
          </div>
        )}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Guided Selling</h1>
            <p className="text-sm text-muted-foreground">Answer a few questions to get tailored product recommendations.</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{done ? "Results" : `Step ${currentStep + 1} of ${STEPS.length}`}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex gap-6">
          {/* Left Panel */}
          <div className="hidden lg:flex flex-col w-56 shrink-0 gap-2">
            {STEPS.map((label, i) => {
              const isActive = !done && i === currentStep;
              const isDone = done || i < currentStep;
              return (
                <div key={label} className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm",
                  isActive && "bg-blue-50 text-blue-700 font-semibold",
                  isDone && !isActive && "text-muted-foreground")}>
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    isDone || isActive ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground")}>
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  {label}
                </div>
              );
            })}
            {Object.keys(answers).length > 0 && (
              <div className="mt-4 border-t border-border pt-4 space-y-2">
                {ANSWER_LABELS.map(([key, label]) => {
                  const val = answers[key];
                  if (!val) return null;
                  const display = Array.isArray(val) ? val.join(", ") : String(val);
                  if (!display) return null;
                  return (
                    <div key={key}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-xs font-medium truncate">{display}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="flex-1 min-w-0">
            {done ? (
              <div className="space-y-6">
                <Card className="shadow-sm">
                  <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold mb-1">Recommended Products</h2>
                    <p className="text-sm text-muted-foreground mb-4">Based on your selections, here are the best-fit products.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {recommended.map((p: any) => (
                        <div key={p.id} className={cn("border rounded-lg p-3 transition-all cursor-pointer",
                          selectedProducts.has(p.id) ? "border-blue-500 bg-blue-50" : "border-border hover:border-blue-300")}>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <Package className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <Badge className="text-xs bg-muted text-muted-foreground">{p.category || "General"}</Badge>
                          </div>
                          <p className="font-semibold text-sm mt-1">{p.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
                          <p className="text-base font-bold text-blue-700 mt-2">{fmtMoney(parseFloat(p.unitPrice) || 0)}</p>
                          <Button
                            size="sm"
                            className={cn("w-full mt-3 text-xs h-7", selectedProducts.has(p.id) ? "bg-blue-600 hover:bg-blue-700" : "")}
                            variant={selectedProducts.has(p.id) ? "default" : "outline"}
                            onClick={() => toggleProduct(p.id)}
                          >
                            {selectedProducts.has(p.id) ? "Added ✓" : "Add to Quote"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {recommendedBundles.length > 0 && (
                  <Card className="shadow-sm">
                    <CardContent className="pt-6">
                      <h2 className="text-lg font-semibold mb-1">Recommended Bundles</h2>
                      <p className="text-sm text-muted-foreground mb-4">Pre-packaged solutions that match your requirements.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {recommendedBundles.map((b: any) => (
                          <div key={b.id} className="border border-border rounded-lg p-3 hover:border-blue-300 transition-all">
                            <p className="font-semibold text-sm">{b.name}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.description}</p>
                            {b.bundle_discount_pct > 0 && (
                              <Badge className="mt-2 bg-green-100 text-green-700 text-xs">{b.bundle_discount_pct}% bundle discount</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={back}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => {
                    const dest = contextQuoteId
                      ? `/cpq/qle/${contextQuoteId}?from=quote`
                      : "/cpq/qle";
                    navigate(dest);
                  }}>
                    <ShoppingCart className="w-4 h-4" />
                    {contextQuoteId ? "Add to Quote & Review" : "Create Quote with Selections"}
                  </Button>
                </div>
              </div>
            ) : (
              <Card className="shadow-sm">
                <CardContent className="pt-8 pb-6">
                  {currentStep === 0 && (
                    <>
                      <h2 className="text-xl font-semibold mb-1">What industry does your customer operate in?</h2>
                      <p className="text-sm text-muted-foreground mb-6">Select the primary industry vertical.</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {INDUSTRY_OPTIONS.map((opt) => (
                          <button key={opt} onClick={() => selectSingle("industry", opt)}
                            className={cn("border rounded-lg p-4 text-sm font-medium text-left transition-all hover:border-blue-400",
                              answers.industry === opt ? "border-blue-500 bg-blue-50 text-blue-700" : "border-border")}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {currentStep === 1 && (
                    <>
                      <h2 className="text-xl font-semibold mb-1">What is the primary use case?</h2>
                      <p className="text-sm text-muted-foreground mb-6">Choose the main business problem to solve.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {useCaseOptions.map((opt) => (
                          <button key={opt} onClick={() => selectSingle("useCase", opt)}
                            className={cn("border rounded-lg p-4 text-sm font-medium text-left transition-all hover:border-blue-400",
                              answers.useCase === opt ? "border-blue-500 bg-blue-50 text-blue-700" : "border-border")}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {currentStep === 2 && (
                    <>
                      <h2 className="text-xl font-semibold mb-1">What is the company size?</h2>
                      <p className="text-sm text-muted-foreground mb-6">This helps us recommend appropriately sized solutions.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {SIZE_OPTIONS.map((opt) => (
                          <button key={opt.label} onClick={() => selectSingle("size", opt.label)}
                            className={cn("border rounded-lg p-5 text-left transition-all hover:border-blue-400",
                              answers.size === opt.label ? "border-blue-500 bg-blue-50" : "border-border")}>
                            <p className={cn("font-semibold text-sm", answers.size === opt.label && "text-blue-700")}>{opt.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {currentStep === 3 && (
                    <>
                      <h2 className="text-xl font-semibold mb-1">Which features are required?</h2>
                      <p className="text-sm text-muted-foreground mb-6">Select all that apply.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {FEATURE_OPTIONS.map((feat) => {
                          const selected = (answers.features ?? []).includes(feat);
                          return (
                            <button key={feat} onClick={() => toggleFeature(feat)}
                              className={cn("border rounded-lg p-4 text-sm font-medium text-left flex items-center gap-3 transition-all hover:border-blue-400",
                                selected ? "border-blue-500 bg-blue-50 text-blue-700" : "border-border")}>
                              <div className={cn("w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center",
                                selected ? "border-blue-500 bg-blue-500" : "border-muted-foreground")}>
                                {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </div>
                              {feat}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {currentStep === 4 && (
                    <>
                      <h2 className="text-xl font-semibold mb-1">What is your budget range?</h2>
                      <p className="text-sm text-muted-foreground mb-6">We'll filter recommendations to match your budget.</p>
                      <div className="grid grid-cols-2 gap-3">
                        {BUDGET_OPTIONS.map((opt) => (
                          <button key={opt.label}
                            onClick={() => setAnswers((prev) => ({ ...prev, budget: opt.label, budgetMax: opt.max }))}
                            className={cn("border rounded-lg p-5 text-sm font-medium text-left transition-all hover:border-blue-400",
                              answers.budget === opt.label ? "border-blue-500 bg-blue-50 text-blue-700" : "border-border")}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between mt-8">
                    <Button variant="outline" onClick={back} disabled={currentStep === 0}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={next}>
                      {currentStep === STEPS.length - 1 ? "See Recommendations" : "Next"}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
