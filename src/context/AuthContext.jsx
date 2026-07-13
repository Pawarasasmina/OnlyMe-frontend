import { useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import { AuthContext } from "./AuthContext";

const ACCESS_TOKEN_KEY = "onlyme_access_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const clearAuthState = () => setUser(null);
    window.addEventListener("onlyme-auth-cleared", clearAuthState);
    return () => window.removeEventListener("onlyme-auth-cleared", clearAuthState);
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!localStorage.getItem(ACCESS_TOKEN_KEY)) {
      setLoading(false);
      return () => { mounted = false; };
    }

    authService.getProfile()
      .then((response) => {
        if (mounted) setUser(response.data?.data?.user ?? null);
      })
      .catch(() => {
        if (mounted) {
          setUser(null);
          localStorage.removeItem(ACCESS_TOKEN_KEY);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login: async (credentials) => {
      const response = await authService.login(credentials);
      localStorage.setItem(ACCESS_TOKEN_KEY, response.data.data.accessToken);
      setUser(response.data?.data?.user ?? null);
      return response;
    },
    register: async (details) => {
      const response = await authService.register(details);
      localStorage.setItem(ACCESS_TOKEN_KEY, response.data.data.accessToken);
      setUser(response.data?.data?.user ?? null);
      return response;
    },
    logout: async () => {
      try {
        await authService.logout();
      } finally {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        setUser(null);
      }
    },
    setUser,
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
