import { wallNoteStoryDraft } from "../../utils/wallNoteStory";
import { createPortal } from "react-dom";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import "./InvitationShare.css";
import "./WallShareSheet.css";
import "./TicketShare.css";
import TicketChatCard from "./TicketChatCard";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FaTelegramPlane, FaWhatsapp } from "react-icons/fa";
import { FiCheck, FiCopy, FiInstagram, FiMessageCircle, FiMoreHorizontal, FiPlusCircle, FiSearch, FiSend, FiX } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import { useAuth } from "../../hooks/useAuth";
import { useShareRecipients } from "../../hooks/share/useShareRecipients";
import { useSendSharedContent } from "../../hooks/share/useSendSharedContent";
import { canonicalShareUrl, shareService } from "../../services/shareService";

const quickEmojis = ["\u2764\uFE0F", "\uD83D\uDE02", "\uD83D\uDD25", "\uD83D\uDE0D", "\uD83D\uDC4F", "\uD83D\uDE2E", "\uD83D\uDE4F", "\uD83E\uDD1D"];
const MAX_VISIBLE_DIRECT_CHATS = 8;

function firstName(name = "") {
  return String(name || "").trim().split(/\s+/)[0] || __msg("branding.atseen");
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) throw new Error(__msg("share.copyFailed"));
}

function RecipientItem({ person, selected, onToggle }) {
  __useUiLanguage();
  const displayName = person.displayName || person.name || person.username || __msg("branding.atseen");
  return (
    <button
      aria-label={`${selected ? __msg("profile.remove") : __msg("content.select")} ${displayName}`}
      aria-pressed={selected}
      className={`share-recipient-item ${selected ? "is-selected" : ""}`}
      onClick={() => onToggle(person)}
      type="button"
    >
      <span className="share-recipient-ring">
        <FanAvatar alt={__msg("fan.avatar", { value0: displayName })} name={displayName} size="h-[52px] w-[52px]" src={person.avatarUrl} />
        {selected || person.isVerified || person.statusEmoji ? <span className="share-recipient-badge">{selected || person.isVerified ? <FiCheck aria-hidden="true" /> : person.statusEmoji}</span> : null}
      </span>
      <span className="share-recipient-name">{firstName(displayName)}</span>
    </button>
  );
}

function WallStoryIcon() {
  __useUiLanguage();
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="9" strokeDasharray="4 3"/><path d="M12 8.5v7M8.5 12h7"/></svg>;
}

function ExternalAction({ Icon, label, onClick }) {
  __useUiLanguage();
  return (
    <button className="share-external-action" onClick={onClick} type="button">
      <span><Icon aria-hidden="true" /></span>
      <small>{label}</small>
    </button>
  );
}

function ShareContentPreview({ payload, canonicalUrl }) {
  __useUiLanguage();
  if (payload.contentType === "ticket") return <section className="share-chat-preview" aria-label={__msg("share.howTheSharedContentLooksInAChat")}><p>{__msg("share.howItLooksInAChat")}</p><TicketChatCard content={payload} /></section>;
  const author = payload.author || {};
  const authorName = author.name || author.displayName || author.username || "@seen";
  const mediaUrl = payload.imageUrl || payload.mediaUrl || payload.thumbnailUrl || "";
  const mediaType = String(payload.mediaType || payload.type || "").toLowerCase();
  const isVideo = mediaType.includes("video") || /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(mediaUrl);
  const isNote = payload.contentType === "feed_post";
  const noteTitle = String(payload.textPreview || payload.title || __msg("social.note_2c924e"));
  const previewTitle = isNote ? `\u201c${noteTitle.length > 82 ? `${noteTitle.slice(0, 79)}...` : noteTitle}\u201d` : payload.title || payload.textPreview || __msg("share.sharedOnSeen");
  const typeLabel = payload.contentType === "dream" ? __msg("profile.dream") : payload.contentType === "seen" ? "Seen" : payload.contentType === "feed_post" ? "post" : payload.contentType || "share";
  const shortUrl = String(canonicalUrl || "@seen.com").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  return <section className="share-chat-preview" aria-label={__msg("share.howTheSharedContentLooksInAChat")}>
    <p>{__msg("share.howItLooksInAChat")}</p>
    <div className={`share-chat-card ${mediaUrl ? "has-media" : ""}`}>
      <div className="share-chat-media">
        {mediaUrl ? isVideo ? <video aria-label={__msg("admin.preview_c39702", { value0: payload.title || __msg("fan.sharedContent") })} muted playsInline preload="metadata" src={mediaUrl} /> : <img alt={__msg("admin.preview_c39702", { value0: payload.title || __msg("fan.sharedContent") })} src={mediaUrl} /> : null}
        <span className="share-chat-media-shade" />
        <span className="share-chat-avatar"><FanAvatar alt={__msg("fan.avatar", { value0: authorName })} name={authorName} size="h-[66px] w-[66px]" src={author.avatarUrl || author.avatar} /></span>
      </div>
      <div className="share-chat-copy">
        <strong>{previewTitle}</strong>
        <span>{isNote ? __msg("social.note_2c924e") : payload.contentType === "dream" ? __msg("profile.dream") : payload.contentType === "invitation" ? __msg("messages.realStoriesFromRealPeopleJoinMeThere") : <>{__msg("share.a")} {typeLabel} {__msg("share.by")} {firstName(authorName)}</>}</span>
        <small><svg aria-hidden="true" width="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12C5.3 7.8 18.7 7.8 22 12 18.7 16.2 5.3 16.2 2 12z"/><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/></svg>{shortUrl || __msg("share.seenCom")}</small>
      </div>
    </div>
  </section>;
}

