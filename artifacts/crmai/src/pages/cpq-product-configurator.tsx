import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/context/currency";
import { useCpqEnabled } from "@/context/cpq-feature";
import { cn } from "@/lib/utils";
import {
  SlidersHorizontal,
  Search,
  Package,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Lock,
  AlertTriangle,
} from "lucide-react";

const VARIANTS = ["Standard", "Premium", "Enterprise"];
const DEPLOYMENTS = ["Cloud", "On-Premise", "Hybrid"];
const SUPPORT_LEVELS = [
  { label: "Basic", adj: 0 },
  { label: "Standard", adj: 0.1 },
  { label: "Premium", adj: 0.25 },
];
const DURATIONS = [
  { label: "1 Year", mult: 1 },
  { label: "2 Years", mult: 1.85 },
  { label: "3 Years", mult: 2.6 },
];

const VARIANT_ADJ: Record<string, number> = { Standard: 0, Premium: 0.15, Enterprise: 0.35 };

function ValidationWarnings({ config }: { config: Record<string, any> }) {
  const warnings: string[] = [];
  if (config.support === "Premium" && config.variant !== "Enterprise") {
    warnings.push("Premium Support requires Enterprise variant.");
  }
  if (config.licenseCount > 500 && config.deployment === "On-Premise") {
    warnings.push("Large license counts (500+) are recommended on Cloud or Hybrid deployments.");
  }
  if (!warnings.length) return null;
  return (
    <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 space-y-1.5">
      {warnings.map((w) => (
        <div key={w} className="flex items-start gap-2 text-sm text-yellow-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-600" />
          {w}
        </div>
      ))}
    </div>
  );
}

