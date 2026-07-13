import { useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import { AuthContext } from "./AuthContext";
import { findDemoAccount } from "../data/demoAccounts";

const ACCESS_TOKEN_KEY = "onlyme_access_token";
const DEMO_USER_KEY = "onlyme_demo_user";
const DEMO_TOKEN_PREFIX = "demo-token";

const readStoredDemoUser = () => {
  const demoUser = localStorage.getItem(DEMO_USER_KEY);

  if (!demoUser) {
    return null;
  }

  try {
    return JSON.parse(demoUser);
  } catch {
    localStorage.removeItem(DEMO_USER_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const clearAuthState = () => {
      setUser(null);
    };

    window.addEventListener("onlyme-auth-cleared", clearAuthState);
    return () => window.removeEventListener("onlyme-auth-cleared", clearAuthState);
  }, []);

  useEffect(() => {
    let mounted = true;

    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const demoUser = readStoredDemoUser();

    if (accessToken?.startsWith(DEMO_TOKEN_PREFIX) && demoUser) {
      setUser(demoUser);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    if (!accessToken) {
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
          localStorage.removeItem(DEMO_USER_KEY);
          localStorage.removeItem(ACCESS_TOKEN_KEY);
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
        const demoAccount = findDemoAccount(credentials);

        if (demoAccount) {
          const accessToken = `${DEMO_TOKEN_PREFIX}-${demoAccount.user.id}`;

          localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
          localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoAccount.user));
          setUser(demoAccount.user);

          return {
            data: {
              data: {
                accessToken,
                user: demoAccount.user,
              },
            },
          };
        }

        const response = await authService.login(credentials);
        localStorage.setItem(ACCESS_TOKEN_KEY, response.data.data.accessToken);
        localStorage.removeItem(DEMO_USER_KEY);
        setUser(response.data?.data?.user ?? null);
        return response;
      },
      register: async (details) => {
        const response = await authService.register(details);
        localStorage.setItem(ACCESS_TOKEN_KEY, response.data.data.accessToken);
        localStorage.removeItem(DEMO_USER_KEY);
        setUser(response.data?.data?.user ?? null);
        return response;
      },
      logout: async () => {
        try {
          await authService.logout();
        } finally {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(DEMO_USER_KEY);
        }
        setUser(null);
      },
      setUser,
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
