import { useState, useMemo } from "react";
import { Bell, UserPlus, AlertTriangle, Clock, Briefcase, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useListLeads, useListOpportunities, useListActivities } from "@workspace/api-client-react";
import { formatDistanceToNow, isBefore, isAfter, addDays } from "date-fns";
import { cn } from "@/lib/utils";

type NotifType = "new_lead" | "closing_soon" | "overdue" | "activity";

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  subtitle: string;
  href: string;
  time: Date;
}

const TYPE_META: Record<NotifType, { icon: React.ElementType; bg: string; fg: string }> = {
  new_lead:     { icon: UserPlus,      bg: "bg-blue-100 dark:bg-blue-950",   fg: "text-blue-600" },
  closing_soon: { icon: Clock,         bg: "bg-amber-100 dark:bg-amber-950", fg: "text-amber-600" },
  overdue:      { icon: AlertTriangle, bg: "bg-red-100 dark:bg-red-950",     fg: "text-red-600" },
  activity:     { icon: Briefcase,     bg: "bg-violet-100 dark:bg-violet-950", fg: "text-violet-600" },
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("crm-notif-read") ?? "[]"));
    } catch {
      return new Set();
    }
  });

  const { data: leadsData } = useListLeads({ limit: 30 });
  const { data: oppsData } = useListOpportunities({ limit: 50 });
  const { data: activitiesData } = useListActivities({ limit: 10 });

  const notifications = useMemo<Notification[]>(() => {
    const now = new Date();
    const sevenDaysAgo = addDays(now, -7);
    const sevenDaysAhead = addDays(now, 7);
    const items: Notification[] = [];

    // New leads (created in last 7 days, status = new or contacted)
    for (const lead of leadsData?.data ?? []) {
      const createdAt = new Date(lead.createdAt);
      if ((lead.status === "new" || lead.status === "contacted") && isAfter(createdAt, sevenDaysAgo)) {
        items.push({
          id: `lead-${lead.id}`,
          type: "new_lead",
          title: `New lead: ${lead.firstName} ${lead.lastName}`,
          subtitle: lead.company ?? lead.email ?? "No company",
          href: `/leads/${lead.id}`,
          time: createdAt,
        });
      }
    }

    // Opportunities: overdue or closing soon
    for (const opp of oppsData?.data ?? []) {
      if (opp.stage === "closed_won" || opp.stage === "closed_lost" || !opp.closeDate) continue;
      const closeDate = new Date(opp.closeDate);
      if (isBefore(closeDate, now)) {
        items.push({
          id: `opp-overdue-${opp.id}`,
          type: "overdue",
          title: `Overdue: ${opp.name}`,
          subtitle: `Close date was ${formatDistanceToNow(closeDate, { addSuffix: true })}`,
          href: `/opportunities/${opp.id}`,
          time: closeDate,
        });
      } else if (isBefore(closeDate, sevenDaysAhead)) {
        items.push({
          id: `opp-closing-${opp.id}`,
          type: "closing_soon",
          title: `Closing soon: ${opp.name}`,
          subtitle: `Due ${formatDistanceToNow(closeDate, { addSuffix: true })}`,
          href: `/opportunities/${opp.id}`,
          time: closeDate,
        });
      }
    }

    // Recent activities (last 5)
    for (const act of (activitiesData?.data ?? []).slice(0, 5)) {
      const t = new Date(act.createdAt ?? now);
      if (isAfter(t, sevenDaysAgo)) {
        items.push({
          id: `act-${act.id}`,
          type: "activity",
          title: act.subject ?? `${act.type} logged`,
          subtitle: act.description?.slice(0, 60) ?? `Activity · ${act.type}`,
          href: "/activities",
          time: t,
        });
      }
    }

    // Sort newest first, cap at 20
    return items.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 20);
  }, [leadsData, oppsData, activitiesData]);

  const unread = notifications.filter((n) => !readIds.has(n.id));
  const unreadCount = unread.length;

  const persistRead = (ids: Set<string>) => {
    setReadIds(ids);
    try { localStorage.setItem("crm-notif-read", JSON.stringify([...ids])); } catch {}
  };

  const markRead = (id: string) => {
    persistRead(new Set([...readIds, id]));
  };

  const markAllRead = () => {
    persistRead(new Set(notifications.map((n) => n.id)));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-primary rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5 leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={6} className="w-[340px] p-0 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Badge className="text-[10px] h-4 px-1.5 bg-primary/10 text-primary border-primary/20 font-semibold">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:text-primary/70 transition-colors font-medium"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <CheckCircle2 className="w-9 h-9 text-muted-foreground/25 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">You're all caught up!</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">No new notifications right now.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isRead = readIds.has(notif.id);
              const { icon: Icon, bg, fg } = TYPE_META[notif.type];
              return (
                <Link
                  key={notif.id}
                  href={notif.href}
                  onClick={() => { markRead(notif.id); setOpen(false); }}
                >
                  <div className={cn(
                    "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer",
                    !isRead && "bg-primary/[0.04]"
                  )}>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", bg)}>
                      <Icon className={cn("w-3.5 h-3.5", fg)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs leading-snug", isRead ? "text-muted-foreground" : "font-semibold text-foreground")}>
                        {notif.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-1">
                        {notif.subtitle}
                      </p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">
                        {formatDistanceToNow(notif.time, { addSuffix: true })}
                      </p>
                    </div>
                    {!isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border px-4 py-2.5">
            <Link href="/activities" onClick={() => setOpen(false)}>
              <span className="text-xs text-primary hover:text-primary/70 transition-colors font-medium">
                View all activity →
              </span>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
