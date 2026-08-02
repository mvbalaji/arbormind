import React, { useState } from "react";
import { Link } from "wouter";

const SERVICES = [
  "CRM Implementation",
  "Sales Automation",
  "AI-Powered Insights",
  "CPQ / Quote Management",
  "Contract Lifecycle Management",
  "Custom Integration",
  "Training & Support",
  "General Enquiry",
];

export default function Contact() {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    company: "", country: "", service: "", message: "",
    website_url_confirm: "", // honeypot
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/web-to-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? "Something went wrong."); setStatus("error"); return; }
      setStatus("success");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-white text-sm">A</div>
              <span className="font-bold text-lg tracking-tight">arbormind<span className="text-blue-400">.in</span></span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <span className="text-sm text-white/70 hover:text-white cursor-pointer transition-colors">Login</span>
            </Link>
            <Link href="/login">
              <button className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg transition-colors font-medium">
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Left — info */}
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs text-blue-300 font-medium">Get in touch</span>
            </div>
            <h1 className="text-4xl font-bold mb-4 leading-tight">
              Let's build your<br />
              <span className="text-blue-400">sales future</span> together
            </h1>
            <p className="text-white/60 text-lg mb-10 leading-relaxed">
              Whether you're exploring Arbormind for the first time or ready to get started,
              our team is here to help you find the right solution.
            </p>

            <div className="space-y-6">
              {[
                { icon: "📧", label: "Email us", value: "hello@arbormind.in" },
                { icon: "📍", label: "United Kingdom", value: "London, United Kingdom" },
                { icon: "📍", label: "India", value: "India" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">{item.label}</p>
                    <p className="text-white font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 p-5 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-sm text-white/50 mb-3 font-medium uppercase tracking-wider">Trusted by teams at</p>
              <div className="flex flex-wrap gap-3">
                {["Flex Technologies", "Global Corp", "Nexus Group", "Apex Ltd"].map(co => (
                  <span key={co} className="text-xs bg-white/10 border border-white/10 text-white/70 px-3 py-1 rounded-full">{co}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right — form */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
            {status === "success" ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-5 text-3xl">
                  ✓
                </div>
                <h2 className="text-2xl font-bold mb-3">Thank you!</h2>
                <p className="text-white/60 mb-6">
                  Your message has been received. One of our team members will be in touch within 24 hours.
                </p>
                <button
                  onClick={() => { setStatus("idle"); setForm({ firstName: "", lastName: "", email: "", phone: "", company: "", country: "", service: "", message: "", website_url_confirm: "" }); }}
                  className="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-1">Send us a message</h2>
                <p className="text-white/50 text-sm mb-6">We'll get back to you within 24 hours.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Honeypot — hidden from real users */}
                  <input
                    type="text" name="website_url_confirm" value={form.website_url_confirm}
                    onChange={set("website_url_confirm")} tabIndex={-1}
                    style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
                    aria-hidden="true"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5 font-medium">First name <span className="text-red-400">*</span></label>
                      <input
                        type="text" value={form.firstName} onChange={set("firstName")} required
                        placeholder="John"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5 font-medium">Last name</label>
                      <input
                        type="text" value={form.lastName} onChange={set("lastName")}
                        placeholder="Smith"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 font-medium">Work email <span className="text-red-400">*</span></label>
                    <input
                      type="email" value={form.email} onChange={set("email")} required
                      placeholder="john@company.com"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5 font-medium">Phone</label>
                      <input
                        type="tel" value={form.phone} onChange={set("phone")}
                        placeholder="+44 20 0000 0000"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5 font-medium">Company</label>
                      <input
                        type="text" value={form.company} onChange={set("company")}
                        placeholder="Acme Corp"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 font-medium">Country <span className="text-red-400">*</span></label>
                    <select
                      value={form.country} onChange={set("country")} required
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
                    >
                      <option value="" className="bg-slate-800">Select your country…</option>
                      <option value="India" className="bg-slate-800">India</option>
                      <option value="United Kingdom" className="bg-slate-800">United Kingdom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 font-medium">I'm interested in</label>
                    <select
                      value={form.service} onChange={set("service")}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
                    >
                      <option value="" className="bg-slate-800">Select a service…</option>
                      {SERVICES.map(s => <option key={s} value={s} className="bg-slate-800">{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 font-medium">Message</label>
                    <textarea
                      value={form.message} onChange={set("message")} rows={4}
                      placeholder="Tell us about your needs, team size, or any questions you have…"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                    />
                  </div>

                  {status === "error" && (
                    <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {status === "submitting" ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Sending…
                      </>
                    ) : "Send Message →"}
                  </button>

                  <p className="text-xs text-white/30 text-center">
                    By submitting this form you agree to our{" "}
                    <span className="underline cursor-pointer hover:text-white/50">Privacy Policy</span>.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
