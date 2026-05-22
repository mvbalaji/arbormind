import React, { createContext, useContext, useEffect, useState } from "react";

export type ScreenAccessLevel = "none" | "view" | "read_only" | "edit";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  username?: string;
  screenAccess?: Record<string, ScreenAccessLevel>;
  isImpersonating?: boolean;
  originalUser?: { id: number; email: string; name: string; role: string };
}

const LEVEL_RANK: Record<ScreenAccessLevel, number> = {
  none: 0, view: 1, read_only: 2, edit: 3,
};

export function useScreenAccess(screenKey: string) {
  const { user } = useAuth();
  const level: ScreenAccessLevel = user?.role === "admin"
    ? "edit"
    : (user?.screenAccess?.[screenKey] ?? "none");
  const meets = (req: ScreenAccessLevel) => LEVEL_RANK[level] >= LEVEL_RANK[req];
  return {
    level,
    canView: meets("view"),
    canRead: meets("read_only"),
    canEdit: meets("edit"),
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
  signIn: (credentials?: { username: string; password: string }) => Promise<boolean>;
  signInAndGoToDashboard: (credentials?: { username: string; password: string }) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  logout: async () => {},
  refetch: async () => {},
  signIn: async () => false,
  signInAndGoToDashboard: async () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as { user: AuthUser };
        setUser((prev) => {
          if (prev && data.user && prev.id === data.user.id && prev.email === data.user.email && prev.role === data.user.role && prev.name === data.user.name) {
            return prev;
          }
          return data.user;
        });
      } else {
        setUser((prev) => (prev === null ? prev : null));
      }
    } catch {
      setUser((prev) => (prev === null ? prev : null));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchUser();

    // Refetch when window/tab regains focus (covers OAuth redirect + session expiry)
    const handleFocus = () => void fetchUser();
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    window.location.href = "/";
  };

  const signIn = async (credentials?: { username: string; password: string }) => {
    if (!credentials) return false;
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(credentials),
    });
    if (!res.ok) return false;
    await fetchUser();
    return true;
  };

  const signInAndGoToDashboard = async (credentials?: { username: string; password: string }) => {
    const ok = await signIn(credentials);
    if (ok) {
      await fetchUser();
      window.location.href = "/#/dashboard";
    }
    return ok;
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, logout, refetch: fetchUser, signIn, signInAndGoToDashboard }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
