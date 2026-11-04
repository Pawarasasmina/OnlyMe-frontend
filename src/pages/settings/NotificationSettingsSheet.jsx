import { localizedTuple as __uiTuple } from "../../i18n/runtime.js";
import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileService } from "../../services/profileService";
import { normalizeApiError } from "../../utils/apiErrors";
import { FiChevronRight } from "react-icons/fi";
import FirstWeekNotifications from "./FirstWeekNotifications";
import "./NotificationSettingsSheet.css";

const activityKeys = ["comments", "reactions", "followers", "saves", "reposts"];

const definitions = {
  comments: __uiTuple([{ __uiMessage: "admin.comments" }, { __uiMessage: "settings.namedOneByOne" }]),
  reactions: __uiTuple([{ __uiMessage: "fanWeb.reactions" }, { __uiMessage: "settings.batchedAnnaAnd26Others" }]),
  followers: __uiTuple([{ __uiMessage: "settings.newFollowers" }, ""]),
  saves: __uiTuple([{ __uiMessage: "admin.saves" }, { __uiMessage: "settings.anonymousCountsOnly" }]),
  reposts: __uiTuple([{ __uiMessage: "settings.reposts" }, ""]),
  messages: __uiTuple([{ __uiMessage: "share.messages" }, ""]),
  directAccess: __uiTuple([{ __uiMessage: "settings.directAccessIncome" }, { __uiMessage: "settings.alwaysInDollars" }]),
  security: __uiTuple([{ __uiMessage: "settings.securityAlerts" }, { __uiMessage: "settings.requiredProtectionForAdministratorAccounts" }]),
};

function toSheetPreferences(apiPreferences = {}) {
  return {
    comments: apiPreferences.comments ?? apiPreferences.inApp ?? true,
    reactions: apiPreferences.reactions ?? apiPreferences.inApp ?? true,
    followers: apiPreferences.followers ?? apiPreferences.inApp ?? true,
    saves: apiPreferences.saves ?? apiPreferences.inApp ?? true,
    reposts: apiPreferences.reposts ?? apiPreferences.inApp ?? true,
    messages: apiPreferences.messages ?? true,
    directAccess: apiPreferences.directAccess ?? true,
    security: apiPreferences.security ?? true,
    email: apiPreferences.email,
    marketing: apiPreferences.marketing,
  };
}

function toApiPreferences(sheetPreferences = {}, currentApiPreferences = {}, role = "fan") {
  const inApp = activityKeys.some((key) => sheetPreferences[key] !== false);
  if (role === "admin") {
    return {
      email: sheetPreferences.email ?? currentApiPreferences.email ?? true,
      inApp,
      security: true,
    };
  }

  return {
    email: sheetPreferences.email ?? currentApiPreferences.email ?? true,
    inApp,
    messages: sheetPreferences.messages !== false,
    directAccess: sheetPreferences.directAccess !== false,
    marketing: currentApiPreferences.marketing ?? sheetPreferences.marketing ?? false,
  };
}

