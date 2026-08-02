import React, { useState, useEffect } from "react";
import {
  Sun, Moon, Zap, BarChart3, Users, Shield, Star, CheckCircle, Globe,
  Twitter, Linkedin, Github, Youtube, Megaphone, FileSignature, Workflow,
  ArrowRight, ChevronDown, Building2, KanbanSquare, UserCircle2, LayoutDashboard,
} from "lucide-react";
import { Link, useLocation } from "wouter";

const FEATURES = [
  {
    icon: Users,
    title: "360° Customer View",
    description: "Unified contacts, accounts, leads and full activity timeline — calls, emails, meetings and notes — in one intelligent workspace.",
  },
  {
    icon: BarChart3,
    title: "Pipeline Intelligence",
    description: "Drag-and-drop Kanban deals board, stage-by-stage revenue forecasting, and AI-powered win-probability scoring on every opportunity.",
  },
  {
    icon: Zap,
    title: "AI Assistant",
    description: "A floating AI copilot that answers questions about your live CRM data, drafts emails, summarises deals, and surfaces next-best actions.",
  },
  {
    icon: Star,
    title: "Quotes, Orders & CPQ",
    description: "Configure-price-quote with guided selling and bundle line items, versioned quotes with PDF generation, and orders tracked from acceptance to delivery.",
  },
  {
    icon: FileSignature,
    title: "Contract Lifecycle Management",
    description: "Templates, renewal tracking, approval workflows and automated notifications keep every contract on schedule — nothing falls through the cracks.",
  },
  {
    icon: Megaphone,
    title: "Campaigns & Website Visitors",
    description: "Plan and track marketing campaigns with budget and ROI reporting, and capture inbound website visitors as leads automatically.",
  },
  {
    icon: Workflow,
    title: "Approvals & Automation",
    description: "Configurable approval chains for quotes and deals, product rules, workflow automation, and an integration studio for connecting external systems.",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description: "Granular admin, manager and sales-rep permissions per screen, with Google SSO and user impersonation for support and onboarding.",
  },
  {
    icon: Globe,
    title: "Reports & Analytics",
    description: "Real-time dashboards, pipeline-by-stage and lead-source reports, revenue forecasts and case management — all driven by live data, no spreadsheets.",
  },
];

const STATS = [
  { value: "3×", label: "Faster deal cycles" },
  { value: "87%", label: "Win rate improvement" },
  { value: "100%", label: "Data ownership" },
];

// Real product screenshots, each paired with the feature it best demonstrates.
// Alternating image/copy "spotlight" sections convert better than a small,
// auto-advancing carousel — visitors can see and read at their own pace.
const SPOTLIGHTS = [
  {
    src: "/screenshots/dashboard.jpeg",
    icon: LayoutDashboard,
    eyebrow: "Command Center",
    title: "One dashboard. Every number that matters.",
    description: "Revenue, pipeline value, win rate and open cases update in real time. AI Insights flags what needs attention today — no digging through spreadsheets or waiting for a weekly report.",
    bullets: ["Live revenue & pipeline value", "AI-generated daily insights", "Pipeline-by-stage breakdown"],
  },
  {
    src: "/screenshots/opportunities.jpeg",
    icon: KanbanSquare,
    eyebrow: "Pipeline Intelligence",
    title: "Never lose a deal in the pipeline again.",
    description: "Drag deals across stages on a Kanban board built for speed. Every opportunity carries an AI-estimated win probability, so reps and managers both know exactly where to focus.",
    bullets: ["Drag-and-drop Kanban board", "AI win-probability scoring", "Stage-by-stage revenue forecasting"],
  },
  {
    src: "/screenshots/leads.jpeg",
    icon: Zap,
    eyebrow: "Lead Scoring",
    title: "Score, route, and convert leads automatically.",
    description: "Every inbound lead — from a web form, a campaign, or a forwarded email — is scored, assigned to the right rep, and tracked from first touch to qualified opportunity.",
    bullets: ["Automatic lead scoring", "Smart owner assignment", "One-click lead-to-opportunity conversion"],
  },
  {
    src: "/screenshots/contacts.jpeg",
    icon: UserCircle2,
    eyebrow: "360° Customer View",
    title: "A complete view of every relationship.",
    description: "Contacts, their accounts, titles and full activity history live in one record — calls, emails and meetings included — so anyone on the team can pick up a conversation instantly.",
    bullets: ["Full activity timeline per contact", "Linked accounts & opportunities", "Fast search across every field"],
  },
  {
    src: "/screenshots/accounts.jpeg",
    icon: Building2,
    eyebrow: "Account Intelligence",
    title: "Company-level insight, not just contact cards.",
    description: "See every account's industry, location, contacts and open deals at a glance — the context reps need before every call, without switching tabs.",
    bullets: ["Contacts & deals per account", "Industry & location at a glance", "Roll-up reporting across accounts"],
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Capture every lead, automatically",
    description: "Web forms, campaigns, and forwarded emails all flow into one scored, de-duplicated pipeline — nothing sits in an inbox waiting to be entered by hand.",
  },
  {
    step: "02",
    title: "Work the pipeline with AI at your side",
    description: "Win-probability scoring, next-best-action suggestions, and an AI assistant that drafts follow-ups mean reps spend time selling, not guessing what to do next.",
  },
  {
    step: "03",
    title: "Quote, contract, and close — in the same system",
    description: "Build a quote, route it for approval, generate the contract, and track the order — without exporting to a spreadsheet or a separate e-signature tool.",
  },
];

