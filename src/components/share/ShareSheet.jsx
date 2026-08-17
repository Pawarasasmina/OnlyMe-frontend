import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSnapchatGhost, FaWhatsapp } from "react-icons/fa";
import { FiCheck, FiExternalLink, FiLink, FiMoreHorizontal, FiPlusCircle, FiSearch, FiX } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import { useAuth } from "../../hooks/useAuth";
import { useShareRecipients } from "../../hooks/share/useShareRecipients";
import { useSendSharedContent } from "../../hooks/share/useSendSharedContent";
import { canonicalShareUrl } from "../../services/shareService";
import { resolveMediaUrl } from "../../utils/media";

const quickEmojis = ["\u2764\uFE0F", "\uD83D\uDE02", "\uD83D\uDD25", "\uD83D\uDE0D", "\uD83D\uDC4F", "\uD83D\uDE2E", "\uD83D\uDE4F", "\uD83E\uDD1D"];

function contentTypeLabel(type = "content") {
  if (type === "feed_post") return "POST";
  if (type === "seen") return "SEEN";
  if (type === "world") return "WORLD";
  if (type === "experience") return "EXPERIENCE";
  if (type === "profile") return "PROFILE";
  if (type === "story") return "STORY";
  return "CONTENT";
}

function firstName(name = "") {
  return String(name || "").trim().split(/\s+/)[0] || "Atseen";
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
  if (!copied) throw new Error("Copy failed");
}

function ShareContentPreview({ payload }) {
  const image = resolveMediaUrl(payload?.imageUrl);
  return (
    <div className="share-content-preview">
      {image ? <img alt={`${contentTypeLabel(payload.contentType)} preview`} src={image} /> : <span className="share-preview-icon"><FiExternalLink /></span>}
      <div className="min-w-0">
        <p>{contentTypeLabel(payload.contentType)}</p>
        <strong>{payload?.title || payload?.author?.name || "Shared content"}</strong>
        <span>{payload?.textPreview || payload?.previewText || "Open on @seen"}</span>
      </div>
    </div>
  );
}

function RecipientItem({ person, selected, onToggle }) {
  const displayName = person.displayName || person.name || person.username || "Atseen";
  const status = person.reason || (person.lastSeenAt ? "Recent" : "");
  return (
    <button
      aria-label={`${selected ? "Remove" : "Select"} ${displayName}`}
      aria-pressed={selected}
      className={`share-recipient-item ${selected ? "is-selected" : ""}`}
      onClick={() => onToggle(person)}
      type="button"
    >
      <span className="share-recipient-ring">
        <FanAvatar alt={`${displayName} avatar`} name={displayName} size="h-[52px] w-[52px]" src={person.avatarUrl} />
        <span className="share-recipient-badge">{selected ? <FiCheck aria-hidden="true" /> : person.isVerified ? "✓" : status ? "•" : ""}</span>
      </span>
      <span className="share-recipient-name">{firstName(displayName)}</span>
    </button>
  );
}

function ExternalAction({ Icon, label, onClick }) {
  return (
    <button className="share-external-action" onClick={onClick} type="button">
      <span><Icon aria-hidden="true" /></span>
      <small>{label}</small>
    </button>
  );
}

