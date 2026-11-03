/* i18n-source-migrated */
import { msg as __msg } from "../../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../../hooks/useLanguage.js";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { fanService } from "../../../services/fanService";
import { useAuth } from "../../../hooks/useAuth";
import { resolveMediaUrl } from "../../../utils/media";
import { useFanToast } from "./FanToastContext";
import FanAvatar from "./FanAvatar";
import { GIFT_THANKS_OPEN_EVENT } from "./giftThanksEvent";

// The prototype's timed reply is a demo. Announce real creator activity only.
export default function GiftThanksNotice() {
  __useUiLanguage();
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const navigate = useNavigate();
  const shown = useRef(new Set());
  const toastTimer = useRef(null);
  const [toastBusy, setToastBusy] = useState(false);
  const sheetRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [sheetPosition, setSheetPosition] = useState({});
  const activity = useQuery({
    queryKey: ["fan", "activity", "gift-thanks", user?.id],
    queryFn: () => fanService.getActivity({ direction: "received", filter: "support", limit: 30, page: 1 }).then((response) => response.data.data),
    enabled: Boolean(user?.id),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    retry: false,
  });

  useEffect(() => {
    shown.current = new Set();
    setSelected(null);
    setToastBusy(false);
    window.clearTimeout(toastTimer.current);
    return () => window.clearTimeout(toastTimer.current);
  }, [user?.id]);
  useEffect(() => {
    const openThanks = (event) => setSelected(event.detail);
    window.addEventListener(GIFT_THANKS_OPEN_EVENT, openThanks);
    return () => window.removeEventListener(GIFT_THANKS_OPEN_EVENT, openThanks);
  }, []);
  useEffect(() => {
    if (!user?.id || toastBusy) return;
    const items = activity.data?.items || activity.data?.activity || [];
    const storageKey = item => `atseen:gift-thanks-shown:${user.id}:${item.dedupeKey || item.id}`;
    const alreadyShown = item => {
      if (shown.current.has(item.id)) return true;
      try { return localStorage.getItem(storageKey(item)) === "1"; } catch { return false; }
    };
    const thanks = items.filter((item) => /gift.*thank|thank.*gift/i.test(item.type || "") && !item.read && !item.acknowledged && item.id && !alreadyShown(item));
    if (!thanks.length) return;
    const item = thanks[0];
    // Persist before announcing so a refresh or another tab cannot replay it.
    shown.current.add(item.id);
    try { localStorage.setItem(storageKey(item), "1"); } catch { /* server acknowledgement also persists delivery */ }
    fanService.acknowledgeActivity(item.id).catch(() => { /* local marker prevents replay if temporarily offline */ });
    setToastBusy(true);
    toastTimer.current = window.setTimeout(() => setToastBusy(false), 6500);
    const creator = item.relatedCreator || item.actor || {};
    const name = String(creator.displayName || creator.name || creator.username || __msg("fanWeb.theCreator")).split(" ")[0];
    showToast(item.preview || item.message || item.title || __msg("fanWeb.thankYouForYourGift"), {
      variant: "gift-thanks",
      title: __msg("fanWeb.value0ThankedYou", { value0: name }),
      avatar: creator.avatarUrl || creator.avatar,
      duration: 6000,
      onAction: () => setSelected(item),
    });
  }, [activity.data, user?.id, toastBusy, showToast]);

  useEffect(() => {
    if (!selected) return undefined;
    const center = document.querySelector(".social-center-scroll");
    const previousFocus = document.activeElement;
    const updatePosition = () => {
      const bounds = center?.getBoundingClientRect();
      setSheetPosition(bounds ? { left: `${bounds.left}px`, width: `${bounds.width}px` } : {});
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSelected(null);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("keydown", closeOnEscape);
    const observer = center && typeof ResizeObserver !== "undefined" ? new ResizeObserver(updatePosition) : null;
    observer?.observe(center);
    window.setTimeout(() => sheetRef.current?.focus(), 0);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("keydown", closeOnEscape);
      observer?.disconnect();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [selected]);

  const creator = selected?.relatedCreator || selected?.actor || {};
  const name = creator.displayName || creator.name || creator.username || __msg("fanWeb.theCreator");
  if (!selected) return null;

  const firstName = String(name).split(" ")[0];
  const message = selected.preview || selected.message || selected.title || __msg("fanWeb.thankYouForYourGift");
  const giftName = selected.metadata?.giftName || selected.gift?.name || __msg("fanWeb.yourGift");
  const giftImage = resolveMediaUrl(selected.metadata?.giftImageUrl || selected.giftImageUrl || selected.gift?.imageUrl);
  const profileRoute = creator.username
    ? `/profile/${encodeURIComponent(creator.username)}`
    : selected.route || selected.actionPath || "/activity?filter=support";
  const visitCreator = () => {
    setSelected(null);
    if (typeof selected.openProfile === "function") selected.openProfile();
    else navigate(profileRoute);
  };

  return createPortal(
    <div className="gift-thanks-card-layer" style={sheetPosition}>
      <button aria-label={__msg("fanWeb.closeThankYou")} className="gift-thanks-card-scrim" onClick={() => setSelected(null)} type="button" />
      <section
        aria-label={__msg("fanWeb.sThankYou", { value0: firstName })}
        aria-modal="true"
        className="gift-thanks-card-sheet-prototype"
        ref={sheetRef}
        role="dialog"
        tabIndex={-1}
      >
        <span aria-hidden="true" className="gift-thanks-card-handle" />
        <div className="gift-thanks-card-avatar">
          <FanAvatar name={name} size="h-24 w-24" src={creator.avatarUrl || creator.avatar} />
          {giftImage ? <img alt={giftName} className="gift-thanks-card-gift" src={giftImage} /> : null}
        </div>
        <blockquote>{String(message).replace(/^[“"]|[”"]$/g, "")}</blockquote>
        <p className="gift-thanks-card-byline">&mdash; {firstName} {__msg("fanWeb.for")} {giftName}</p>
        <button
          className="gift-thanks-card-visit"
          onClick={visitCreator}
          type="button"
        >{__msg("fanWeb.visit")}{firstName}
        </button>
        <p className="gift-thanks-card-kept">{__msg("fanWeb.keptInYourThingsThanks")}</p>
      </section>
    </div>,
    document.body,
  );
}
