import React, { useEffect, useState } from "react";
import { Mail, Eye, EyeOff, MessageCircle, User, Calendar } from "lucide-react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/context/auth";

interface Email {
  id: number;
  fromEmail: string;
  fromName: string;
  subject: string;
  message: string;
  status: string;
  isKnownCustomer: string;
  relatedLeadId?: number;
  relatedOpportunityId?: number;
  notes?: string;
  createdAt: string;
}

export default function Support() {
  const { user, isLoading } = useAuth();
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && user) {
      fetchEmails();
    }
  }, [isLoading, user]);

  const fetchEmails = async () => {
    try {
      const res = await fetch("/api/emails", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
      }
    } catch (err) {
      console.error("Error fetching emails:", err);
    } finally {
      setFetchLoading(false);
    }
  };

  if (isLoading || !user || user.role !== "admin") {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-red-500">Admin access required</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-border">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Support Inbox</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage customer inquiries — auto-creates Leads (new) or Opportunities (known customers)
          </p>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Email List */}
          <div className="w-96 border-r border-border overflow-y-auto">
            {fetchLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : emails.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No emails yet</div>
            ) : (
              emails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`w-full px-4 py-4 border-b border-border text-left transition-colors hover:bg-accent/50 ${
                    selectedEmail?.id === email.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{email.fromName}</p>
                      <p className="text-xs text-muted-foreground truncate">{email.fromEmail}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {email.isKnownCustomer === "true" ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="Known Customer" />
                      ) : (
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500" title="New Customer" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm truncate text-foreground mb-2">{email.subject}</p>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        email.status === "replied"
                          ? "bg-green-500/20 text-green-700"
                          : "bg-yellow-500/20 text-yellow-700"
                      }`}
                    >
                      {email.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(email.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Email Detail */}
          {selectedEmail ? (
            <div className="flex-1 overflow-y-auto">
              <div className="p-8 max-w-3xl">
                {/* Header */}
                <div className="mb-8 pb-6 border-b border-border">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">{selectedEmail.subject}</h2>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{selectedEmail.fromName}</span>
                        <span>•</span>
                        <span>{selectedEmail.fromEmail}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium ${
                          selectedEmail.isKnownCustomer === "true"
                            ? "bg-green-500/20 text-green-700"
                            : "bg-blue-500/20 text-blue-700"
                        }`}
                      >
                        {selectedEmail.isKnownCustomer === "true" ? "Known Customer" : "New Customer"}
                      </span>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium ${
                          selectedEmail.status === "replied"
                            ? "bg-green-500/20 text-green-700"
                            : "bg-yellow-500/20 text-yellow-700"
                        }`}
                      >
                        {selectedEmail.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(selectedEmail.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div className="mb-8">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </h3>
                  <div className="bg-card/50 p-6 rounded-lg border border-border whitespace-pre-wrap text-sm leading-relaxed">
                    {selectedEmail.message}
                  </div>
                </div>

                {/* Auto-Created Items */}
                <div className="mb-8 p-6 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <h3 className="font-semibold mb-3 text-sm">Auto-Created Items</h3>
                  <div className="space-y-2 text-sm">
                    {selectedEmail.relatedLeadId && (
                      <p>
                        ✓ <strong>Lead</strong> created (ID: {selectedEmail.relatedLeadId}) —{" "}
                        <span className="text-muted-foreground">Awaiting sales team assignment</span>
                      </p>
                    )}
                    {selectedEmail.relatedOpportunityId && (
                      <p>
                        ✓ <strong>Opportunity</strong> created (ID: {selectedEmail.relatedOpportunityId}) —{" "}
                        <span className="text-muted-foreground">Awaiting sales team assignment</span>
                      </p>
                    )}
                    {selectedEmail.notes && (
                      <p className="text-muted-foreground text-xs">Note: {selectedEmail.notes}</p>
                    )}
                  </div>
                </div>

                {/* Auto-Reply Sent */}
                <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <h3 className="font-semibold mb-3 text-sm">Auto-Reply Sent</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedEmail.isKnownCustomer === "true"
                      ? '"New product inquiry — our sales team will get in touch with you shortly."'
                      : '"Thank you for your inquiry — our sales team will get in touch with you shortly."'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select an email to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