const DIFFERENTIATORS = [
  {
    title: "Built for speed, not bloat",
    description: "No six-week implementation. Google SSO, sensible defaults, and a UI that doesn't need a training course to use on day one.",
  },
  {
    title: "One system, not six point tools",
    description: "CRM, CPQ, contract lifecycle management, campaigns, and approvals live in a single data model — so a deal's history is never scattered across tabs.",
  },
  {
    title: "AI that's actually wired into your data",
    description: "The assistant answers questions about your live pipeline and drafts real follow-ups — it isn't a chatbot bolted on top of static reports.",
  },
];

const FAQS = [
  {
    q: "How long does it take to get set up?",
    a: "Most teams are creating leads and quotes within a day. Sign in with Google, and your role-based permissions, pipeline stages and product catalogue are ready to configure immediately — no lengthy onboarding project required.",
  },
  {
    q: "Can I migrate data from our current CRM?",
    a: "Yes — accounts, contacts, leads, opportunities and campaigns can all be bulk-imported from CSV, with field mapping handled for you.",
  },
  {
    q: "Does the AI assistant see our real data?",
    a: "Yes — it's wired directly into your live pipeline, contacts and activity history, so answers and drafts reflect what's actually happening in your CRM, not a generic template.",
  },
  {
    q: "Who can see what? Can I restrict access by role?",
    a: "Every screen — leads, quotes, contracts, reports — has its own granular permission per role (admin, manager, rep), plus support-friendly user impersonation for onboarding and troubleshooting.",
  },
  {
    q: "What happens to our data if we leave?",
    a: "It's yours. Export any entity to CSV at any time — there's no lock-in and no per-export fee.",
  },
];

