import React, { useState } from "react";
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
  BarChart3,
  Bot,
  Settings,
  Search,
  X,
  LogOut,
  ChevronDown,
  Mail,
  Megaphone,
  Plus,
  MoreHorizontal,
  Sun,
  Moon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";
import { NotificationBell } from "@/components/notification-bell";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Leads", href: "/leads", icon: UserPlus },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Accounts", href: "/accounts", icon: Building2 },
  { label: "Opportunities", href: "/opportunities", icon: Briefcase },
  { label: "Campaigns", href: "/campaigns", icon: Megaphone },
  { label: "Activities", href: "/activities", icon: Activity },
  { label: "Products", href: "/products", icon: Package },
  { label: "Quotes", href: "/quotes", icon: FileText },
  { label: "Cases", href: "/cases", icon: LifeBuoy },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "AI Assistant", href: "/ai-assistant", icon: Bot },
  { label: "Support", href: "/support", icon: Mail },
  { label: "Team & Data", href: "/users", icon: Settings },
];

// 4 pinned tabs for the mobile bottom bar; "More" is the 5th slot
const BOTTOM_NAV = [
  { label: "Home", href: "/", icon: LayoutDashboard },
  { label: "Leads", href: "/leads", icon: UserPlus },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Opps", href: "/opportunities", icon: Briefcase },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const isActive = (href: string) => {
    if (href === "/") return location === "/" || location === "/dashboard";
    return location === href || location.startsWith(href + "/");
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">

        {/* ── Desktop: Narrow Icon Sidebar ── */}
        <aside className="hidden md:flex flex-col w-14 border-r border-sidebar-border z-30 relative flex-shrink-0" style={{ background: "hsl(var(--sidebar))" }}>
          <div className="h-14 flex items-center justify-center border-b border-sidebar-border flex-shrink-0">
            <div className="w-8 h-8 rounded flex items-center justify-center overflow-hidden bg-white/10">
              <img src="/arbormind-logo.png" alt="arbormind.in" className="w-7 h-7 object-cover" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-0.5 items-center custom-scrollbar">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link href={item.href} className="w-full">
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-all duration-150 cursor-pointer relative",
                        active
                          ? "bg-white/15 text-white"
                          : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-white"
                      )}>
                        {active && (
                          <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 rounded-r-full bg-white -translate-x-[5px]" />
                        )}
                        <item.icon className="w-[18px] h-[18px]" />
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-gray-900 text-white text-xs border-0">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          <div className="p-2 border-t border-sidebar-border flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center justify-center py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                  <Avatar className="w-8 h-8 border border-white/20 shadow-sm">
                    {user?.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                    <AvatarFallback className="bg-sidebar-primary text-white text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-56 mb-1 ml-2">
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
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={() => void logout()}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

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
                {NAV_ITEMS.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                    <div className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-sm",
                      isActive(item.href) ? "bg-white/15 text-white font-medium" : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-white"
                    )}>
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {item.label}
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
          <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 z-20 flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-sm font-bold text-primary">arbormind<span className="text-muted-foreground font-normal">.in</span></span>

              <div className="hidden sm:flex items-center relative max-w-sm w-full ml-2">
                <Search className="w-3.5 h-3.5 absolute left-3 text-muted-foreground" />
                <input
                  placeholder="Search everything..."
                  className="w-full pl-9 pr-4 h-8 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
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

              {/* Avatar — desktop only (mobile has it in drawer) */}
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={() => void logout()}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content — adds bottom padding on mobile to clear the nav bar */}
          <main className="flex-1 overflow-auto bg-background">
            <div className="p-3 sm:p-4 lg:p-6 pb-20 md:pb-4 lg:pb-6 animate-in fade-in duration-300">
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
    </TooltipProvider>
  );
}
