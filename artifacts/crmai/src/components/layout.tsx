import React, { useState, useRef, useLayoutEffect, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Building2,
  Briefcase,
  Activity,
  Package,
  LifeBuoy,
  FileText,
  FileSignature,
  BookText,
  BarChart3,
  ShoppingCart,
  Bot,
  Settings,
  Search,
  X,
  LogOut,
  ChevronDown,
  Mail,
  Megaphone,
  Globe,
  Plus,
  MoreHorizontal,
  Sun,
  Moon,
  ShieldCheck,
  UserCog,
  Sliders,
  RefreshCw,
  Library,
  Zap,
  Bell,
  Target,
  DollarSign,
  Crown,
  Cpu,
  GitBranch,
  SlidersHorizontal,
  Table2,
  TrendingUp,
  Settings2,
  Grid3x3,
  X as XIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AIChatbot } from "@/components/ai-chatbot";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";
import { useCurrency } from "@/context/currency";
import { CURRENCY_META } from "@/lib/currency";
import { NotificationBell } from "@/components/notification-bell";
import { useCpqEnabled } from "@/context/cpq-feature";
import { APP_DEFINITIONS, ALL_APP_ID, type AppDefinition } from "@/lib/apps-config";

const BASE_NAV_ITEMS: Array<{ label: string; href: string; icon: any; screenKey?: string; adminOnly?: boolean; moduleKey?: string; cpqOnly?: boolean }> = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, screenKey: "dashboard" },
  { label: "Sales Manager", href: "/sales-manager", icon: TrendingUp, screenKey: "dashboard" },
  { label: "Leads", href: "/leads", icon: UserPlus, screenKey: "leads" },
  { label: "Contacts", href: "/contacts", icon: Users, screenKey: "contacts" },
  { label: "Accounts", href: "/accounts", icon: Building2, screenKey: "accounts" },
  { label: "Opportunities", href: "/opportunities", icon: Briefcase, screenKey: "opportunities" },
  { label: "Campaigns", href: "/campaigns", icon: Megaphone, screenKey: "campaigns" },
  { label: "Website Visitors", href: "/website-visitors", icon: Globe, screenKey: "website-visits" },
  { label: "Activities", href: "/activities", icon: Activity, screenKey: "activities" },
  { label: "Products", href: "/products", icon: Package, screenKey: "products" },
  { label: "Product Bundles", href: "/product-bundles", icon: Package, screenKey: "products" },
  { label: "Price Books", href: "/price-books", icon: BookText, screenKey: "price-books" },
  { label: "Quotes", href: "/quotes", icon: FileText, screenKey: "quotes", moduleKey: "quotes" },
  { label: "Orders", href: "/orders", icon: ShoppingCart, screenKey: "orders", moduleKey: "orders" },
  { label: "Contracts", href: "/contracts", icon: FileSignature, screenKey: "contracts", moduleKey: "contracts" },
  { label: "CLM Templates", href: "/clm/templates", icon: Library, screenKey: "contracts", moduleKey: "contracts" },
  { label: "CLM Renewals", href: "/clm/renewals", icon: RefreshCw, screenKey: "contracts", moduleKey: "contracts" },
  { label: "CLM Workflow", href: "/clm/workflow", icon: Zap, screenKey: "contracts", adminOnly: true },
  { label: "CLM Alerts", href: "/clm/notifications", icon: Bell, screenKey: "contracts", adminOnly: true },
  { label: "Cases", href: "/cases", icon: LifeBuoy, screenKey: "cases" },
  { label: "Reports", href: "/reports", icon: BarChart3, screenKey: "reports" },
  { label: "AI Assistant", href: "/ai-assistant", icon: Bot, screenKey: "ai-assistant" },
  { label: "Approvals", href: "/approvals", icon: ShieldCheck, screenKey: "approvals" },
  { label: "Support", href: "/support", icon: Mail, screenKey: "support" },
  { label: "Product Rules", href: "/admin/product-rules", icon: Sliders, screenKey: "products", adminOnly: true },
  { label: "System Admin", href: "/users", icon: Settings, screenKey: "users" },
  // STIMS — Sales Performance
  { label: "Sales Performance", href: "/stims/dashboard", icon: BarChart3 },
  { label: "Target Cycles", href: "/stims/target-cycles", icon: Target },
  { label: "Incentive Plans", href: "/stims/incentive-plans", icon: TrendingUp },
  { label: "Calc Runs & Payouts", href: "/stims/calc-runs", icon: DollarSign },
  { label: "Comp Admin", href: "/stims/admin", icon: Settings2, adminOnly: true },
  // CPQ items (only shown when cpqEnabled)
  { label: "CPQ", href: "/cpq", icon: Cpu, cpqOnly: true },
  { label: "Guided Selling", href: "/cpq/guided-selling", icon: GitBranch, cpqOnly: true },
  { label: "CPQ Configurator", href: "/cpq/configurator", icon: SlidersHorizontal, cpqOnly: true },
  { label: "Quote Line Editor", href: "/cpq/qle", icon: Table2, cpqOnly: true },
  { label: "Pricing Rules", href: "/cpq/pricing", icon: TrendingUp, cpqOnly: true },
  { label: "CPQ Settings", href: "/cpq/admin", icon: Settings2, cpqOnly: true, adminOnly: true },
];

