import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, Eye, Loader2, Mail } from "lucide-react";
import DOMPurify from "dompurify";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EmailBody {
  direction: "inbound" | "outbound" | "unknown";
  subject: string;
  fromEmail: string | null;
  fromName: string | null;
  toEmail: string | null;
  sentAt: string | null;
  textBody: string;
  htmlBody: string | null;
  openCount: number;
  lastOpenedAt: string | null;
  lastUserAgent: string | null;
}

interface EmailViewerProps {
  activityId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailViewer({ activityId, open, onOpenChange }: EmailViewerProps) {
  const { data, isLoading, error } = useQuery<EmailBody>({
    queryKey: ["email-body", activityId],
    queryFn: async () => {
      const res = await fetch(`/api/activities/${activityId}/email-body`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load email");
      return res.json();
    },
    enabled: open && activityId != null,
    staleTime: 30_000,
  });

  const isInbound = data?.direction === "inbound";
  const isGmailProxy = /GoogleImageProxy|ggpht\.com/i.test(data?.lastUserAgent ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[720px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <DialogTitle className="font-display text-lg flex items-center gap-2 pr-8">
            <Mail className="w-5 h-5 text-primary" />
            <span className="truncate">{data?.subject ?? "Email"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
            </div>
          )}

          {error && (
            <div className="px-6 py-10 text-sm text-destructive">
              Could not load this email.
            </div>
          )}

          {data && (
            <div className="px-6 py-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      isInbound
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }
                  >
                    {isInbound ? (
                      <><ArrowDownLeft className="w-3 h-3 mr-1" />Received</>
                    ) : (
                      <><ArrowUpRight className="w-3 h-3 mr-1" />Sent</>
                    )}
                  </Badge>
                  {data.sentAt && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(data.sentAt), "EEE, MMM d, yyyy 'at' HH:mm")}
                    </span>
                  )}
                </div>

                <div className="text-xs space-y-1">
                  {isInbound ? (
                    <div className="text-muted-foreground">
                      <span className="font-medium text-foreground">From: </span>
                      {data.fromName && data.fromName !== data.fromEmail ? `${data.fromName} <${data.fromEmail}>` : data.fromEmail}
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      <span className="font-medium text-foreground">To: </span>
                      {data.toEmail}
                    </div>
                  )}
                </div>

                {!isInbound && data.openCount > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Eye className="w-3.5 h-3.5" />
                    <span>
                      Opened {data.openCount}{isGmailProxy ? "+" : ""}× by recipient
                      {data.lastOpenedAt && ` · ${format(new Date(data.lastOpenedAt), "MMM d, HH:mm")}`}
                      {isGmailProxy && " (Gmail caches the open-tracking pixel after the first fetch, so reopens are not reported)"}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                {data.htmlBody ? (
                  <div
                    className="prose prose-sm max-w-none text-foreground [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_img]:h-auto"
                    // body_html is from inbound mail; sanitize before rendering to strip
                    // <script>, on* handlers, javascript: URLs, etc.
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.htmlBody) }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground leading-relaxed">
                    {data.textBody || <span className="text-muted-foreground italic">(empty body)</span>}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
