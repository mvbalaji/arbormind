import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/auth";

export default function Login() {
  const { signIn } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const ok = await signIn({ username, password });
      if (ok) {
        // Wait a bit for auth context to update, then redirect
        await new Promise(resolve => setTimeout(resolve, 500));
        setLocation("/");
        return;
      }
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl p-6 space-y-4 border">
        <h1 className="text-2xl font-bold">Login</h1>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full px-4 py-3 rounded-xl border" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className="w-full px-4 py-3 rounded-xl border" />
        {error && <div className="text-sm text-red-500">{error}</div>}
        <button type="submit" disabled={loading} className="w-full px-4 py-3 rounded-xl font-semibold text-white" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}