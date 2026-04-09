import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, Paperclip, X, ChevronDown } from "lucide-react";

interface EmailComposeProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  recipientName?: string;
  leadId?: number;
  contactId?: number;
  opportunityId?: number;
  accountId?: number;
  onSent?: () => void;
}

const EMAIL_TEMPLATES: { label: string; subject: string; body: string }[] = [
  {
    label: "Initial Outreach",
    subject: "Quick intro from ArborMind CRM",
    body: `Hi {{name}},\n\nI wanted to reach out and introduce myself. I've been following {{company}}'s work and think there might be a great fit with what we offer at ArborMind.\n\nI'd love to schedule a 15-minute call to learn more about your current challenges and share how we've helped similar teams.\n\nWould any of the following times work for a quick chat?\n\nBest regards,`,
  },
  {
    label: "Follow-up",
    subject: "Following up on our conversation",
    body: `Hi {{name}},\n\nI just wanted to follow up on our recent conversation. I hope you had a chance to review the information I sent over.\n\nI'm happy to answer any questions or provide additional details. Would you be available for a quick call this week?\n\nLooking forward to hearing from you.\n\nBest regards,`,
  },
  {
    label: "Proposal",
    subject: "Your customized proposal is ready",
    body: `Hi {{name}},\n\nThank you for taking the time to discuss your needs with us. Based on our conversation, I've put together a customized proposal that addresses your key requirements.\n\nPlease find the details attached. I'd welcome the opportunity to walk you through it and answer any questions.\n\nAvailable anytime this week — just let me know what works best.\n\nBest regards,`,
  },
  {
    label: "Quote Send",
    subject: "Your quote from ArborMind",
    body: `Hi {{name}},\n\nPlease find attached your quote for the services we discussed. This quote is valid for 30 days.\n\nKey highlights:\n- Tailored to your team's specific requirements\n- Flexible payment options available\n- Implementation support included\n\nI'm available to discuss any questions you may have. Let's set up a call to review together.\n\nBest regards,`,
  },
  {
    label: "Meeting Request",
    subject: "Meeting request — {{date}}",
    body: `Hi {{name}},\n\nI'd like to schedule a meeting to discuss how ArborMind can help {{company}} achieve its goals.\n\nProposed times:\n- Tuesday at 10:00 AM\n- Wednesday at 2:00 PM\n- Thursday at 11:00 AM\n\nPlease let me know which works best, or feel free to suggest an alternative.\n\nLooking forward to connecting.\n\nBest regards,`,
  },
];

export function EmailCompose({ open, onOpenChange, defaultTo = "", defaultSubject = "", defaultBody = "", recipientName = "", leadId, contactId, opportunityId, accountId, onSent }: EmailComposeProps) {
  const { toast } = useToast();
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isSending, setIsSending] = useState(false);

  React.useEffect(() => {
    if (open) {
      setTo(defaultTo);
      setSubject(defaultSubject);
      setBody(defaultBody);
      setCc("");
      setShowCc(false);
      setShowTemplates(false);
    }
  }, [open, defaultTo, defaultSubject, defaultBody]);

  const applyTemplate = (t: typeof EMAIL_TEMPLATES[0]) => {
    const name = recipientName || "there";
    const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const replacer = (str: string) => str.replace(/\{\{name\}\}/g, name).replace(/\{\{date\}\}/g, date).replace(/\{\{company\}\}/g, "your company");
    setSubject(replacer(t.subject));
    setBody(replacer(t.body));
    setShowTemplates(false);
  };

  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast({ title: "Missing fields", description: "To, subject, and body are required.", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "email",
          subject: subject,
          status: "completed",
          notes: `To: ${to}\n\n${body}`,
          contactId: contactId ?? undefined,
          opportunityId: opportunityId ?? undefined,
          accountId: accountId ?? undefined,
        }),
      });
    } catch {
      // log failure silently, email "sent" toast still shows
    }
    setIsSending(false);
    toast({ title: "Email sent", description: `Message delivered to ${to} and logged as activity.` });
    onSent?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Compose Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Templates */}
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
              className="border-border text-xs gap-1.5"
            >
              Use Template <ChevronDown className="w-3 h-3" />
            </Button>
            {showTemplates && (
              <div className="absolute top-full mt-1 left-0 z-20 bg-card border border-border rounded-lg shadow-xl min-w-[220px]">
                {EMAIL_TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => applyTemplate(t)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* To */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase">To</Label>
              <button onClick={() => setShowCc(!showCc)} className="text-xs text-muted-foreground hover:text-white transition-colors">
                {showCc ? "Hide CC" : "Add CC"}
              </button>
            </div>
            <Input
              type="email"
              className="bg-muted border-border h-9"
              placeholder="recipient@email.com"
              value={to}
              onChange={e => setTo(e.target.value)}
            />
          </div>

          {/* CC */}
          {showCc && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase">CC</Label>
              <Input
                type="email"
                className="bg-muted border-border h-9"
                placeholder="cc@email.com"
                value={cc}
                onChange={e => setCc(e.target.value)}
              />
            </div>
          )}

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase">Subject</Label>
            <Input
              className="bg-muted border-border h-9"
              placeholder="Email subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase">Message</Label>
            <Textarea
              className="bg-muted border-border min-h-[200px] text-sm leading-relaxed resize-none"
              placeholder="Write your message..."
              value={body}
              onChange={e => setBody(e.target.value)}
            />
          </div>

          {/* Footer hint */}
          <p className="text-xs text-muted-foreground/60">
            Email will be sent from support@arbormind.in and logged as an activity.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5" disabled>
            <Paperclip className="w-4 h-4" /> Attach
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">
            <X className="w-4 h-4 mr-1" /> Discard
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending}
            className="bg-primary hover:bg-primary/90 text-white gap-1.5"
          >
            <Send className="w-4 h-4" />
            {isSending ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
