import { useState } from "react";
import { useAuth } from "@/context/auth";
import { Zap } from "lucide-react";

export default function Login() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        window.location.href = "/";
        return;
      }
      setError("Invalid username or password");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setUsername("demo@arbormind.in");
    setPassword("demo1234");
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: "linear-gradient(135deg, #0f1117 0%, #1a1f2e 50%, #0f1117 100%)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg">
          <img src="/arbormind-logo.png" alt="arbormind" className="w-full h-full object-cover" />
        </div>
        <span className="text-xl font-bold text-white">arbormind<span className="text-indigo-400">.in</span></span>
      </div>

      <div className="w-full max-w-sm">
        {/* Demo banner */}
        <button
          type="button"
          onClick={fillDemo}
          className="w-full mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors text-left group"
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-indigo-300">Try the demo account</div>
            <div className="text-[11px] text-indigo-400/70 truncate">demo@arbormind.in · demo1234</div>
          </div>
          <span className="text-[10px] font-medium text-indigo-400 group-hover:text-indigo-300 transition-colors shrink-0">
            Fill in →
          </span>
        </button>

        {/* Login form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 space-y-4 shadow-2xl"
        >
          <div>
            <h1 className="text-xl font-bold text-white">Sign in</h1>
            <p className="text-sm text-white/40 mt-0.5">to your arbormind.in workspace</p>
          </div>

          <div className="space-y-3">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Email / Username"
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              autoComplete="username"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs text-white/20 mt-6">
          © 2025 arbormind.in · All rights reserved
        </p>
      </div>
    </div>
  );
}
