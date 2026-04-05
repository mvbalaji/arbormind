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
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Mail,
  Megaphone,
  Plus,
  Upload,
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
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuth } from "@/context/auth";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

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

        {/* Narrow Icon Sidebar */}
        <aside className="hidden md:flex flex-col w-14 border-r border-sidebar-border z-30 relative flex-shrink-0" style={{ background: "hsl(var(--sidebar))" }}>
          {/* Logo */}
          <Link href="/" className="h-14 flex items-center justify-center border-b border-sidebar-border hover:opacity-90 transition-opacity flex-shrink-0">
            <div className="w-8 h-8 rounded flex items-center justify-center overflow-hidden bg-white/10">
              <img src="/arbormind-logo.png" alt="arbormind.in" className="w-7 h-7 object-cover" />
            </div>
          </Link>

          {/* Nav Icons */}
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
                        <item.icon className="w-4.5 h-4.5" />
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

          {/* User Avatar at bottom */}
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
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                  onClick={() => void logout()}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <aside
              className="w-64 h-full flex flex-col shadow-2xl animate-in slide-in-from-left-full duration-200"
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
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm",
                      isActive(item.href) ? "bg-white/15 text-white" : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-white"
                    )}>
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </div>
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 z-20 flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-3 flex-1">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-muted-foreground h-8 w-8"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="w-4 h-4" />
              </Button>

              {/* App name */}
              <Link href="/" className="hidden md:flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors">
                <span className="text-primary font-bold">arbormind</span>
                <span className="text-muted-foreground font-normal">.in</span>
              </Link>

              <div className="hidden sm:flex items-center relative max-w-sm w-full ml-2">
                <Search className="w-3.5 h-3.5 absolute left-3 text-muted-foreground" />
                <input
                  placeholder="Search everything..."
                  className="w-full pl-9 pr-4 h-8 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full"></span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="hidden sm:flex h-8 bg-primary hover:bg-primary/90 text-white text-xs gap-1 shadow-sm"
                  >
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

              <Avatar className="w-7 h-7 border border-border cursor-pointer">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto bg-background">
            <div className="p-4 lg:p-6 animate-in fade-in duration-300">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
