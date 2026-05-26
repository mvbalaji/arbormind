import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, Eye, Loader2, Mail, Paperclip } from "lucide-react";
import DOMPurify from "dompurify";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EmailAttachmentInfo {
  filename: string;
  contentType: string | null;
  sizeBytes: number;
  openCount: number;
  lastOpenedAt: string | null;
}

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
  attachments?: EmailAttachmentInfo[];
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
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

              {data.attachments && data.attachments.length > 0 && (
                <div className="border-t border-border pt-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Paperclip className="w-3.5 h-3.5" />
                    Attachments ({data.attachments.length})
                  </div>
                  <ul className="space-y-1">
                    {data.attachments.map((a, i) => {
                      const opened = a.openCount > 0;
                      return (
                        <li
                          key={i}
                          className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Paperclip className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="truncate font-medium text-foreground" title={a.filename}>
                              {a.filename}
                            </span>
                            <span className="text-muted-foreground flex-shrink-0">
                              · {formatBytes(a.sizeBytes)}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              opened
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-muted text-muted-foreground border-border"
                            }
                          >
                            {opened ? (
                              <>
                                <Eye className="w-3 h-3 mr-1" />
                                Opened {a.openCount}×
                                {a.lastOpenedAt && ` · ${format(new Date(a.lastOpenedAt), "MMM d, HH:mm")}`}
                              </>
                            ) : (
                              "Not yet opened"
                            )}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-[10px] text-muted-foreground leading-relaxed pt-0.5">
                    Tracks the &ldquo;View online&rdquo; link added to the email. Customers who open the attached
                    file directly from their email client are not counted.
                  </p>
                </div>
              )}

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