function EnquiryForm({ isDark }: { isDark: boolean }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setSubmitted(true);
        setFormData({ name: "", email: "", phone: "", company: "", message: "" });
        setTimeout(() => setSubmitted(false), 3000);
      }
    } catch (err) {
      console.error("Submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          name="name"
          placeholder="Your Name"
          value={formData.name}
          onChange={handleChange}
          required
          className="px-2 py-1 rounded-xl border transition-colors focus:outline-none focus:ring-2"
          style={{
            background: isDark ? "rgba(30,41,59,0.5)" : "rgba(248,250,252,0.5)",
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            color: isDark ? "#f1f5f9" : "#0f172a",
          }}
        />
        <input
          type="email"
          name="email"
          placeholder="Your Email"
          value={formData.email}
          onChange={handleChange}
          required
          className="px-2 py-1 rounded-xl border transition-colors focus:outline-none focus:ring-2"
          style={{
            background: isDark ? "rgba(30,41,59,0.5)" : "rgba(248,250,252,0.5)",
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            color: isDark ? "#f1f5f9" : "#0f172a",
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="tel"
          name="phone"
          placeholder="Phone (optional)"
          value={formData.phone}
          onChange={handleChange}
          className="px-2 py-1 rounded-xl border transition-colors focus:outline-none focus:ring-2"
          style={{
            background: isDark ? "rgba(30,41,59,0.5)" : "rgba(248,250,252,0.5)",
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            color: isDark ? "#f1f5f9" : "#0f172a",
          }}
        />
        <input
          type="text"
          name="company"
          placeholder="Company (optional)"
          value={formData.company}
          onChange={handleChange}
          className="px-2 py-1 rounded-xl border transition-colors focus:outline-none focus:ring-2"
          style={{
            background: isDark ? "rgba(30,41,59,0.5)" : "rgba(248,250,252,0.5)",
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            color: isDark ? "#f1f5f9" : "#0f172a",
          }}
        />
      </div>

      <textarea
        name="message"
        placeholder="Tell us more about your enquiry..."
        value={formData.message}
        onChange={handleChange}
        required
        rows={4}
        className="w-full px-2 py-1 rounded-xl border transition-colors focus:outline-none focus:ring-2 resize-none"
        style={{
          background: isDark ? "rgba(30,41,59,0.5)" : "rgba(248,250,252,0.5)",
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          color: isDark ? "#f1f5f9" : "#0f172a",
        }}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 rounded-xl font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg, #6366f1, #4f46e5)",
          color: "white",
          boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
        }}
      >
        {isSubmitting ? "Submitting..." : submitted ? "✓ Submitted!" : "Send Enquiry"}
      </button>
    </form>
  );
}

function BrowserFrame({ src, label, isDark }: { src: string; label: string; isDark: boolean }) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl"
      style={{
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        boxShadow: isDark
          ? "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)"
          : "0 40px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
      }}
    >
      <div
        className="flex items-center gap-2 px-2 py-1"
        style={{
          background: isDark ? "#1e2a3a" : "#f1f5f9",
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        }}
      >
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
        </div>
        <div
          className="flex-1 mx-4 py-1 px-3 rounded-md text-xs text-center font-mono"
          style={{
            background: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.8)",
            color: isDark ? "#64748b" : "#94a3b8",
            maxWidth: 280,
            margin: "0 auto",
          }}
        >
          arbormind.in/{label.toLowerCase().replace(/\s+/g, "-")}
        </div>
      </div>
      <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <img src={src} alt={label} className="w-full h-full object-cover object-top" loading="lazy" />
      </div>
    </div>
  );
}

