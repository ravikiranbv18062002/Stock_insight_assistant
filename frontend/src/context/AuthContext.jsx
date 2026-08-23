import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);
const STORAGE_KEY = "sia_auth";

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadStoredAuth);

  const persist = useCallback((next) => {
    setAuth(next);
    if (next) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(
    async (email, password) => {
      const res = await api.login(email, password);
      persist({ token: res.access_token, email });
    },
    [persist]
  );

  const register = useCallback(
    async (email, password) => {
      const res = await api.register(email, password);
      persist({ token: res.access_token, email });
    },
    [persist]
  );

  const logout = useCallback(() => persist(null), [persist]);

  const value = useMemo(
    () => ({
      token: auth?.token ?? null,
      email: auth?.email ?? null,
      isAuthenticated: Boolean(auth?.token),
      login,
      register,
      logout,
    }),
    [auth, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
