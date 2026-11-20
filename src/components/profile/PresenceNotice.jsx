import api from "../../api/axiosInstance";
import { clearReadReceipts } from "../../utils/privacyPresentation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { getMessageSocket } from "../../services/messageSocket";
import "./PresenceNotice.css";

export default function PresenceNotice() {
  const { user, setUser } = useAuth();
  const { t } = useLanguage();
  const client = useQueryClient();
  const [offer, setOffer] = useState(false);
  const [bounds, setBounds] = useState({});
  const previousStatus = useRef(undefined);
  const userId = user?.id || user?._id;
  useEffect(() => {
    if (!userId) return undefined;
    const socket = getMessageSocket();
    const self = state => {
      setOffer(Boolean(state.offerAtSeen));
      const key = JSON.stringify(state.activeStatus);
      if (previousStatus.current === key) return;
      previousStatus.current = key;
      setUser(current => current ? { ...current, activeStatus: state.activeStatus } : current);
      client.invalidateQueries({ queryKey: ["wall-stories"] });
      client.invalidateQueries({ queryKey: ["unified-profile"] });
    };
    const status = event => {
      if (String(event.userId) === String(userId)) { setOffer(false); self({ activeStatus: event.activeStatus, offerAtSeen: false }); }
      client.invalidateQueries({ queryKey: ["messages"] });
      client.invalidateQueries({ predicate: query => ["wall-stories", "stories", "discover", "unified-profile"].includes(query.queryKey[0]) });
    };
    const privacy = preferences => setUser(current => current ? { ...current, ...preferences } : current);
    const refresh = () => { client.setQueriesData({ queryKey: ["messages"] }, clearReadReceipts); client.invalidateQueries({ queryKey: ["messages"] }); client.invalidateQueries({ queryKey: ["settings", "privacy"] }); window.dispatchEvent(new Event("onlyme-privacy-updated")); };
    socket.on("presence:self", self); socket.on("status:updated", status); socket.on("privacy:updated", privacy); socket.on("privacy:refresh", refresh);
    const fromHttp = event => self(event.detail);
    window.addEventListener("onlyme-presence-self", fromHttp);
    socket.emit("presence:heartbeat", { interaction: false });
    return () => { window.removeEventListener("onlyme-presence-self", fromHttp); socket.off("presence:self", self); socket.off("status:updated", status); socket.off("privacy:updated", privacy); socket.off("privacy:refresh", refresh); };
  }, [userId, client, setUser]);
  useEffect(() => {
    if (!offer) return undefined;
    const measure = () => { const rect = document.querySelector(".social-center-scroll")?.getBoundingClientRect(); if (rect) setBounds({ left: rect.left + 16, width: rect.width - 32 }); };
    measure(); window.addEventListener("resize", measure);
    const timer = setTimeout(() => { setOffer(false); getMessageSocket().emit("presence:offer-dismiss"); api.post("/presence/offer", { enable: false }).catch(() => {}); }, 9000);
    return () => { clearTimeout(timer); window.removeEventListener("resize", measure); };
  }, [offer]);
  if (!offer) return null;
  return <aside className="presence-return-bar" role="status" style={bounds}><span>{"\uD83D\uDC41"} {t("presence.atSeenAgain")}</span><button onClick={() => { setOffer(false); const socket = getMessageSocket(); if (socket.connected) socket.emit("presence:at-seen-on"); else api.post("/presence/offer", { enable: true }).then(response => window.dispatchEvent(new CustomEvent("onlyme-presence-self", { detail: response.data.data }))).catch(() => {}); }} type="button">{t("presence.turnOn")}</button><button aria-label={t("activity.close")} onClick={() => { setOffer(false); getMessageSocket().emit("presence:offer-dismiss"); api.post("/presence/offer", { enable: false }).catch(() => {}); }} type="button">{"\u00d7"}</button></aside>;
}
