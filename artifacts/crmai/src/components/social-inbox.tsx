import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Send, Image, Paperclip, RefreshCw, ExternalLink, Check, CheckCheck, Clock, AlertCircle, MessageCircle, Zap } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// ── Platform config ───────────────────────────────────────────────────────────

type Platform = "linkedin" | "facebook" | "whatsapp" | "instagram";

const PLATFORMS: Record<Platform, {
  label: string;
  color: string;          // bg for active tab
  bubble: string;         // outbound bubble bg
  inboundBubble: string;  // inbound bubble bg
  textColor: string;
  icon: React.ReactNode;
  connectUrl: string;
  description: string;
}> = {
  linkedin: {
    label: "LinkedIn",
    color: "bg-[#0A66C2]",
    bubble: "bg-[#0A66C2] text-white",
    inboundBubble: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
    textColor: "text-[#0A66C2]",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    connectUrl: "https://www.linkedin.com/developers/apps",
    description: "Connect via LinkedIn Messaging API to send InMails and capture replies from prospects.",
  },
  facebook: {
    label: "Facebook",
    color: "bg-[#1877F2]",
    bubble: "bg-[#1877F2] text-white",
    inboundBubble: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
    textColor: "text-[#1877F2]",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    connectUrl: "https://developers.facebook.com/apps",
    description: "Connect via Facebook Messenger API to receive Lead Ad submissions and reply to messages.",
  },
  whatsapp: {
    label: "WhatsApp",
    color: "bg-[#25D366]",
    bubble: "bg-[#25D366] text-white",
    inboundBubble: "bg-white text-slate-800 border border-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600",
    textColor: "text-[#25D366]",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
      </svg>
    ),
    connectUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    description: "Connect via WhatsApp Business API (Meta Cloud API) for two-way messaging with leads.",
  },
  instagram: {
    label: "Instagram",
    color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400",
    bubble: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white",
    inboundBubble: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
    textColor: "text-pink-600",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
    connectUrl: "https://developers.facebook.com/docs/instagram-api",
    description: "Connect via Instagram Graph API to capture DMs and story replies from prospects.",
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface SocialMessage {
  id: number;
  leadId: number | null;
  contactId: number | null;
  platform: string;
  direction: "inbound" | "outbound";
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  senderName: string | null;
  senderHandle: string | null;
  senderAvatarUrl: string | null;
  platformProfileUrl: string | null;
  status: string;
  isRead: boolean;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
  sentByUserName: string | null;
}

interface SocialInboxProps {
  leadId: number;
  leadName: string;
}

// ── Message status icon ───────────────────────────────────────────────────────
function StatusIcon({ status }: { status: string }) {
  if (status === "failed") return <AlertCircle className="w-3 h-3 text-red-400" />;
  if (status === "read") return <CheckCheck className="w-3 h-3 text-blue-300" />;
  if (status === "delivered") return <CheckCheck className="w-3 h-3 opacity-60" />;
  if (status === "sent") return <Check className="w-3 h-3 opacity-60" />;
  return <Clock className="w-3 h-3 opacity-40" />;
}

// ── Simulate inbound reply (demo helper) ─────────────────────────────────────
const DEMO_REPLIES: Record<Platform, string[]> = {
  linkedin: [
    "Thanks for reaching out! I'd be happy to learn more about your solution.",
    "Hi! Yes, we're actively looking at CRM tools. Can we schedule a call?",
    "Interesting timing — we just wrapped up budget planning. Let's chat.",
    "Could you send over a product overview? I'll share it with my team.",
  ],
  facebook: [
    "Hey! Saw your ad and wanted to know more about pricing.",
    "We've been struggling with our current system. What makes yours different?",
    "Can you share a case study from our industry?",
    "I filled in your lead form. When can we connect?",
  ],
  whatsapp: [
    "Hi! I got your number from the website. Looking for a demo.",
    "Sure, I'm free Thursday afternoon for a quick call.",
    "Could you send me the pricing sheet on WhatsApp?",
    "Thanks! Looking forward to the demo link. 👍",
  ],
  instagram: [
    "Loved your post! How does your product help with lead tracking?",
    "Just DMed you from your story. Would love a walkthrough.",
    "Your content is great 🙌 What's the best way to get started?",
    "Following you for a while — finally ready to explore this properly.",
  ],
};

// ── Main component ────────────────────────────────────────────────────────────
export function SocialInbox({ leadId, leadName }: SocialInboxProps) {
  const [activePlatform, setActivePlatform] = useState<Platform>("linkedin");
  const [compose, setCompose] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const qKey = ["social-messages", leadId, activePlatform];

  const { data, isLoading, refetch } = useQuery<{ data: SocialMessage[] }>({
    queryKey: qKey,
    queryFn: async () => {
      const params = new URLSearchParams({ leadId: String(leadId), platform: activePlatform });
      const res = await fetch(`/api/social-messages?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json() as Promise<{ data: SocialMessage[] }>;
    },
    refetchInterval: 15_000,
  });

  const { data: statsData } = useQuery<{ stats: Record<string, { inbound: number; outbound: number; total: number }> }>({
    queryKey: ["social-stats", leadId],
    queryFn: async () => {
      const res = await fetch(`/api/social-messages/stats?leadId=${leadId}`, { credentials: "include" });
      return res.json();
    },
    refetchInterval: 15_000,
  });

  const messages = data?.data ?? [];
  const stats = statsData?.stats ?? {};

  // Scroll to bottom when messages load or platform changes
  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [messages.length, activePlatform]);

  const platformConfig = PLATFORMS[activePlatform];

  // ── Send outbound message ─────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!compose.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/social-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          leadId,
          platform: activePlatform,
          direction: "outbound",
          content: compose.trim(),
          status: "sent",
        }),
      });
      if (!res.ok) throw new Error("Send failed");
      setCompose("");
      await queryClient.invalidateQueries({ queryKey: qKey });
      await queryClient.invalidateQueries({ queryKey: ["social-stats", leadId] });
    } catch {
      toast({ title: "Send failed", description: "Could not send message.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  // ── Simulate inbound reply (demo / testing) ───────────────────────────────
  const simulateReply = async () => {
    setIsSimulating(true);
    const pool = DEMO_REPLIES[activePlatform];
    const content = pool[Math.floor(Math.random() * pool.length)];
    const handles: Record<Platform, string> = {
      linkedin: "@prospect-linkedin",
      facebook: "@prospect-fb",
      whatsapp: "+44 7700 900123",
      instagram: "@prospect_ig",
    };
    try {
      const res = await fetch("/api/social-messages/inbound-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          leadId,
          platform: activePlatform,
          content,
          senderName: leadName,
          senderHandle: handles[activePlatform],
        }),
      });
      if (!res.ok) throw new Error("Webhook failed");
      await queryClient.invalidateQueries({ queryKey: qKey });
      await queryClient.invalidateQueries({ queryKey: ["social-stats", leadId] });
      toast({ title: `Inbound ${platformConfig.label} message received`, description: "Simulated for demo purposes." });
    } catch {
      toast({ title: "Simulation failed", variant: "destructive" });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Platform Tabs ── */}
      <div className="flex gap-1 px-3 pt-3 pb-1 border-b border-border flex-wrap">
        {(Object.keys(PLATFORMS) as Platform[]).map((p) => {
          const cfg = PLATFORMS[p];
          const count = stats[p]?.total ?? 0;
          const isActive = activePlatform === p;
          return (
            <button
              key={p}
              onClick={() => setActivePlatform(p)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                isActive
                  ? `${cfg.color} text-white shadow-sm`
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cfg.icon}
              {cfg.label}
              {count > 0 && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={() => void refetch()}
          className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Platform header ── */}
      <div className={cn("flex items-center justify-between px-4 py-2 text-white text-sm", platformConfig.color)}>
        <div className="flex items-center gap-2">
          {platformConfig.icon}
          <span className="font-semibold">{platformConfig.label} · {leadName}</span>
          {messages.length > 0 && (
            <span className="text-xs opacity-75">
              · {messages.length} message{messages.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void simulateReply()}
            disabled={isSimulating}
            className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 rounded-full px-2.5 py-1 transition-colors"
            title="Simulate an inbound reply (demo)"
          >
            <Zap className="w-3 h-3" />
            {isSimulating ? "Simulating…" : "Simulate Reply"}
          </button>
        </div>
      </div>

      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[280px] max-h-[420px] bg-muted/20">
        {isLoading ? (
          <div className="flex items-center justify-center h-full py-12">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <EmptyState platform={activePlatform} />
        ) : (
          messages.map((msg, idx) => {
            const isOut = msg.direction === "outbound";
            const showDate =
              idx === 0 ||
              new Date(msg.createdAt).toDateString() !== new Date(messages[idx - 1].createdAt).toDateString();

            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-border/60" />
                    <span className="text-[10px] text-muted-foreground px-2 font-medium">
                      {format(new Date(msg.createdAt), "EEE, MMM d")}
                    </span>
                    <div className="flex-1 h-px bg-border/60" />
                  </div>
                )}
                <div className={cn("flex gap-2 items-end", isOut ? "flex-row-reverse" : "flex-row")}>
                  {/* Avatar */}
                  {!isOut && (
                    <div
                      className={cn("w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold",
                        activePlatform === "linkedin" ? "bg-[#0A66C2]" :
                        activePlatform === "facebook" ? "bg-[#1877F2]" :
                        activePlatform === "whatsapp" ? "bg-[#25D366]" :
                        "bg-pink-500"
                      )}
                    >
                      {msg.senderName ? msg.senderName[0].toUpperCase() : "?"}
                    </div>
                  )}

                  <div className={cn("flex flex-col max-w-[72%]", isOut ? "items-end" : "items-start")}>
                    {/* Sender label */}
                    {!isOut && msg.senderName && (
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-semibold text-foreground">{msg.senderName}</span>
                        {msg.senderHandle && (
                          <span className="text-[10px] text-muted-foreground">{msg.senderHandle}</span>
                        )}
                        {msg.platformProfileUrl && (
                          <a href={msg.platformProfileUrl} target="_blank" rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={cn(
                      "px-3.5 py-2 rounded-2xl text-sm leading-relaxed shadow-sm",
                      isOut
                        ? platformConfig.bubble
                        : platformConfig.inboundBubble,
                      isOut ? "rounded-br-sm" : "rounded-bl-sm",
                    )}>
                      {msg.content}
                      {msg.mediaUrl && (
                        <div className="mt-2">
                          {msg.mediaType === "image" ? (
                            <img src={msg.mediaUrl} alt="attachment" className="rounded-lg max-w-full max-h-40 object-cover" />
                          ) : (
                            <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs underline opacity-80 mt-1">
                              <Paperclip className="w-3 h-3" /> Attachment
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Timestamp + status */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </span>
                      {isOut && <StatusIcon status={msg.status} />}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Compose bar ── */}
      <div className="border-t border-border px-3 py-2.5 bg-card">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={compose}
              onChange={(e) => setCompose(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder={`Message via ${platformConfig.label}…`}
              rows={2}
              className="w-full resize-none rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 pr-10"
            />
          </div>
          <Button
            size="sm"
            disabled={isSending || !compose.trim()}
            onClick={() => void sendMessage()}
            className={cn(
              "h-10 w-10 rounded-xl p-0 flex-shrink-0 transition-all",
              compose.trim() ? "opacity-100" : "opacity-50",
              activePlatform === "linkedin" ? "bg-[#0A66C2] hover:bg-[#0A66C2]/90" :
              activePlatform === "facebook" ? "bg-[#1877F2] hover:bg-[#1877F2]/90" :
              activePlatform === "whatsapp" ? "bg-[#25D366] hover:bg-[#25D366]/90" :
              "bg-gradient-to-br from-purple-500 to-pink-500 hover:opacity-90",
              "text-white"
            )}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-1.5 px-0.5">
          <span className="text-[10px] text-muted-foreground">
            {platformConfig.label} · Press Enter to send, Shift+Enter for new line
          </span>
          <div className="flex-1" />
          <span className={cn("text-[10px] font-medium", platformConfig.textColor)}>
            {messages.filter(m => m.direction === "inbound").length} received ·{" "}
            {messages.filter(m => m.direction === "outbound").length} sent
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Empty state per platform ──────────────────────────────────────────────────
function EmptyState({ platform }: { platform: Platform }) {
  const cfg = PLATFORMS[platform];
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 text-center px-6">
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center text-white mb-3 shadow-md",
        cfg.color,
      )}>
        <MessageCircle className="w-6 h-6" />
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">
        No {cfg.label} messages yet
      </p>
      <p className="text-xs text-muted-foreground mb-4 max-w-xs leading-relaxed">
        {cfg.description}
      </p>
      <div className="flex flex-col gap-2 items-center">
        <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1">
          {cfg.icon}
          <a href={cfg.connectUrl} target="_blank" rel="noopener noreferrer"
            className="hover:underline flex items-center gap-1">
            Configure {cfg.label} API
            <ExternalLink className="w-3 h-3" />
          </a>
        </Badge>
        <p className="text-[10px] text-muted-foreground">
          Or use "Simulate Reply" above to test the inbox flow
        </p>
      </div>
    </div>
  );
}

// ── Hook: total social message count for a lead ───────────────────────────────
export function useSocialMessageCount(leadId: number): number {
  const { data } = useQuery<{ stats: Record<string, { inbound: number; outbound: number; total: number }> }>({
    queryKey: ["social-stats", leadId],
    queryFn: async () => {
      const res = await fetch(`/api/social-messages/stats?leadId=${leadId}`, { credentials: "include" });
      return res.json();
    },
  });
  return Object.values(data?.stats ?? {}).reduce((s, v) => s + v.total, 0);
}