function selectedLabel(recipients = []) {
  const names = recipients.map((item) => firstName(item.displayName || item.name || item.username));
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

function useShareSheetPosition(isOpen) {
  const [position, setPosition] = useState(undefined);

  useEffect(() => {
    if (!isOpen) return undefined;

    const centerColumn = document.querySelector(".social-center-scroll");
    if (!centerColumn) return undefined;

    const updatePosition = () => {
      const bounds = centerColumn.getBoundingClientRect();
      setPosition({
        "--share-sheet-center-x": `${bounds.left + bounds.width / 2}px`,
        "--share-sheet-column-width": `${bounds.width}px`,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    resizeObserver?.observe(centerColumn);

    return () => {
      window.removeEventListener("resize", updatePosition);
      resizeObserver?.disconnect();
    };
  }, [isOpen]);

  return position;
}

function ShareSheet({ isOpen, onClose, payload, variant = "default" }) {
  __useUiLanguage();
  const { user } = useAuth();
  const { showToast: notify } = useFanToast();
  const showToast = message => notify(message, payload?.contentType === "invitation" ? { variant: "archive", duration: 1600 } : {});
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const messageInputRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Map());
  const [message, setMessage] = useState("");
  const [externalBusy, setExternalBusy] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const [instagramOpen, setInstagramOpen] = useState(false);
  const [instagramPreview, setInstagramPreview] = useState("");
  const recipientsQuery = useShareRecipients({ enabled: isOpen, query, viewerId: user?.id || user?._id || "" });
  const sendMutation = useSendSharedContent();
  const canonicalUrl = useMemo(() => canonicalShareUrl(payload || {}), [payload]);
  const selectedRecipients = useMemo(() => [...selected.values()], [selected]);
  const visibleRecipients = useMemo(
    () => (recipientsQuery.data || []).slice(0, MAX_VISIBLE_DIRECT_CHATS),
    [recipientsQuery.data]
  );
  const canClose = !sendMutation.isPending;
  const sheetPosition = useShareSheetPosition(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape" && canClose) {
        if (query) setQuery("");
        else onClose();
      }
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable?.[0];
      const last = focusable?.[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      if (previousFocusRef.current instanceof HTMLElement) previousFocusRef.current.focus();
    };
  }, [canClose, isOpen, onClose, query]);

  useEffect(() => {
    if (isOpen) return;
    setQuery("");
    setSelected(new Map());
    setMessage("");
    setExternalBusy("");
    setCopyNotice("");
    setInstagramOpen(false);
    setInstagramPreview("");
  }, [isOpen]);

  useEffect(() => {
    if (!copyNotice) return undefined;
    const timer = window.setTimeout(() => setCopyNotice(""), 2200);
    return () => window.clearTimeout(timer);
  }, [copyNotice]);

  const close = () => {
    if (canClose) onClose();
  };

  const publishShareCount = (privateShareCount) => {
    const count = Number(privateShareCount);
    if (!Number.isFinite(count) || !["feed_post", "seen"].includes(payload?.contentType) || !payload?.contentId) return;
    window.dispatchEvent(new CustomEvent("atseen:private-share", {
      detail: { contentId: String(payload.contentId), contentType: payload.contentType, privateShareCount: count },
    }));
  };

  const recordShare = async (route) => {
    if (!["feed_post", "seen"].includes(payload?.contentType) || !payload?.contentId) return;
    try {
      const response = await shareService.record(payload.contentType, payload.contentId, route);
      const privateShareCount = response.data?.data?.privateShareCount;
      publishShareCount(privateShareCount);
      queryClient.invalidateQueries({ queryKey: ["seen"] });
      queryClient.invalidateQueries({ queryKey: ["seen-feed"] });
      queryClient.invalidateQueries({ queryKey: ["seen-engagement", payload.contentId] });
      queryClient.invalidateQueries({ queryKey: ["wall"] });
      queryClient.invalidateQueries({ queryKey: ["post", payload.contentId] });
      queryClient.invalidateQueries({ queryKey: ["fan", "home"] });
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
    } catch { /* Sharing must still work if analytics is temporarily unavailable. */ }
  };

  const toggleRecipient = (person) => {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(person.id)) next.delete(person.id);
      else next.set(person.id, person);
      return next;
    });
  };

  const appendEmoji = (emoji) => {
    const input = messageInputRef.current;
    setMessage((current) => {
      const start = input?.selectionStart ?? current.length;
      const end = input?.selectionEnd ?? current.length;
      const next = `${current.slice(0, start)}${emoji}${current.slice(end)}`;
      const cursor = start + emoji.length;
      window.requestAnimationFrame(() => {
        input?.focus();
        input?.setSelectionRange(cursor, cursor);
      });
      return next.slice(0, 2000);
    });
  };

  const copyLink = async (toast = __msg("share.linkCopied"), value = canonicalUrl) => {
    setExternalBusy("copy");
    try {
      await copyText(value);
      await recordShare("COPY_LINK");
      setCopyNotice(__msg("profile.linkCopied"));
      showToast(toast);
      if (payload?.contentType === "invitation") close();
    } catch {
      setCopyNotice(__msg("share.couldnTCopyLink"));
      showToast(__msg("share.couldnTCopyTheLink"));
    } finally {
      setExternalBusy("");
    }
  };

  const shareToStory = async () => {
    if (payload?.onShareToStory) { payload.onShareToStory(); return; }
    if (payload?.contentType === "seen" && payload?.contentId) {
      close();
      navigate(`/seen/${encodeURIComponent(payload.contentId)}/share/story`, { state: { fromShareSheet: true } });
      return;
    }
    close();
    navigate("/create", {
      state: {
        openStoryComposer: true,
        returnTo: `${location.pathname}${location.search}${location.hash}`,
        storyDraft: payload?.storyDraft || (payload?.contentType === "feed_post" ? wallNoteStoryDraft({ id: payload.contentId, author: payload.author || {}, text: payload.textPreview || payload.title, location: payload.location || "", own: String(payload.author?.id || "") === String(user?.id || user?._id || "") }) : {
          caption: payload?.previewText || payload?.textPreview || payload?.title || "",
          imageUrl: payload?.imageUrl || "",
          sharedCard: {
            destinationRoute: payload?.route || canonicalUrl,
            imageUrl: payload?.imageUrl || "",
            kind: payload?.contentType || "content",
            subtitle: payload?.previewText || payload?.textPreview || __msg("stories.tapToOpen"),
            title: payload?.title || __msg("share.sharedOnSeen"),
          },
        }),
      },
    });
  };

  const shareWhatsApp = () => {
    const title = payload?.title || payload?.textPreview || "this";
    const text = payload?.contentType === "invitation" ? __msg("share.value0RealStoriesFromRealPeopleJoinMe", { value0: title, value1: canonicalUrl }) : __msg("share.checkThisOutOnSeenValue0Value1", { value0: title, value1: canonicalUrl });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    void recordShare("WHATSAPP");
    showToast(__msg("share.openingWhatsapp"));
  };

  const shareTelegram = () => {
    const title = payload?.title || payload?.textPreview || __msg("share.seeThisOnSeen");
    window.open(`https://t.me/share/url?url=${encodeURIComponent(canonicalUrl)}&text=${encodeURIComponent(title)}`, "_blank", "noopener,noreferrer");
    void recordShare("TELEGRAM");
    showToast(__msg("share.openingTelegram"));
  };

  const openMessages = () => {
    if (["invitation", "ticket"].includes(payload?.contentType)) {
      window.location.href = `sms:?&body=${encodeURIComponent(`${payload.title}. ${payload.previewText || __msg("messages.realStoriesFromRealPeopleJoinMeThere")} ${canonicalUrl}`)}`;
      return;
    }
    close();
    navigate("/messages", { state: { sharePayload: payload } });
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      if (payload?.contentType === "invitation") await copyLink(__msg("share.copiedWithAMessagePasteItAnywhere"), __msg("share.value0RealStoriesFromRealPeopleJoinMe_fa38cf", { value0: payload.title, value1: canonicalUrl }));
      else await copyLink(__msg("share.linkCopied"));
      return;
    }
    setExternalBusy("native");
    try {
      await navigator.share({
        title: payload?.title || "@seen",
        text: payload?.textPreview || payload?.previewText || __msg("share.seeThisOnSeen"),
        url: canonicalUrl,
      });
      await recordShare("SYSTEM_SHARE");
    } catch (error) {
      if (error?.name !== "AbortError") showToast(__msg("share.couldnTOpenSharing"));
    } finally {
      setExternalBusy("");
    }
  };

  const send = async () => {
    if (!selectedRecipients.length || sendMutation.isPending || !payload?.contentId) return;
    try {
      const data = await sendMutation.mutateAsync({ message: message.trim(), recipients: selectedRecipients, sharedContent: payload });
      if (data.failed?.length) {
        showToast(data.sent?.length ? __msg("share.someSharesCouldNotBeSent") : __msg("share.couldnTSendThisPost"));
        return;
      }
      publishShareCount(data.privateShareCount);
      await recordShare("CHAT");
      showToast(__msg("share.sentTo", { value0: selectedLabel(selectedRecipients) }));
      close();
    } catch (error) {
      showToast(error?.response?.data?.message || __msg("share.couldnTSendThisPost"));
    }
  };

  if (!isOpen || !payload) return null;

  const isSeenVariant = variant === "seen";

  const imageSource = payload.imageUrl || payload.thumbnailUrl || payload.mediaUrl;
  const hasImage = !/audio|video/i.test(String(payload.mediaType || "")) && !/\.(mp3|wav|m4a|ogg|webm|mp4|mov)(?:$|[?#])/i.test(imageSource || "");
  const instagramImage = instagramPreview || (hasImage ? imageSource : "");
  const openInstagram = () => {
    if (!instagramImage) {
      const canvas = document.createElement("canvas");
      canvas.width = 1080; canvas.height = 1350;
      const ctx = canvas.getContext("2d");
      if (!ctx) { showToast(__msg("system.ShareSheet.6a383b102a")); return; }
      ctx.fillStyle = "#0A0C0F"; ctx.fillRect(0, 0, 1080, 1350);
      ctx.fillStyle = "#9CCBFF"; ctx.font = "bold 56px sans-serif"; ctx.fillText("@seen", 76, 120);
      ctx.fillStyle = "#FFFFFF"; ctx.font = "36px sans-serif";
      const words = String(payload.textPreview || payload.title || __msg("social.note_2c924e")).split(/\s+/);
      let line = "", y = 280;
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width > 920 && line) {
          ctx.fillText(line, 76, y); y += 54; line = word;
          if (y > 1100) { line = "..."; break; }
        } else line = next;
      }
      ctx.fillText(line, 76, y);
      ctx.fillStyle = "#9CCBFF"; ctx.font = "28px sans-serif";
      ctx.fillText(String(payload.author?.name || __msg("share.noteOnSeen")).slice(0, 55), 76, 1200);
      ctx.fillStyle = "#AAAAAA"; ctx.font = "22px sans-serif";
      ctx.fillText(String(canonicalUrl).slice(0, 80), 76, 1260);
      setInstagramPreview(canvas.toDataURL("image/png"));
    }
    setInstagramOpen(true);
  };
  if (instagramOpen) return createPortal(<div className={`share-sheet-overlay instagram-save-overlay ${payload.contentType === "dream" ? "is-dream-share" : ""}`} style={sheetPosition} role="dialog" aria-modal="true" aria-labelledby="instagram-save-title" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section className="instagram-save-content" ref={panelRef}>
      <img alt={payload.title || ""} src={instagramImage} />
      <h2 id="instagram-save-title">{__msg("share.instagramSavePicture")}</h2>
      <p>{__msg("share.instagramAddStory")}</p>
      <a href={instagramImage} download="seen-note.png" style={{ color: "#9CCBFF" }}>{__msg("system.ShareSheet.ccdb19f1fb")}</a>
      <button autoFocus onClick={() => { setInstagramOpen(false); close(); }} type="button">{__msg("comments.done")}</button>
    </section>
  </div>, document.body);

  const sheet = (
    <div
      aria-labelledby="share-sheet-title"
      aria-modal="true"
      className={`${variant === "ticket" ? "is-ticket-share " : ""}${isSeenVariant ? "is-seen-share " : ""}${payload.contentType === "feed_post" ? "is-wall-share " : ""}${payload.contentType === "invitation" ? "is-invitation " : payload.contentType === "dream" ? "is-dream-share " : ""}share-sheet-overlay`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      role="dialog"
      style={sheetPosition}
    >
      <div className="share-sheet-panel" ref={panelRef} tabIndex={-1}>
        <div className="share-sheet-handle" aria-hidden="true" />
        <header className="share-sheet-header">
          <div className="min-w-0">
            <h2 id="share-sheet-title">{__msg("admin.share")}</h2>
          </div>
          <button aria-label={__msg("share.closeShareSheet")} className="share-sheet-close" disabled={!canClose} onClick={close} type="button">
            <FiX aria-hidden="true" />
          </button>
        </header>

        <ShareContentPreview canonicalUrl={canonicalUrl} payload={payload} />

        <p className="share-send-label">{__msg("share.sendInSeen")}</p>

        <label className="share-search">
          <span className="sr-only">{__msg("share.searchRecipients")}</span>
          <FiSearch aria-hidden="true" />
          <input
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={__msg("discover.search")}
            ref={inputRef}
            value={query}
          />
        </label>

        <div className="share-recipient-grid" role="list">
          {recipientsQuery.isLoading ? Array.from({ length: 8 }).map((_, index) => <span className="share-recipient-skeleton" key={index} />) : null}
          {!recipientsQuery.isLoading && visibleRecipients.map((person) => (
            <RecipientItem key={person.id} onToggle={toggleRecipient} person={person} selected={selected.has(person.id)} />
          ))}
        </div>
        {!recipientsQuery.isLoading && !(recipientsQuery.data || []).length ? <p className="share-empty">{__msg("share.noOneFound")}</p> : null}

        {selectedRecipients.length ? (
          <section className="share-message-section" aria-live="polite">
            <div className="share-emoji-row">
              {quickEmojis.map((emoji) => (
                <button aria-label={__msg("share.add", { value0: emoji })} key={emoji} onClick={() => appendEmoji(emoji)} type="button">
                  {emoji}
                </button>
              ))}
            </div>
            <form
              className="share-message-row"
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
            >
              <input
                maxLength={2000}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={__msg("share.writeAMessage")}
                ref={messageInputRef}
                value={message}
              />
              <button disabled={sendMutation.isPending || !selectedRecipients.length} type="submit">
                {sendMutation.isPending ? __msg("profile.sending") : __msg("fanWeb.send")}
              </button>
            </form>
            <p className="sr-only" role="status">{sendMutation.isPending ? __msg("share.sendingSharedContent") : __msg("share.selected", { value0: selectedRecipients.length })}</p>
          </section>
        ) : (
          <section className="share-external-row" aria-label={__msg("share.externalShareActions")}>
            {copyNotice ? <p className="share-copy-notice" role="status">{copyNotice}</p> : null}
            {payload.contentType !== "invitation" ? <ExternalAction Icon={["feed_post", "ticket"].includes(payload.contentType) ? WallStoryIcon : FiPlusCircle} label={__msg("activity.story")} onClick={shareToStory} /> : null}
            {instagramImage || payload.contentType === "feed_post" ? <ExternalAction Icon={FiInstagram} label="Instagram" onClick={openInstagram} /> : null}
            <ExternalAction Icon={externalBusy === "copy" ? FiCheck : FiCopy} label={__msg("profile.copyLink")} onClick={() => copyLink()} />
            <ExternalAction Icon={FaWhatsapp} label={__msg("share.whatsapp")} onClick={shareWhatsApp} />
            <ExternalAction Icon={["feed_post", "ticket"].includes(payload.contentType) ? FiSend : FaTelegramPlane} label={__msg("share.telegram")} onClick={shareTelegram} />
            <ExternalAction Icon={FiMessageCircle} label={__msg("share.messages")} onClick={openMessages} />
            <ExternalAction Icon={FiMoreHorizontal} label={__msg("discover.more")} onClick={nativeShare} />
          </section>
        )}
      </div>
    </div>
  );
  return ["dream", "ticket"].includes(payload.contentType) ? createPortal(sheet, document.body) : sheet;
}

export default ShareSheet;
