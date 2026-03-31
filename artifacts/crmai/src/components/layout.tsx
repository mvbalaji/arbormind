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
  ChevronDown
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuth } from "@/context/auth";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Leads", href: "/leads", icon: UserPlus },
  { label: "Accounts", href: "/accounts", icon: Building2 },
  { label: "Opportunities", href: "/opportunities", icon: Briefcase },
  { label: "Activities", href: "/activities", icon: Activity },
  { label: "Products", href: "/products", icon: Package },
  { label: "Quotes", href: "/quotes", icon: FileText },
  { label: "Cases", href: "/cases", icon: LifeBuoy },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Users", href: "/users", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/50 backdrop-blur-xl z-20 relative">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden bg-black/20">
              <img src="/arbormind-logo.png" alt="arbormind.in" className="w-6 h-6 object-cover" />
            </div>
            <span className="font-display font-bold text-xl tracking-wide">arbormind.in</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1 custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="w-full">
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer",
                  isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}>
                  <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
          
          <div className="mt-8 mb-4 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Intelligence</div>
          <Link href="/ai-assistant" className="w-full">
            <div className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group cursor-pointer relative overflow-hidden",
              location === "/ai-assistant" 
                ? "bg-accent/20 text-white font-medium shadow-[0_0_15px_rgba(139,92,246,0.2)]" 
                : "text-muted-foreground hover:bg-white/5 hover:text-white"
            )}>
              {location === "/ai-assistant" && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 pointer-events-none" />
              )}
              <Bot className={cn("w-5 h-5 transition-colors z-10", location === "/ai-assistant" ? "text-accent" : "text-muted-foreground group-hover:text-accent")} />
              <span className="z-10 ai-gradient-text group-hover:text-transparent">AI Assistant</span>
            </div>
          </Link>
        </div>
        
        <div className="p-4 border-t border-border mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left">
                <Avatar className="w-9 h-9 border border-white/10 shadow-md flex-shrink-0">
                  {user?.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                  <AvatarFallback className="bg-primary/20 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium leading-none truncate">{user?.name ?? "User"}</span>
                  <span className="text-xs text-muted-foreground mt-1 capitalize">{user?.role ?? "sales"}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
              <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user?.email}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-500 focus:text-red-500 cursor-pointer"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <aside className="w-64 h-full bg-card border-r border-border flex flex-col shadow-2xl animate-in slide-in-from-left-full duration-200" onClick={e => e.stopPropagation()}>
            <div className="h-16 flex items-center justify-between px-6 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center overflow-hidden bg-black/20">
                  <img src="/arbormind-logo.png" alt="arbormind.in" className="w-5 h-5 object-cover" />
                </div>
                <span className="font-display font-bold text-sm">arbormind.in</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                    location === item.href ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  )}>
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </div>
                </Link>
              ))}
              <Link href="/ai-assistant" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="flex items-center gap-3 px-3 py-3 rounded-lg mt-4 bg-accent/10 text-accent font-medium">
                  <Bot className="w-5 h-5" />
                  AI Assistant
                </div>
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
        {/* Top Header */}
        <header className="h-16 border-b border-border/50 bg-background/50 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 z-10">
          <div className="flex items-center gap-4 flex-1">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            
            <div className="hidden sm:flex items-center relative max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
              <Input 
                placeholder="Search everywhere..." 
                className="pl-9 bg-black/20 border-white/5 focus-visible:ring-primary/50 rounded-full h-10 shadow-inner"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 relative">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            </Button>
            <Button variant="default" className="hidden sm:flex rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity border-0 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              + Quick Add
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="mx-auto max-w-7xl animate-in fade-in duration-500 slide-in-from-bottom-4">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