export default function NotificationSettingsSheet({ anchorRef, isOpen, onClose }) {
  __useUiLanguage();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState({});
  const [anchorBounds, setAnchorBounds] = useState(null);
  const [error, setError] = useState("");
  const [firstWeekOpen, setFirstWeekOpen] = useState(false);
  useEffect(() => { if (!isOpen) setFirstWeekOpen(false); }, [isOpen]);
  const query = useQuery({
    enabled: isOpen,
    queryKey: ["settings", "notifications"],
    queryFn: () => profileService.getNotificationSettings().then((response) => response.data.data),
  });

  useEffect(() => {
    if (query.data) setPreferences(toSheetPreferences(query.data.notificationPreferences || {}));
  }, [query.data]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const close = (event) => { if (event.key === "Escape") { if (firstWeekOpen) setFirstWeekOpen(false); else onClose(); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [isOpen, onClose, firstWeekOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const syncBounds = () => {
      const rect = anchorRef?.current?.getBoundingClientRect();
      if (!rect) {
        setAnchorBounds(null);
        return;
      }
      setAnchorBounds({ left: rect.left, width: rect.width });
    };
    syncBounds();
    window.addEventListener("resize", syncBounds);
    return () => window.removeEventListener("resize", syncBounds);
  }, [anchorRef, isOpen]);

  const mutation = useMutation({
    mutationFn: (notificationPreferences) => profileService.updateNotificationSettings({ notificationPreferences }),
    onSuccess: (response) => {
      queryClient.setQueryData(["settings", "notifications"], response.data.data);
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      setError("");
    },
    onError: (requestError, _payload, context) => {
      if (context?.previous) setPreferences(context.previous);
      setError(normalizeApiError(requestError, __msg("settings.unableToSaveNotificationSettings")).message);
    },
  });

  if (!isOpen) return null;

  const role = query.data?.role || "fan";
  const keys = role === "admin" ? ["comments", "reactions", "security"] : ["comments", "reactions", "followers", "saves", "reposts", "messages", "directAccess"];
  const toggle = (key) => {
    if (role === "admin" && key === "security") return;
    const previous = preferences;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    setError("");
    mutation.mutate(toApiPreferences(next, query.data?.notificationPreferences || {}, role), { context: { previous } });
  };

  return (
    <div
      aria-labelledby="notification-sheet-title"
      aria-modal="true"
      className="profile-notification-layer settings-notification-layer"
      role="dialog"
      style={anchorBounds ? {
        "--settings-notification-left": `${anchorBounds.left}px`,
        "--settings-notification-width": `${anchorBounds.width}px`,
      } : undefined}
    >
      <button aria-label={__msg("settings.closeNotificationSettings")} className="profile-notification-dim" onClick={onClose} type="button" />
      <section className="profile-notification-sheet settings-notification-sheet">
        <span aria-hidden="true" className="profile-notification-grab" />
        <h2 id="notification-sheet-title">{__msg(firstWeekOpen ? "settings.yourFirstWeek" : "settings.notifications")}</h2>
        {firstWeekOpen ? <FirstWeekNotifications /> : <>
        {query.isLoading ? <div className="mt-6 space-y-3">{Array.from({ length: 7 }, (_, index) => <div className="h-14 animate-pulse rounded-xl bg-white/5" key={index} />)}</div> : null}
        {query.isError ? (
          <div className="profile-notification-error">
            <p>{__msg("settings.unableToLoadNotificationSettings")}</p>
            <button className="mt-3 font-bold text-atseen-blue" onClick={() => query.refetch()} type="button">{__msg("discover.tryAgain")}</button>
          </div>
        ) : null}
        {!query.isLoading && !query.isError ? (
          <div className="profile-notification-list">
            {keys.map((key) => {
              const [title, subtitle] = definitions[key];
              const locked = role === "admin" && key === "security";
              const checked = locked || Boolean(preferences[key]);
              return (
                <button aria-checked={checked} disabled={locked || mutation.isPending} key={key} onClick={() => toggle(key)} role="switch" type="button">
                  <span>
                    <b>{title}</b>
                    {subtitle ? <small>{subtitle}</small> : null}
                  </span>
                  <i aria-hidden="true" className={checked ? "is-on" : ""}><em /></i>
                </button>
              );
            })}
          </div>
        ) : null}
        {error ? <p className="profile-notification-error" role="alert">{__systemMessage(error)}</p> : null}
        <p className="profile-notification-note">{__msg("settings.viewsAreAlwaysSilentNeverANotification")}</p>
        <button className="notification-week-entry" onClick={() => setFirstWeekOpen(true)} type="button"><span><b>{__msg("settings.yourFirstWeek")}</b><small>{__msg("settings.firstWeekWhatWeSend")}</small></span><FiChevronRight data-ui-directional="true" /></button>
        </>}
      </section>
    </div>
  );
}
