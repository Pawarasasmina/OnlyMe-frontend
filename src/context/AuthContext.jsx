import { clearWallDraft } from "../services/wallDraftStore";
import { useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import { AuthContext } from "./AuthContext";
import { disconnectMessageSocket, getMessageSocket } from "../services/messageSocket";
import { analyticsService } from "../services/analyticsService";
import { clearAnalyticsSession } from "../services/analyticsSession";

const ACCESS_TOKEN_KEY = "onlyme_access_token";
const CACHED_USER_KEY = "onlyme_cached_user";

function readCachedUser() {
  if (!localStorage.getItem(ACCESS_TOKEN_KEY)) return null;
  try {
    return JSON.parse(localStorage.getItem(CACHED_USER_KEY)) || null;
  } catch {
    localStorage.removeItem(CACHED_USER_KEY);
    return null;
  }
}

function clearStoredAuth() {
  clearWallDraft();
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(CACHED_USER_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readCachedUser);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(ACCESS_TOKEN_KEY)) && !readCachedUser());

  useEffect(() => {
    if (user) localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(CACHED_USER_KEY);
  }, [user]);

  useEffect(() => {
    const clearAuthState = () => {
      clearStoredAuth();
      setUser(null);
      setLoading(false);
    };
    window.addEventListener("onlyme-auth-cleared", clearAuthState);
    return () => window.removeEventListener("onlyme-auth-cleared", clearAuthState);
  }, []);

  useEffect(() => {
    if (user && localStorage.getItem(ACCESS_TOKEN_KEY)) {
      getMessageSocket();
      return undefined;
    }
    if (!loading) disconnectMessageSocket();
    return undefined;
  }, [loading, user]);

  useEffect(() => {
    let mounted = true;

    if (!localStorage.getItem(ACCESS_TOKEN_KEY)) {
      setLoading(false);
      return () => { mounted = false; };
    }

    // A cached user lets the application render immediately while this request
    // request validates and refreshes the session in the background.
    authService.getProfile()
      .then((response) => {
        if (mounted) setUser(response.data?.data?.user ?? null);
      })
      .catch(() => {
        // The response interceptor removes the token only when the API has
        // confirmed that both access and refresh credentials are invalid.
        // Keep the last session during timeouts, cold starts and temporary 5xxs.
        if (mounted && !localStorage.getItem(ACCESS_TOKEN_KEY)) setUser(null);
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
      const nextUser = response.data?.data?.user ?? null;
      if (nextUser) localStorage.setItem(CACHED_USER_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      return response;
    },
    register: async (details) => {
      const response = await authService.register(details);
      localStorage.setItem(ACCESS_TOKEN_KEY, response.data.data.accessToken);
      const nextUser = response.data?.data?.user ?? null;
      if (nextUser) localStorage.setItem(CACHED_USER_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      return response;
    },
    refreshUser: async () => {
      const response = await authService.getProfile();
      const nextUser = response.data?.data?.user ?? null;
      setUser(nextUser);
      return nextUser;
    },    logout: async () => {
      try {
        void analyticsService.endSession().catch(() => {});
        await authService.logout();
      } finally {
        disconnectMessageSocket();
        clearStoredAuth();
        clearAnalyticsSession();
        setUser(null);
      }
    },
    setUser,
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

