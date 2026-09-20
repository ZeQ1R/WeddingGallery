import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { formatRequestError } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = anon, obj = user
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // A login or invite opened in another tab can replace the shared httpOnly
    // cookie. Refresh on return so the visible route matches that session.
    const syncSession = () => refresh();
    window.addEventListener("focus", syncSession);
    return () => window.removeEventListener("focus", syncSession);
  }, [refresh]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      return { ok: true, user: data };
    } catch (e) {
      return { ok: false, error: formatRequestError(e) };
    }
  };

  const register = async (payload) => {
    try {
      const { data } = await api.post("/auth/register", payload);
      setUser(data);
      return { ok: true, user: data };
    } catch (e) {
      return { ok: false, error: formatRequestError(e) };
    }
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