export default function CpqProductConfigurator() {
  const [, navigate] = useLocation();
  const { format: fmtMoney } = useCurrency();
  const { cpqEnabled, isLoading: cpqLoading } = useCpqEnabled();
  const urlParams = new URLSearchParams(window.location.search);
  const contextQuoteId = urlParams.get("quoteId");
  const fromQuote = urlParams.get("from") === "quote";

  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [config, setConfig] = useState<Record<string, any>>({
    variant: "Standard",
    deployment: "Cloud",
    support: "Basic",
    licenseCount: 1,
    duration: "1 Year",
  });
  const [selectedOptions, setSelectedOptions] = useState<Set<number>>(new Set());
  const [configOpen, setConfigOpen] = useState(true);
  const [optionsOpen, setOptionsOpen] = useState(true);

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
  const allBundleItems = bundles.flatMap((b) => (b.items ?? []).map((item: any) => ({ ...item, bundleName: b.name })));

  const filtered = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase())
  );

  if (!cpqLoading && !cpqEnabled) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">CPQ Module Not Enabled</h2>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            The Configure-Price-Quote module is not enabled for your account. Contact your administrator to enable CPQ.
          </p>
          <Button variant="outline" onClick={() => navigate("/quotes")}>Go to Standard Quoting</Button>
        </div>
      </Layout>
    );
  }

  const basePrice = parseFloat(selectedProduct?.unitPrice ?? "0") || 0;
  const variantAdj = VARIANT_ADJ[config.variant] ?? 0;
  const supportAdj = SUPPORT_LEVELS.find((s) => s.label === config.support)?.adj ?? 0;
  const durationMult = DURATIONS.find((d) => d.label === config.duration)?.mult ?? 1;
  const unitAdjusted = basePrice * (1 + variantAdj + supportAdj);
  const optionsTotal = allBundleItems
    .filter((item: any) => selectedOptions.has(item.product_id))
    .reduce((sum: number, item: any) => sum + (parseFloat(item.unit_price_override ?? "0") || 0), 0);
  const configuredTotal = (unitAdjusted * config.licenseCount + optionsTotal) * durationMult;

  function setConf(key: string, value: any) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function toggleOption(productId: number) {
    setSelectedOptions((prev) => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Quote context banner */}
        {fromQuote && contextQuoteId && (
          <div className="flex items-center justify-between rounded-lg bg-purple-50 border border-purple-200 px-4 py-2.5 mb-5 text-sm">
            <span className="text-purple-800">
              <span className="font-semibold">Product Configurator</span> — configuring for Quote #{contextQuoteId}
            </span>
            <a href={`/quotes/${contextQuoteId}`} className="text-purple-600 hover:underline text-xs font-medium">← Back to Quote</a>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Product Configurator</h1>
            <p className="text-sm text-muted-foreground">Select a product and configure attributes, options, and pricing.</p>
          </div>
        </div>

        {/* Product Picker */}
        <Card className="shadow-sm mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">1. Select Product</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search products by name, SKU, or category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-border rounded-md border border-border">
              {filtered.slice(0, 30).map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedProduct(p); setConfig({ variant: "Standard", deployment: "Cloud", support: "Basic", licenseCount: 1, duration: "1 Year" }); setSelectedOptions(new Set()); }}
                  className={cn("w-full text-left flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors",
                    selectedProduct?.id === p.id && "bg-blue-50")}
                >
                  <div>
                    <p className={cn("text-sm font-medium", selectedProduct?.id === p.id && "text-blue-700")}>{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.sku} · {p.category}</p>
                  </div>
                  <span className="text-sm font-semibold text-right shrink-0 ml-4">{fmtMoney(parseFloat(p.unitPrice) || 0)}</span>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No products match.</p>}
            </div>
          </CardContent>
        </Card>

        {selectedProduct && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Config + Options */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Product Header */}
              <Card className="shadow-sm">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shrink-0">
                      <Package className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold">{selectedProduct.name}</h2>
                      <p className="text-sm text-muted-foreground">{selectedProduct.description || "No description available."}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xl font-bold text-blue-700">{fmtMoney(basePrice)}</span>
                        <Badge className="bg-muted text-muted-foreground text-xs">{selectedProduct.category}</Badge>
                        <Badge className="bg-muted text-muted-foreground text-xs">SKU: {selectedProduct.sku}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Configuration Attributes */}
              <Card className="shadow-sm">
                <button className="w-full" onClick={() => setConfigOpen((o) => !o)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Configuration Attributes</CardTitle>
                      {configOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CardHeader>
                </button>
                {configOpen && (
                  <CardContent className="space-y-5 pb-5">
                    {/* Variant */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Variant / Tier</label>
                      <select
                        className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                        value={config.variant}
                        onChange={(e) => setConf("variant", e.target.value)}
                      >
                        {VARIANTS.map((v) => <option key={v}>{v}</option>)}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Price adjustment: +{Math.round((VARIANT_ADJ[config.variant] ?? 0) * 100)}%
                      </p>
                    </div>

                    {/* Deployment */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Deployment</label>
                      <div className="flex gap-2">
                        {DEPLOYMENTS.map((d) => (
                          <button key={d} onClick={() => setConf("deployment", d)}
                            className={cn("flex-1 border rounded-md py-2 text-sm font-medium transition-all",
                              config.deployment === d ? "border-blue-500 bg-blue-50 text-blue-700" : "border-border hover:border-blue-300")}>
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Support Level */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Support Level</label>
                      <div className="flex gap-2">
                        {SUPPORT_LEVELS.map((s) => (
                          <button key={s.label} onClick={() => setConf("support", s.label)}
                            className={cn("flex-1 border rounded-md py-2.5 text-sm font-medium transition-all",
                              config.support === s.label ? "border-blue-500 bg-blue-50 text-blue-700" : "border-border hover:border-blue-300")}>
                            <span className="block">{s.label}</span>
                            <span className="text-xs text-muted-foreground">+{Math.round(s.adj * 100)}%</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* License Count */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">License Count</label>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setConf("licenseCount", Math.max(1, config.licenseCount - 1))}
                          className="w-8 h-8 rounded-md border border-border flex items-center justify-center hover:bg-muted">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <Input type="number" min={1} className="w-24 text-center"
                          value={config.licenseCount}
                          onChange={(e) => setConf("licenseCount", Math.max(1, parseInt(e.target.value) || 1))} />
                        <button onClick={() => setConf("licenseCount", config.licenseCount + 1)}
                          className="w-8 h-8 rounded-md border border-border flex items-center justify-center hover:bg-muted">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Contract Duration */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Contract Duration</label>
                      <div className="flex gap-2">
                        {DURATIONS.map((d) => (
                          <button key={d.label} onClick={() => setConf("duration", d.label)}
                            className={cn("flex-1 border rounded-md py-2.5 text-sm font-medium transition-all",
                              config.duration === d.label ? "border-blue-500 bg-blue-50 text-blue-700" : "border-border hover:border-blue-300")}>
                            <span className="block">{d.label}</span>
                            <span className="text-xs text-muted-foreground">×{d.mult}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Product Options */}
              {allBundleItems.length > 0 && (
                <Card className="shadow-sm">
                  <button className="w-full" onClick={() => setOptionsOpen((o) => !o)}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Product Options & Add-ons</CardTitle>
                        {optionsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </CardHeader>
                  </button>
                  {optionsOpen && (
                    <CardContent className="pb-4 space-y-2">
                      {allBundleItems.slice(0, 12).map((item: any) => (
                        <label key={item.product_id} className={cn("flex items-center justify-between gap-3 border rounded-md px-3 py-2.5 cursor-pointer transition-all",
                          selectedOptions.has(item.product_id) ? "border-blue-500 bg-blue-50" : "border-border hover:border-blue-300")}>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={selectedOptions.has(item.product_id)} onChange={() => toggleOption(item.product_id)} className="accent-blue-600" />
                            <div>
                              <p className="text-sm font-medium">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground">Bundle: {item.bundleName}</p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold shrink-0">
                            +{fmtMoney(parseFloat(item.unit_price_override ?? "0") || 0)}
                          </span>
                        </label>
                      ))}
                    </CardContent>
                  )}
                </Card>
              )}

              <ValidationWarnings config={config} />
            </div>

            {/* Pricing Summary Sidebar */}
            <div className="lg:w-72 shrink-0">
              <div className="sticky top-4">
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Pricing Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Base Price</span>
                      <span>{fmtMoney(basePrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Variant adj. (+{Math.round(variantAdj * 100)}%)</span>
                      <span>+{fmtMoney(basePrice * variantAdj)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Support adj. (+{Math.round(supportAdj * 100)}%)</span>
                      <span>+{fmtMoney(basePrice * supportAdj)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium border-t border-border pt-3">
                      <span>Unit Price</span>
                      <span>{fmtMoney(unitAdjusted)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">× {config.licenseCount} licences</span>
                      <span>{fmtMoney(unitAdjusted * config.licenseCount)}</span>
                    </div>
                    {optionsTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Options subtotal</span>
                        <span>+{fmtMoney(optionsTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration ({config.duration})</span>
                      <span>×{DURATIONS.find((d) => d.label === config.duration)?.mult}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold border-t border-border pt-3">
                      <span>Configured Total</span>
                      <span className="text-blue-700">{fmtMoney(configuredTotal)}</span>
                    </div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-2" onClick={() => {
                      const dest = contextQuoteId ? `/cpq/qle/${contextQuoteId}?from=quote` : "/cpq/qle";
                      navigate(dest);
                    }}>
                      {contextQuoteId ? "Add to Quote & Review" : "Add to Quote"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {!selectedProduct && (
          <div className="text-center py-16 text-muted-foreground">
            <SlidersHorizontal className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a product above to begin configuration.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
