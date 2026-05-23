import React, { useState, useEffect } from "react";
import { Sun, Moon, Zap, BarChart3, Users, Shield, Star, CheckCircle, Globe, Twitter, Linkedin, Github, Youtube } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/auth";

const FEATURES = [
  {
    icon: Users,
    title: "360° Customer View",
    description: "Unified contacts, accounts, leads and activity timeline in one intelligent workspace.",
  },
  {
    icon: BarChart3,
    title: "Pipeline Intelligence",
    description: "Kanban deals board, revenue forecasting, and AI-powered win probability scoring.",
  },
  {
    icon: Zap,
    title: "AI Assistant",
    description: "Built-in AI copilot that drafts emails, summarises deals, and surfaces next best actions.",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description: "Admin and sales roles with granular permissions. SSO via Google for your entire team.",
  },
  {
    icon: Globe,
    title: "Reports & Analytics",
    description: "Real-time dashboards, pipeline reports and custom metrics to drive data-backed decisions.",
  },
  {
    icon: Star,
    title: "Quotes & Cases",
    description: "Generate professional quotes and manage support cases — all within the same platform.",
  },
];

const STATS = [
  { value: "3×", label: "Faster deal cycles" },
  { value: "87%", label: "Win rate improvement" },
  { value: "100%", label: "Data ownership" },
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

const CAROUSEL_SLIDES = [
  { src: "/screenshots/dashboard.jpeg", label: "Dashboard", caption: "Real-time KPIs, pipeline health and activity feed" },
  { src: "/screenshots/opportunities.jpeg", label: "Pipeline", caption: "Kanban deal board with AI win-probability scoring" },
  { src: "/screenshots/contacts.jpeg", label: "Contacts", caption: "360° contact profiles with activity timeline" },
  { src: "/screenshots/accounts.jpeg", label: "Accounts", caption: "Company-level insights, contacts and opportunities" },
  { src: "/screenshots/leads.jpeg", label: "Leads", caption: "Lead scoring, status tracking and one-click conversion" },
];

function DashboardCarousel({ isDark }: { isDark: boolean }) {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % CAROUSEL_SLIDES.length);
        setAnimating(false);
      }, 350);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  const goTo = (i: number) => {
    if (i === current) return;
    setAnimating(true);
    setTimeout(() => { setCurrent(i); setAnimating(false); }, 350);
  };

  const slide = CAROUSEL_SLIDES[current]!;

  return (
    <div className="relative select-none">
      {/* Browser chrome mockup */}
      <div
        className="rounded-2xl overflow-hidden shadow-2xl"
        style={{
          border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          boxShadow: isDark
            ? "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)"
            : "0 40px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
        }}
      >
        {/* Title bar */}
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
            arbormind.in/{slide.label.toLowerCase()}
          </div>
          <div
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.2))",
              color: "#818cf8",
            }}
          >
            {slide.label}
          </div>
        </div>

        {/* Screenshot */}
        <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <img
            key={current}
            src={slide.src}
            alt={slide.label}
            className="w-full h-full object-cover object-top transition-opacity duration-350"
            style={{ opacity: animating ? 0 : 1, transition: "opacity 0.35s ease" }}
          />
          {/* Gradient overlay at bottom */}
          <div
            className="absolute inset-x-0 bottom-0 h-16"
            style={{
              background: isDark
                ? "linear-gradient(to top, rgba(2,6,23,0.8), transparent)"
                : "linear-gradient(to top, rgba(248,250,252,0.8), transparent)",
            }}
          />
        </div>
      </div>

      {/* Caption + dots */}
      <div className="mt-6 flex flex-col items-center gap-4">
        <p
          className="text-sm text-center transition-opacity duration-350"
          style={{ color: isDark ? "#94a3b8" : "#64748b", opacity: animating ? 0 : 1 }}
        >
          {slide.caption}
        </p>
        <div className="flex items-center gap-2">
          {CAROUSEL_SLIDES.map((s, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="transition-all duration-300"
              style={{
                width: i === current ? 28 : 8,
                height: 8,
                borderRadius: 4,
                background: i === current
                  ? "linear-gradient(135deg, #6366f1, #06b6d4)"
                  : isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
              }}
              title={s.label}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {CAROUSEL_SLIDES.map((s, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="text-xs font-medium px-3 py-1 rounded-full transition-all duration-200"
              style={{
                background: i === current
                  ? isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.1)"
                  : "transparent",
                color: i === current
                  ? "#818cf8"
                  : isDark ? "#475569" : "#94a3b8",
                border: `1px solid ${i === current ? "rgba(99,102,241,0.3)" : "transparent"}`,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    role: "VP Sales, TechFlow Inc",
    quote: "arbormind.in transformed our sales process. We closed 40% more deals in 3 months with the pipeline intelligence.",
    avatar: "SC",
  },
  {
    name: "Marcus Johnson",
    role: "Sales Manager, CloudScale",
    quote: "The AI assistant is a game-changer. It drafts follow-ups, summarizes deals, and suggests next actions automatically.",
    avatar: "MJ",
  },
  {
    name: "Priya Patel",
    role: "Founder, GrowthLabs",
    quote: "Finally, a CRM built for speed. Google OAuth integration, real-time analytics, and it just works. No bloat.",
    avatar: "PP",
  },
];

type Theme = "dark" | "light";

export default function Landing() {
  const { signInAndGoToDashboard } = useAuth();
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

  useEffect(() => {
    document.documentElement.classList.toggle("light-mode", theme === "light");
    localStorage.setItem("arbormind-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const handleDemoLogin = async () => {
    await signInAndGoToDashboard({ username: "demo@arbormind.in", password: "demo1234" });
  };

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
          <a href="#dashboard" className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: "#ffffff" }}>Dashboard</a>
          <a href="#testimonials" className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: "#ffffff" }}>Testimonials</a>
          <a href="#pricing" className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: "#ffffff" }}>Pricing</a>
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
            arbormind.in is the modern CRM built for high-velocity sales teams. Contacts, pipeline,
            AI assistant and real-time analytics — all in one beautiful workspace.
          </p>

          <div />
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
              A complete platform that replaces five separate tools — built for the modern AI-first sales workflow.
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
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
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

        {/* DASHBOARD CAROUSEL */}
        <section id="dashboard" className="px-6 md:px-12 py-20 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
            >
              See arbormind in action
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>
              Real-time analytics, AI-powered insights, and seamless collaboration — all in one intuitive platform.
            </p>
          </div>
          <DashboardCarousel isDark={isDark} />
        </section>

        {/* TESTIMONIALS */}
        <section id="testimonials" className="px-6 md:px-12 py-20 max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
            >
              Trusted by Sales Leaders
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>
              See how top sales teams use arbormind.in to close bigger deals, faster.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="p-6 rounded-2xl flex flex-col"
                style={{
                  background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm mb-5 flex-1 leading-relaxed" style={{ color: isDark ? "#cbd5e1" : "#1e293b" }}>
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, #6366f1, #06b6d4)" }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}>
                      {t.name}
                    </div>
                    <div className="text-xs" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>
                      {t.role}
                    </div>
                  </div>
                </div>
              </div>
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
              <div className="flex items-center justify-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
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
                  onClick={handleDemoLogin}
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
          {/* Compliance badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {["SOC 2 Type II", "ISO 27001", "GDPR", "CCPA"].map((badge) => (
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