// 4 pinned tabs for the mobile bottom bar; "More" is the 5th slot
const BOTTOM_NAV = [
  { label: "Home", href: "/", icon: LayoutDashboard },
  { label: "Leads", href: "/leads", icon: UserPlus },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Opportunities", href: "/opportunities", icon: Briefcase },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { displayCurrency, setDisplayCurrency, supported } = useCurrency();
  const { cpqEnabled } = useCpqEnabled();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  // App Launcher state
  const appKey = `crmai:activeApp:${user?.id ?? "anon"}`;
  const [activeAppId, setActiveAppId] = useState<string>(() => {
    try { return localStorage.getItem(appKey) ?? ALL_APP_ID; } catch { return ALL_APP_ID; }
  });
  const [launcherOpen, setLauncherOpen] = useState(false);

  const switchApp = (appId: string) => {
    setActiveAppId(appId);
    try { localStorage.setItem(appKey, appId); } catch {}
    setLauncherOpen(false);
  };

  // Only show apps that are available (CPQ gated, module gated)
  const availableApps = useMemo<AppDefinition[]>(() => {
    return APP_DEFINITIONS.filter((app) => {
      if (app.cpqRequired && !cpqEnabled) return false;
      if (app.moduleKeys?.length) {
        return app.moduleKeys.some((k) => user?.enabledModules?.[k] !== false);
      }
      return true;
    });
  }, [cpqEnabled, user?.enabledModules]);

  const activeApp = availableApps.find((a) => a.id === activeAppId) ?? null;
  const activeAppLabel = activeApp?.name ?? "All Apps";

  const isActive = (href: string) => {
    if (href === "/") return location === "/" || location === "/dashboard";
    return location === href || location.startsWith(href + "/");
  };

  // Refs + state for Salesforce-style overflow into a "More" dropdown.
  const navContainerRef = useRef<HTMLDivElement>(null);
  const navMeasureRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLDivElement>(null);
  const [visibleNavCount, setVisibleNavCount] = useState<number>(Number.MAX_SAFE_INTEGER);

  // Per-user, user-controlled nav tab order (persisted to localStorage).
  const navOrderKey = `crmai:navOrder:${user?.id ?? "anon"}`;
  const [navOrder, setNavOrder] = useState<string[]>([]);
  const [dragHref, setDragHref] = useState<string | null>(null);
  const [dragOverHref, setDragOverHref] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(navOrderKey);
      setNavOrder(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setNavOrder([]);
    }
  }, [navOrderKey]);

  const persistNavOrder = (next: string[]) => {
    setNavOrder(next);
    try { localStorage.setItem(navOrderKey, JSON.stringify(next)); } catch { /* ignore */ }
  };

  useLayoutEffect(() => {
    const container = navContainerRef.current;
    const measure = navMeasureRef.current;
    if (!container || !measure) return;
    const compute = () => {
      const containerWidth = container.clientWidth;
      const items = Array.from(measure.children) as HTMLElement[];
      const widths = items.map((el) => el.getBoundingClientRect().width);
      const total = widths.reduce((a, b) => a + b, 0);
      if (total <= containerWidth) {
        setVisibleNavCount(items.length);
        return;
      }
      const moreWidth = moreBtnRef.current?.getBoundingClientRect().width ?? 80;
      const limit = containerWidth - moreWidth - 8;
      let used = 0;
      let count = 0;
      for (let i = 0; i < widths.length; i++) {
        if (used + widths[i] > limit) break;
        used += widths[i];
        count++;
      }
      setVisibleNavCount(Math.max(1, count));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [user?.role, user?.screenAccess, user?.enabledModules, cpqEnabled]);

  const visibleNavItems = useMemo(() => {
    const isFullAdmin = user?.role === "admin" || user?.role === "super_admin";
    const appHrefs = activeApp ? new Set(activeApp.navHrefs) : null;
    const allowed = BASE_NAV_ITEMS.filter((item) => {
      // Filter by active app
      if (appHrefs && !appHrefs.has(item.href)) return false;
      // Hide CPQ items when CPQ is not enabled
      if (item.cpqOnly && !cpqEnabled) return false;
      // Module gate
      if (item.moduleKey && user?.enabledModules) {
        if (!user.enabledModules[item.moduleKey]) return false;
      }
      if (item.adminOnly && !isFullAdmin) return false;
      if (isFullAdmin) return true;
      if (!item.screenKey) return true;
      const lvl = user?.screenAccess?.[item.screenKey];
      return lvl != null && lvl !== "none";
    });
    if (navOrder.length === 0) return allowed;
    const byHref = new Map(allowed.map((i) => [i.href, i] as const));
    const ordered: typeof allowed = [];
    for (const href of navOrder) {
      const it = byHref.get(href);
      if (it) { ordered.push(it); byHref.delete(href); }
    }
    for (const it of allowed) if (byHref.has(it.href)) ordered.push(it);
    return ordered;
  }, [user?.role, user?.screenAccess, navOrder, cpqEnabled, activeApp]);

  const reorderNav = (sourceHref: string, targetHref: string) => {
    if (sourceHref === targetHref) return;
    const hrefs = visibleNavItems.map((i) => i.href);
    const from = hrefs.indexOf(sourceHref);
    const to = hrefs.indexOf(targetHref);
    if (from < 0 || to < 0) return;
    const next = hrefs.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persistNavOrder(next);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <ImpersonationBanner />
      <div className="flex h-screen bg-background text-foreground overflow-hidden ">

        {/* ── Mobile: Full slide-over drawer ── */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <aside
              className="w-72 h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200"
              style={{ background: "hsl(var(--sidebar))" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border">
                <div className="flex items-center gap-2">
                  <img src="/arbormind-logo.png" alt="" className="w-7 h-7" />
                  <span className="font-bold text-white text-sm">arbormind.in</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="text-white/70 hover:text-white hover:bg-white/10">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
                {visibleNavItems.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                    <div className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-sm",
                      isActive(item.href) ? "bg-white/15 text-white font-medium" : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-white"
                    )}>
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {item.label}
                      {(item as any).cpqOnly && (
                        <span className="ml-auto text-[9px] font-bold uppercase tracking-wide bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded">CPQ</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              {/* User info at bottom of drawer */}
              <div className="p-4 border-t border-sidebar-border">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="w-9 h-9 border border-white/20">
                    {user?.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                    <AvatarFallback className="bg-sidebar-primary text-white text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{user?.name ?? "User"}</div>
                    <div className="text-xs text-white/50 truncate">{user?.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => { void logout(); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-white/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* ── Main Content Area ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <header className="h-14 border-b border-sidebar-border bg-card flex items-center justify-between px-4 lg:px-6 z-20 flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-sm font-bold text-primary">arbormind<span className="text-muted-foreground font-normal">.in</span></span>
              <GlobalSearch />
            </div>

            <div className="flex items-center gap-2">
              {/* App Launcher waffle button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
                onClick={() => setLauncherOpen((o) => !o)}
                title={`App Launcher — ${activeAppLabel}`}
              >
                <Grid3x3 className="w-4 h-4" />
                {activeApp && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background"
                    style={{ background: "hsl(var(--primary))" }} />
                )}
              </Button>

              {/* Display currency switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-foreground gap-1 font-medium"
                    title="Display currency"
                  >
                    <span className="text-base leading-none">{CURRENCY_META[displayCurrency].symbol}</span>
                    <span className="text-xs">{displayCurrency}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border text-foreground min-w-[10rem]">
                  {supported.map((code) => (
                    <DropdownMenuItem
                      key={code}
                      onClick={() => setDisplayCurrency(code)}
                      className={cn(
                        "cursor-pointer hover:bg-muted flex items-center gap-2",
                        code === displayCurrency && "text-primary font-semibold",
                      )}
                    >
                      <span className="text-base w-4 text-center">{CURRENCY_META[code].symbol}</span>
                      <span className="flex-1">{CURRENCY_META[code].label}</span>
                      <span className="text-xs text-muted-foreground">{code}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Dark / Light mode toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={toggleTheme}
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>

              <NotificationBell />

              {/* Quick-create dropdown — visible sm+ */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="hidden sm:flex h-8 bg-primary hover:bg-primary/90 text-white text-xs gap-1 shadow-sm">
                    <Plus className="w-3.5 h-3.5" /> New
                    <ChevronDown className="w-3 h-3 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {[
                    { label: "Lead", href: "/leads", icon: UserPlus },
                    { label: "Contact", href: "/contacts", icon: Users },
                    { label: "Account", href: "/accounts", icon: Building2 },
                    { label: "Opportunity", href: "/opportunities", icon: Briefcase },
                    { label: "Campaign", href: "/campaigns", icon: Megaphone },
                  ].map((item) => (
                    <DropdownMenuItem key={item.href} asChild className="cursor-pointer">
                      <Link href={item.href} className="flex items-center gap-2 text-sm">
                        <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Avatar */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="w-7 h-7 border border-border cursor-pointer">
                    {user?.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-2 py-2">
                    <div className="text-sm font-semibold truncate">{user?.name ?? "User"}</div>
                    <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" asChild>
                    <Link href="/users" className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Team & Settings
                    </Link>
                  </DropdownMenuItem>
                  {user?.role === "admin" && (
                    <DropdownMenuItem className="cursor-pointer" asChild>
                      <Link href="/admin/approvals" className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        Approval Configuration
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {(user?.role === "admin" || user?.role === "super_admin") && (
                    <DropdownMenuItem className="cursor-pointer" asChild>
                      <Link href="/cpq/admin" className="flex items-center gap-2">
                        <Cpu className="w-4 h-4" />
                        CPQ Settings
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={() => void logout()}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* App Launcher Overlay */}
          {launcherOpen && (
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4" onClick={() => setLauncherOpen(false)}>
              <div
                className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-in fade-in slide-in-from-top-2 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">App Launcher</h2>
                    <p className="text-xs text-muted-foreground">Currently in: <span className="font-semibold text-foreground">{activeAppLabel}</span></p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setLauncherOpen(false)}>
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>

                {/* All Apps tile */}
                <div className="mb-4">
                  <button
                    onClick={() => switchApp(ALL_APP_ID)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all",
                      activeAppId === ALL_APP_ID
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-lg shrink-0">
                      🏠
                    </div>
                    <div>
                      <p className="text-sm font-semibold">All Apps</p>
                      <p className="text-xs text-muted-foreground">Show the full navigation</p>
                    </div>
                    {activeAppId === ALL_APP_ID && <span className="ml-auto text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Active</span>}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {availableApps.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => switchApp(app.id)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all",
                        activeAppId === app.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/50"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0", app.color)}>
                        {app.emoji}
                      </div>
                      <div className="min-w-0">
                        <p className={cn("text-sm font-semibold truncate", activeAppId === app.id && "text-primary")}>{app.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{app.description}</p>
                      </div>
                      {activeAppId === app.id && <span className="ml-auto shrink-0 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Active</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Salesforce-style horizontal top nav (desktop only) */}
          <nav className="hidden md:block border-b border-sidebar-border flex-shrink-0 z-10 relative" style={{ background: "hsl(var(--sidebar))" }}>
            {/* Hidden measurer */}
            <div
              ref={navMeasureRef}
              aria-hidden="true"
              className="absolute -top-[9999px] left-0 flex items-stretch px-2 pointer-events-none"
            >
              {visibleNavItems.map((item) => (
                <div key={`m-${item.href}`} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap">
                  <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {item.label}
                </div>
              ))}
            </div>

            <div ref={navContainerRef} className="flex items-stretch gap-0 px-2 overflow-hidden">
              {/* Active app pill */}
              {activeApp && (
                <button
                  onClick={() => setLauncherOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white/70 hover:text-white whitespace-nowrap border-r border-white/10 mr-1 shrink-0"
                  title="Switch app"
                >
                  <span>{activeApp.emoji}</span>
                  <span>{activeApp.name}</span>
                  <Grid3x3 className="w-3 h-3 opacity-50" />
                </button>
              )}
              {visibleNavItems.slice(0, visibleNavCount).map((item) => {
                const active = isActive(item.href);
                const isDragging = dragHref === item.href;
                const isDragOver = dragOverHref === item.href && dragHref !== null && dragHref !== item.href;
                const isCpq = (item as any).cpqOnly;
                return (
                  <div
                    key={item.href}
                    draggable
                    onDragStart={(e) => {
                      setDragHref(item.href);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", item.href);
                    }}
                    onDragOver={(e) => {
                      if (!dragHref) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverHref !== item.href) setDragOverHref(item.href);
                    }}
                    onDragLeave={() => {
                      if (dragOverHref === item.href) setDragOverHref(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const src = e.dataTransfer.getData("text/plain") || dragHref;
                      if (src) reorderNav(src, item.href);
                      setDragHref(null);
                      setDragOverHref(null);
                    }}
                    onDragEnd={() => {
                      setDragHref(null);
                      setDragOverHref(null);
                    }}
                    className={cn(
                      "relative",
                      isDragging && "opacity-40",
                      isDragOver && "before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-white before:rounded-full"
                    )}
                    title="Drag to reorder"
                  >
                    <Link href={item.href}>
                      <div
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors cursor-grab active:cursor-grabbing relative",
                          active
                            ? "text-white"
                            : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        {item.label}
                        {isCpq && (
                          <span className="text-[8px] font-bold uppercase tracking-wide bg-blue-400/30 text-blue-200 px-1 py-0.5 rounded leading-none">CPQ</span>
                        )}
                        {active && (
                          <span className="absolute left-2 right-2 bottom-0 h-0.5 bg-white rounded-t-full" />
                        )}
                      </div>
                    </Link>
                  </div>
                );
              })}

              {visibleNavCount < visibleNavItems.length && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div
                      ref={moreBtnRef}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer relative",
                        visibleNavItems.slice(visibleNavCount).some((i) => isActive(i.href))
                          ? "text-white"
                          : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5 flex-shrink-0" />
                      More
                      <ChevronDown className="w-3 h-3" />
                      {visibleNavItems.slice(visibleNavCount).some((i) => isActive(i.href)) && (
                        <span className="absolute left-2 right-2 bottom-0 h-0.5 bg-white rounded-t-full" />
                      )}
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    {visibleNavItems.slice(visibleNavCount).map((item) => (
                      <DropdownMenuItem key={item.href} asChild className="cursor-pointer">
                        <Link href={item.href} className={cn(
                          "flex items-center gap-2 text-sm",
                          isActive(item.href) && "text-primary font-medium"
                        )}>
                          <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                          {item.label}
                          {(item as any).cpqOnly && (
                            <span className="ml-auto text-[9px] font-bold bg-blue-100 text-blue-600 px-1 py-0.5 rounded">CPQ</span>
                          )}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </nav>

          {/* Page Content */}
          <main className="flex-1 overflow-auto bg-background p-1 sm:p-1.5 lg:p-2 pb-20 md:pb-2 lg:pb-2" style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--muted-foreground) / 0.4) transparent" }}>
            <div className="border-2 border-blue-700 dark:border-blue-800 rounded-md bg-card px-4 py-3 sm:px-5 sm:py-3 lg:px-8 lg:py-4 shadow-sm animate-in fade-in duration-300 min-h-full">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* ── Mobile: Bottom Navigation Bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md shadow-[0_-2px_16px_rgba(0,0,0,0.12)]">
        <div className="flex items-stretch h-16">
          {BOTTOM_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <div className={cn(
                  "relative flex flex-col items-center justify-center gap-1 h-full transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}>
                  {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-primary rounded-b-full" />}
                  <div className={cn("p-1.5 rounded-xl transition-colors", active && "bg-primary/10")}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium leading-none">{item.label}</span>
                </div>
              </Link>
            );
          })}
          {/* More button → opens full slide-over */}
          <button
            className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>
      <AIChatbot />
    </TooltipProvider>
  );
}

interface SearchHit {
  type: "lead" | "opportunity" | "account" | "contact" | "campaign";
  id: number;
  title: string;
  subtitle: string | null;
  meta: string | null;
  href: string;
}

const TYPE_LABEL: Record<SearchHit["type"], string> = {
  lead: "Lead", opportunity: "Opportunity", account: "Account", contact: "Contact", campaign: "Campaign",
};
const TYPE_COLOR: Record<SearchHit["type"], string> = {
  lead: "bg-blue-100 text-blue-700",
  opportunity: "bg-emerald-100 text-emerald-700",
  account: "bg-purple-100 text-purple-700",
  contact: "bg-amber-100 text-amber-700",
  campaign: "bg-pink-100 text-pink-700",
};

function GlobalSearch() {
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (debounced.length < 2) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debounced)}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : { results: [] })
      .then((d: { results?: SearchHit[] }) => { if (!cancelled) setResults(d.results ?? []); })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debounced]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (hit: SearchHit) => {
    setOpen(false);
    setQ("");
    navigate(hit.href);
  };

  return (
    <div ref={wrapRef} className="hidden sm:flex items-center relative max-w-sm w-full ml-2">
      <Search className="w-3.5 h-3.5 absolute left-3 text-muted-foreground pointer-events-none" />
      <input
        placeholder="Search leads, opportunities, accounts…"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setQ(""); setOpen(false); (e.target as HTMLInputElement).blur(); }
          if (e.key === "Enter" && results[0]) { e.preventDefault(); go(results[0]); }
        }}
        className="w-full pl-9 pr-8 h-8 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground"
      />
      {q && (
        <button
          type="button"
          onClick={() => { setQ(""); setResults([]); }}
          className="absolute right-2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {open && q.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-96 overflow-y-auto z-50">
          {loading && results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">No matches for "{q}"</div>
          ) : (
            <ul className="py-1">
              {results.map(hit => (
                <li key={`${hit.type}-${hit.id}`}>
                  <button
                    type="button"
                    onClick={() => go(hit)}
                    className="w-full text-left px-3 py-2 hover:bg-muted flex items-start gap-2"
                  >
                    <span className={cn("text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded shrink-0 mt-0.5", TYPE_COLOR[hit.type])}>
                      {TYPE_LABEL[hit.type]}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-foreground truncate">{hit.title}</span>
                      {hit.subtitle && <span className="block text-xs text-muted-foreground truncate">{hit.subtitle}</span>}
                    </span>
                    {hit.meta && <span className="text-[10px] text-muted-foreground capitalize shrink-0 mt-1">{hit.meta}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ImpersonationBanner() {
  const { user, refetch } = useAuth();
  const [stopping, setStopping] = React.useState(false);
  if (!user?.isImpersonating || !user.originalUser) return null;

  const stop = async () => {
    setStopping(true);
    try {
      await fetch("/api/auth/stop-impersonating", { method: "POST", credentials: "include" });
      await refetch();
      window.location.reload();
    } finally {
      setStopping(false);
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs sm:text-sm px-4 py-2 flex items-center justify-center gap-3 shadow-sm">
      <UserCog className="w-4 h-4 shrink-0" />
      <span className="text-center">
        Viewing as <strong>{user.name || user.email}</strong>{" "}
        <span className="opacity-80">({user.role})</span>
        <span className="opacity-80"> · signed in as {user.originalUser.email}</span>
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-xs bg-white/95 text-orange-700 hover:bg-white shrink-0"
        onClick={stop}
        disabled={stopping}
      >
        {stopping ? "Returning…" : "Return to my account"}
      </Button>
    </div>
  );
}
