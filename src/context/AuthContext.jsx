import { useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    if (!localStorage.getItem("onlyme_access_token")) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    authService
      .getProfile()
      .then((response) => {
        if (mounted) {
          setUser(response.data?.data?.user ?? null);
        }
      })
      .catch(() => {
        if (mounted) {
          setUser(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login: async (credentials) => {
        const response = await authService.login(credentials);
        localStorage.setItem("onlyme_access_token", response.data.data.accessToken);
        setUser(response.data?.data?.user ?? null);
        return response;
      },
      register: async (details) => {
        const response = await authService.register(details);
        localStorage.setItem("onlyme_access_token", response.data.data.accessToken);
        setUser(response.data?.data?.user ?? null);
        return response;
      },
      logout: async () => {
        try {
          await authService.logout();
        } finally {
          localStorage.removeItem("onlyme_access_token");
        }
        setUser(null);
      },
      setUser,
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