function FeatureSpotlight({
  item, reversed, isDark,
}: {
  item: (typeof SPOTLIGHTS)[number];
  reversed: boolean;
  isDark: boolean;
}) {
  const Icon = item.icon;
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${reversed ? "" : ""}`}>
      <div className={reversed ? "lg:order-2" : ""}>
        <BrowserFrame src={item.src} label={item.eyebrow} isDark={isDark} />
      </div>
      <div className={reversed ? "lg:order-1" : ""}>
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5 tracking-wide uppercase"
          style={{
            background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
            color: "#818cf8",
            border: "1px solid rgba(99,102,241,0.2)",
          }}
        >
          <Icon className="w-3.5 h-3.5" />
          {item.eyebrow}
        </div>
        <h3
          className="text-2xl md:text-3xl font-bold mb-4 leading-tight"
          style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
        >
          {item.title}
        </h3>
        <p className="text-base leading-relaxed mb-6" style={{ color: isDark ? "#94a3b8" : "#475569" }}>
          {item.description}
        </p>
        <ul className="space-y-2.5">
          {item.bullets.map((b) => (
            <li key={b} className="flex items-center gap-2.5 text-sm" style={{ color: isDark ? "#cbd5e1" : "#1e293b" }}>
              <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#22c55e" }} />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FaqItem({ q, a, isDark }: { q: string; a: string; isDark: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 text-left px-6 py-5"
      >
        <span className="font-semibold text-base" style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}>
          {q}
        </span>
        <ChevronDown
          className="w-5 h-5 flex-shrink-0 transition-transform duration-200"
          style={{ color: isDark ? "#64748b" : "#94a3b8", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-sm leading-relaxed" style={{ color: isDark ? "#94a3b8" : "#475569" }}>
            {a}
          </p>
        </div>
      )}
    </div>
  );
}

type Theme = "dark" | "light";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("arbormind-theme");
    return (stored as Theme) || "dark";
  });

  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "unauthorized") {
      setAuthError(true);
    }
  }, []);

  // Record this website visit so it shows up under the CRM "Website Visitors"
  // screen. Uses an anonymous, browser-persisted session id to attribute
  // repeat views to the same visitor.
  useEffect(() => {
    try {
      let sessionId = localStorage.getItem("arbormind-visitor-id");
      if (!sessionId) {
        sessionId =
          (crypto.randomUUID && crypto.randomUUID()) ||
          `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem("arbormind-visitor-id", sessionId);
      }
      const base = import.meta.env.BASE_URL;
      void fetch(`${base}api/website-visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          sessionId,
          path: window.location.pathname,
          referrer: document.referrer || "",
        }),
      }).catch(() => {});
    } catch {
      /* tracking must never break the page */
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light-mode", theme === "light");
    localStorage.setItem("arbormind-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const isDark = theme === "dark";

  return (
    <div
      className="min-h-screen font-sans transition-colors duration-300"
      style={{
        background: isDark
          ? "radial-gradient(ellipse at 20% 0%, #0f172a 0%, #020617 60%, #0a0a1a 100%)"
          : "radial-gradient(ellipse at 20% 0%, #f0f9ff 0%, #ffffff 60%, #f8faff 100%)",
        color: isDark ? "#f1f5f9" : "#0f172a",
      }}
    >
      {/* Animated grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: isDark
            ? "linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)"
            : "linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Glow orbs */}
      <div
        className="fixed top-0 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)" }}
      />
      <div
        className="fixed bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: isDark ? "rgba(6,182,212,0.08)" : "rgba(6,182,212,0.06)" }}
      />

      {/* NAV */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 py-5 border-b backdrop-blur-xl"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(10,25,60,0.95)"
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <img src="/arbormind-logo.png" alt="arbormind.in" className="w-14 h-14 object-cover" />
          </div>
          <span className="font-bold text-2xl tracking-tight" style={{ color: "#ffffff" }}>
            arbormind.in
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: "#ffffff" }}>Features</a>
          <a href="#dashboard" className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: "#ffffff" }}>Product Tour</a>
          <a href="#how-it-works" className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: "#ffffff" }}>How It Works</a>
          <a href="#faq" className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: "#ffffff" }}>FAQ</a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
            style={{
              background: "rgba(255,255,255,0.12)",
              color: "#ffffff",
            }}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <Link href="/contact" className="flex items-center gap-2 px-3 py-1 rounded-xl font-semibold text-sm transition-all hover:-translate-y-0.5 cursor-pointer" style={{ color: "rgba(255,255,255,0.7)" }}>
            Contact Us
          </Link>
          <Link href="/login" className="flex items-center gap-2 px-3 py-1 rounded-xl font-semibold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer border" style={{ borderColor: "rgba(255,255,255,0.25)", color: "#ffffff" }}>
            Log in
          </Link>
        </div>
      </nav>

      <main className="relative z-10">
        {/* HERO */}
        <section className="px-6 md:px-12 pt-20 pb-24 text-center max-w-5xl mx-auto">
          {authError && (
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-8"
              style={{
                background: "rgba(239,68,68,0.1)",
                color: "#f87171",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              Your account hasn't been granted access yet. Contact your admin.
            </div>
          )}

          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-8 tracking-wide uppercase"
            style={{
              background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
              color: "#818cf8",
              border: "1px solid rgba(99,102,241,0.2)",
            }}
          >
            <Zap className="w-3 h-3" />
            Predict. Personalize. Grow.
          </div>

          <h1
            className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 tracking-tight"
            style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
          >
            Close deals faster.
            <br />
            <span
              style={{
                backgroundImage: "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              See What Your Competitors Miss
            </span>
          </h1>

          <p
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: isDark ? "#94a3b8" : "#475569" }}
          >
            arbormind.in is the modern CRM built for high-velocity sales teams — leads, pipeline,
            quotes, contracts, and an AI assistant that's wired into your real data, all in one workspace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <button
              type="button"
              onClick={() => setLocation("/login")}
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "white",
                boxShadow: "0 8px 24px rgba(99,102,241,0.35)",
              }}
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#dashboard"
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold transition-all hover:-translate-y-0.5 cursor-pointer"
              style={{
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
                color: isDark ? "#f1f5f9" : "#0f172a",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
              }}
            >
              See the Product Tour
            </a>
          </div>
          <div
            className="flex items-center justify-center gap-2 text-sm"
            style={{ color: isDark ? "#64748b" : "#94a3b8" }}
          >
            <CheckCircle className="w-4 h-4 text-green-500" />
            No credit card required · Google SSO in under a minute
          </div>
        </section>

        {/* STATS */}
        <section className="px-6 md:px-12 pb-16">
          <div
            className="max-w-3xl mx-auto grid grid-cols-3 gap-8 rounded-2xl p-8"
            style={{
              background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
            }}
          >
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div
                  className="text-4xl font-extrabold mb-1"
                  style={{
                    backgroundImage: "linear-gradient(135deg, #6366f1, #06b6d4)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {s.value}
                </div>
                <div className="text-sm" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PRODUCT TOUR — real screenshots, one per key capability */}
        <section id="dashboard" className="px-6 md:px-12 py-20 max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
            >
              See arbormind in action
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>
              Real screens, real workflows — not mockups. Here's what your team works in every day.
            </p>
          </div>

          <div className="flex flex-col gap-24">
            {SPOTLIGHTS.map((item, i) => (
              <FeatureSpotlight key={item.title} item={item} reversed={i % 2 === 1} isDark={isDark} />
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="px-6 md:px-12 py-20 max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
            >
              From first touch to signed contract
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>
              One system for the whole revenue cycle — no exports, no re-keying data between tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="relative">
                <div
                  className="text-5xl font-extrabold mb-4"
                  style={{
                    backgroundImage: "linear-gradient(135deg, rgba(99,102,241,0.4), rgba(6,182,212,0.4))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {step.step}
                </div>
                <h3 className="font-bold text-lg mb-3" style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}>
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: isDark ? "#94a3b8" : "#475569" }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="px-6 md:px-12 py-20 max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
            >
              Everything your sales team needs
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>
              From first touch to signed contract — a complete quote-to-cash platform that replaces half a dozen point tools, built for the modern AI-first sales workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                  backdropFilter: "blur(12px)",
                  boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  className="w-11 h-9 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.2))" }}
                >
                  <f.icon className="w-5 h-5" style={{ color: "#818cf8" }} />
                </div>
                <h3
                  className="font-semibold text-base mb-2"
                  style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
                >
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* WHY TEAMS SWITCH */}
        <section id="testimonials" className="px-6 md:px-12 py-20 max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
            >
              Why teams switch to arbormind
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>
              Fewer tools, less admin overhead, and a pipeline your whole team actually trusts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DIFFERENTIATORS.map((d) => (
              <div
                key={d.title}
                className="p-6 rounded-2xl flex flex-col"
                style={{
                  background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                  backdropFilter: "blur(12px)",
                }}
              >
                <div
                  className="w-11 h-9 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.2))" }}
                >
                  <CheckCircle className="w-5 h-5" style={{ color: "#818cf8" }} />
                </div>
                <h3 className="font-semibold text-base mb-2" style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}>
                  {d.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>
                  {d.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="px-6 md:px-12 py-20 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
            >
              Frequently asked questions
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {FAQS.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} isDark={isDark} />
            ))}
          </div>
        </section>

        {/* CTA */}
        <section id="pricing" className="px-6 md:px-12 py-20">
          <div
            className="max-w-3xl mx-auto rounded-3xl p-12 text-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(6,182,212,0.1) 100%)",
              border: "1px solid rgba(99,102,241,0.2)",
            }}
          >
            <div
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 70%)",
              }}
            />
            <div className="relative">
              <h2
                className="text-3xl md:text-4xl font-bold mb-4"
                style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
              >
                Ready to transform your sales?
              </h2>
              <p className="mb-8 text-base" style={{ color: isDark ? "#94a3b8" : "#475569" }}>
                Log in to access the arbormind.in dashboard.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setLocation("/login")}
                  className="flex items-center gap-3 px-8 py-3.5 rounded-2xl font-semibold transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
                    color: isDark ? "#f1f5f9" : "#0f172a",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                    padding: "0.875rem 2rem",
                  }}
                >
                  Log in
                </button>
                <div
                  className="flex items-center gap-2 text-sm"
                  style={{ color: isDark ? "#64748b" : "#94a3b8" }}
                >
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  No credit card required
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer
        className="relative z-10 border-t"
        style={{
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
          backgroundColor: isDark ? "rgba(5,8,18,0.95)" : "rgba(248,250,252,0.95)",
        }}
      >
        {/* Main footer grid */}
        <div className="px-6 md:px-12 lg:px-20 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span
                className="font-display font-bold text-base"
                style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
              >
                arbormind.in
              </span>
            </div>
            {/* Tagline */}
            <p className="text-sm leading-relaxed" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>
              AI-powered CRM for high-velocity sales teams — close deals faster, smarter.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-2">
              {[
                { icon: Twitter, label: "X / Twitter", href: "#" },
                { icon: Linkedin, label: "LinkedIn", href: "#" },
                { icon: Github, label: "GitHub", href: "#" },
                { icon: Youtube, label: "YouTube", href: "#" },
              ].map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{
                    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
                    color: isDark ? "#64748b" : "#94a3b8",
                    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = isDark ? "#f1f5f9" : "#0f172a")}
                  onMouseLeave={e => (e.currentTarget.style.color = isDark ? "#64748b" : "#94a3b8")}
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {[
            {
              heading: "PRODUCT",
              links: ["Features", "How It Works", "Pricing", "Integrations", "Changelog", "Roadmap", "System Status"],
            },
            {
              heading: "COMPANY",
              links: ["About Us", "Careers", "Blog", "Press & Media", "Partners", "Customers", "Investors"],
            },
            {
              heading: "SUPPORT",
              links: ["Contact Us", "Help Center", "Documentation", "API Reference", "Community", "SLA & Uptime"],
            },
            {
              heading: "LEGAL",
              links: ["Terms & Conditions", "Privacy Policy", "Cookie Policy", "GDPR Compliance", "Security", "Acceptable Use", "Data Processing"],
            },
          ].map((col) => (
            <div key={col.heading} className="flex flex-col gap-4">
              <p
                className="text-xs font-semibold tracking-widest uppercase"
                style={{ color: isDark ? "#94a3b8" : "#64748b" }}
              >
                {col.heading}
              </p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm transition-colors"
                      style={{ color: isDark ? "#64748b" : "#94a3b8" }}
                      onMouseEnter={e => (e.currentTarget.style.color = isDark ? "#38bdf8" : "#0284c7")}
                      onMouseLeave={e => (e.currentTarget.style.color = isDark ? "#64748b" : "#94a3b8")}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="px-6 md:px-12 lg:px-20 py-4 border-t flex flex-wrap items-center justify-between gap-4 text-xs"
          style={{
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            color: isDark ? "#475569" : "#94a3b8",
          }}
        >
          <span>© {new Date().getFullYear()} arbormind.in, Inc. All rights reserved.</span>
          {/* Trust signals — kept general on purpose; see PR/commit notes on why the
              previous specific certification badges (SOC 2 / ISO 27001 / etc.) were
              replaced: don't display a compliance badge unless it's been audited. */}
          <div className="flex items-center gap-2 flex-wrap">
            {["Google SSO", "Encrypted in transit & at rest", "Role-based access control"].map((badge) => (
              <span
                key={badge}
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
                  color: isDark ? "#94a3b8" : "#64748b",
                  backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                }}
              >
                {badge}
              </span>
            ))}
          </div>
          {/* System status */}
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
            All systems operational
          </span>
        </div>
      </footer>
    </div>
  );
}