function selectedLabel(recipients = []) {
  const names = recipients.map((item) => firstName(item.displayName || item.name || item.username));
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

function ShareSheet({ isOpen, onClose, payload, variant = "default" }) {
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const messageInputRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Map());
  const [message, setMessage] = useState("");
  const [externalBusy, setExternalBusy] = useState("");
  const recipientsQuery = useShareRecipients({ enabled: isOpen, query, viewerId: user?.id || user?._id || "" });
  const sendMutation = useSendSharedContent();
  const canonicalUrl = useMemo(() => canonicalShareUrl(payload || {}), [payload]);
  const selectedRecipients = useMemo(() => [...selected.values()], [selected]);
  const canClose = !sendMutation.isPending;

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
  }, [isOpen]);

  const close = () => {
    if (canClose) onClose();
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

  const copyLink = async (toast = "Link copied \u2713") => {
    setExternalBusy("copy");
    try {
      await copyText(canonicalUrl);
      showToast(toast);
    } catch {
      showToast("Couldn't copy the link");
    } finally {
      setExternalBusy("");
    }
  };

  const shareToStory = async () => {
    await copyLink("Link copied - add it to your story");
    close();
    navigate("/create");
  };

  const shareWhatsApp = () => {
    const title = payload?.title || payload?.textPreview || "this";
    const text = `Check this out on @seen: ${title} ${canonicalUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    showToast("Opening WhatsApp...");
  };

  const shareSnapchat = () => {
    copyLink("Link copied - paste it into Snapchat");
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      await copyLink("Link copied \u2713");
      return;
    }
    setExternalBusy("native");
    try {
      await navigator.share({
        title: payload?.title || "@seen",
        text: payload?.textPreview || payload?.previewText || "See this on @seen",
        url: canonicalUrl,
      });
    } catch (error) {
      if (error?.name !== "AbortError") showToast("Couldn't open sharing");
    } finally {
      setExternalBusy("");
    }
  };

  const send = async () => {
    if (!selectedRecipients.length || sendMutation.isPending || !payload?.contentId) return;
    try {
      const data = await sendMutation.mutateAsync({ message: message.trim(), recipients: selectedRecipients, sharedContent: payload });
      if (data.failed?.length) {
        showToast(data.sent?.length ? "Some shares could not be sent" : "Couldn't send this post");
        return;
      }
      showToast(`Sent to ${selectedLabel(selectedRecipients)} \u2713`);
      close();
    } catch (error) {
      showToast(error?.response?.data?.message || "Couldn't send this post");
    }
  };

  if (!isOpen || !payload) return null;

  const isSeenVariant = variant === "seen";

  return (
    <div
      aria-labelledby="share-sheet-title"
      aria-modal="true"
      className={isSeenVariant ? "is-seen-share share-sheet-overlay" : "share-sheet-overlay"}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      role="dialog"
    >
      <div className="share-sheet-panel" ref={panelRef} tabIndex={-1}>
        <div className="share-sheet-handle" aria-hidden="true" />
        <header className="share-sheet-header">
          <div className="min-w-0">
            <h2 id="share-sheet-title">Send to</h2>
            <p>{payload.textPreview || payload.previewText || payload.title || "Share this on @seen"}</p>
          </div>
          <button aria-label="Close share sheet" className="share-sheet-close" disabled={!canClose} onClick={close} type="button">
            <FiX aria-hidden="true" />
          </button>
        </header>

        {isSeenVariant ? null : <ShareContentPreview payload={payload} />}

        <label className="share-search">
          <span className="sr-only">Search recipients</span>
          <FiSearch aria-hidden="true" />
          <input
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            ref={inputRef}
            value={query}
          />
        </label>

        <div className="share-recipient-grid" role="list">
          {recipientsQuery.isLoading ? Array.from({ length: 8 }).map((_, index) => <span className="share-recipient-skeleton" key={index} />) : null}
          {!recipientsQuery.isLoading && (recipientsQuery.data || []).map((person) => (
            <RecipientItem key={person.id} onToggle={toggleRecipient} person={person} selected={selected.has(person.id)} />
          ))}
        </div>
        {!recipientsQuery.isLoading && !(recipientsQuery.data || []).length ? <p className="share-empty">No one found</p> : null}

        {selectedRecipients.length ? (
          <section className="share-message-section" aria-live="polite">
            <div className="share-emoji-row">
              {quickEmojis.map((emoji) => (
                <button aria-label={`Add ${emoji}`} key={emoji} onClick={() => appendEmoji(emoji)} type="button">
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
                placeholder="Write a message..."
                ref={messageInputRef}
                value={message}
              />
              <button disabled={sendMutation.isPending || !selectedRecipients.length} type="submit">
                {sendMutation.isPending ? "Sending..." : "Send"}
              </button>
            </form>
            <p className="sr-only" role="status">{sendMutation.isPending ? "Sending shared content" : `${selectedRecipients.length} selected`}</p>
          </section>
        ) : (
          <section className="share-external-row" aria-label="External share actions">
            <ExternalAction Icon={FiPlusCircle} label="Story" onClick={shareToStory} />
            <ExternalAction Icon={externalBusy === "copy" ? FiCheck : FiLink} label="Copy link" onClick={() => copyLink()} />
            <ExternalAction Icon={FaWhatsapp} label="WhatsApp" onClick={shareWhatsApp} />
            <ExternalAction Icon={FaSnapchatGhost} label="Snapchat" onClick={shareSnapchat} />
            <ExternalAction Icon={FiMoreHorizontal} label="More" onClick={nativeShare} />
          </section>
        )}
      </div>
    </div>
  );
}

export default ShareSheet;
