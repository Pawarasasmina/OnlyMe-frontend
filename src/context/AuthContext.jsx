import { useLanguage as __useUiLanguage } from "../hooks/useLanguage.js";
import { clearWallDraft } from "../services/wallDraftStore";
import { useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import { AuthContext } from "./AuthContext";
import { disconnectMessageSocket, getMessageSocket } from "../services/messageSocket";
import { analyticsService } from "../services/analyticsService";
import { clearAnalyticsSession } from "../services/analyticsSession";

const CACHED_USER_KEY = "onlyme_cached_user";
const LAST_USER_KEY = "onlyme_last_user";

function readCachedUser() {
  try {
    return JSON.parse(localStorage.getItem(CACHED_USER_KEY)) || null;
  } catch {
    localStorage.removeItem(CACHED_USER_KEY);
    return null;
  }
}

function clearStoredAuth() {
  clearWallDraft();
  localStorage.removeItem("onlyme_access_token");
  localStorage.removeItem(CACHED_USER_KEY);
}

export function AuthProvider({ children }) {
  __useUiLanguage();
  const [user, setUser] = useState(readCachedUser);
  const [loading, setLoading] = useState(true);

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
    if (user) {
      getMessageSocket();
      return undefined;
    }
    if (!loading) disconnectMessageSocket();
    return undefined;
  }, [loading, user]);

  useEffect(() => {
    const userId = user?.id || user?._id;
    if (!userId) return undefined;
    const socket = getMessageSocket();
    const changed = (event) => {
      if (String(event.userId) !== String(userId) || typeof event.isVerified !== "boolean") return;
      setUser(current => current ? { ...current, isVerified: event.isVerified } : current);
      window.dispatchEvent(new CustomEvent("onlyme-verification-updated"));
    };
    socket.on("verification:updated", changed);
    return () => socket.off("verification:updated", changed);
  }, [user?.id, user?._id]);

  useEffect(() => {
    let mounted = true;

    // A cached user lets the application render immediately while this request
    // request validates and refreshes the session in the background.
    authService.getProfile({ _sessionProbe: true })
      .then((response) => {
        if (mounted) setUser(response.data?.data?.user ?? null);
      })
      .catch(() => {
        // The response interceptor removes the token only when the API has
        // confirmed that both access and refresh credentials are invalid.
        // Keep the last session during timeouts, cold starts and temporary 5xxs.
        if (mounted) setUser(null);
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
      const nextUser = response.data?.data?.user ?? null;
      if (nextUser) localStorage.setItem(CACHED_USER_KEY, JSON.stringify(nextUser));
      if (nextUser) localStorage.setItem(LAST_USER_KEY, JSON.stringify({ name: nextUser.name, username: nextUser.username, email: nextUser.email, avatar: nextUser.avatar || "" }));
      setUser(nextUser);
      return response;
    },
    register: async (details) => {
      const response = await authService.register(details);
      const nextUser = response.data?.data?.user ?? null;
      if (nextUser) localStorage.setItem(CACHED_USER_KEY, JSON.stringify(nextUser));
      if (nextUser) localStorage.setItem(LAST_USER_KEY, JSON.stringify({ name: nextUser.name, username: nextUser.username, email: nextUser.email, avatar: nextUser.avatar || "" }));
      setUser(nextUser);
      return response;
    },
    refreshUser: async () => {
      const response = await authService.getProfile();
      const nextUser = response.data?.data?.user ?? null;
      setUser(nextUser);
      return nextUser;
    },
    resumeTrustedSession: async () => {
      await authService.refreshSession();
      const response = await authService.getProfile();
      const nextUser = response.data?.data?.user ?? null;
      if (!nextUser) throw new Error("Saved session is unavailable");
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      return nextUser;
    },
    trustedDeviceLogout: () => {
      void analyticsService.endSession().catch(() => {});
      void authService.logout().catch(() => {});
      disconnectMessageSocket();
      clearStoredAuth();
      clearAnalyticsSession();
      setUser(null);
    },
    logout: async () => {
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

