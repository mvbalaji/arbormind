import React, { useState, useEffect } from "react";
import { Sun, Moon, Zap, BarChart3, Users, Shield, ArrowRight, Star, CheckCircle, Globe } from "lucide-react";
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
          className="px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2"
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
          className="px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2"
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
          className="px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2"
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
          className="px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2"
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
        className="w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 resize-none"
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
  const handleLoginClick = async () => {
    setLocation("/login");
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
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
          background: isDark ? "rgba(15,23,42,0.8)" : "rgba(255,255,255,0.8)"
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden"
            style={{ background: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.05)" }}
          >
            <img src="/arbormind-logo.png" alt="arbormind.in" className="w-14 h-14 object-cover" />
          </div>
          <span className="font-bold text-2xl tracking-tight" style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}>
            arbormind.in
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium transition-colors" style={{ color: isDark ? "#94a3b8" : "#475569" }}>Features</a>
          <a href="#dashboard" className="text-sm font-medium transition-colors" style={{ color: isDark ? "#94a3b8" : "#475569" }}>Dashboard</a>
          <a href="#testimonials" className="text-sm font-medium transition-colors" style={{ color: isDark ? "#94a3b8" : "#475569" }}>Testimonials</a>
          <a href="#pricing" className="text-sm font-medium transition-colors" style={{ color: isDark ? "#94a3b8" : "#475569" }}>Pricing</a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
            style={{
              background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              color: isDark ? "#94a3b8" : "#64748b",
            }}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <Link href="/login" className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer border" style={{ borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)", color: isDark ? "#f1f5f9" : "#0f172a" }}>
            Log in
          </Link>
          <button
            onClick={handleDemoLogin}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer border-0 bg-gradient-to-r"
            style={{
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "white",
              boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            Sign in
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      <main className="relative z-10">
        {/* HERO */}
        <section className="px-6 md:px-12 pt-20 pb-24 text-center max-w-5xl mx-auto">
          {authError && (
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8"
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

        {/* DASHBOARD SCREENSHOT */}
        <section id="dashboard" className="px-6 md:px-12 py-20 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
            >
              See arbormind in action
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>
              Real-time analytics, AI-powered insights, and seamless collaboration—all in one intuitive dashboard.
            </p>
          </div>
          <div
            className="rounded-2xl overflow-hidden border"
            style={{ border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}
          >
            <img src="/dashboard-screenshot.png" alt="arbormind.in Dashboard" className="w-full h-auto" />
          </div>
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
                Sign in to access the arbormind.in dashboard.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="flex items-center gap-3 px-8 py-3.5 rounded-2xl font-semibold transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer border-0"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                    color: "white",
                    boxShadow: "0 8px 24px rgba(99,102,241,0.35)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    border: "none",
                    padding: "0.875rem 2rem",
                  }}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Sign in
                </button>
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
        className="relative z-10 px-6 md:px-12 py-8 border-t text-center text-sm"
        style={{
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
          color: isDark ? "#475569" : "#94a3b8",
        }}
      >
        © {new Date().getFullYear()} arbormind.in — Built with AI for modern sales teams
      </footer>
    </div>
  );
}
