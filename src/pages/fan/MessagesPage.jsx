import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiArchive, FiArrowLeft, FiBell, FiCamera, FiCopy, FiCornerUpLeft, FiEye, FiFlag, FiImage, FiLogOut, FiMessageCircle, FiMoreVertical, FiPhone, FiPlus, FiRefreshCw, FiSearch, FiSend, FiSettings, FiShare2, FiShield, FiSmile, FiTrash2, FiUserPlus, FiX, FiZap } from "react-icons/fi";
import { FiExternalLink } from "react-icons/fi";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import VerifiedBadge from "../../components/fanWeb/shared/VerifiedBadge";
import VoiceMessageBubble from "../../components/messaging/VoiceMessageBubble";
import VoiceRecorder from "../../components/messaging/VoiceRecorder";
import VideoNoteBubble from "../../components/messaging/VideoNoteBubble";
import { useAuth } from "../../hooks/useAuth";
import { useCalls } from "../../context/callContextBase";
import { UNREAD_MESSAGE_COUNT_EVENT } from "../../hooks/useUnreadMessageCount";
import { messageService } from "../../services/messageService";
import { postService } from "../../services/postService";
import { getMessageSocket } from "../../services/messageSocket";
import { storyService } from "../../services/storyService";
import { resolveMediaUrl } from "../../utils/media";

const relative = (value) => {
  if (!value) return "Offline";
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Last seen just now";
  if (seconds < 3600) return `Last seen ${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `Last seen ${Math.floor(seconds / 3600)}h ago`;
  return `Last seen ${new Date(value).toLocaleDateString()}`;
};

const inboxTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const chatDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const chatDateLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDifference = Math.round((todayStart - dateStart) / 86400000);
  if (dayDifference === 0) return "Today";
  if (dayDifference === 1) return "Yesterday";
  return date.toLocaleDateString([], {
    day: "numeric",
    month: "long",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
};

const MESSAGE_EMOJIS = ["😀", "😂", "🥰", "😍", "😊", "😉", "😎", "🥳", "😭", "😮", "😅", "🤔", "🙌", "👏", "🙏", "👍", "👎", "💪", "❤️", "🔥", "✨", "🎉", "💯", "👀", "🌍", "🪐", "⭐", "💙"];
const MESSAGE_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

const STORY_REACTIONS = ["❤️", "🔥", "😂", "👏", "👁️"];
const REPORT_REASONS = [
  ["SPAM", "Spam"],
  ["HARASSMENT", "Harassment or bullying"],
  ["HATE", "Hate speech"],
  ["SEXUAL_CONTENT", "Sexual content"],
  ["VIOLENCE", "Violence or threats"],
  ["SCAM", "Scam or fraud"],
  ["OTHER", "Something else"],
];

const newClientMessageId = () => globalThis.crypto?.randomUUID?.()
  || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

function Identity({ person, presence, compact = false, subtitle = "" }) {
  const resolvedPresence = presence || person.presence;
  const online = resolvedPresence?.online;
  const atSeenSubtitle = subtitle.startsWith("● At seen");
  const replyLabel = atSeenSubtitle ? subtitle.replace("● At seen", "").replace(/^\s*·\s*/, "") : "";
  return <>
    <span className="relative shrink-0">
      <FanAvatar name={person.displayName} size={compact ? "h-10 w-10" : "h-12 w-12"} src={person.avatarUrl} />
      <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-atseen-bg-2 ${online ? "bg-atseen-success" : "bg-atseen-dim"}`} />
    </span>
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-1 truncate text-sm font-bold">{person.displayName}{person.isVerified ? <VerifiedBadge /> : null}</span>
      {atSeenSubtitle ? <span className="mt-0.5 flex min-w-0 items-center gap-1.5"><span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-atseen-blue/25 bg-atseen-blue/[0.07] px-2 py-0.5 text-[9px] font-bold text-atseen-blue"><span className="h-1.5 w-1.5 rounded-full bg-atseen-blue" />At seen</span>{replyLabel ? <span className="truncate text-[10px] text-atseen-muted">{replyLabel}</span> : null}</span> : <span className={`block truncate text-[11px] ${online && !subtitle ? "text-atseen-success" : "text-atseen-muted"}`}>{subtitle || (online ? "Online" : relative(resolvedPresence?.lastSeenAt || person.lastSeenAt))}</span>}
    </span>
  </>;
}

function StoryReplyPreview({ forceExpired = false, mine, onOpen, reply }) {
  const expired = forceExpired || Boolean(reply.expiresAt && new Date(reply.expiresAt).getTime() <= Date.now());
  return <button className={`mb-2 block w-full overflow-hidden rounded-xl border text-left ${mine ? "border-atseen-bg/15 bg-atseen-bg/10" : "border-white/10 bg-black/20"}`} onClick={() => onOpen(reply, expired)} type="button"><div className="flex items-center gap-2 p-2">{expired ? <span className={`grid h-12 w-10 shrink-0 place-items-center rounded-lg text-lg ${mine ? "bg-atseen-bg/10" : "bg-white/5"}`}>⌛</span> : <img alt="Story replied to" className="h-12 w-10 shrink-0 rounded-lg object-cover" src={resolveMediaUrl(reply.imageUrl)} />}<div className="min-w-0"><p className={`text-[10px] font-bold uppercase tracking-wide ${mine ? "text-atseen-bg/65" : "text-atseen-blue"}`}>{expired ? "Story unavailable" : mine ? "You replied to their story" : "Replied to your story"}</p><p className={`truncate text-xs ${mine ? "text-atseen-bg/75" : "text-atseen-muted"}`}>{expired ? "This story has expired" : reply.caption || "Tap to view story"}</p></div></div></button>;
}

function PostMessagePreview({ mine, postId, sharedUrl }) {
  const postQuery = useQuery({
    queryKey: ["message-post-preview", postId],
    queryFn: () => postService.getPost(postId),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const post = postQuery.data;
  if (postQuery.isLoading) return <div className={`min-w-56 animate-pulse overflow-hidden rounded-xl border ${mine ? "border-atseen-bg/20 bg-atseen-bg/10" : "border-atseen-line bg-black/20"}`}><div className="h-28 bg-white/10" /><div className="space-y-2 p-3"><div className="h-3 w-28 rounded bg-white/10" /><div className="h-3 w-44 rounded bg-white/10" /></div></div>;
  if (!post) return <a className={`block min-w-52 overflow-hidden rounded-xl border text-left ${mine ? "border-atseen-bg/20 bg-atseen-bg/10" : "border-atseen-line bg-black/20"}`} href={sharedUrl} rel="noreferrer" target="_blank"><span className="block px-3 py-3"><span className={`block text-[10px] font-black uppercase tracking-wider ${mine ? "text-atseen-bg/60" : "text-atseen-blue"}`}>Shared post</span><span className="mt-1 block text-sm font-bold">Open this post</span><span className={`mt-1 block truncate text-[10px] ${mine ? "text-atseen-bg/55" : "text-atseen-muted"}`}>{sharedUrl}</span></span></a>;
  const previewMedia = post.media?.find((item) => item.type === "image") || post.media?.[0];
  const authorName = post.author?.name || post.author?.displayName || "OnlyMe creator";
  const authorAvatar = post.author?.avatar || post.author?.avatarUrl || "";
  return <a className={`block w-[min(18rem,72vw)] overflow-hidden rounded-xl border text-left transition hover:brightness-110 ${mine ? "border-atseen-bg/20 bg-atseen-bg/10" : "border-atseen-line bg-black/20"}`} href={sharedUrl} rel="noreferrer" target="_blank">
    {previewMedia?.url ? previewMedia.type === "video" ? <div className="grid h-32 place-items-center bg-black/40 text-xs font-bold">Video post</div> : <img alt="Shared post preview" className="h-32 w-full object-cover" loading="lazy" src={resolveMediaUrl(previewMedia.url)} /> : null}
    <span className="block p-3">
      <span className="flex items-center gap-2"><FanAvatar name={authorName} size="h-7 w-7" src={authorAvatar} /><span className="min-w-0"><span className="block truncate text-xs font-black">{authorName}</span>{post.author?.username ? <span className={`block truncate text-[9px] ${mine ? "text-atseen-bg/55" : "text-atseen-muted"}`}>@{post.author.username}</span> : null}</span></span>
      {post.text ? <span className="mt-2 block line-clamp-3 whitespace-pre-wrap text-xs leading-5">{post.text}</span> : <span className={`mt-2 block text-xs ${mine ? "text-atseen-bg/60" : "text-atseen-muted"}`}>Shared an OnlyMe post</span>}
      <span className={`mt-2 block text-[10px] font-bold ${mine ? "text-atseen-bg/65" : "text-atseen-blue"}`}>Open post</span>
    </span>
  </a>;
}

function MessageText({ body, mine }) {
  const value = String(body || "");
  const sharedUrl = /^https?:\/\/\S+\/(?:posts|profile|worlds?|publications?)\/[^\s]+$/i.test(value) ? value : null;
  if (!sharedUrl) return <p className="whitespace-pre-wrap break-words">{value}</p>;
  const postId = sharedUrl.match(/\/posts\/([^/?#]+)/i)?.[1];
  if (postId) return <PostMessagePreview mine={mine} postId={decodeURIComponent(postId)} sharedUrl={sharedUrl} />;
  const profileShare = /\/profile\//i.test(sharedUrl);
  const worldShare = /\/(?:worlds?|publications?)\//i.test(sharedUrl);
  const sharedKind = profileShare ? "profile" : worldShare ? "world" : "note";
  return <a className={`block min-w-52 overflow-hidden rounded-xl border text-left ${mine ? "border-atseen-bg/20 bg-atseen-bg/10" : "border-atseen-line bg-black/20"}`} href={sharedUrl} rel="noreferrer" target="_blank"><span className="block px-3 py-3"><span className={`block text-[10px] font-black uppercase tracking-wider ${mine ? "text-atseen-bg/60" : "text-atseen-blue"}`}>Forwarded {sharedKind}</span><span className="mt-1 block text-sm font-bold">Open this {sharedKind}</span><span className={`mt-1 block truncate text-[10px] ${mine ? "text-atseen-bg/55" : "text-atseen-muted"}`}>{sharedUrl}</span></span></a>;
}

function GroupImageCropper({ source, onCancel, onSave, saving }) {
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const save = async () => {
    const image = new Image();
    image.src = source.url;
    await image.decode();
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight) * zoom;
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const offsetX = (x / 100) * Math.max(0, width - size) / 2;
    const offsetY = (y / 100) * Math.max(0, height - size) / 2;
    context.drawImage(image, (size - width) / 2 + offsetX, (size - height) / 2 + offsetY, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (blob) onSave(new File([blob], "group-avatar.jpg", { type: "image/jpeg" }));
  };
  return <div className="absolute inset-0 z-[80] flex items-end bg-black/80">
    <section aria-modal="true" className="w-full rounded-t-[24px] border border-b-0 border-atseen-line bg-[#1b212c] p-5 shadow-2xl" role="dialog">
      <div className="mx-auto mb-5 h-1 w-8 rounded-full bg-white/35" />
      <div className="flex items-center justify-between"><div><h2 className="text-base font-black">Position group photo</h2><p className="mt-1 text-[11px] text-atseen-muted">Zoom and move the image inside the circle.</p></div><button className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5" onClick={onCancel} type="button"><FiX /></button></div>
      <div className="relative mx-auto mt-5 aspect-square w-[min(72vw,290px)] overflow-hidden rounded-full bg-black ring-4 ring-white/10">
        <img alt="Group crop preview" className="h-full w-full select-none object-cover" draggable="false" src={source.url} style={{ objectPosition: `${50 - x / 2}% ${50 - y / 2}%`, transform: `scale(${zoom})` }} />
        <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/40" />
      </div>
      <div className="mx-auto mt-5 max-w-sm space-y-3">
        <label className="flex items-center gap-3 text-[11px] font-bold text-atseen-muted"><span className="w-12">Zoom</span><input className="w-full accent-[#9CCBFF]" max="2.5" min="1" onChange={(event) => setZoom(Number(event.target.value))} step="0.01" type="range" value={zoom} /></label>
        <label className="flex items-center gap-3 text-[11px] font-bold text-atseen-muted"><span className="w-12">Left/right</span><input className="w-full accent-[#9CCBFF]" max="100" min="-100" onChange={(event) => setX(Number(event.target.value))} type="range" value={x} /></label>
        <label className="flex items-center gap-3 text-[11px] font-bold text-atseen-muted"><span className="w-12">Up/down</span><input className="w-full accent-[#9CCBFF]" max="100" min="-100" onChange={(event) => setY(Number(event.target.value))} type="range" value={y} /></label>
      </div>
      <div className="mt-6 flex gap-2"><button className="flex-1 rounded-xl border border-atseen-line py-3 text-sm font-bold" disabled={saving} onClick={onCancel} type="button">Cancel</button><button className="flex-1 rounded-xl bg-atseen-blue py-3 text-sm font-black text-atseen-bg disabled:opacity-50" disabled={saving} onClick={save} type="button">{saving ? "Uploading…" : "Use photo"}</button></div>
    </section>
  </div>;
}

function sharedContentLabel(type = "") {
  if (type === "feed_post") return "POST";
  if (type === "seen") return "SEEN";
  if (type === "world") return "WORLD";
  if (type === "experience") return "EXPERIENCE";
  if (type === "profile") return "PROFILE";
  if (type === "story") return "STORY";
  return "CONTENT";
}

function sharedContentBodyLabel(type = "") {
  if (type === "feed_post") return "post";
  if (type === "seen") return "Seen";
  if (type === "world") return "World";
  if (type === "experience") return "experience";
  if (type === "profile") return "profile";
  if (type === "story") return "story";
  return "content";
}

function defaultSharedBody(message) {
  if (!message?.sharedContent) return "";
  return `Shared a ${sharedContentBodyLabel(message.sharedContent.contentType)}`;
}

function SharedContentMessageCard({ content, mine, onOpen }) {
  if (!content) return null;
  const author = content.author || {};
  const image = resolveMediaUrl(content.imageUrl || author.avatarUrl);
  return (
    <button
      className={`mb-2 block w-full max-w-[236px] overflow-hidden rounded-2xl border text-left transition hover:brightness-110 ${mine ? "border-atseen-bg/20 bg-atseen-bg/10" : "border-white/10 bg-black/20"}`}
      onClick={() => onOpen(content)}
      type="button"
    >
      {image ? <img alt={`${sharedContentLabel(content.contentType)} preview`} className="aspect-[5/3] w-full object-cover" loading="lazy" src={image} /> : null}
      <div className="p-2.5">
        <p className={`text-[9px] font-black tracking-[0.14em] ${mine ? "text-atseen-bg/65" : "text-atseen-blue"}`}>{sharedContentLabel(content.contentType)}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <FanAvatar name={author.name || content.title || "@seen"} size="h-6 w-6" src={author.avatarUrl} />
          <span className="min-w-0 flex-1">
            <b className="block truncate text-xs">{author.name || content.title || "Shared content"}</b>
            {author.username ? <small className={`block truncate text-[10px] ${mine ? "text-atseen-bg/60" : "text-atseen-muted"}`}>@{author.username}</small> : null}
          </span>
          <FiExternalLink className="shrink-0 opacity-55" />
        </div>
        <p className={`mt-2 line-clamp-2 text-xs leading-5 ${mine ? "text-atseen-bg/75" : "text-atseen-text/85"}`}>{content.previewText || content.title || "Open shared content"}</p>
      </div>
    </button>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { startCall } = useCalls();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const myId = String(user?.id || user?._id || "");
  const [selected, setSelected] = useState(() => {
    const userId = searchParams.get("with");
    const groupId = searchParams.get("group");
    const directAccessWindowId = searchParams.get("window");
    return groupId ? { id: groupId, type: "group" } : userId ? { id: userId, type: "direct", ...(directAccessWindowId ? { directAccessWindowId } : {}) } : null;
  });
  const [draft, setDraft] = useState("");
  const [pendingShare, setPendingShare] = useState(() => searchParams.get("share") || "");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [reactionFor, setReactionFor] = useState(null);
  const [reactionDetails, setReactionDetails] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [newChat, setNewChat] = useState(false);
  const [sharePickerOpen, setSharePickerOpen] = useState(false);
  const [newDirectChat, setNewDirectChat] = useState(false);
  const [newGroup, setNewGroup] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [inboxRowMenu, setInboxRowMenu] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);
  const [newGroupAvatar, setNewGroupAvatar] = useState(null);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [groupInfoName, setGroupInfoName] = useState("");
  const [groupMemberPickerOpen, setGroupMemberPickerOpen] = useState(false);
  const [groupPhotoMenuOpen, setGroupPhotoMenuOpen] = useState(false);
  const [groupImageViewerOpen, setGroupImageViewerOpen] = useState(false);
  const [groupCropSource, setGroupCropSource] = useState(null);
  const [groupPermissionsOpen, setGroupPermissionsOpen] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [forwardSelection, setForwardSelection] = useState(() => new Set());
  const [groupMessageInfo, setGroupMessageInfo] = useState(null);
  const [inboxTab, setInboxTab] = useState(() => searchParams.get("tab") === "direct" ? "direct" : "all");
  const [requestBusy, setRequestBusy] = useState(false);
  const [storyViewer, setStoryViewer] = useState(null);
  const [expiredStoryIds, setExpiredStoryIds] = useState(() => new Set());
  const [search, setSearch] = useState("");
  const [presence, setPresence] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [scrollDate, setScrollDate] = useState({ label: "", visible: false });
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [messageMenu, setMessageMenu] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [storyReplyDraft, setStoryReplyDraft] = useState("");
  const [storyActionBusy, setStoryActionBusy] = useState(false);
  const [directAccessBusy, setDirectAccessBusy] = useState(false);
  const [directAccessSettings, setDirectAccessSettings] = useState({ enabled: false, priceStars: 100, callEnabled: false, callPriceStars: 500, callDurationMinutes: 5, callAutoDeclineAway: false });
  const [directAccessSetupOpen, setDirectAccessSetupOpen] = useState(false);
  const [directAccessOffer, setDirectAccessOffer] = useState(null);
  const [creatorAskMode, setCreatorAskMode] = useState(false);
  const [directAccessNotice, setDirectAccessNotice] = useState("");
  const [clock, setClock] = useState(Date.now());
  const directAccessAutoOpenedRef = useRef(false);
  const directAccessSettlementRef = useRef(null);
  const bottomRef = useRef(null);
  const threadRef = useRef(null);
  const scrollDateTimerRef = useRef(null);
  const imageInputRef = useRef(null);
  const groupAvatarInputRef = useRef(null);
  const newGroupAvatarInputRef = useRef(null);
  useEffect(() => {
    if (!inboxRowMenu && !chatMenuOpen && !messageMenu && !reactionFor) return undefined;
    const dismissPopovers = (event) => {
      if (event.target.closest?.("[data-chat-popover]")) return;
      setInboxRowMenu(null);
      setChatMenuOpen(false);
      setMessageMenu(null);
      setReactionFor(null);
    };
    document.addEventListener("pointerdown", dismissPopovers);
    return () => document.removeEventListener("pointerdown", dismissPopovers);
  }, [chatMenuOpen, inboxRowMenu, messageMenu, reactionFor]);
  const conversationsQuery = useQuery({
    queryKey: ["messages", "conversations"],
    queryFn: () => messageService.getConversations().then((r) => r.data.data.conversations),
    refetchInterval: socketConnected ? false : 10000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });
  const messagesQuery = useQuery({
    queryKey: selected?.type === "group" ? ["messages", "group", selected?.id] : ["messages", selected?.id],
    queryFn: async () => {
      if (selected.type === "group") return messageService.getGroupMessages(selected.id).then((response) => response.data.data);
      const fresh = await messageService.getMessages(selected.id, { directAccessWindowId: selected.directAccessWindowId || null }).then((response) => response.data.data);
      const current = queryClient.getQueryData(["messages", selected.id]);
      const currentWindowId = current?.directAccessWindow?.id || null;
      if (currentWindowId !== (selected.directAccessWindowId || null)) return fresh;
      if (!current?.messages?.length) return fresh;
      const messageKey = (message) => message.clientMessageId
        ? `client:${message.clientMessageId}`
        : `server:${message.id}`;
      const reconciled = new Map(current.messages.map((message) => [messageKey(message), message]));
      fresh.messages.forEach((message) => reconciled.set(messageKey(message), message));
      return {
        ...fresh,
        messages: [...reconciled.values()].sort((left, right) => (
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
        )),
        pageInfo: current.pageInfo?.nextCursor ? current.pageInfo : fresh.pageInfo,
      };
    },
    enabled: Boolean(selected?.id),
    refetchOnWindowFocus: "always",
    staleTime: 10000,
  });
  useEffect(() => {
    if (selected?.id) messagesQuery.refetch();
  }, [selected?.directAccessWindowId]);
  const peopleQuery = useQuery({ queryKey: ["messages", "people", search], queryFn: () => messageService.searchPeople(search).then((r) => r.data.data.people), enabled: newChat || sharePickerOpen || newGroup || groupInfoOpen || Boolean(forwardingMessage) });
  const groupsQuery = useQuery({
    queryKey: ["messages", "groups"],
    queryFn: () => messageService.getGroups().then((response) => response.data.data.groups),
    refetchInterval: 5000,
  });
  const directWindowsQuery = useQuery({
    queryKey: ["messages", "direct-access"],
    queryFn: () => messageService.getDirectAccessWindows().then((response) => response.data.data.windows),
    enabled: inboxTab === "direct" || user?.role === "creator",
    refetchInterval: inboxTab === "direct" ? 10000 : false,
  });
  const creatorDirectAccessQuery = useQuery({
    queryKey: ["messages", "direct-access-settings"],
    queryFn: () => messageService.getDirectAccessOffer(myId).then((response) => response.data.data),
    enabled: inboxTab === "direct" && user?.role === "creator" && Boolean(myId),
  });
  const selectedDirectAccessOfferQuery = useQuery({
    queryKey: ["messages", "direct-access-offer", selected?.id],
    queryFn: () => messageService.getDirectAccessOffer(selected.id).then((response) => response.data.data),
    enabled: user?.role === "fan" && selected?.type !== "group" && Boolean(selected?.id),
    retry: false,
    staleTime: 30000,
  });
  useEffect(() => {
    if (creatorDirectAccessQuery.data) setDirectAccessSettings({
      enabled: creatorDirectAccessQuery.data.enabled,
      priceStars: creatorDirectAccessQuery.data.priceStars,
      callEnabled: Boolean(creatorDirectAccessQuery.data.callEnabled),
      callPriceStars: Number(creatorDirectAccessQuery.data.callPriceStars || 500),
      callDurationMinutes: Number(creatorDirectAccessQuery.data.callDurationMinutes || 5),
      callAutoDeclineAway: Boolean(creatorDirectAccessQuery.data.callAutoDeclineAway),
    });
  }, [creatorDirectAccessQuery.data]);
  const conversations = useMemo(() => conversationsQuery.data || [], [conversationsQuery.data]);
  const directConversations = useMemo(() => {
    const byPerson = new Map();
    (directWindowsQuery.data || []).forEach((windowItem) => {
      const other = user?.role === "creator" ? windowItem.fan : windowItem.creator;
      if (!other?.id) return;
      const current = byPerson.get(other.id);
      const itemIsActive = ["OPEN", "ANSWERED"].includes(windowItem.status)
        && Number(windowItem.messagesRemaining) > 0
        && new Date(windowItem.expiresAt).getTime() > Date.now();
      const currentIsActive = current
        && ["OPEN", "ANSWERED"].includes(current.status)
        && Number(current.messagesRemaining) > 0
        && new Date(current.expiresAt).getTime() > Date.now();
      if (!current || (itemIsActive && !currentIsActive)) {
        byPerson.set(other.id, { ...windowItem, windowCount: (current?.windowCount || 0) + 1 });
      } else {
        current.windowCount = (current.windowCount || 1) + 1;
      }
    });
    return [...byPerson.values()];
  }, [directWindowsQuery.data, user?.role]);
  const archiveInboxRow = async (conversation) => {
    setInboxRowMenu(null);
    if (conversation.type === "group") await messageService.archiveGroup(conversation.id, !conversation.archived);
    else await messageService.archiveConversation(conversation.id, !conversation.archived);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] }),
      queryClient.invalidateQueries({ queryKey: ["messages", "groups"] }),
    ]);
  };
  const directWindowSections = useMemo(() => {
    const windows = directConversations;
    if (user?.role !== "creator") return [{ label: "MY DIRECT ACCESS", items: windows }];
    return [
      { label: "INCOMING · PAID", items: windows.filter((item) => item.settlementStatus === "HELD") },
      { label: "ANSWERED", items: windows.filter((item) => item.settlementStatus !== "HELD") },
    ];
  }, [directConversations, user?.role]);
  const participant = selected?.type === "group"
    ? { ...(messagesQuery.data?.group || selected), displayName: messagesQuery.data?.group?.name || selected?.name || "Group", avatarUrl: messagesQuery.data?.group?.avatarUrl || selected?.avatarUrl, members: (messagesQuery.data?.group?.members || selected?.members || []).map((member) => ({ ...member, presence: presence[member.id] })) }
    : messagesQuery.data?.participant || selected?.participant || selected;
  const groupPresenceIds = useMemo(() => (
    selected?.type === "group"
      ? (messagesQuery.data?.group?.members || selected?.members || []).map((member) => member.id)
      : []
  ), [messagesQuery.data?.group?.members, selected?.members, selected?.type]);
  const messages = useMemo(() => messagesQuery.data?.messages || [], [messagesQuery.data?.messages]);
  useEffect(() => {
    if (!pendingShare) return;
    if (!selected?.id) {
      setSharePickerOpen(true);
      return;
    }
    setDraft(pendingShare);
    setPendingShare("");
    setSearchParams((current) => { const next = new URLSearchParams(current); next.delete("share"); return next; }, { replace: true });
  }, [pendingShare, selected?.id, setSearchParams]);
  const latestGroupSeenMessageByUser = useMemo(() => {
    const latestMessageByUser = new Map();
    if (selected?.type !== "group") return latestMessageByUser;

    messages.forEach((message) => {
      if (message.senderId !== myId) return;
      (message.readBy || []).forEach((receipt) => {
        if (receipt.userId !== myId) latestMessageByUser.set(receipt.userId, message.id);
      });
    });

    return latestMessageByUser;
  }, [messages, myId, selected?.type]);
  const directAccessWindow = selected?.type === "group" ? null : messagesQuery.data?.directAccessWindow || null;
  const selectedConversationMuted = selected?.type === "group" ? Boolean(participant?.muted) : Boolean(messagesQuery.data?.muted ?? selected?.muted);
  useEffect(() => {
    const previous = directAccessSettlementRef.current;
    if (user?.role === "creator" && previous === "HELD" && directAccessWindow?.settlementStatus === "CAPTURED") {
      const creatorShare = directAccessWindow.source === "CREATOR_REOPEN" ? 80 : 90;
      const earned = Math.floor((directAccessWindow.priceStars * creatorShare) / 100);
      setDirectAccessNotice(`✦${directAccessWindow.priceStars} captured · ✦${earned} earned`);
      const timer = window.setTimeout(() => setDirectAccessNotice(""), 3500);
      directAccessSettlementRef.current = directAccessWindow.settlementStatus;
      return () => window.clearTimeout(timer);
    }
    directAccessSettlementRef.current = directAccessWindow?.settlementStatus || null;
    return undefined;
  }, [directAccessWindow?.priceStars, directAccessWindow?.settlementStatus, directAccessWindow?.source, user?.role]);
  const hasActiveDirectAccessWindow = Boolean(
    directAccessWindow
    && ["OPEN", "ANSWERED"].includes(directAccessWindow.status)
    && directAccessWindow.messagesRemaining > 0
    && new Date(directAccessWindow.expiresAt).getTime() > clock,
  );
  useEffect(() => {
    if (!directAccessWindow?.expiresAt || !["OPEN", "ANSWERED"].includes(directAccessWindow.status)) return undefined;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [directAccessWindow?.expiresAt, directAccessWindow?.status]);
  const directAccessRemaining = directAccessWindow?.expiresAt
    ? Math.max(0, new Date(directAccessWindow.expiresAt).getTime() - clock)
    : 0;
  const directAccessTimeLabel = `${Math.floor(directAccessRemaining / 3600000)}h ${Math.floor((directAccessRemaining % 3600000) / 60000)}m`;
  const directAccessEffectivelyClosed = Boolean(
    directAccessWindow
    && (
      ["CLOSED", "EXPIRED"].includes(directAccessWindow.status)
      || directAccessWindow.messagesRemaining <= 0
      || directAccessRemaining <= 0
    )
  );
  const latestFreeFanAsk = [...messages].reverse().find((message) => message.messageKind === "FAN_FREE_ASK") || null;
  const latestFreeFanAskIndex = latestFreeFanAsk ? messages.findIndex((message) => message.id === latestFreeFanAsk.id) : -1;
  const pendingFreeFanAsk = latestFreeFanAsk && !messages.slice(latestFreeFanAskIndex + 1).some((message) => message.senderId === directAccessWindow?.creatorId && message.messageKind !== "FAN_FREE_ASK") ? latestFreeFanAsk : null;
  const awaitingFollowupCreatorReply = Boolean(directAccessWindow?.source === "FAN_FOLLOWUP" && directAccessWindow?.settlementStatus === "HELD" && !directAccessWindow?.firstCreatorReplyAt);
  const fanCanAskAfterWindowEnded = Boolean(user?.role === "fan" && directAccessEffectivelyClosed && ["CAPTURED", "INCLUDED", "REFUNDED"].includes(directAccessWindow?.settlementStatus));
  const followupPriceStars = Number(selectedDirectAccessOfferQuery.data?.priceStars || 0);
  const followupWalletBalance = Number(selectedDirectAccessOfferQuery.data?.walletBalance ?? -1);
  const followupBalanceKnown = followupPriceStars > 0 && followupWalletBalance >= 0;
  const fanCanAffordFollowup = !followupBalanceKnown || followupWalletBalance >= followupPriceStars;
  const creatorCanReplyToFreeFanAsk = Boolean(user?.role === "creator" && directAccessEffectivelyClosed && pendingFreeFanAsk);
  const fanAwaitingFreeAskReply = Boolean(user?.role === "fan" && directAccessEffectivelyClosed && pendingFreeFanAsk);
  const creatorCanAnswerClosedPaidWindow = Boolean(
    user?.role === "creator"
    && directAccessWindow?.settlementStatus === "HELD"
    && directAccessRemaining > 0
  );
  const directAccessFanLocked = Boolean(
    (directAccessEffectivelyClosed && !(fanCanAskAfterWindowEnded || creatorCanReplyToFreeFanAsk || (user?.role === "creator" && (creatorAskMode || creatorCanAnswerClosedPaidWindow))))
    || (user?.role === "fan" && awaitingFollowupCreatorReply)
    || fanAwaitingFreeAskReply
    || (fanCanAskAfterWindowEnded && !fanCanAffordFollowup),
  );
  useEffect(() => {
    if (searchParams.get("directAccess") !== "1" || !selected?.id || directAccessAutoOpenedRef.current || messagesQuery.isLoading) return;
    directAccessAutoOpenedRef.current = true;
    if (hasActiveDirectAccessWindow) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete("directAccess");
        return next;
      }, { replace: true });
      return;
    }
    setDirectAccessBusy(true);
    setError("");
    messageService.getDirectAccessOffer(selected.id)
      .then((response) => {
        if (!response.data.data.enabled) throw new Error("This creator is not accepting Direct Access.");
        setDirectAccessOffer(response.data.data);
      })
      .catch((requestError) => setError(requestError.response?.data?.message || requestError.message || "Could not load Direct Access."))
      .finally(() => {
        setDirectAccessBusy(false);
        setSearchParams((current) => {
          const next = new URLSearchParams(current);
          next.delete("directAccess");
          return next;
        }, { replace: true });
      });
  }, [hasActiveDirectAccessWindow, messagesQuery.isLoading, searchParams, selected?.id, setSearchParams]);
  const lastReadOutgoingMessageId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.senderId === myId && message.readAt) return message.id;
    }
    return null;
  }, [messages, myId]);

  useEffect(() => {
    const unreadChats = conversations.filter(
      (conversation) => !conversation.muted && (Number(conversation.unreadCount) || 0) > 0,
    ).length + (groupsQuery.data || []).filter(
      (group) => !group.muted && (Number(group.unreadCount) || 0) > 0,
    ).length;
    window.dispatchEvent(new CustomEvent(UNREAD_MESSAGE_COUNT_EVENT, { detail: unreadChats }));
  }, [conversations, groupsQuery.data]);

  useEffect(() => {
    const socket = getMessageSocket();
    if (!socket) return undefined;
    const connected = () => {
      setSocketConnected(true);
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      if (selected?.id) queryClient.invalidateQueries({ queryKey: selected.type === "group" ? ["messages", "group", selected.id] : ["messages", selected.id] });
    };
    const disconnected = () => setSocketConnected(false);
    const receiveMessage = ({ message, participant: sender, conversationStatus = "ACTIVE" }) => {
      const otherId = message.senderId === myId ? message.recipientId : message.senderId;
      const incomingWindowId = message.directAccessWindowId || null;
      if (!incomingWindowId) {
        queryClient.setQueryData(["messages", "conversations"], (current = []) => {
          const existing = current.find((item) => item.id === otherId);
          const next = existing
            ? { ...existing, lastMessage: message, status: conversationStatus, unreadCount: selected?.id === otherId && !selected?.directAccessWindowId ? 0 : (existing.unreadCount || 0) + 1 }
            : { id: otherId, participant: sender, lastMessage: message, status: conversationStatus, unreadCount: selected?.id === otherId && !selected?.directAccessWindowId ? 0 : 1 };
          return [next, ...current.filter((item) => item.id !== otherId)];
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["messages", "direct-access"] });
      }
      if (selected?.id === otherId && incomingWindowId === (selected?.directAccessWindowId || null)) {
        queryClient.setQueryData(["messages", otherId], (current) => {
          if (!current || current.messages.some((item) => item.id === message.id)) return current;
          return { ...current, participant: current.participant || sender, messages: [...current.messages, message] };
        });
        queryClient.invalidateQueries({ queryKey: ["messages", otherId] });
      }
    };
    const receiveGroupMessage = ({ groupId, message }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", "groups"] });
      const viewingGroup = selected?.type === "group" && selected.id === groupId && document.visibilityState === "visible";
      if (message.senderId !== myId && viewingGroup) messageService.markGroupDelivered(message.id, true).catch(() => {});
      if (!viewingGroup) return;
      queryClient.setQueryData(["messages", "group", groupId], (current) => {
        if (!current) return current;
        const matchIndex = current.messages.findIndex((item) => item.id === message.id || (message.clientMessageId && item.clientMessageId === message.clientMessageId));
        if (matchIndex < 0) return { ...current, messages: [...current.messages, message] };
        return { ...current, messages: current.messages.map((item, index) => index === matchIndex ? { ...item, ...message, deliveryState: "sent" } : item) };
      });
    };
    const receiveGroupCreated = () => queryClient.invalidateQueries({ queryKey: ["messages", "groups"] });
    const receiveGroupReaction = ({ groupId, messageId, reactions }) => queryClient.setQueryData(["messages", "group", groupId], (current) => current ? { ...current, messages: current.messages.map((message) => message.id === messageId ? { ...message, reactions } : message) } : current);
    const receiveGroupReceipt = ({ groupId, messageId, deliveredBy, readBy }) => {
      queryClient.setQueryData(["messages", "group", groupId], (current) => current ? { ...current, messages: current.messages.map((message) => message.id === messageId ? { ...message, deliveredBy, readBy } : message) } : current);
      setGroupMessageInfo((current) => current?.id === messageId ? { ...current, deliveredBy, readBy } : current);
    };
    const receiveGroupDelete = ({ groupId, messageId, scope, deletedAt, hiddenForUserId }) => queryClient.setQueryData(["messages", "group", groupId], (current) => !current ? current : { ...current, messages: scope === "me" && hiddenForUserId === myId ? current.messages.filter((message) => message.id !== messageId) : current.messages.map((message) => message.id === messageId ? { ...message, deletedAt, body: "This message was deleted", reactions: [] } : message) });
    const updatePresence = (next) => setPresence((current) => ({ ...current, [next.userId]: { ...current[next.userId], ...next } }));
    const updateConversationStatus = ({ otherUserId, status }) => {
      queryClient.setQueryData(["messages", otherUserId], (current) => current ? { ...current, conversationStatus: status } : current);
      queryClient.setQueryData(["messages", "conversations"], (current = []) => current.map((item) => item.id === otherUserId ? { ...item, status } : item));
    };
    const onConnected = () => connected();
    setSocketConnected(socket.connected);
    socket.on("connect", onConnected);
    socket.on("disconnect", disconnected);
    socket.on("connect_error", disconnected);
    socket.on("message:new", receiveMessage);
    socket.on("group:message", receiveGroupMessage);
    socket.on("group:created", receiveGroupCreated);
    socket.on("group:reaction", receiveGroupReaction);
    socket.on("group:receipt", receiveGroupReceipt);
    socket.on("group:message-deleted", receiveGroupDelete);
    const markMessagesRead = ({ byUserId, readAt }) => {
      if (!byUserId) return;
      queryClient.setQueryData(["messages", byUserId], (current) => current ? {
        ...current,
        messages: current.messages.map((message) => (
          message.senderId === myId && message.recipientId === byUserId && !message.readAt
            ? { ...message, readAt: readAt || new Date().toISOString() }
            : message
        )),
      } : current);
      queryClient.setQueryData(["messages", "conversations"], (current = []) => current.map((conversation) => (
        conversation.id === byUserId
          && conversation.lastMessage?.senderId === myId
          && !conversation.lastMessage.readAt
          ? { ...conversation, lastMessage: { ...conversation.lastMessage, readAt: readAt || new Date().toISOString() } }
          : conversation
      )));
    };
    const updateReaction = ({ messageId, reactions = [] }) => {
      if (!selected?.id) return;
      queryClient.setQueryData(["messages", selected.id], (current) => current ? {
        ...current,
        messages: current.messages.map((message) => message.id === messageId ? { ...message, reactions } : message),
      } : current);
    };
    const deleteRealtimeMessage = ({ messageId, message }) => {
      if (!selected?.id) return;
      queryClient.setQueryData(["messages", selected.id], (current) => current ? {
        ...current,
        messages: current.messages.map((item) => item.id === messageId ? { ...item, ...message, deliveryState: "sent" } : item),
      } : current);
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
    };
    const hideRealtimeMessage = ({ messageId, hiddenForUserId }) => {
      if (hiddenForUserId !== myId || !selected?.id) return;
      queryClient.setQueryData(["messages", selected.id], (current) => current ? {
        ...current,
        messages: current.messages.filter((item) => item.id !== messageId),
      } : current);
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
    };
    const hideRealtimeConversation = ({ otherUserId, hiddenForUserId }) => {
      if (hiddenForUserId !== myId || !otherUserId) return;
      queryClient.setQueryData(["messages", "conversations"], (current = []) => (
        current.filter((item) => item.id !== otherUserId)
      ));
      queryClient.removeQueries({ queryKey: ["messages", otherUserId], exact: true });
      if (selected?.id === otherUserId) {
        setSelected(null);
        setSearchParams({}, { replace: true });
      }
    };
    const updateBlock = ({ otherUserId, blocked }) => {
      if (!otherUserId) return;
      queryClient.setQueryData(["messages", otherUserId], (current) => current ? {
        ...current,
        blockStatus: { ...(current.blockStatus || {}), blockedMe: Boolean(blocked) },
      } : current);
    };
    const updateDirectAccess = (windowItem) => {
      const otherId = windowItem.fanId === myId ? windowItem.creatorId : windowItem.fanId;
      if (selected?.id === otherId) {
        queryClient.invalidateQueries({ queryKey: ["messages", otherId], exact: true });
      }
      queryClient.invalidateQueries({ queryKey: ["messages", "direct-access"] });
    };
    const openDirectAccessRealtime = (windowItem) => {
      queryClient.invalidateQueries({ queryKey: ["messages", "direct-access"] });
      if (user?.role !== "creator") return;
      const fanName = windowItem?.fan?.displayName || windowItem?.fan?.username || "Someone";
      setDirectAccessNotice(`⚡ New Direct Access — ${fanName} · +$${Number(windowItem?.creatorNetUsd || 0).toFixed(2)}`);
      window.setTimeout(() => setDirectAccessNotice(""), 5000);
    };
    socket.on("messages:read", markMessagesRead);
    socket.on("message:reaction", updateReaction);
    socket.on("presence:update", updatePresence);
    socket.on("conversation:status", updateConversationStatus);
    socket.on("message:deleted", deleteRealtimeMessage);
    socket.on("message:hidden", hideRealtimeMessage);
    socket.on("conversation:hidden", hideRealtimeConversation);
    socket.on("account:block", updateBlock);
    socket.on("direct-access:updated", updateDirectAccess);
    socket.on("direct-access:opened", openDirectAccessRealtime);
    return () => { socket.off("connect", onConnected); socket.off("disconnect", disconnected); socket.off("connect_error", disconnected); socket.off("message:new", receiveMessage); socket.off("group:message", receiveGroupMessage); socket.off("group:created", receiveGroupCreated); socket.off("group:reaction", receiveGroupReaction); socket.off("group:receipt", receiveGroupReceipt); socket.off("group:message-deleted", receiveGroupDelete); socket.off("messages:read", markMessagesRead); socket.off("message:reaction", updateReaction); socket.off("presence:update", updatePresence); socket.off("conversation:status", updateConversationStatus); socket.off("message:deleted", deleteRealtimeMessage); socket.off("message:hidden", hideRealtimeMessage); socket.off("conversation:hidden", hideRealtimeConversation); socket.off("account:block", updateBlock); socket.off("direct-access:updated", updateDirectAccess); socket.off("direct-access:opened", openDirectAccessRealtime); };
  }, [myId, queryClient, selected?.id, selected?.type, setSearchParams, user?.role]);

  useEffect(() => {
    if (!selected?.id) return;
    queryClient.invalidateQueries({ queryKey: selected.type === "group" ? ["messages", "group", selected.id] : ["messages", selected.id], exact: true });
  }, [queryClient, selected?.id, selected?.type]);

  useEffect(() => {
    const syncAfterResume = () => {
      if (document.visibilityState !== "visible") return;
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      if (selected?.id) queryClient.invalidateQueries({ queryKey: selected.type === "group" ? ["messages", "group", selected.id] : ["messages", selected.id], exact: true });
    };
    document.addEventListener("visibilitychange", syncAfterResume);
    window.addEventListener("online", syncAfterResume);
    return () => {
      document.removeEventListener("visibilitychange", syncAfterResume);
      window.removeEventListener("online", syncAfterResume);
    };
  }, [queryClient, selected?.id, selected?.type]);

  useEffect(() => {
    const ids = conversations.map((item) => item.participant.id);
    if (selected?.type === "group") {
      groupPresenceIds.forEach((id) => {
        if (id !== myId && !ids.includes(id)) ids.push(id);
      });
    } else if (selected?.id && !ids.includes(selected.id)) ids.push(selected.id);
    const socket = getMessageSocket();
    if (socket && ids.length) socket.emit("presence:query", ids, (rows) => setPresence((current) => ({ ...current, ...Object.fromEntries(rows.map((row) => [row.userId, { ...current[row.userId], ...row }])) })));
  }, [conversations, groupPresenceIds, myId, selected?.id, selected?.type]);

  const latestMessageId = messages[messages.length - 1]?.id || null;
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [latestMessageId]);
  useEffect(() => () => window.clearTimeout(scrollDateTimerRef.current), []);

  const handleThreadScroll = (event) => {
    const container = event.currentTarget;
    const markerLine = container.getBoundingClientRect().top + 72;
    const messageNodes = [...container.querySelectorAll("[data-chat-date-label]")];
    let activeNode = messageNodes[0];
    for (const node of messageNodes) {
      if (node.getBoundingClientRect().top <= markerLine) activeNode = node;
      else break;
    }
    const label = activeNode?.dataset.chatDateLabel || "";
    if (!label) return;
    setScrollDate({ label, visible: true });
    window.clearTimeout(scrollDateTimerRef.current);
    scrollDateTimerRef.current = window.setTimeout(() => {
      setScrollDate((current) => ({ ...current, visible: false }));
    }, 1100);
  };

  const orderedPeople = useMemo(() => peopleQuery.data || [], [peopleQuery.data]);
  const shownConversations = useMemo(() => inboxTab === "direct"
    ? []
    : [
      ...(inboxTab === "all" ? (groupsQuery.data || []).filter((item) => !item.archived) : []),
      ...conversations.filter((item) => {
      if (inboxTab === "requests") return item.status === "REQUEST" && item.requestReceived;
      return !item.archived && item.status !== "DECLINED" && (item.status !== "REQUEST" || !item.requestReceived);
    })], [conversations, groupsQuery.data, inboxTab]);
  const archivedConversations = useMemo(() => [
    ...(groupsQuery.data || []).filter((item) => item.archived),
    ...conversations.filter((item) => item.archived),
  ], [conversations, groupsQuery.data]);
  const recentShareTargets = useMemo(() => [
    ...(groupsQuery.data || []).filter((item) => !item.archived),
    ...conversations.filter((item) => !item.archived && item.status !== "DECLINED"),
  ].sort((left, right) => {
    const leftTime = new Date(left.lastMessage?.createdAt || left.updatedAt || left.createdAt || 0).getTime();
    const rightTime = new Date(right.lastMessage?.createdAt || right.updatedAt || right.createdAt || 0).getTime();
    return rightTime - leftTime;
  }), [conversations, groupsQuery.data]);
  const shareSearch = search.trim().toLowerCase();
  const filteredRecentShareTargets = useMemo(() => recentShareTargets.filter((target) => {
    if (!shareSearch) return true;
    const name = target.type === "group" ? target.name : target.participant?.displayName;
    const username = target.type === "group" ? "" : target.participant?.username;
    return `${name || ""} ${username || ""}`.toLowerCase().includes(shareSearch);
  }), [recentShareTargets, shareSearch]);
  const remainingSharePeople = useMemo(() => {
    const existingDirectIds = new Set(conversations.map((item) => String(item.id)));
    return orderedPeople.filter((person) => !existingDirectIds.has(String(person.id)));
  }, [conversations, orderedPeople]);
  const chooseConversation = (conversation) => {
    if (conversation.type === "group") {
      setSelected(conversation);
      setSearchParams({ group: conversation.id }, { replace: true });
      return;
    }
    queryClient.setQueryData(["messages", "conversations"], (current = []) => current.map((item) => (
      item.id === conversation.id ? { ...item, unreadCount: 0 } : item
    )));
    queryClient.removeQueries({ queryKey: ["messages", conversation.id], exact: true });
    setSelected({ ...conversation, type: "direct" });
    setSearchParams({ with: conversation.id, ...(conversation.directAccessWindowId ? { window: conversation.directAccessWindowId } : {}) }, { replace: true });
  };
  const closeConversation = () => { setSelected(null); setSearchParams({}, { replace: true }); };
  const openPerson = (person) => { chooseConversation({ id: person.id, type: "direct", participant: person }); setNewChat(false); setNewDirectChat(false); setSearch(""); };
  const chooseShareTarget = (target) => {
    setSharePickerOpen(false);
    setSearch("");
    chooseConversation(target.type === "group" ? target : { ...target, type: "direct" });
  };
  const closeSharePicker = () => {
    setSharePickerOpen(false);
    setPendingShare("");
    setSearch("");
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("share");
      return next;
    }, { replace: true });
  };
  const createGroup = async (event) => {
    event.preventDefault();
    if (!groupName.trim() || !groupMembers.length || actionBusy) return;
    setActionBusy(true);
    setError("");
    try {
      const group = await messageService.createGroup(groupName.trim(), groupMembers).then((response) => response.data.data.group);
      if (newGroupAvatar?.file) {
        try { await messageService.updateGroupAvatar(group.id, newGroupAvatar.file); }
        catch { setError("Group created, but its photo could not be uploaded. You can add it from group info."); }
      }
      await queryClient.invalidateQueries({ queryKey: ["messages", "groups"] });
      setNewGroup(false);
      setNewChat(false);
      setNewDirectChat(false);
      setGroupName("");
      setGroupMembers([]);
      if (newGroupAvatar?.url) URL.revokeObjectURL(newGroupAvatar.url);
      setNewGroupAvatar(null);
      chooseConversation(group);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not create this group.");
    } finally {
      setActionBusy(false);
    }
  };
  const handleInboxRequest = async (conversation, accept) => {
    if (requestBusy) return;
    setRequestBusy(true);
    setError("");
    try {
      if (accept) await messageService.acceptRequest(conversation.id);
      else await messageService.declineRequest(conversation.id);
      await queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      if (accept) chooseConversation({ ...conversation, status: "ACTIVE", requestReceived: false });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update this message request.");
    } finally {
      setRequestBusy(false);
    }
  };
  const refreshSelectedGroup = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["messages", "group", selected.id] }),
      queryClient.invalidateQueries({ queryKey: ["messages", "groups"] }),
    ]);
  };
  const addSelectedGroupMember = async (userId) => {
    setActionBusy(true);
    try { await messageService.addGroupMember(selected.id, userId); await refreshSelectedGroup(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Could not add this member."); }
    finally { setActionBusy(false); }
  };
  const updateSelectedGroupMember = async (memberId, action) => {
    setActionBusy(true);
    try {
      if (action === "remove") await messageService.removeGroupMember(selected.id, memberId);
      else await messageService.setGroupAdmin(selected.id, memberId, action === "admin");
      await refreshSelectedGroup();
    } catch (requestError) { setError(requestError.response?.data?.message || "Could not update this member."); }
    finally { setActionBusy(false); }
  };
  const saveSelectedGroupName = async () => {
    const name = groupInfoName.trim();
    if (!name || name === participant?.displayName) return;
    setActionBusy(true);
    try { await messageService.updateGroup(selected.id, { name: name.trim() }); await refreshSelectedGroup(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Could not rename this group."); }
    finally { setActionBusy(false); }
  };
  const changeSelectedGroupAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || selected?.type !== "group") return;
    if (file.size > 10 * 1024 * 1024) return setError("Choose an image smaller than 10 MB.");
    setGroupPhotoMenuOpen(false);
    setGroupCropSource({ file, url: URL.createObjectURL(file) });
  };
  const chooseNewGroupAvatar = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return setError("Choose an image smaller than 10 MB.");
    setGroupCropSource({ file, url: URL.createObjectURL(file), target: "NEW_GROUP" });
  };
  const storeCroppedNewGroupAvatar = (file) => {
    if (newGroupAvatar?.url) URL.revokeObjectURL(newGroupAvatar.url);
    if (groupCropSource?.url) URL.revokeObjectURL(groupCropSource.url);
    setNewGroupAvatar({ file, url: URL.createObjectURL(file) });
    setGroupCropSource(null);
  };
  const uploadCroppedGroupAvatar = async (file) => {
    setActionBusy(true);
    setError("");
    try {
      await messageService.updateGroupAvatar(selected.id, file);
      await refreshSelectedGroup();
      if (groupCropSource?.url) URL.revokeObjectURL(groupCropSource.url);
      setGroupCropSource(null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not update the group photo.");
    } finally {
      setActionBusy(false);
    }
  };
  const removeSelectedGroupAvatar = async () => {
    if (!participant?.avatarUrl || actionBusy || !window.confirm("Remove this group photo?")) return;
    setActionBusy(true);
    setError("");
    try { await messageService.removeGroupAvatar(selected.id); setGroupPhotoMenuOpen(false); await refreshSelectedGroup(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Could not remove the group photo."); }
    finally { setActionBusy(false); }
  };
  const updateGroupPermission = async (key, value) => {
    if (actionBusy) return;
    setActionBusy(true);
    setError("");
    try { await messageService.updateGroup(selected.id, { permissions: { [key]: value } }); await refreshSelectedGroup(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Could not update group permissions."); }
    finally { setActionBusy(false); }
  };
  const leaveOrDeleteSelectedGroup = async (removeForEveryone = false) => {
    if (!window.confirm(removeForEveryone ? "Delete this group for every member?" : "Leave this group?")) return;
    setActionBusy(true);
    try {
      if (removeForEveryone) await messageService.deleteGroup(selected.id);
      else await messageService.removeGroupMember(selected.id, myId);
      setGroupInfoOpen(false);
      closeConversation();
      await queryClient.invalidateQueries({ queryKey: ["messages", "groups"] });
    } catch (requestError) { setError(requestError.response?.data?.message || "Could not update this group."); }
    finally { setActionBusy(false); }
  };
  const forwardSelectedMessage = async (target) => {
    if (!forwardingMessage || !target || actionBusy) return;
    setActionBusy(true);
    try {
      const targets = [{ type: target.type === "group" ? "group" : "direct", id: target.id }];
      const sourceMessages = forwardingMessage.messages || [forwardingMessage];
      for (const sourceMessage of sourceMessages) {
        if (selected.type === "group") await messageService.forwardGroupMessage(sourceMessage.id, targets);
        else await messageService.forwardMessage(sourceMessage.id, targets);
      }
      setForwardingMessage(null);
      setForwardSelection(new Set());
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["messages", "groups"] }), queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] })]);
    } catch (requestError) { setError(requestError.response?.data?.message || "Could not forward this message."); }
    finally { setActionBusy(false); }
  };
  const openSharedContent = (content) => {
    if (content?.route) navigate(content.route);
  };
  const loadOlder = async () => {
    const cursor = messagesQuery.data?.pageInfo?.nextCursor;
    if (!selected?.id || !cursor || loadingOlder) return;
    setLoadingOlder(true);
    setError("");
    try {
      const response = selected.type === "group"
        ? await messageService.getGroupMessages(selected.id, { cursor })
        : await messageService.getMessages(selected.id, { cursor, directAccessWindowId: selected.directAccessWindowId || null });
      const older = response.data.data;
      const cacheKey = selected.type === "group" ? ["messages", "group", selected.id] : ["messages", selected.id];
      queryClient.setQueryData(cacheKey, (current) => current ? {
        ...current,
        messages: [
          ...older.messages.filter((incoming) => !current.messages.some((item) => item.id === incoming.id)),
          ...current.messages,
        ],
        pageInfo: older.pageInfo,
      } : older);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load older messages.");
    } finally {
      setLoadingOlder(false);
    }
  };
  const deliverText = async ({ body, clientMessageId, optimisticId, reply }) => {
    try {
      if (selected.type === "group") {
        const response = await messageService.sendGroupMessage(selected.id, body, reply?.id || null, clientMessageId);
        const sentMessage = response.data.data.message;
        queryClient.setQueryData(["messages", "group", selected.id], (current) => {
          if (!current) return current;
          const reconciled = current.messages.map((item) => item.id === optimisticId || item.clientMessageId === clientMessageId ? { ...sentMessage, deliveryState: "sent" } : item);
          const seen = new Set();
          return { ...current, messages: reconciled.filter((item) => { const key = item.clientMessageId ? `client:${item.clientMessageId}` : `server:${item.id}`; if (seen.has(key)) return false; seen.add(key); return true; }) };
        });
        queryClient.invalidateQueries({ queryKey: ["messages", "groups"] });
        return;
      }
      if (fanCanAskAfterWindowEnded) {
        const response = await messageService.sendFreeDirectAccessFollowup(selected.id, body, clientMessageId, `da-followup:${clientMessageId}`);
        const { message: sentMessage, directAccessWindow: reservedWindow } = response.data.data;
        queryClient.setQueryData(["messages", selected.id], (current) => current ? { ...current, messages: current.messages.map((item) => item.id === optimisticId || item.clientMessageId === clientMessageId ? { ...sentMessage, deliveryState: "sent" } : item), directAccessWindow: reservedWindow || current.directAccessWindow } : current);
        queryClient.invalidateQueries({ queryKey: ["messages", "direct-access"] });
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
        return;
      }
      if (creatorCanReplyToFreeFanAsk) {
        const response = await messageService.replyToFreeDirectAccessFollowup(pendingFreeFanAsk.id, body, clientMessageId, `da-followup-reply:${clientMessageId}`);
        const { message: sentMessage, directAccessWindow: updatedDirectAccessWindow } = response.data.data;
        queryClient.setQueryData(["messages", selected.id], (current) => current ? { ...current, messages: current.messages.map((item) => item.id === optimisticId || item.clientMessageId === clientMessageId ? { ...sentMessage, deliveryState: "sent" } : item), directAccessWindow: updatedDirectAccessWindow || current.directAccessWindow } : current);
        queryClient.invalidateQueries({ queryKey: ["messages", "direct-access"] });
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
        return;
      }
      const response = await messageService.send(selected.id, body, reply?.id || null, clientMessageId, directAccessWindow?.id || null);
      const { message: sentMessage, conversationStatus = "ACTIVE", directAccessWindow: updatedDirectAccessWindow } = response.data.data;
      queryClient.setQueryData(["messages", selected.id], (current) => current ? {
        ...current,
        messages: current.messages.map((item) => (
          item.id === optimisticId || item.clientMessageId === clientMessageId
            ? { ...sentMessage, deliveryState: "sent" }
            : item
        )),
        conversationStatus,
        directAccessWindow: updatedDirectAccessWindow || current.directAccessWindow,
        requestRequired: false,
      } : current);
      queryClient.setQueryData(["messages", "conversations"], (current = []) => {
        const existing = current.find((item) => item.id === selected.id);
        const next = existing
          ? { ...existing, lastMessage: sentMessage, status: conversationStatus }
          : { id: selected.id, participant, lastMessage: sentMessage, status: conversationStatus, unreadCount: 0 };
        return [next, ...current.filter((item) => item.id !== selected.id)];
      });
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
    } catch (requestError) {
      queryClient.setQueryData(["messages", selected.id], (current) => current ? {
        ...current,
        messages: current.messages.map((item) => (
          item.id === optimisticId || item.clientMessageId === clientMessageId
            ? { ...item, deliveryState: "failed" }
            : item
        )),
      } : current);
      setError(requestError.response?.status === 429
        ? requestError.response?.data?.message || "You are sending messages too quickly. Please wait a moment."
        : requestError.response?.data?.message || "Message failed. Tap retry beside the message.");
    }
  };
  const openDirectAccess = async () => {
    if (!selected?.id || directAccessBusy) return;
    if (hasActiveDirectAccessWindow) {
      setDirectAccessOffer(null);
      setError(directAccessWindow.messagesRemaining > 0
        ? "A Direct Access window is already open."
        : "This Direct Access window is still active, but all three fan messages have been used.");
      return;
    }
    setDirectAccessBusy(true);
    setError("");
    try {
      const offer = selectedDirectAccessOfferQuery.data
        || await selectedDirectAccessOfferQuery.refetch().then((result) => result.data);
      if (!offer.enabled) throw new Error("This creator is not accepting Direct Access.");
      setDirectAccessOffer(offer);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Could not load Direct Access.");
    } finally {
      setDirectAccessBusy(false);
    }
  };
  const confirmDirectAccess = async (source) => {
    setDirectAccessBusy(true);
    setError("");
    try {
      const reopenQuestionId = directAccessOffer?.reopenQuestionId || null;
      const windowSource = reopenQuestionId ? "CREATOR_REOPEN" : source;
      const response = await messageService.openDirectAccessWindow(selected.id, `da-open:${newClientMessageId()}`, windowSource, reopenQuestionId);
      const openedWindow = response.data.data.window;
      if (reopenQuestionId && selected.directAccessWindowId) {
        queryClient.setQueryData(["messages", selected.id], (current) => current ? {
          ...current,
          directAccessWindow: openedWindow,
        } : current);
        await messagesQuery.refetch();
      } else {
        chooseConversation({ ...selected, directAccessWindowId: openedWindow.id });
      }
      setDirectAccessOffer(null);
      await queryClient.invalidateQueries({ queryKey: ["messages", "direct-access"] });
      await queryClient.invalidateQueries({ queryKey: ["wallet"] });
    } catch (requestError) {
      if (requestError.response?.data?.code === "DIRECT_ACCESS_ALREADY_ACTIVE"
        || /already open/i.test(requestError.response?.data?.message || "")) {
        setDirectAccessOffer(null);
        await messagesQuery.refetch();
      }
      setError(requestError.response?.data?.code === "INSUFFICIENT_STARS"
        ? "You do not have enough Stars to open Direct Access."
        : requestError.response?.data?.message || requestError.message || "Could not open Direct Access.");
    } finally {
      setDirectAccessBusy(false);
    }
  };
  const saveDirectAccessSettings = async (nextSettings = directAccessSettings) => {
    setDirectAccessBusy(true);
    setError("");
    try {
      setDirectAccessSettings(nextSettings);
      await messageService.updateDirectAccessSettings(nextSettings.enabled, Number(nextSettings.priceStars), nextSettings);
      await creatorDirectAccessQuery.refetch();
      setDirectAccessSetupOpen(false);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not save Direct Access settings.");
    } finally {
      setDirectAccessBusy(false);
    }
  };
  const send = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selected?.id || sending) return;
    setSending(true);
    setError("");
    const clientMessageId = newClientMessageId();
    if (selected.type !== "group" && creatorAskMode && user?.role === "creator") {
      try {
        const response = await messageService.askDirectAccessQuestion(selected.id, body, clientMessageId);
        queryClient.setQueryData(["messages", selected.id], (current) => current ? {
          ...current,
          messages: [...current.messages, response.data.data.message],
        } : current);
        setDraft("");
        setCreatorAskMode(false);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Could not send the follow-up question.");
      } finally {
        setSending(false);
      }
      return;
    }
    const optimisticId = `pending:${clientMessageId}`;
    const reply = replyTo;
    const optimisticMessage = {
      id: optimisticId,
      clientMessageId,
      senderId: myId,
      recipientId: selected.id,
      body,
      mediaType: "text",
      createdAt: new Date().toISOString(),
      readAt: null,
      replyTo: reply ? { id: reply.id, senderId: reply.senderId, body: reply.body } : null,
      reactions: [],
      deliveryState: "sending",
    };
    const selectedCacheKey = selected.type === "group" ? ["messages", "group", selected.id] : ["messages", selected.id];
    queryClient.setQueryData(selectedCacheKey, (current) => current ? {
      ...current,
      messages: [...current.messages, optimisticMessage],
    } : current);
    setDraft("");
    setReplyTo(null);
    setEmojiOpen(false);
    setSending(false);
    await deliverText({ body, clientMessageId, optimisticId, reply });
  };
  const retryText = async (message) => {
    if (message.deliveryState !== "failed") return;
    setError("");
    const selectedCacheKey = selected.type === "group" ? ["messages", "group", selected.id] : ["messages", selected.id];
    queryClient.setQueryData(selectedCacheKey, (current) => current ? {
      ...current,
      messages: current.messages.map((item) => item.id === message.id ? { ...item, deliveryState: "sending" } : item),
    } : current);
    await deliverText({
      body: message.body,
      clientMessageId: message.clientMessageId,
      optimisticId: message.id,
      reply: message.replyTo,
    });
  };
  const reactToMessage = async (message, emoji) => {
    setReactionFor(null);
    setError("");
    const mine = (message.reactions || []).find((reaction) => reaction.userId === myId);
    try {
      const response = mine?.emoji === emoji
        ? selected.type === "group" ? await messageService.removeGroupReaction(message.id) : await messageService.removeReaction(message.id)
        : selected.type === "group" ? await messageService.setGroupReaction(message.id, emoji) : await messageService.setReaction(message.id, emoji);
      const reactions = response.data.data.reactions || [];
      const cacheKey = selected.type === "group" ? ["messages", "group", selected.id] : ["messages", selected.id];
      queryClient.setQueryData(cacheKey, (current) => current ? {
        ...current,
        messages: current.messages.map((item) => item.id === message.id ? { ...item, reactions } : item),
      } : current);
    } catch (reactionError) {
      setError(reactionError.response?.data?.message || "Could not update this reaction.");
    }
  };
  const sendVoice = async (blob, waveform, mediaType = "audio") => {
    if (mediaType === "video") return sendVideoNote(blob, waveform);
    if (!selected?.id) return;
    if (selected.type === "group") {
      const response = await messageService.sendGroupVoice(selected.id, blob, waveform, newClientMessageId());
      const sentMessage = response.data.data.message;
      queryClient.setQueryData(["messages", "group", selected.id], (current) => current ? { ...current, messages: current.messages.some((item) => item.id === sentMessage.id) ? current.messages : [...current.messages, sentMessage] } : current);
      queryClient.invalidateQueries({ queryKey: ["messages", "groups"] });
      return;
    }
    const response = await messageService.sendVoice(selected.id, blob, waveform, directAccessWindow?.id || null, newClientMessageId());
    const { message: sentMessage, conversationStatus = "ACTIVE", directAccessWindow: updatedDirectAccessWindow } = response.data.data;
    queryClient.setQueryData(["messages", selected.id], (current) => {
      if (!current || current.messages.some((item) => item.id === sentMessage.id)) return current;
      return { ...current, messages: [...current.messages, sentMessage], conversationStatus, directAccessWindow: updatedDirectAccessWindow || current.directAccessWindow, requestRequired: false };
    });
    queryClient.setQueryData(["messages", "conversations"], (current = []) => {
      const existing = current.find((item) => item.id === selected.id);
      const next = existing
        ? { ...existing, lastMessage: sentMessage, status: conversationStatus }
        : { id: selected.id, participant, lastMessage: sentMessage, status: conversationStatus, unreadCount: 0 };
      return [next, ...current.filter((item) => item.id !== selected.id)];
    });
    queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
  };
  const sendVideoNote = async (blob, onProgress) => {
    if (!selected?.id) return;
    if (selected.type === "group") {
      const response = await messageService.sendGroupVideoNote(selected.id, blob, newClientMessageId(), onProgress);
      const sentMessage = response.data.data.message;
      queryClient.setQueryData(["messages", "group", selected.id], (current) => current ? { ...current, messages: current.messages.some((item) => item.id === sentMessage.id) ? current.messages : [...current.messages, sentMessage] } : current);
      queryClient.invalidateQueries({ queryKey: ["messages", "groups"] });
      return;
    }
    const response = await messageService.sendVideoNote(selected.id, blob, onProgress, directAccessWindow?.id || null, newClientMessageId());
    const { message: sentMessage, conversationStatus = "ACTIVE", directAccessWindow: updatedDirectAccessWindow } = response.data.data;
    queryClient.setQueryData(["messages", selected.id], (current) => {
      if (!current || current.messages.some((item) => item.id === sentMessage.id)) return current;
      return { ...current, messages: [...current.messages, sentMessage], conversationStatus, directAccessWindow: updatedDirectAccessWindow || current.directAccessWindow, requestRequired: false };
    });
    queryClient.setQueryData(["messages", "conversations"], (current = []) => {
      const existing = current.find((item) => item.id === selected.id);
      const next = existing
        ? { ...existing, lastMessage: sentMessage, status: conversationStatus }
        : { id: selected.id, participant, lastMessage: sentMessage, status: conversationStatus, unreadCount: 0 };
      return [next, ...current.filter((item) => item.id !== selected.id)];
    });
    queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
  };
  const handleRequest = async (accept) => {
    setRequestBusy(true); setError("");
    try {
      if (accept) {
        await messageService.acceptRequest(selected.id);
        queryClient.setQueryData(["messages", selected.id], (current) => ({ ...current, conversationStatus: "ACTIVE" }));
        await queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      } else {
        await messageService.declineRequest(selected.id);
        await queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
        closeConversation();
      }
    } catch (requestError) { setError(requestError.response?.data?.message || "Unable to update this message request."); }
    finally { setRequestBusy(false); }
  };
  const deleteSelectedMessage = async (selection = null) => {
    const message = selection?.message || deleteDialog?.message;
    const scope = selection?.scope || deleteDialog?.scope;
    if (!message || !scope) return;
    setActionBusy(true);
    setMessageMenu(null);
    setError("");
    try {
      const response = selected.type === "group" ? await messageService.deleteGroupMessage(message.id, scope) : await messageService.deleteMessage(message.id, scope);
      const cacheKey = selected.type === "group" ? ["messages", "group", selected.id] : ["messages", selected.id];
      if (scope === "me") {
        queryClient.setQueryData(cacheKey, (current) => current ? {
          ...current,
          messages: current.messages.filter((item) => item.id !== message.id),
        } : current);
      } else {
        const deleted = response.data.data.message || { deletedAt: response.data.data.deletedAt, body: "This message was deleted", reactions: [] };
        queryClient.setQueryData(cacheKey, (current) => current ? {
          ...current,
          messages: current.messages.map((item) => item.id === message.id ? { ...item, ...deleted } : item),
        } : current);
      }
      setDeleteDialog(null);
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not delete this message.");
    } finally {
      setActionBusy(false);
    }
  };
  const toggleBlock = async () => {
    const blocked = Boolean(messagesQuery.data?.blockStatus?.blockedByMe);
    if (!blocked && !window.confirm(`Block ${participant?.displayName || "this account"}? They will not be able to message you.`)) return;
    setActionBusy(true);
    setChatMenuOpen(false);
    setError("");
    try {
      if (blocked) await messageService.unblock(selected.id);
      else await messageService.block(selected.id);
      queryClient.setQueryData(["messages", selected.id], (current) => current ? {
        ...current,
        blockStatus: { ...(current.blockStatus || {}), blockedByMe: !blocked },
      } : current);
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Could not ${blocked ? "unblock" : "block"} this account.`);
    } finally {
      setActionBusy(false);
    }
  };
  const deleteSelectedConversation = async () => {
    if (!selected?.id || !window.confirm("Delete this chat? It will disappear only for you. New messages can start the chat again.")) return;
    const otherUserId = selected.id;
    setActionBusy(true);
    setChatMenuOpen(false);
    setError("");
    try {
      await messageService.deleteConversation(otherUserId);
      queryClient.setQueryData(["messages", "conversations"], (current = []) => (
        current.filter((item) => item.id !== otherUserId)
      ));
      queryClient.removeQueries({ queryKey: ["messages", otherUserId], exact: true });
      closeConversation();
      window.dispatchEvent(new Event(UNREAD_MESSAGE_COUNT_EVENT));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not delete this chat.");
    } finally {
      setActionBusy(false);
    }
  };
  const deleteSelectedMessages = async (scope) => {
    const selectedMessages = bulkDeleteDialog?.messages || [];
    if (!selectedMessages.length || !["me", "everyone"].includes(scope)) return;
    if (scope === "everyone" && !selectedMessages.every((message) => message.senderId === myId && !message.deletedAt)) return;
    setActionBusy(true);
    setError("");
    const cacheKey = selected.type === "group" ? ["messages", "group", selected.id] : ["messages", selected.id];
    try {
      const results = [];
      for (const message of selectedMessages) {
        const response = selected.type === "group" ? await messageService.deleteGroupMessage(message.id, scope) : await messageService.deleteMessage(message.id, scope);
        results.push({ id: message.id, data: response.data.data });
      }
      queryClient.setQueryData(cacheKey, (current) => {
        if (!current) return current;
        if (scope === "me") return { ...current, messages: current.messages.filter((message) => !selectedMessages.some((selectedMessage) => selectedMessage.id === message.id)) };
        return { ...current, messages: current.messages.map((message) => {
          const result = results.find((item) => item.id === message.id);
          if (!result) return message;
          return { ...message, ...(result.data.message || {}), deletedAt: result.data.message?.deletedAt || result.data.deletedAt || new Date().toISOString(), body: "This message was deleted", reactions: [] };
        }) };
      });
      setBulkDeleteDialog(null);
      setForwardSelection(new Set());
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
    } catch (requestError) {
      await queryClient.invalidateQueries({ queryKey: cacheKey });
      setError(requestError.response?.data?.message || "Some selected messages could not be deleted.");
    } finally {
      setActionBusy(false);
    }
  };
  const archiveSelectedConversation = async () => {
    if (!selected?.id || actionBusy) return;
    setActionBusy(true);
    setChatMenuOpen(false);
    setError("");
    try {
      const archived = !selected.archived;
      if (selected.type === "group") await messageService.archiveGroup(selected.id, archived);
      else await messageService.archiveConversation(selected.id, archived);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["messages", "groups"] }),
        queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] }),
      ]);
      closeConversation();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not archive this chat.");
    } finally {
      setActionBusy(false);
    }
  };
  const muteSelectedConversation = async () => {
    if (!selected?.id || actionBusy) return;
    setActionBusy(true);
    setChatMenuOpen(false);
    setError("");
    try {
      const muted = !selectedConversationMuted;
      if (selected.type === "group") await messageService.muteGroup(selected.id, muted);
      else await messageService.muteConversation(selected.id, muted);
      setSelected((current) => current ? { ...current, muted } : current);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["messages", "groups"] }),
        queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] }),
      ]);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not update notification settings.");
    } finally {
      setActionBusy(false);
    }
  };
  const pinSelectedGroup = async () => {
    if (selected?.type !== "group" || actionBusy) return;
    setActionBusy(true);
    try {
      const pinnedToProfile = !participant?.pinnedToProfile;
      await messageService.pinGroupToProfile(selected.id, pinnedToProfile);
      await queryClient.invalidateQueries({ queryKey: ["messages", "groups"] });
      await messagesQuery.refetch();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not update the group on your profile.");
    } finally {
      setActionBusy(false);
    }
  };
  const copyMessage = async (message) => {
    try {
      await navigator.clipboard.writeText(message.body || "");
      setMessageMenu(null);
    } catch {
      setError("Could not copy this message.");
    }
  };
  const submitReport = async (event) => {
    event.preventDefault();
    if (!reportTarget) return;
    setActionBusy(true);
    setError("");
    try {
      const payload = { reason: reportReason, details: reportDetails };
      if (reportTarget.type === "message") {
        if (selected.type === "group") await messageService.reportGroupMessage(reportTarget.message.id, payload);
        else await messageService.reportMessage(reportTarget.message.id, payload);
      }
      else await messageService.reportConversation(selected.id, payload);
      setReportTarget(null);
      setReportReason("SPAM");
      setReportDetails("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not submit this report.");
    } finally {
      setActionBusy(false);
    }
  };
  const sendImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selected?.id) return;
    setImageBusy(true);
    setError("");
    try {
      const response = selected.type === "group" ? await messageService.sendGroupImage(selected.id, file, newClientMessageId()) : await messageService.sendImage(selected.id, file, newClientMessageId(), null, directAccessWindow?.id || null);
      const { message, conversationStatus = "ACTIVE", directAccessWindow: updatedDirectAccessWindow } = response.data.data;
      const cacheKey = selected.type === "group" ? ["messages", "group", selected.id] : ["messages", selected.id];
      queryClient.setQueryData(cacheKey, (current) => current ? {
        ...current,
        messages: [...current.messages.filter((item) => item.id !== message.id), message],
        conversationStatus,
        directAccessWindow: updatedDirectAccessWindow || current.directAccessWindow,
        requestRequired: false,
      } : current);
      queryClient.invalidateQueries({ queryKey: selected.type === "group" ? ["messages", "groups"] : ["messages", "conversations"] });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not send this image.");
    } finally {
      setImageBusy(false);
    }
  };
  const reactToOpenStory = async (reaction) => {
    if (!storyViewer?.story?.id || storyActionBusy) return;
    setStoryActionBusy(true);
    try {
      await storyService.reactToStory(storyViewer.story.id, reaction);
      setStoryViewer((current) => ({ ...current, reactionSent: reaction }));
    } catch (requestError) {
      setStoryViewer((current) => ({ ...current, actionError: requestError.response?.data?.message || "Reaction failed." }));
    } finally {
      setStoryActionBusy(false);
    }
  };
  const replyToOpenStory = async (event) => {
    event.preventDefault();
    const body = storyReplyDraft.trim();
    if (!body || !storyViewer?.story?.id || storyActionBusy) return;
    setStoryActionBusy(true);
    try {
      const response = await storyService.replyToStory(storyViewer.story.id, body);
      const message = response.data.data.message;
      queryClient.setQueryData(["messages", selected.id], (current) => current ? {
        ...current,
        messages: current.messages.some((item) => item.id === message.id) ? current.messages : [...current.messages, message],
      } : current);
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      setStoryReplyDraft("");
      setStoryViewer((current) => ({ ...current, replySent: true }));
    } catch (requestError) {
      setStoryViewer((current) => ({ ...current, actionError: requestError.response?.data?.message || "Reply failed." }));
    } finally {
      setStoryActionBusy(false);
    }
  };
  const openStoryReply = async (reply, knownExpired = false) => {
    if (knownExpired) return setStoryViewer({ expired: true });
    setStoryViewer({ loading: true });
    try { setStoryViewer({ story: await storyService.getStory(reply.storyId) }); }
    catch (requestError) { const expired = [404, 410].includes(requestError.response?.status); if (expired) setExpiredStoryIds((current) => new Set(current).add(reply.storyId)); setStoryViewer({ expired, error: !expired }); }
  };

  return <div className="relative h-full min-h-0 overflow-hidden rounded-2xl border border-atseen-line bg-atseen-bg-2">
    <div className="flex h-full min-h-0">
      {sharePickerOpen ? <div className="absolute inset-0 z-[80] flex items-end bg-black/75" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSharePicker(); }}><section aria-modal="true" className="flex max-h-[78vh] w-full flex-col overflow-hidden rounded-t-[22px] border border-b-0 border-atseen-line bg-[#1b212c] px-5 pb-7 pt-2.5 shadow-2xl" role="dialog">
        <div className="mx-auto mb-4 h-1 w-8 shrink-0 rounded-full bg-white/35" />
        <div className="mb-3 flex shrink-0 items-center justify-between"><div><h2 className="text-lg font-black">Send in message</h2><p className="mt-1 text-[11px] text-atseen-muted">Choose a recent chat, group, or another person.</p></div><button aria-label="Close share picker" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5" onClick={closeSharePicker} type="button"><FiX /></button></div>
        <label className="mb-3 flex shrink-0 items-center gap-2 rounded-xl border border-atseen-line bg-atseen-surface-2 px-3"><FiSearch className="text-atseen-muted" /><input autoFocus className="w-full bg-transparent py-2.5 text-sm outline-none" onChange={(event) => setSearch(event.target.value)} placeholder="Search chats and people" value={search} /></label>
        <div className="atseen-hide-scrollbar min-h-0 flex-1 overflow-y-auto">
          {filteredRecentShareTargets.length ? <><h3 className="sticky top-0 z-10 bg-[#1b212c] pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.16em] text-atseen-muted">Recent</h3>{filteredRecentShareTargets.map((target) => { const isGroup = target.type === "group"; const person = isGroup ? { displayName: target.name, avatarUrl: target.avatarUrl } : target.participant; return <button className="flex w-full items-center gap-3 border-b border-white/[0.07] py-3 text-left last:border-0 hover:bg-white/[0.03]" key={`${isGroup ? "group" : "direct"}:${target.id}`} onClick={() => chooseShareTarget(target)} type="button"><Identity compact person={person} presence={isGroup ? null : presence[target.id]} subtitle={isGroup ? `${target.members?.length || 0} members` : target.lastMessage?.body || "Recent chat"} /><FiSend className="ml-auto shrink-0 text-atseen-blue" /></button>; })}</> : null}
          {remainingSharePeople.length ? <><h3 className="sticky top-0 z-10 mt-3 border-t border-white/[0.07] bg-[#1b212c] pb-2 pt-3 text-[10px] font-black uppercase tracking-[0.16em] text-atseen-muted">Other people</h3>{remainingSharePeople.map((person) => <button className="flex w-full items-center gap-3 border-b border-white/[0.07] py-3 text-left last:border-0 hover:bg-white/[0.03]" key={`person:${person.id}`} onClick={() => chooseShareTarget({ id: person.id, participant: person, type: "direct" })} type="button"><Identity compact person={person} presence={presence[person.id]} /><FiSend className="ml-auto shrink-0 text-atseen-blue" /></button>)}</> : null}
          {peopleQuery.isLoading ? <p className="p-5 text-center text-sm text-atseen-muted">Loading people…</p> : null}
          {!peopleQuery.isLoading && !filteredRecentShareTargets.length && !remainingSharePeople.length ? <p className="p-8 text-center text-sm text-atseen-muted">No chats or people found.</p> : null}
        </div>
      </section></div> : null}
      <aside className={`${selected ? "hidden" : "flex"} h-full min-h-0 w-full flex-col`}>
        <header className="flex items-center justify-end gap-2 px-5 pb-4 pt-5">
          <p className="mr-1 max-w-[180px] truncate text-sm font-black text-atseen-blue">@{user?.username || user?.name || "you"}</p>
          <button aria-label="New message" className="grid h-11 w-11 place-items-center rounded-full border border-atseen-line bg-atseen-surface text-lg text-atseen-muted transition hover:border-atseen-blue/50 hover:text-white" onClick={() => setNewChat(true)}><FiPlus /></button>
          <button aria-label="Message notifications" className="relative grid h-11 w-11 place-items-center rounded-full border border-atseen-line bg-atseen-surface text-atseen-blue" type="button"><FiZap /><span className="absolute -right-0.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-atseen-blue px-1 text-[9px] font-black text-atseen-bg">{[...conversations, ...(groupsQuery.data || [])].reduce((total, item) => total + (Number(item.unreadCount) || 0), 0)}</span></button>
        </header>
        <nav aria-label="Message inbox filters" className="mx-5 grid grid-cols-3 rounded-xl border border-atseen-line bg-atseen-surface p-1">
          {([{ id: "all", label: "All" }, { id: "requests", label: "Requests" }, { id: "direct", label: "Direct Access" }]).map((tab) => {
            const count = tab.id === "requests"
              ? conversations.filter((item) => item.status === "REQUEST" && item.requestReceived).length
              : tab.id === "direct"
                ? user?.role === "creator" ? directConversations.filter((item) => item.settlementStatus === "HELD").length : directConversations.length
                : 0;
            return <button className={`rounded-lg px-2 py-2.5 text-xs font-bold transition ${inboxTab === tab.id ? "bg-white/[0.055] text-white shadow-sm" : "text-atseen-muted hover:text-white"}`} key={tab.id} onClick={() => setInboxTab(tab.id)} type="button">{tab.label}{count ? <span className={`ml-1 ${tab.id === "direct" ? "text-atseen-warning" : "text-atseen-blue"}`}>{count}</span> : null}</button>;
          })}
        </nav>
        {inboxTab === "requests" ? <p className="px-5 pb-2 pt-3 text-[10px] leading-4 text-atseen-muted">People you don’t follow yet. They won’t know you’ve seen it until you accept.</p> : null}
        <div className="atseen-hide-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {inboxTab === "direct" && user?.role === "creator" ? <button className="mx-5 mb-5 mt-3 flex w-[calc(100%-2.5rem)] items-center gap-3 rounded-2xl border border-dashed border-atseen-blue/45 bg-atseen-blue/[0.025] p-4 text-left transition hover:bg-atseen-blue/[0.06]" onClick={() => { setDirectAccessSettings({ enabled: Boolean(creatorDirectAccessQuery.data?.enabled), priceStars: Number(creatorDirectAccessQuery.data?.priceStars || 100), callEnabled: Boolean(creatorDirectAccessQuery.data?.callEnabled), callPriceStars: Number(creatorDirectAccessQuery.data?.callPriceStars || 500), callDurationMinutes: Number(creatorDirectAccessQuery.data?.callDurationMinutes || 5), callAutoDeclineAway: Boolean(creatorDirectAccessQuery.data?.callAutoDeclineAway) }); setDirectAccessSetupOpen(true); }} type="button"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-atseen-blue/10 text-atseen-blue"><FiPlus /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-atseen-blue">Set up Direct Access</span><span className="mt-0.5 block text-[11px] text-atseen-muted">Your prices for priority messages and calls</span></span></button> : null}
          {inboxTab === "direct" && directWindowsQuery.isLoading ? <p className="p-6 text-sm text-atseen-muted">Loading Direct Access…</p> : null}
          {inboxTab !== "direct" && conversationsQuery.isLoading ? <p className="p-6 text-sm text-atseen-muted">Loading conversations…</p> : null}
          {conversationsQuery.isError ? <div className="p-6 text-sm text-atseen-danger"><p>Conversations are unavailable.</p><button className="mt-3 rounded-full border border-atseen-danger/30 px-4 py-2 text-xs font-bold" onClick={() => conversationsQuery.refetch()} type="button">Retry</button></div> : null}
          {inboxTab === "direct" ? directWindowSections.map((section) => section.items.length ? <section className="mb-6" key={section.label}><h2 className="px-5 pb-3 pt-1 text-[10px] font-black tracking-[0.16em] text-atseen-muted">{section.label} <span className="text-atseen-blue">{section.items.length}</span></h2>{section.items.map((windowItem) => {
            const other = user?.role === "creator" ? windowItem.fan : windowItem.creator;
            if (!other) return null;
            const hoursLeft = Math.max(0, Math.ceil((new Date(windowItem.expiresAt).getTime() - Date.now()) / 3600000));
            const statusLabel = windowItem.settlementStatus === "HELD" ? "Pending" : windowItem.settlementStatus === "CAPTURED" ? "Answered" : windowItem.settlementStatus === "REFUNDED" ? "Refunded" : windowItem.settlementStatus.replaceAll("_", " ");
            return <button className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition hover:bg-white/[0.03]" key={windowItem.id} onClick={() => chooseConversation({ id: other.id, participant: other, directAccessWindowId: windowItem.id })} type="button">
              <Identity compact person={other} presence={presence[other.id]} subtitle={windowItem.questionQuote ? `“${windowItem.questionQuote}”` : `${windowItem.messagesRemaining} messages left`} />
              <span className="ml-auto flex shrink-0 flex-col items-end gap-2"><span className="text-[10px] text-atseen-muted">{inboxTime(windowItem.updatedAt || windowItem.createdAt)}</span><span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${windowItem.settlementStatus === "HELD" ? "bg-white/[0.07] text-atseen-muted" : windowItem.settlementStatus === "CAPTURED" ? "bg-atseen-blue/10 text-atseen-blue" : windowItem.settlementStatus === "REFUNDED" ? "bg-atseen-success/10 text-atseen-success" : "bg-white/5 text-atseen-muted"}`}>{statusLabel}</span>{windowItem.settlementStatus === "HELD" ? <span className="text-[9px] text-atseen-muted">⌛ {hoursLeft}h left</span> : null}</span>
            </button>;
          })}</section> : null) : null}
          {inboxTab === "direct" && !directWindowsQuery.isLoading && !directConversations.length ? <div className="grid place-items-center px-8 py-20 text-center"><FiMessageCircle className="text-4xl text-atseen-blue" /><h2 className="mt-4 font-bold">{user?.role === "fan" ? "No Priority messages" : "No Direct Access messages"}</h2><p className="mt-2 text-sm text-atseen-muted">Direct Access conversations will appear here.</p></div> : null}
          {inboxTab === "all" && archivedConversations.length ? <button className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm hover:bg-white/[0.03]" onClick={() => setShowArchived((current) => !current)} type="button"><span className="grid h-10 w-10 place-items-center rounded-full border border-atseen-line bg-white/[0.03] text-atseen-muted"><FiArchive /></span><span className="flex-1 font-bold">{showArchived ? "Back to messages" : "Archived"}</span><span className="text-xs text-atseen-muted">{archivedConversations.length}</span></button> : null}
          {inboxTab !== "direct" && !conversationsQuery.isLoading && !shownConversations.length ? <div className="grid place-items-center px-8 py-20 text-center"><FiMessageCircle className="text-4xl text-atseen-blue" /><h2 className="mt-4 font-bold">{inboxTab === "requests" ? "No message requests" : "No conversations yet"}</h2><p className="mt-2 text-sm text-atseen-muted">{inboxTab === "requests" ? "Messages from non-following fans appear here." : user?.role === "fan" ? "Start a private chat with a creator." : "Accepted fan conversations appear here."}</p></div> : null}
          {inboxTab === "requests" ? shownConversations.map((conversation) => {
            const person = conversation.participant;
            const last = conversation.lastMessage;
            return <article className="flex items-center gap-3 px-5 py-4" key={`request:${conversation.id}`}>
              <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => chooseConversation(conversation)} type="button"><Identity compact person={person} presence={presence[conversation.id]} subtitle={last?.body || "Message request"} /></button>
              <div className="flex shrink-0 items-center gap-2">
                <span className="mr-1 text-[10px] text-atseen-muted">{inboxTime(last?.createdAt)}</span>
                <button className="min-h-10 rounded-full bg-atseen-blue px-4 py-2 text-xs font-black text-atseen-bg shadow-[0_7px_18px_rgba(112,169,255,0.25)] disabled:opacity-50" disabled={requestBusy} onClick={() => handleInboxRequest(conversation, true)} type="button">Accept</button>
                <button className="min-h-10 rounded-full border border-atseen-line bg-atseen-surface-2 px-4 py-2 text-xs font-bold text-white disabled:opacity-50" disabled={requestBusy} onClick={() => handleInboxRequest(conversation, false)} type="button">Delete</button>
              </div>
            </article>;
          }) : (showArchived && inboxTab === "all" ? archivedConversations : shownConversations).map((conversation) => {
            const isGroup = conversation.type === "group";
            const rowPerson = isGroup ? { displayName: conversation.name, avatarUrl: conversation.avatarUrl } : conversation.participant;
            const last = conversation.lastMessage;
            const subtitle = !last ? "No messages yet" : last.deletedAt ? last.senderId === myId ? "You deleted this message" : "This message was deleted" : `${last.senderId === myId ? "You: " : isGroup && last.sender?.displayName ? `${last.sender.displayName.split(" ")[0]}: ` : ""}${last.body}`;
            const requestPending = conversation.status === "REQUEST";
            return <div className={`relative flex w-full items-center px-3 transition hover:bg-white/[0.03] ${selected?.id === conversation.id ? "bg-atseen-blue/10" : ""}`} key={`${isGroup ? "group" : "direct"}:${conversation.id}`}>
              <button className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-2 text-left" onClick={() => chooseConversation(conversation)} type="button"><Identity compact person={rowPerson} presence={isGroup ? null : presence[conversation.id]} subtitle={subtitle} /><span className="ml-auto flex max-w-[95px] flex-col items-end gap-1"><span className="text-[10px] text-atseen-muted">{inboxTime(last?.createdAt)}</span>{requestPending ? <span className="rounded-full bg-atseen-warning/10 px-2 py-0.5 text-[9px] font-black text-atseen-warning">Pending</span> : conversation.unreadCount ? <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-atseen-blue px-1 text-[10px] font-black text-atseen-bg">{conversation.unreadCount}</span> : null}</span></button>
              <button aria-label={`Actions for ${rowPerson.displayName}`} className="grid h-11 w-10 shrink-0 place-items-center rounded-full text-atseen-muted hover:bg-white/5 hover:text-white" data-chat-popover onClick={() => { setChatMenuOpen(false); setMessageMenu(null); setReactionFor(null); setInboxRowMenu((current) => current?.id === conversation.id ? null : conversation); }} type="button"><FiMoreVertical /></button>
              {inboxRowMenu?.id === conversation.id ? <div className="absolute right-4 top-12 z-50 w-44 rounded-2xl border border-atseen-line bg-atseen-bg-2 p-1.5 shadow-2xl" data-chat-popover><button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold hover:bg-white/5" onClick={() => archiveInboxRow(conversation)} type="button"><FiArchive />{conversation.archived ? "Unarchive" : "Archive"}</button><button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs text-atseen-muted hover:bg-white/5" onClick={() => { setInboxRowMenu(null); chooseConversation(conversation); }} type="button"><FiMessageCircle />Open chat</button></div> : null}
            </div>;
          })}
        </div>
      </aside>

      <main className={`${selected ? "flex" : "hidden"} isolate h-full min-h-0 min-w-0 flex-1 flex-col`}>
        {directAccessNotice ? <div className="absolute left-1/2 top-16 z-[90] -translate-x-1/2 rounded-full border border-atseen-line bg-atseen-bg-2/95 px-4 py-2 text-xs font-bold text-atseen-muted shadow-xl backdrop-blur">{directAccessNotice}</div> : null}
        {selected ? <>
          <header className="relative z-50 flex shrink-0 items-center gap-3 overflow-visible border-b border-atseen-line bg-atseen-bg-2/95 px-4 py-3 backdrop-blur">
            <button aria-label="Back to conversations" className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-white/5" onClick={closeConversation}><FiArrowLeft /></button>
            {participant ? <button className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atseen-blue" onClick={() => { if (selected.type === "group") { setGroupInfoName(participant.displayName || ""); setGroupMemberPickerOpen(false); setGroupInfoOpen(true); } else if (participant.username) navigate(`/profile/${encodeURIComponent(participant.username)}`); }} type="button"><Identity person={participant} presence={selected.type === "group" ? null : presence[selected.id]} subtitle={selected.type === "group" ? `${participant.members?.length || 0} members${participant.admins?.includes(myId) ? " · you're admin" : ""}` : `${presence[selected.id]?.online ? "● At seen" : relative(presence[selected.id]?.lastSeenAt || participant.lastSeenAt)}${participant.typicalReplyHours ? ` · replies within ${participant.typicalReplyHours}h` : ""}`} /></button> : null}
            {!socketConnected ? <span className="ml-auto hidden text-[10px] font-semibold text-atseen-warning sm:block">Reconnecting…</span> : null}
            {selected.type !== "group" && user?.role === "fan" && participant?.role === "creator" && participant?.callEnabled ? <button aria-label={`Call ${participant.displayName}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-atseen-line text-sm text-atseen-blue transition hover:border-atseen-blue/50 hover:bg-atseen-blue/10" onClick={() => startCall(participant, "AUDIO")} type="button"><FiPhone /></button> : null}
            <div className="relative">
              <button aria-expanded={chatMenuOpen} aria-label="Chat options" className="grid h-9 w-9 place-items-center rounded-full text-atseen-muted hover:bg-white/5 hover:text-white" data-chat-popover onClick={() => { setInboxRowMenu(null); setMessageMenu(null); setReactionFor(null); setChatMenuOpen((current) => !current); }} type="button"><FiMoreVertical /></button>
              {chatMenuOpen ? <div className="absolute right-0 top-11 z-[70] w-52 overflow-hidden rounded-2xl border border-atseen-line bg-atseen-bg-2 p-1.5 shadow-2xl" data-chat-popover>
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/5" disabled={actionBusy} onClick={muteSelectedConversation} type="button"><FiBell /> {selectedConversationMuted ? "Unmute notifications" : "Mute notifications"}</button>
                {selected.type === "group" ? <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/5" disabled={actionBusy} onClick={() => { setChatMenuOpen(false); pinSelectedGroup(); }} type="button"><FiZap /> {participant?.pinnedToProfile ? "Remove from profile" : "Add group to profile"}</button> : null}
                {selected.type === "group" && participant?.admins?.includes(myId) ? <><input accept="image/jpeg,image/png,image/webp" className="hidden" onChange={changeSelectedGroupAvatar} ref={groupAvatarInputRef} type="file" /><button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/5" disabled={actionBusy} onClick={() => groupAvatarInputRef.current?.click()} type="button"><FiImage /> Change group photo</button></> : null}
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/5" disabled={actionBusy} onClick={archiveSelectedConversation} type="button"><FiArchive /> {selected.archived ? "Unarchive chat" : "Archive chat"}</button>
                {selected.type !== "group" ? <><button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/5" disabled={actionBusy} onClick={() => { setChatMenuOpen(false); setReportTarget({ type: "conversation" }); }} type="button"><FiFlag className="text-atseen-warning" /> Report conversation</button>
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/5 ${messagesQuery.data?.blockStatus?.blockedByMe ? "text-atseen-blue" : "text-atseen-danger"}`} disabled={actionBusy} onClick={toggleBlock} type="button"><FiShield /> {messagesQuery.data?.blockStatus?.blockedByMe ? "Unblock account" : "Block account"}</button>
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-atseen-danger hover:bg-atseen-danger/5" disabled={actionBusy} onClick={deleteSelectedConversation} type="button"><FiTrash2 /> Delete chat</button></> : null}
              </div> : null}
            </div>
          </header>
          {awaitingFollowupCreatorReply ? <div className="shrink-0 border-b border-atseen-warning/20 bg-atseen-warning/[0.055] px-4 py-2 text-center text-[10px] text-atseen-warning"><b>✦{directAccessWindow.priceStars} held</b> · awaiting creator reply · ⏳ {directAccessTimeLabel} · 0/3 used</div> : fanAwaitingFreeAskReply || creatorCanReplyToFreeFanAsk ? <div className="shrink-0 border-b border-atseen-warning/20 bg-atseen-warning/[0.055] px-4 py-2 text-center text-[10px] text-atseen-warning"><b>Free follow-up pending</b> · no Stars charged yet</div> : hasActiveDirectAccessWindow ? <div className="shrink-0 border-b border-atseen-blue/15 bg-atseen-blue/[0.045] px-4 py-2 text-center text-[10px] text-atseen-blue"><b>✦ Direct Access</b> · ⏳ {directAccessTimeLabel} · {directAccessWindow.fanMessagesUsed}/{directAccessWindow.fanMessageLimit} used · {directAccessWindow.settlementStatus === "HELD" ? "Pending" : directAccessWindow.settlementStatus === "INCLUDED" ? "Premium" : "Answered"}</div> : creatorCanAnswerClosedPaidWindow ? <div className="shrink-0 border-b border-atseen-warning/20 bg-atseen-warning/[0.055] px-4 py-2 text-center text-[10px] text-atseen-warning"><b>3/3 fan messages used</b> · You can still answer · ⏳ {directAccessTimeLabel}</div> : directAccessEffectivelyClosed ? <div className="shrink-0 border-b border-atseen-line/70 px-4 py-2 text-center text-[10px] text-atseen-muted"><b>✦ Direct Access ended</b> · History remains readable</div> : user?.role === "fan" && participant?.role === "creator" && selectedDirectAccessOfferQuery.data?.enabled ? <div className="shrink-0 border-b border-atseen-line/60 px-4 py-2.5 text-center"><button className="rounded-full border border-atseen-blue/45 bg-atseen-blue/[0.035] px-4 py-1.5 text-[11px] font-bold text-atseen-blue transition hover:bg-atseen-blue/10 disabled:opacity-50" disabled={directAccessBusy} onClick={openDirectAccess} type="button">{directAccessBusy ? "Opening…" : `Direct Access · ✦${selectedDirectAccessOfferQuery.data.priceStars}`}</button><p className="mt-1 text-[9px] text-atseen-muted">Guaranteed within 48 hours or fully refunded</p></div> : null}
          {selected.type !== "group" && messagesQuery.data?.requestReceived ? <div className="shrink-0 border-b border-atseen-warning/20 bg-atseen-warning/[0.06] px-4 py-2 text-center text-[11px] font-semibold text-atseen-warning">They won’t know you’ve seen it until you accept.</div> : null}
          <section className="atseen-hide-scrollbar relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top,rgba(94,155,255,0.07),transparent_36%)] px-4 py-6 sm:px-8" onScroll={handleThreadScroll} ref={threadRef}>
            {selected.type !== "group" && (participant?.statusLine || participant?.personalLine) ? <div className="mx-auto mb-7 max-w-sm px-5 py-1 text-center"><span className="inline-flex items-center gap-1.5 rounded-full border border-atseen-blue/35 bg-atseen-blue/[0.035] px-3 py-1 text-[10px] font-black text-atseen-blue"><FiEye className="text-[11px]" />{participant.statusLine || "At seen"}</span>{participant.personalLine ? <p className="mt-2 line-clamp-2 text-xs italic leading-5 text-white/80">“{participant.personalLine}”</p> : null}{participant.typicalReplyHours ? <p className="mt-0.5 text-[10px] text-atseen-muted">usually replies within {participant.typicalReplyHours}h</p> : null}</div> : null}
            {user?.role === "creator" && directAccessWindow?.settlementStatus === "HELD" ? <div className="mx-auto mb-4 max-w-sm rounded-2xl border border-atseen-warning/20 bg-atseen-warning/[0.06] px-4 py-3 text-center"><p className="text-xs font-black text-atseen-warning">Answer honestly · earn ${Number(directAccessWindow.creatorNetUsd || 0).toFixed(2)}</p><p className="mt-1 text-[10px] leading-4 text-atseen-muted">Your first reply completes this paid request and releases your net earnings.</p></div> : null}
            <div className={`pointer-events-none sticky top-2 z-30 mx-auto -mb-7 flex h-7 w-fit items-center rounded-full border border-atseen-line bg-atseen-bg-2/95 px-3 text-[10px] font-bold text-atseen-muted shadow-lg backdrop-blur transition-all duration-200 ${scrollDate.visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}>{scrollDate.label}</div>
            {messagesQuery.data?.pageInfo?.hasMore ? <div className="mb-4 text-center"><button className="inline-flex items-center gap-2 rounded-full border border-atseen-line px-4 py-2 text-xs font-bold text-atseen-muted hover:border-atseen-blue/40 hover:text-white disabled:opacity-50" disabled={loadingOlder} onClick={loadOlder} type="button"><FiRefreshCw className={loadingOlder ? "animate-spin" : ""} />{loadingOlder ? "Loading…" : "Load older messages"}</button></div> : null}
            <p className="mx-auto mb-7 max-w-sm text-center text-[11px] leading-5 text-atseen-dim">Text messages are private between you and this {participant?.role === "creator" ? "creator" : "fan"}.</p>
            {messagesQuery.isLoading ? <p className="text-center text-sm text-atseen-muted">Loading messages…</p> : null}
            {messagesQuery.isError ? <div className="mx-auto max-w-sm text-center text-sm text-atseen-danger"><p>Messages could not be loaded.</p><button className="mt-3 rounded-full border border-atseen-danger/30 px-4 py-2 text-xs font-bold" onClick={() => messagesQuery.refetch()} type="button">Retry</button></div> : null}
            {!messagesQuery.isLoading && !messagesQuery.isError && !messages.length ? <div className="mx-auto max-w-sm py-16 text-center"><FiMessageCircle className="mx-auto text-4xl text-atseen-blue" /><h2 className="mt-4 font-bold">Start the conversation</h2><p className="mt-2 text-sm text-atseen-muted">Send a message when you are ready.</p></div> : null}
            {messages.map((message, index) => {
              const mine = message.senderId === myId;
              const dateLabel = chatDateLabel(message.createdAt);
              const startsDay = index === 0 || chatDateKey(messages[index - 1].createdAt) !== chatDateKey(message.createdAt);
              const showReadAvatar = mine && message.id === lastReadOutgoingMessageId;
              const reactions = message.reactions || [];
              const groupedReactions = Object.entries(reactions.reduce((groups, reaction) => ({ ...groups, [reaction.emoji]: (groups[reaction.emoji] || 0) + 1 }), {}));
              return <Fragment key={message.id}>
                {startsDay ? <div className="my-5 flex items-center justify-center"><span className="rounded-full border border-atseen-line bg-atseen-bg-2/90 px-3 py-1.5 text-[10px] font-bold text-atseen-muted shadow-sm backdrop-blur">{dateLabel}</span></div> : null}
                <div className={`group mb-2 flex rounded-2xl transition ${mine ? "justify-end" : "justify-start"} ${forwardSelection.has(message.id) ? "bg-atseen-blue/10 ring-1 ring-inset ring-atseen-blue/30" : ""}`} data-chat-date-label={dateLabel} onClick={forwardSelection.size && !message.id.startsWith("pending:") ? () => setForwardSelection((current) => { const next = new Set(current); if (next.has(message.id)) next.delete(message.id); else next.add(message.id); return next; }) : undefined}>
                <div className={`relative flex max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
                  <div className={`min-w-[112px] rounded-[19px] px-4 py-2 text-sm leading-5 sm:min-w-[128px] ${mine ? "rounded-br-md bg-atseen-blue font-medium text-atseen-bg" : "rounded-bl-md border border-atseen-line bg-atseen-surface-2 text-atseen-text"}`} data-message-id={message.id} onDoubleClick={() => reactToMessage(message, "❤️")} title="Double-click to react with ❤️">
                    {selected.type === "group" && !mine && message.sender?.displayName ? <p className="mb-0.5 text-[10px] font-bold text-atseen-blue">{message.sender.displayName}</p> : null}
                    {message.replyTo ? <button className={`mb-2 block w-full rounded-xl border-l-2 px-3 py-1.5 text-left ${mine ? "border-atseen-bg/40 bg-atseen-bg/10 text-atseen-bg/70" : "border-atseen-blue bg-black/20 text-atseen-muted"}`} onClick={() => document.querySelector(`[data-message-id="${message.replyTo.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })} type="button"><span className="block text-[10px] font-bold">{message.replyTo.senderId === myId ? "You" : participant?.displayName}</span><span className="block max-w-[230px] truncate text-xs">{message.replyTo.body}</span></button> : null}
                    {message.storyReply ? <StoryReplyPreview forceExpired={expiredStoryIds.has(message.storyReply.storyId)} mine={mine} onOpen={openStoryReply} reply={message.storyReply} /> : null}
                    {message.forwarded ? <p className={`mb-1 text-[9px] italic ${mine ? "text-atseen-bg/55" : "text-atseen-muted"}`}>↪ Forwarded</p> : null}
                    {message.messageKind === "CREATOR_ASK" ? <p className={`mb-1 text-[9px] font-black uppercase tracking-[0.16em] ${mine ? "text-atseen-bg/65" : "text-atseen-blue"}`}>Asks you</p> : null}
                    {message.messageKind === "FAN_FREE_ASK" ? <p className={`mb-1 text-[9px] font-black uppercase tracking-[0.16em] ${mine ? "text-atseen-bg/65" : "text-atseen-warning"}`}>Free follow-up</p> : null}
                    {message.messageKind === "FAN_FREE_ASK" ? <p className={`mb-1 text-[9px] font-black uppercase tracking-[0.16em] ${mine ? "text-atseen-bg/65" : "text-atseen-warning"}`}>Free follow-up</p> : null}
                    {message.deletedAt ? <p className="flex items-center gap-1.5 italic opacity-65"><FiTrash2 className="shrink-0" />{mine ? "You deleted this message" : "This message was deleted"}</p> : message.sharedContent ? <div><SharedContentMessageCard content={message.sharedContent} mine={mine} onOpen={openSharedContent} />{message.body && message.body !== defaultSharedBody(message) ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}</div> : message.mediaType === "image" && message.image ? <div><img alt="Shared in chat" className="max-h-80 w-full rounded-xl object-cover" loading="lazy" src={message.image.url} />{message.body && message.body !== "Image" ? <p className="mt-2 whitespace-pre-wrap break-words">{message.body}</p> : null}</div> : message.mediaType === "audio" && message.audio ? <VoiceMessageBubble audio={message.audio} mine={mine} /> : message.mediaType === "video" && message.video ? <VideoNoteBubble mine={mine} video={message.video} /> : <MessageText body={message.body} mine={mine} />}
                    <p className={`mt-0.5 flex items-center justify-end gap-1 text-right text-[9px] ${mine ? "text-atseen-bg/60" : "text-atseen-muted"}`}>
                      <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{mine && message.deliveryState === "sending" ? " · Sending…" : mine && message.deliveryState === "failed" ? " · Failed" : selected.type !== "group" && mine && !message.readAt ? " · Sent" : ""}</span>
                      {mine && message.deliveryState === "failed" ? <button className="inline-flex items-center gap-1 font-bold text-atseen-bg underline" onClick={() => retryText(message)} type="button"><FiRefreshCw /> Retry</button> : null}
                    </p>
                  </div>
                  {message.messageKind === "CREATOR_ASK" && !mine && user?.role === "fan" ? <button className="mt-2 rounded-full border border-atseen-blue/40 bg-atseen-blue/10 px-4 py-2 text-xs font-black text-atseen-blue" onClick={async () => {
                    setDirectAccessBusy(true);
                    setError("");
                    try {
                      const offer = await messageService.getDirectAccessOffer(selected.id).then((response) => response.data.data);
                      setDirectAccessOffer({ ...offer, reopenQuestionId: message.id });
                    } catch (requestError) {
                      setError(requestError.response?.data?.message || "Could not load the new window.");
                    } finally {
                      setDirectAccessBusy(false);
                    }
                  }} type="button">Answer · New window ✦{selectedDirectAccessOfferQuery.data?.priceStars || 100}</button> : null}
                  {groupedReactions.length ? <div className={`-mt-1 flex flex-wrap gap-1 ${mine ? "mr-2 justify-end" : "ml-2"}`}>{groupedReactions.map(([emoji, count]) => {
                    const matching = reactions.filter((reaction) => reaction.emoji === emoji);
                    const reactionPerson = (userId) => selected.type === "group" ? participant?.members?.find((member) => member.id === userId) : participant;
                    const names = matching.map((reaction) => reaction.userId === myId ? "You" : reactionPerson(reaction.userId)?.displayName || "Participant");
                    const detailsOpen = reactionDetails?.messageId === message.id && reactionDetails?.emoji === emoji;
                    return <span className="relative" key={emoji}>
                      <button aria-expanded={detailsOpen} aria-label={`${emoji} reaction by ${names.join(" and ")}`} className={`rounded-full border px-1.5 py-0.5 text-xs shadow ${matching.some((reaction) => reaction.userId === myId) ? "border-atseen-blue bg-atseen-blue/20" : "border-atseen-line bg-atseen-bg-2"}`} onClick={() => setReactionDetails((current) => current?.messageId === message.id && current?.emoji === emoji ? null : { messageId: message.id, emoji })} title={names.join(", ")} type="button">{emoji}{count > 1 ? <span className="ml-1 text-[9px]">{count}</span> : null}</button>
                      {detailsOpen ? <span className={`absolute bottom-7 z-30 block min-w-40 rounded-xl border border-atseen-line bg-atseen-bg-2 p-2 text-left shadow-2xl ${mine ? "right-0" : "left-0"}`}>{matching.map((reaction) => {
                        const isMine = reaction.userId === myId;
                        const reactingPerson = reactionPerson(reaction.userId);
                        return <span className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs" key={reaction.userId}><FanAvatar name={isMine ? user?.name || "You" : reactingPerson?.displayName} size="h-6 w-6" src={isMine ? user?.avatar || user?.avatarUrl : reactingPerson?.avatarUrl} /><span className="min-w-0 flex-1 truncate font-semibold">{isMine ? "You" : reactingPerson?.displayName || "Participant"}</span><span>{emoji}</span>{isMine ? <button className="ml-1 text-[10px] font-bold text-atseen-danger hover:underline" onClick={() => { setReactionDetails(null); reactToMessage(message, emoji); }} type="button">Remove</button> : null}</span>;
                      })}<span className="block px-2 pt-1 text-[9px] text-atseen-dim">{matching.some((reaction) => reaction.userId === myId) ? "Remove is available for your reaction." : "Reactions from this chat."}</span></span> : null}
                    </span>;
                  })}</div> : null}
                  {!message.deletedAt ? <div className={`absolute top-1/2 z-10 flex -translate-y-1/2 items-center gap-0.5 text-atseen-muted opacity-100 transition sm:opacity-45 sm:group-hover:opacity-100 ${mine ? "right-full mr-1 flex-row-reverse" : "left-full ml-1"}`}>
                    <button aria-label="Reply to message" className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/5 hover:text-white" onClick={() => { setReplyTo(message); setReactionFor(null); }} title="Reply" type="button"><FiCornerUpLeft /></button>
                    <button aria-label="React to message" className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/5 hover:text-white" data-chat-popover onClick={() => { setInboxRowMenu(null); setChatMenuOpen(false); setMessageMenu(null); setReactionFor((current) => current === message.id ? null : message.id); }} title="React" type="button"><FiSmile /></button>
                    <button aria-label="Message options" className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/5 hover:text-white" data-chat-popover onClick={() => { setInboxRowMenu(null); setChatMenuOpen(false); setReactionFor(null); setMessageMenu((current) => current === message.id ? null : message.id); }} title="More" type="button"><FiMoreVertical /></button>
                    {reactionFor === message.id ? <div className={`absolute bottom-8 z-20 flex gap-1 rounded-full border border-atseen-line bg-atseen-bg-2 p-1.5 shadow-2xl ${mine ? "right-0" : "left-0"}`} data-chat-popover>{MESSAGE_REACTIONS.map((emoji) => <button className="grid h-8 w-8 place-items-center rounded-full text-lg transition hover:scale-110 hover:bg-white/10" key={emoji} onClick={() => reactToMessage(message, emoji)} type="button">{emoji}</button>)}</div> : null}
                    {messageMenu === message.id ? <div className={`absolute bottom-8 z-30 w-40 overflow-hidden rounded-xl border border-atseen-line bg-atseen-bg-2 p-1 shadow-2xl ${mine ? "right-0" : "left-0"}`} data-chat-popover>
                      {message.body && !message.deletedAt ? <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-white/5" onClick={() => copyMessage(message)} type="button"><FiCopy /> Copy</button> : null}
                      {selected.type === "group" && mine ? <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-white/5" onClick={() => { setMessageMenu(null); setGroupMessageInfo(message); }} type="button">Message info</button> : null}
                      {!message.id.startsWith("pending:") ? <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-white/5" onClick={() => { setMessageMenu(null); setForwardSelection(new Set([message.id])); }} type="button"><FiShare2 /> Select messages</button> : null}
                      {!message.id.startsWith("pending:") ? <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-white/5" disabled={actionBusy} onClick={() => { setMessageMenu(null); setForwardingMessage(message); }} type="button"><FiShare2 /> Forward</button> : null}
                      {!message.id.startsWith("pending:") ? <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-atseen-danger hover:bg-white/5" disabled={actionBusy} onClick={() => { setMessageMenu(null); setDeleteDialog({ message, scope: null }); }} type="button"><FiTrash2 /> Delete</button> : null}
                      {!mine ? <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-atseen-warning hover:bg-white/5" onClick={() => { setMessageMenu(null); setReportTarget({ type: "message", message }); }} type="button"><FiFlag /> Report</button> : null}
                    </div> : null}
                  </div> : null}
                  {selected.type !== "group" && showReadAvatar && participant ? <span aria-label={`Seen by ${participant.displayName}`} className="mt-1 block" title={`Seen by ${participant.displayName}`}><FanAvatar name={participant.displayName} size="h-4 w-4" src={participant.avatarUrl} /></span> : null}
                  {selected.type === "group" && mine ? (() => {
                    const seenMembers = (message.readBy || []).filter((receipt) => receipt.userId !== myId && latestGroupSeenMessageByUser.get(receipt.userId) === message.id).map((receipt) => participant?.members?.find((member) => member.id === receipt.userId)).filter(Boolean);
                    if (!seenMembers.length) return null;
                    const visibleMembers = seenMembers.slice(0, 3);
                    const extraCount = Math.max(0, seenMembers.length - visibleMembers.length);
                    return <button aria-label={`Seen by ${seenMembers.length} group members. Open message info.`} className="mt-1 flex items-center justify-end -space-x-1.5" onClick={() => setGroupMessageInfo(message)} title="Open message info" type="button">{visibleMembers.map((member) => <span className="rounded-full ring-2 ring-atseen-bg-2" key={member.id}><FanAvatar name={member.displayName} size="h-4 w-4" src={member.avatarUrl} /></span>)}{extraCount ? <span className="relative grid h-4 min-w-4 place-items-center rounded-full bg-atseen-surface-2 px-1 text-[8px] font-black text-atseen-blue ring-2 ring-atseen-bg-2">+{extraCount}</span> : null}</button>;
                  })() : null}
                </div>
              </div>
              </Fragment>;
            })}
            <div ref={bottomRef} />
          </section>
          {forwardSelection.size ? <div className="flex shrink-0 items-center gap-2 border-t border-atseen-line bg-atseen-bg-2 p-3"><button className="rounded-full border border-atseen-line px-3 py-2 text-xs font-bold" onClick={() => setForwardSelection(new Set())} type="button">Cancel</button><span className="min-w-0 flex-1 text-center text-xs font-bold text-atseen-blue">{forwardSelection.size} selected</span><button aria-label="Delete selected messages" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-atseen-danger/35 text-atseen-danger hover:bg-atseen-danger/10" onClick={() => { const selectedMessages = messages.filter((message) => forwardSelection.has(message.id) && !message.id.startsWith("pending:")); if (selectedMessages.length) setBulkDeleteDialog({ messages: selectedMessages }); }} type="button"><FiTrash2 /></button><button className="rounded-full bg-atseen-blue px-4 py-2 text-xs font-black text-atseen-bg" onClick={() => { const selectedMessages = messages.filter((message) => forwardSelection.has(message.id) && !message.id.startsWith("pending:")); setForwardingMessage({ id: selectedMessages[0]?.id, body: `${selectedMessages.length} messages selected`, messages: selectedMessages }); }} type="button">Forward</button></div> : null}
          {!forwardSelection.size && (messagesQuery.data?.blockStatus?.blockedByMe || messagesQuery.data?.blockStatus?.blockedMe ? <div className="shrink-0 border-t border-atseen-line bg-atseen-bg-2 p-4 text-center"><p className="text-xs text-atseen-muted">{messagesQuery.data.blockStatus.blockedByMe ? "You blocked this account. Unblock them to send messages." : "Messaging is unavailable for this conversation."}</p>{messagesQuery.data.blockStatus.blockedByMe ? <button className="mt-3 rounded-full border border-atseen-blue/40 px-4 py-2 text-xs font-bold text-atseen-blue" disabled={actionBusy} onClick={toggleBlock} type="button">Unblock</button> : null}</div> : messagesQuery.data?.conversationStatus === "REQUEST" && messagesQuery.data?.requestReceived ? <div className="shrink-0 border-t border-atseen-line bg-atseen-bg-2 p-3 sm:p-4">
            <p className="mb-3 text-center text-xs text-atseen-muted">Accept this request before replying.</p>
            {error ? <p className="mb-2 text-xs text-atseen-danger">{error}</p> : null}
            <div className="flex gap-2"><button className="flex-1 rounded-full border border-atseen-line py-3 text-sm font-bold" disabled={requestBusy} onClick={() => handleRequest(false)} type="button">Delete</button><button className="flex-[1.4] rounded-full bg-atseen-blue py-3 text-sm font-bold text-atseen-bg" disabled={requestBusy} onClick={() => handleRequest(true)} type="button">Accept</button></div>
          </div> : messagesQuery.data?.conversationStatus === "REQUEST" ? <div className="shrink-0 border-t border-atseen-line bg-atseen-bg-2 p-4 text-center text-xs text-atseen-muted">Message request sent. You can continue after they accept it.</div> : <form className="relative shrink-0 border-t border-atseen-line bg-atseen-bg-2 p-3 sm:p-4" onSubmit={send}>
            {error ? <p className="mb-2 text-xs text-atseen-danger">{error}</p> : null}
            {replyTo ? <div className="mb-2 flex items-center gap-3 rounded-xl border-l-2 border-atseen-blue bg-atseen-surface-2 px-3 py-2"><FiCornerUpLeft className="shrink-0 text-atseen-blue" /><div className="min-w-0 flex-1"><p className="text-[10px] font-bold text-atseen-blue">Replying to {replyTo.senderId === myId ? "yourself" : participant?.displayName}</p><p className="truncate text-xs text-atseen-muted">{replyTo.body}</p></div><button aria-label="Cancel reply" className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/5" onClick={() => setReplyTo(null)} type="button"><FiX /></button></div> : null}
            {emojiOpen ? <div className="absolute bottom-[4.5rem] left-3 z-20 w-[min(19rem,calc(100%-1.5rem))] rounded-2xl border border-atseen-line bg-atseen-bg-2 p-3 shadow-2xl"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold text-atseen-muted">Emojis</p><button aria-label="Close emoji picker" className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/5" onClick={() => setEmojiOpen(false)} type="button"><FiX /></button></div><div className="grid grid-cols-7 gap-1">{MESSAGE_EMOJIS.map((emoji) => <button className="grid h-9 w-9 place-items-center rounded-lg text-xl transition hover:bg-white/10" key={emoji} onClick={() => setDraft((current) => `${current}${emoji}`)} type="button">{emoji}</button>)}</div></div> : null}
            {fanCanAskAfterWindowEnded ? fanCanAffordFollowup ? <div className="mb-2 rounded-xl border border-atseen-blue/20 bg-atseen-blue/[0.04] px-3 py-2 text-[11px] leading-5 text-atseen-muted"><b className="text-atseen-blue">Ask a free follow-up</b> · ✦{followupPriceStars || directAccessWindow.priceStars} is held now, paid only if they reply, or fully refunded after 48h.</div> : <div className="mb-2 rounded-xl border border-atseen-danger/20 bg-atseen-danger/[0.05] px-3 py-2 text-[11px] leading-5 text-atseen-muted"><b className="text-atseen-danger">Not enough Stars</b> · You need ✦{followupPriceStars}, but your Wallet has ✦{followupWalletBalance}. <button className="font-black text-atseen-blue" onClick={() => navigate("/fan/wallet")} type="button">Open Wallet</button></div> : null}
            {user?.role === "fan" && awaitingFollowupCreatorReply ? <div className="mb-2 rounded-xl border border-atseen-warning/20 bg-atseen-warning/[0.05] px-3 py-2 text-center text-[11px] leading-5 text-atseen-muted"><b className="text-atseen-warning">Waiting for the creator</b> · ✦{directAccessWindow.priceStars} is held and will be fully refunded if they do not reply in time.</div> : null}
            {fanAwaitingFreeAskReply ? <div className="mb-2 rounded-xl border border-atseen-warning/20 bg-atseen-warning/[0.05] px-3 py-2 text-center text-[11px] leading-5 text-atseen-muted"><b className="text-atseen-warning">Waiting for the creator</b> · No Stars have been charged. The configured Direct Access price is charged only when the creator replies.</div> : null}
            {creatorCanReplyToFreeFanAsk ? <div className="mb-2 rounded-xl border border-atseen-warning/20 bg-atseen-warning/[0.05] px-3 py-2 text-[11px] leading-5 text-atseen-muted"><b className="text-atseen-warning">Free fan question</b> · Your reply opens and settles a new paid window at your configured price.</div> : null}
            {user?.role === "creator" && directAccessWindow?.settlementStatus === "HELD" ? <p className="mb-2 text-center text-[11px] text-atseen-dim">Answer the actual question — specific and real. Your reply remains available even after the fan reaches 3/3.</p> : null}
            {directAccessFanLocked && !fanCanAskAfterWindowEnded && !awaitingFollowupCreatorReply ? <p className="mb-2 text-center text-xs font-bold text-atseen-warning">This Direct Access window is closed. Its message history remains visible to both people.</p> : null}
            <div className="flex items-end gap-2"><VoiceRecorder disabled={sending || imageBusy || directAccessFanLocked} onSend={sendVoice} /><input accept="image/jpeg,image/png,image/webp" className="hidden" onChange={sendImage} ref={imageInputRef} type="file" /><button aria-label="Send image" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-atseen-line text-atseen-muted transition hover:text-white disabled:opacity-40" disabled={sending || imageBusy || directAccessFanLocked} onClick={() => imageInputRef.current?.click()} title="Send image" type="button">{imageBusy ? <FiRefreshCw className="animate-spin" /> : <FiImage />}</button><button aria-expanded={emojiOpen} aria-label="Open emoji picker" className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition ${emojiOpen ? "border-atseen-blue bg-atseen-blue/10 text-atseen-blue" : "border-atseen-line text-atseen-muted hover:text-white"}`} disabled={directAccessFanLocked} onClick={() => setEmojiOpen((current) => !current)} type="button"><FiSmile /></button><textarea aria-label="Message" className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl border border-atseen-line bg-atseen-surface-2 px-4 py-2.5 text-sm outline-none placeholder:text-atseen-dim focus:border-atseen-blue/60 disabled:opacity-50" disabled={directAccessFanLocked} maxLength={2000} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }} placeholder="Message…" rows={1} value={draft} /><button aria-label="Send message" className="grid h-11 w-11 place-items-center rounded-full bg-atseen-blue text-atseen-bg disabled:opacity-40" disabled={!draft.trim() || sending || imageBusy || directAccessFanLocked}><FiSend /></button></div>
          </form>)}
        </> : null}
      </main>
    </div>

    {directAccessSetupOpen && user?.role === "creator" ? <div className="absolute inset-0 z-[85] flex items-end bg-black/75" onMouseDown={(event) => { if (event.target === event.currentTarget && !directAccessBusy) setDirectAccessSetupOpen(false); }}><div aria-labelledby="direct-access-setup-title" aria-modal="true" className="max-h-[88vh] w-full overflow-y-auto rounded-t-[22px] border border-b-0 border-atseen-line bg-[#1b212c] p-5 shadow-[0_-22px_60px_rgba(0,0,0,.45)]" role="dialog"><div className="mx-auto mb-5 h-1 w-8 rounded-full bg-white/35" /><div className="flex items-start justify-between"><div><h2 className="text-xl font-black" id="direct-access-setup-title">Direct Access</h2><p className="mt-1 text-sm text-atseen-muted">What people can buy from you.</p></div><button aria-label="Close Direct Access setup" className="grid h-9 w-9 place-items-center rounded-full text-atseen-muted hover:bg-white/5 hover:text-white" disabled={directAccessBusy} onClick={() => setDirectAccessSetupOpen(false)} type="button"><FiX /></button></div><section className="mt-6 border-b border-atseen-line pb-5"><div className="flex items-center gap-3"><FiZap className="text-lg text-atseen-warning" /><div className="min-w-0 flex-1"><h3 className="text-sm font-bold">Priority messages</h3><p className="mt-0.5 text-[11px] text-atseen-muted">Let people pay to open a guaranteed message window.</p></div><button aria-checked={directAccessSettings.enabled} aria-label="Enable priority messages" className={`relative h-7 w-12 rounded-full transition ${directAccessSettings.enabled ? "bg-atseen-blue" : "bg-atseen-surface-2"}`} disabled={directAccessBusy} onClick={() => setDirectAccessSettings((current) => ({ ...current, enabled: !current.enabled }))} role="switch" type="button"><span className={`absolute top-1 h-5 w-5 rounded-full bg-atseen-bg shadow transition ${directAccessSettings.enabled ? "left-6" : "left-1"}`} /></button></div><div className="mt-4 flex flex-wrap gap-2 pl-7">{[50, 100, 200, 500].map((price) => <button className={`rounded-full border px-4 py-2 text-xs font-black transition ${Number(directAccessSettings.priceStars) === price ? "border-atseen-blue bg-atseen-blue text-atseen-bg shadow-[0_0_18px_rgba(112,169,255,0.3)]" : "border-atseen-line bg-atseen-surface-2 text-atseen-muted hover:text-white"}`} disabled={directAccessBusy || !directAccessSettings.enabled} key={price} onClick={() => setDirectAccessSettings((current) => ({ ...current, priceStars: price }))} type="button">✦{price}</button>)}</div></section><section className="mt-5 border-b border-atseen-line pb-5"><div className="flex items-center gap-3"><FiPhone className="text-lg text-atseen-blue" /><div className="min-w-0 flex-1"><h3 className="text-sm font-bold">Priority calls</h3><p className="mt-0.5 text-[11px] text-atseen-muted">Set your price and maximum live-call length.</p></div><button aria-checked={directAccessSettings.callEnabled} aria-label="Enable priority calls" className={`relative h-7 w-12 rounded-full transition ${directAccessSettings.callEnabled ? "bg-atseen-blue" : "bg-atseen-surface-2"}`} disabled={directAccessBusy} onClick={() => setDirectAccessSettings((current) => ({ ...current, callEnabled: !current.callEnabled }))} role="switch" type="button"><span className={`absolute top-1 h-5 w-5 rounded-full bg-atseen-bg shadow transition ${directAccessSettings.callEnabled ? "left-6" : "left-1"}`} /></button></div><div className="mt-4 pl-7"><p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-atseen-muted">Price</p><div className="flex flex-wrap gap-2">{[100, 300, 500, 800, 1500].map((price) => <button className={`rounded-full border px-3 py-2 text-xs font-black transition ${Number(directAccessSettings.callPriceStars) === price ? "border-atseen-blue bg-atseen-blue text-atseen-bg" : "border-atseen-line bg-atseen-surface-2 text-atseen-muted hover:text-white"}`} disabled={directAccessBusy || !directAccessSettings.callEnabled} key={price} onClick={() => setDirectAccessSettings((current) => ({ ...current, callPriceStars: price }))} type="button">✦{price}</button>)}</div><p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-atseen-muted">Call length</p><div className="flex flex-wrap gap-2">{[2, 5, 10, 15, 20, 30].map((minutes) => <button className={`rounded-full border px-3 py-2 text-xs font-black transition ${Number(directAccessSettings.callDurationMinutes) === minutes ? "border-atseen-blue bg-atseen-blue text-atseen-bg" : "border-atseen-line bg-atseen-surface-2 text-atseen-muted hover:text-white"}`} disabled={directAccessBusy || !directAccessSettings.callEnabled} key={minutes} onClick={() => setDirectAccessSettings((current) => ({ ...current, callDurationMinutes: minutes }))} type="button">{minutes} min</button>)}</div><label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-atseen-line bg-atseen-surface-2 px-3 py-3"><span><span className="block text-xs font-bold">Auto-decline while away</span><span className="mt-0.5 block text-[10px] text-atseen-muted">Immediately refund requests when you are offline.</span></span><input checked={Boolean(directAccessSettings.callAutoDeclineAway)} className="h-4 w-4 accent-atseen-blue" disabled={directAccessBusy || !directAccessSettings.callEnabled} onChange={(event) => setDirectAccessSettings((current) => ({ ...current, callAutoDeclineAway: event.target.checked }))} type="checkbox" /></label></div></section>{error ? <p className="mt-4 text-center text-xs text-atseen-danger">{error}</p> : null}<button className="mt-5 w-full rounded-xl bg-atseen-blue py-3 text-sm font-black text-atseen-bg shadow-[0_8px_25px_rgba(112,169,255,0.25)] disabled:opacity-50" disabled={directAccessBusy} onClick={() => saveDirectAccessSettings()} type="button">{directAccessBusy ? "Saving…" : "Save"}</button></div></div> : null}

    {directAccessOffer && !hasActiveDirectAccessWindow ? <div className="absolute inset-0 z-[80] flex items-end justify-center bg-black/75 p-3 sm:items-center"><div className="w-full max-w-sm rounded-3xl border border-atseen-blue/25 bg-atseen-bg-2 p-5 shadow-2xl"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black">{directAccessOffer.reopenQuestionId ? "Answer with a new window" : "Open Direct Access"}</h2><p className="mt-1 text-xs text-atseen-muted">3 messages · expires after 48 hours</p></div><button className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5" disabled={directAccessBusy} onClick={() => setDirectAccessOffer(null)} type="button"><FiX /></button></div><div className="mt-5 rounded-2xl bg-atseen-surface-2 p-4"><div className="flex justify-between text-sm"><span className="text-atseen-muted">Price</span><b>✦{directAccessOffer.priceStars}</b></div><div className="mt-2 flex justify-between text-sm"><span className="text-atseen-muted">Your balance</span><b>✦{Number(directAccessOffer.walletBalance || 0)}</b></div><p className="mt-3 text-[10px] leading-4 text-atseen-muted">Stars are held now. The creator receives {directAccessOffer.reopenQuestionId ? "80%" : "90%"} after their first reply; unanswered windows are refunded in full.</p></div>{!directAccessOffer.reopenQuestionId && directAccessOffer.premiumAllowance?.available ? <button className="mt-4 w-full rounded-full border border-atseen-blue/40 py-3 text-sm font-bold text-atseen-blue" disabled={directAccessBusy} onClick={() => confirmDirectAccess("PREMIUM_INCLUDED")} type="button">Use included Premium window</button> : null}<button className="mt-3 w-full rounded-full bg-atseen-blue py-3 text-sm font-black text-atseen-bg disabled:opacity-40" disabled={directAccessBusy || Number(directAccessOffer.walletBalance || 0) < directAccessOffer.priceStars} onClick={() => confirmDirectAccess("PAID")} type="button">{directAccessBusy ? "Opening…" : directAccessOffer.reopenQuestionId ? `Answer · New window ✦${directAccessOffer.priceStars}` : `Pay ✦${directAccessOffer.priceStars}`}</button>{Number(directAccessOffer.walletBalance || 0) < directAccessOffer.priceStars && !directAccessOffer.premiumAllowance?.available ? <button className="mt-3 w-full text-xs font-bold text-atseen-warning" onClick={() => navigate("/fan/wallet")} type="button">Not enough Stars · Open Wallet</button> : null}</div></div> : null}

    {groupMessageInfo && selected?.type === "group" ? <div className="absolute inset-0 z-[66] flex items-end bg-black/75 p-3 sm:items-center sm:justify-center"><div className="max-h-[78vh] w-full max-w-md overflow-hidden rounded-3xl border border-atseen-line bg-atseen-bg-2 shadow-2xl"><header className="flex items-center justify-between border-b border-atseen-line p-5"><div><h2 className="text-lg font-bold">Message info</h2><p className="mt-1 max-w-[280px] truncate text-xs text-atseen-muted">{groupMessageInfo.body}</p></div><button className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5" onClick={() => setGroupMessageInfo(null)} type="button"><FiX /></button></header><div className="atseen-hide-scrollbar max-h-[60vh] overflow-y-auto p-4">{[{ label: "SEEN BY", rows: (groupMessageInfo.readBy || []).filter((receipt) => receipt.userId !== myId).map((receipt) => ({ ...receipt, at: receipt.readAt })) }, { label: "DELIVERED TO", rows: (groupMessageInfo.deliveredBy || []).filter((receipt) => receipt.userId !== myId && !(groupMessageInfo.readBy || []).some((read) => read.userId === receipt.userId)).map((receipt) => ({ ...receipt, at: receipt.deliveredAt })) }].map((section) => <section className="mb-5" key={section.label}><h3 className="mb-2 text-[10px] font-black tracking-[0.16em] text-atseen-muted">{section.label} <span className="text-atseen-blue">{section.rows.length}</span></h3>{section.rows.length ? section.rows.map((receipt) => { const member = participant.members?.find((item) => item.id === receipt.userId); return <div className="flex items-center gap-3 rounded-xl px-2 py-2" key={receipt.userId}><Identity compact person={member || { displayName: "Former member" }} subtitle="" /><span className="ml-auto text-[10px] text-atseen-muted">{receipt.at ? new Date(receipt.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</span></div>; }) : <p className="px-2 py-2 text-xs text-atseen-muted">No members yet.</p>}</section>)}</div></div></div> : null}
    {forwardingMessage ? <div className="absolute inset-0 z-[65] flex items-end bg-black/75 p-3 sm:items-center sm:justify-center"><div className="max-h-[78vh] w-full max-w-md overflow-hidden rounded-3xl border border-atseen-line bg-atseen-bg-2 shadow-2xl"><header className="flex items-center justify-between p-5"><div><h2 className="text-lg font-bold">Forward message</h2><p className="mt-1 max-w-[280px] truncate text-xs text-atseen-muted">{forwardingMessage.body}</p></div><button className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5" onClick={() => setForwardingMessage(null)} type="button"><FiX /></button></header><label className="mx-4 mb-3 flex items-center gap-2 rounded-2xl border border-atseen-line bg-atseen-surface-2 px-4"><FiSearch className="text-atseen-muted" /><input className="w-full bg-transparent py-3 text-sm outline-none" onChange={(event) => setSearch(event.target.value)} placeholder="Search people" value={search} /></label><div className="atseen-hide-scrollbar max-h-[50vh] overflow-y-auto pb-3">{(groupsQuery.data || []).filter((group) => group.id !== selected?.id).map((group) => <button className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-white/[0.04]" disabled={actionBusy} key={`group:${group.id}`} onClick={() => forwardSelectedMessage(group)} type="button"><Identity compact person={{ displayName: group.name, avatarUrl: group.avatarUrl }} subtitle={`${group.members?.length || 0} members`} /><FiShare2 /></button>)}{orderedPeople.filter((person) => person.id !== selected?.id).map((person) => <button className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-white/[0.04]" disabled={actionBusy} key={person.id} onClick={() => forwardSelectedMessage({ ...person, type: "direct" })} type="button"><Identity compact person={person} presence={presence[person.id]} /><FiShare2 /></button>)}</div></div></div> : null}
    {groupInfoOpen && selected?.type === "group" ? <div className="absolute inset-0 z-50 flex items-end bg-black/60" onMouseDown={(event) => { if (event.target === event.currentTarget) setGroupInfoOpen(false); }} role="presentation">
      <section aria-label="Group details" aria-modal="true" className="relative max-h-[86%] w-full overflow-hidden rounded-t-[22px] border border-b-0 border-atseen-line bg-[#1b212c] shadow-[0_-22px_60px_rgba(0,0,0,.45)]" role="dialog">
        <div className="mx-auto mt-2.5 h-1 w-8 rounded-full bg-white/35" />
        <div className="atseen-hide-scrollbar max-h-[calc(86vh-14px)] overflow-y-auto px-5 pb-8 pt-4">
          <div className="flex items-center gap-3">
            <button aria-label="Group photo options" className="shrink-0 rounded-full ring-offset-2 ring-offset-[#1b212c] hover:ring-2 hover:ring-atseen-blue/50" disabled={actionBusy} onClick={() => setGroupPhotoMenuOpen(true)} type="button">
              <FanAvatar name={participant.displayName} size="h-11 w-11" src={participant.avatarUrl} />
            </button>
            {participant.admins?.includes(myId) || participant.permissions?.editGroupInfo === "ALL_MEMBERS" ? <>
              <input accept="image/jpeg,image/png,image/webp" className="hidden" onChange={changeSelectedGroupAvatar} ref={groupAvatarInputRef} type="file" />
              <input aria-label="Group name" className="min-w-0 flex-1 rounded-xl border border-atseen-line bg-[#10141c] px-3.5 py-3 text-sm font-bold text-white outline-none transition focus:border-atseen-blue/60" maxLength={60} onChange={(event) => setGroupInfoName(event.target.value)} value={groupInfoName} />
              <button className="rounded-xl border border-atseen-line bg-white/[0.025] px-4 py-2.5 text-xs font-black text-white disabled:opacity-40" disabled={actionBusy || !groupInfoName.trim() || groupInfoName.trim() === participant.displayName} onClick={saveSelectedGroupName} type="button">Save</button>
            </> : <h2 className="min-w-0 flex-1 truncate text-base font-bold">{participant.displayName}</h2>}
          </div>

          <h3 className="mt-4 text-sm font-black">Members · {participant.members?.length || 0}</h3>
          <div className="mt-1">
            {[...(participant.members || [])].sort((a, b) => Number(b.id === myId) - Number(a.id === myId)).map((member) => {
              const admin = participant.admins?.includes(member.id);
              const canManage = participant.admins?.includes(myId) && member.id !== myId;
              return <div className="flex min-h-[52px] items-center gap-3 border-b border-white/[0.07] py-2.5" key={member.id}>
                <FanAvatar name={member.displayName} size="h-9 w-9" src={member.avatarUrl} />
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{member.displayName}{member.id === myId ? " (you)" : ""}</p>{admin ? <p className="mt-1 text-[10px] text-atseen-muted">Admin</p> : null}</div>
                {canManage ? <div className="flex items-center gap-1">
                  <button className="rounded-lg px-2 py-1 text-[9px] font-bold text-atseen-muted hover:bg-white/5 hover:text-white" disabled={actionBusy} onClick={() => updateSelectedGroupMember(member.id, admin ? "member" : "admin")} type="button">{admin ? "Remove admin" : "Make admin"}</button>
                  <button aria-label={`Remove ${member.displayName}`} className="rounded-lg px-2 py-1 text-xs text-atseen-muted hover:bg-atseen-danger/10 hover:text-atseen-danger" disabled={actionBusy} onClick={() => updateSelectedGroupMember(member.id, "remove")} type="button">›</button>
                </div> : member.id !== myId ? <span className="text-xs text-atseen-muted">›</span> : null}
              </div>;
            })}
          </div>

          {participant.admins?.includes(myId) || participant.permissions?.addMembers === "ALL_MEMBERS" ? <>
            <button className="flex w-full items-center gap-4 border-b border-white/[0.07] py-3.5 text-left text-sm font-bold text-atseen-blue" onClick={() => setGroupMemberPickerOpen((current) => !current)} type="button"><FiUserPlus className="text-base" /> Add members</button>
            {groupMemberPickerOpen ? <div className="border-b border-white/[0.07] bg-black/10 py-2">
              <label className="mb-2 flex items-center gap-2 rounded-xl border border-atseen-line bg-[#10141c] px-3"><FiSearch className="text-atseen-muted" /><input className="min-w-0 flex-1 bg-transparent py-2.5 text-xs outline-none" onChange={(event) => setSearch(event.target.value)} placeholder="Find people" value={search} /></label>
              {orderedPeople.filter((person) => !participant.members?.some((member) => member.id === person.id)).slice(0, 12).map((person) => <button className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/[0.04]" disabled={actionBusy} key={person.id} onClick={() => addSelectedGroupMember(person.id)} type="button"><Identity compact person={person} presence={presence[person.id]} /><FiPlus /></button>)}
            </div> : null}
          </> : null}

          {participant.admins?.includes(myId) ? <button className="flex w-full items-center gap-4 border-b border-white/[0.07] py-3.5 text-left" onClick={() => setGroupPermissionsOpen(true)} type="button"><FiSettings className="text-base text-atseen-muted" /><span className="min-w-0 flex-1"><b className="block text-sm">Group permissions</b><span className="mt-1 block text-[10px] text-atseen-muted">Choose who can edit group info and add members</span></span><span className="text-xs text-atseen-muted">›</span></button> : null}
          <button className="flex w-full items-center gap-4 border-b border-white/[0.07] py-3.5 text-left" disabled={actionBusy} onClick={pinSelectedGroup} type="button"><FiZap className="text-base text-atseen-muted" /><span><b className="block text-sm">{participant.pinnedToProfile ? "Remove from Profile" : "Add to Profile"}</b><span className="mt-1 block text-[10px] text-atseen-muted">{participant.pinnedToProfile ? "Stop showing this group on your profile" : "Show this group on your profile"}</span></span></button>
          <button className="flex w-full items-center gap-4 border-b border-white/[0.07] py-3.5 text-left text-sm font-bold" disabled={actionBusy} onClick={() => leaveOrDeleteSelectedGroup(false)} type="button"><FiLogOut className="text-base text-atseen-muted" /> Leave group</button>
          {participant.createdBy === myId ? <button className="flex w-full items-center gap-4 py-3.5 text-left" disabled={actionBusy} onClick={() => leaveOrDeleteSelectedGroup(true)} type="button"><FiTrash2 className="text-base text-atseen-danger" /><span><b className="block text-sm text-atseen-danger">Delete group</b><span className="mt-1 block text-[10px] text-atseen-muted">Creator only · removes it for everyone</span></span></button> : null}
        </div>
      </section>
    </div> : null}
    {groupPhotoMenuOpen && selected?.type === "group" ? <div className="absolute inset-0 z-[70] flex items-end bg-black/65" onMouseDown={(event) => { if (event.target === event.currentTarget) setGroupPhotoMenuOpen(false); }} role="presentation"><section aria-modal="true" className="w-full rounded-t-[22px] border border-b-0 border-atseen-line bg-[#1b212c] px-5 pb-7 pt-2.5" role="dialog"><div className="mx-auto mb-4 h-1 w-8 rounded-full bg-white/35" /><h2 className="mb-2 text-base font-black">Group photo</h2>{participant.avatarUrl ? <button className="flex w-full items-center gap-4 border-b border-white/[0.07] py-3.5 text-left text-sm font-bold" onClick={() => { setGroupPhotoMenuOpen(false); setGroupImageViewerOpen(true); }} type="button"><FiEye className="text-atseen-muted" /> View photo</button> : null}{participant.admins?.includes(myId) || participant.permissions?.editGroupInfo === "ALL_MEMBERS" ? <><button className="flex w-full items-center gap-4 border-b border-white/[0.07] py-3.5 text-left text-sm font-bold" onClick={() => groupAvatarInputRef.current?.click()} type="button"><FiCamera className="text-atseen-blue" /> {participant.avatarUrl ? "Change photo" : "Add photo"}</button>{participant.avatarUrl ? <button className="flex w-full items-center gap-4 py-3.5 text-left text-sm font-bold text-atseen-danger" disabled={actionBusy} onClick={removeSelectedGroupAvatar} type="button"><FiTrash2 /> Remove photo</button> : null}</> : <p className="py-3 text-xs text-atseen-muted">Only permitted group members can change this photo.</p>}</section></div> : null}
    {groupImageViewerOpen && participant?.avatarUrl ? <div className="absolute inset-0 z-[75] flex items-center justify-center bg-black/95 p-5"><button aria-label="Close photo" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10" onClick={() => setGroupImageViewerOpen(false)} type="button"><FiX /></button><img alt={`${participant.displayName} group`} className="aspect-square w-full max-w-md rounded-full object-cover shadow-2xl" src={participant.avatarUrl} /></div> : null}
    {groupCropSource ? <GroupImageCropper onCancel={() => { URL.revokeObjectURL(groupCropSource.url); setGroupCropSource(null); }} onSave={groupCropSource.target === "NEW_GROUP" ? storeCroppedNewGroupAvatar : uploadCroppedGroupAvatar} saving={groupCropSource.target === "NEW_GROUP" ? false : actionBusy} source={groupCropSource} /> : null}
    {groupPermissionsOpen && selected?.type === "group" ? <div className="absolute inset-0 z-[72] flex items-end bg-black/65" onMouseDown={(event) => { if (event.target === event.currentTarget) setGroupPermissionsOpen(false); }} role="presentation"><section aria-modal="true" className="w-full rounded-t-[22px] border border-b-0 border-atseen-line bg-[#1b212c] px-5 pb-8 pt-2.5" role="dialog"><div className="mx-auto mb-4 h-1 w-8 rounded-full bg-white/35" /><div className="flex items-center justify-between"><div><h2 className="text-base font-black">Group permissions</h2><p className="mt-1 text-[11px] text-atseen-muted">Admins can always perform these actions.</p></div><button className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5" onClick={() => setGroupPermissionsOpen(false)} type="button"><FiX /></button></div>{[["editGroupInfo", "Edit group info", "Change the group name and photo"], ["addMembers", "Add members", "Invite new people to this group"]].map(([key, title, description]) => <div className="border-b border-white/[0.07] py-4 last:border-0" key={key}><div><b className="text-sm">{title}</b><p className="mt-1 text-[10px] text-atseen-muted">{description}</p></div><div className="mt-3 grid grid-cols-2 gap-2">{[["ADMINS", "Admins only"], ["ALL_MEMBERS", "All members"]].map(([value, label]) => { const selectedPermission = (participant.permissions?.[key] || "ADMINS") === value; return <button className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${selectedPermission ? "border-atseen-blue bg-atseen-blue/10 text-atseen-blue" : "border-atseen-line text-atseen-muted"}`} disabled={actionBusy} key={value} onClick={() => updateGroupPermission(key, value)} type="button">{label}{selectedPermission ? " ✓" : ""}</button>; })}</div></div>)}</section></div> : null}
    {newChat ? <div className="absolute inset-0 z-40 flex items-end bg-black/70" onMouseDown={(event) => { if (event.target === event.currentTarget) setNewChat(false); }}><section aria-modal="true" className="w-full rounded-t-[22px] border border-b-0 border-atseen-line bg-[#1b212c] px-5 pb-8 pt-2.5 shadow-2xl" role="dialog"><div className="mx-auto mb-4 h-1 w-8 rounded-full bg-white/35" /><h2 className="mb-3 text-lg font-black">New message</h2><button className="flex w-full items-center gap-4 border-b border-white/[0.07] py-3.5 text-left" onClick={() => { setNewChat(false); setSearch(""); setNewDirectChat(true); }} type="button"><span className="grid h-7 w-7 place-items-center text-atseen-blue"><FiMessageCircle /></span><span className="min-w-0 flex-1"><b className="block text-sm">New Chat</b><span className="mt-1 block text-[11px] text-atseen-muted">Message someone directly</span></span><span className="text-lg text-atseen-muted">›</span></button><button className="flex w-full items-center gap-4 py-3.5 text-left" onClick={() => { setNewChat(false); setSearch(""); setNewGroup(true); }} type="button"><span className="grid h-7 w-7 place-items-center text-purple-400"><FiUserPlus /></span><span className="min-w-0 flex-1"><b className="block text-sm">New Group</b><span className="mt-1 block text-[11px] text-atseen-muted">A private group with the people you choose</span></span><span className="text-lg text-atseen-muted">›</span></button></section></div> : null}
    {newDirectChat ? <div className="absolute inset-0 z-50 flex items-end bg-black/75" onMouseDown={(event) => { if (event.target === event.currentTarget) setNewDirectChat(false); }}><section aria-modal="true" className="flex max-h-[64vh] w-full flex-col overflow-hidden rounded-t-[22px] border border-b-0 border-atseen-line bg-[#1b212c] px-5 pb-5 pt-2.5 shadow-2xl" role="dialog"><div className="mx-auto mb-4 h-1 w-8 shrink-0 rounded-full bg-white/35" /><h2 className="mb-2 shrink-0 text-lg font-black">New Chat</h2><label className="mb-2 flex shrink-0 items-center gap-2 rounded-xl border border-atseen-line bg-atseen-surface-2 px-3"><FiSearch className="text-atseen-muted" /><input autoFocus className="w-full bg-transparent py-2.5 text-sm outline-none" onChange={(event) => setSearch(event.target.value)} placeholder="Search people" value={search} /></label><div className="atseen-hide-scrollbar min-h-0 flex-1 overflow-y-auto">{peopleQuery.isLoading ? <p className="p-5 text-sm text-atseen-muted">Finding people…</p> : null}{orderedPeople.map((person) => <button className="flex w-full items-center gap-3 border-b border-white/[0.07] py-3 text-left last:border-0 hover:bg-white/[0.03]" key={person.id} onClick={() => openPerson(person)} type="button"><Identity compact person={person} presence={presence[person.id]} /></button>)}{!peopleQuery.isLoading && !orderedPeople.length ? <p className="p-8 text-center text-sm text-atseen-muted">No people found.</p> : null}</div></section></div> : null}
    {newGroup ? <div className="absolute inset-0 z-50 flex items-end bg-black/75" onMouseDown={(event) => { if (event.target === event.currentTarget && !actionBusy) setNewGroup(false); }}><form className="flex max-h-[76vh] w-full flex-col overflow-hidden rounded-t-[22px] border border-b-0 border-atseen-line bg-[#1b212c] px-5 pb-5 pt-2.5 shadow-2xl" onSubmit={createGroup}><div className="mx-auto mb-4 h-1 w-8 shrink-0 rounded-full bg-white/35" /><h2 className="mb-3 shrink-0 text-lg font-black">New Group</h2><div className="flex shrink-0 items-center gap-3"><input accept="image/jpeg,image/png,image/webp" className="hidden" onChange={chooseNewGroupAvatar} ref={newGroupAvatarInputRef} type="file" /><button aria-label="Choose group photo" className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-dashed border-atseen-muted text-atseen-muted" onClick={() => newGroupAvatarInputRef.current?.click()} type="button">{newGroupAvatar?.url ? <img alt="New group" className="h-full w-full object-cover" src={newGroupAvatar.url} /> : <FiCamera />}</button><input className="min-w-0 flex-1 rounded-xl border border-atseen-line bg-atseen-surface-2 px-4 py-3 text-sm outline-none focus:border-atseen-blue/50" maxLength={60} onChange={(event) => setGroupName(event.target.value)} placeholder="Group name" value={groupName} /></div><h3 className="mb-1 mt-4 shrink-0 text-sm font-black">Add members</h3><div className="atseen-hide-scrollbar min-h-0 flex-1 overflow-y-auto">{orderedPeople.map((person) => { const checked = groupMembers.includes(person.id); return <button className="flex w-full items-center gap-3 border-b border-white/[0.07] py-3 text-left last:border-0 hover:bg-white/[0.03]" key={person.id} onClick={() => setGroupMembers((current) => checked ? current.filter((id) => id !== person.id) : [...current, person.id])} type="button"><Identity compact person={person} presence={presence[person.id]} /><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] ${checked ? "border-atseen-blue bg-atseen-blue text-atseen-bg" : "border-atseen-muted"}`}>{checked ? "✓" : ""}</span></button>; })}</div><button className="mt-4 w-full shrink-0 rounded-xl bg-atseen-blue py-3 text-sm font-black text-atseen-bg shadow-[0_8px_24px_rgba(112,169,255,0.25)] disabled:opacity-40" disabled={!groupName.trim() || !groupMembers.length || actionBusy} type="submit">{actionBusy ? "Creating…" : "Create Group"}</button></form></div> : null}
    {deleteDialog ? <div className="absolute inset-0 z-[75] flex items-end justify-center bg-black/70 p-3 sm:items-center"><div aria-labelledby="delete-message-title" aria-modal="true" className="w-full max-w-[300px] rounded-2xl border border-atseen-line bg-atseen-bg-2 p-4 shadow-2xl" role="dialog"><div className="flex items-center justify-between"><h2 className="text-base font-bold" id="delete-message-title">{deleteDialog.scope ? "Confirm deletion" : "Delete message"}</h2><button aria-label="Close delete message" className="grid h-7 w-7 place-items-center rounded-full text-sm hover:bg-white/5" disabled={actionBusy} onClick={() => setDeleteDialog(null)} type="button"><FiX /></button></div>{deleteDialog.scope ? <><p className="mt-2 text-xs leading-5 text-atseen-muted">This disappears only from your chat.</p><div className="mt-4 flex gap-2"><button className="flex-1 rounded-full border border-atseen-line py-2 text-xs font-bold" disabled={actionBusy} onClick={() => setDeleteDialog((current) => ({ ...current, scope: null }))} type="button">Back</button><button className="flex-[1.3] rounded-full bg-atseen-danger px-3 py-2 text-xs font-bold text-white disabled:opacity-50" disabled={actionBusy} onClick={deleteSelectedMessage} type="button">{actionBusy ? "Deleting…" : "Delete"}</button></div></> : <><p className="mt-1 text-xs text-atseen-muted">Choose an option.</p><div className="mt-3 grid gap-1"><button className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-white/5" onClick={() => setDeleteDialog((current) => ({ ...current, scope: "me" }))} type="button"><FiTrash2 className="shrink-0 text-sm text-atseen-danger" /><span><b className="block text-xs">Delete for me</b><span className="mt-0.5 block text-[10px] text-atseen-muted">Only removes it from your chat.</span></span></button>{deleteDialog.message.senderId === myId ? <button className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-atseen-danger/5 disabled:opacity-50" disabled={actionBusy} onClick={() => deleteSelectedMessage({ message: deleteDialog.message, scope: "everyone" })} type="button"><FiTrash2 className="shrink-0 text-sm text-atseen-danger" /><span><b className="block text-xs text-atseen-danger">{actionBusy ? "Unsending…" : "Unsend for everyone"}</b><span className="mt-0.5 block text-[10px] text-atseen-muted">Replaces it for both people.</span></span></button> : null}</div></>}</div></div> : null}
    {bulkDeleteDialog ? <div className="absolute inset-0 z-[76] flex items-end bg-black/70" onMouseDown={(event) => { if (event.target === event.currentTarget && !actionBusy) setBulkDeleteDialog(null); }} role="presentation"><section aria-modal="true" className="w-full rounded-t-[22px] border border-b-0 border-atseen-line bg-[#1b212c] px-5 pb-8 pt-2.5 shadow-2xl" role="dialog"><div className="mx-auto mb-4 h-1 w-8 rounded-full bg-white/35" /><div className="flex items-center justify-between"><div><h2 className="text-base font-black">Delete {bulkDeleteDialog.messages.length} messages?</h2><p className="mt-1 text-[11px] text-atseen-muted">Choose where the selected messages should disappear.</p></div><button className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5" disabled={actionBusy} onClick={() => setBulkDeleteDialog(null)} type="button"><FiX /></button></div><button className="mt-4 flex w-full items-center gap-4 border-b border-white/[0.07] py-4 text-left" disabled={actionBusy} onClick={() => deleteSelectedMessages("me")} type="button"><FiTrash2 className="text-atseen-danger" /><span><b className="block text-sm">Delete for me</b><span className="mt-1 block text-[10px] text-atseen-muted">Only removes the selected messages from your chat.</span></span></button>{bulkDeleteDialog.messages.every((message) => message.senderId === myId && !message.deletedAt) ? <button className="flex w-full items-center gap-4 py-4 text-left" disabled={actionBusy} onClick={() => deleteSelectedMessages("everyone")} type="button"><FiTrash2 className="text-atseen-danger" /><span><b className="block text-sm text-atseen-danger">Delete for everyone</b><span className="mt-1 block text-[10px] text-atseen-muted">All selected messages were sent by you.</span></span></button> : null}{actionBusy ? <p className="pt-3 text-center text-xs font-bold text-atseen-muted">Deleting messages…</p> : null}</section></div> : null}
    {reportTarget ? <div className="absolute inset-0 z-[70] flex items-end justify-center bg-black/75 p-3 sm:items-center"><form className="w-full max-w-md rounded-3xl border border-atseen-line bg-atseen-bg-2 p-5 shadow-2xl" onSubmit={submitReport}><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Report {reportTarget.type === "message" ? "message" : "conversation"}</h2><p className="mt-1 text-xs text-atseen-muted">Your report is private and will be reviewed.</p></div><button aria-label="Close report" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5" disabled={actionBusy} onClick={() => setReportTarget(null)} type="button"><FiX /></button></div><label className="mt-5 block text-xs font-bold text-atseen-muted">Reason<select className="mt-2 w-full rounded-xl border border-atseen-line bg-atseen-surface-2 px-3 py-3 text-sm text-white [color-scheme:dark] outline-none" onChange={(event) => setReportReason(event.target.value)} value={reportReason}>{REPORT_REASONS.map(([value, label]) => <option className="bg-atseen-bg-2 text-white" key={value} value={value}>{label}</option>)}</select></label><label className="mt-4 block text-xs font-bold text-atseen-muted">Additional details <span className="font-normal">(optional)</span><textarea className="mt-2 min-h-24 w-full resize-y rounded-xl border border-atseen-line bg-atseen-surface-2 p-3 text-sm text-white outline-none" maxLength={1000} onChange={(event) => setReportDetails(event.target.value)} value={reportDetails} /></label><button className="mt-5 w-full rounded-full bg-atseen-danger py-3 text-sm font-bold text-white disabled:opacity-50" disabled={actionBusy} type="submit">{actionBusy ? "Submitting…" : "Submit report"}</button></form></div> : null}
    {storyViewer ? <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-4"><div className="relative flex h-[min(78vh,620px)] w-full max-w-sm items-center justify-center overflow-hidden rounded-3xl border border-atseen-line bg-atseen-bg shadow-2xl"><button aria-label="Close story" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white" onClick={() => setStoryViewer(null)} type="button"><FiX /></button>{storyViewer.loading ? <p className="text-sm text-atseen-muted">Loading story…</p> : storyViewer.expired ? <div className="px-8 text-center"><div className="text-5xl">⌛</div><h2 className="mt-5 text-xl font-bold">Story unavailable</h2><p className="mt-2 text-sm leading-6 text-atseen-muted">This story expired after 24 hours or was deleted by its creator.</p></div> : storyViewer.error ? <div className="px-8 text-center"><h2 className="text-xl font-bold">Unable to open story</h2><p className="mt-2 text-sm text-atseen-muted">Please check your connection and try again.</p></div> : storyViewer.story ? <><img alt={storyViewer.story.caption || "Story"} className="h-full w-full object-cover" src={resolveMediaUrl(storyViewer.story.image)} /><div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/75" /><div className="absolute left-5 right-14 top-5 flex items-center gap-3"><FanAvatar name={storyViewer.story.name} size="h-10 w-10" src={storyViewer.story.avatar} /><div><p className="text-sm font-bold text-white">{storyViewer.story.name}</p><p className="text-[10px] text-white/65">Story</p></div></div>{storyViewer.story.caption ? <p className="absolute bottom-7 left-5 right-5 text-base font-bold leading-7 text-white">{storyViewer.story.caption}</p> : null}</> : null}</div></div> : null}
    {storyViewer?.story && !storyViewer.story.isOwn ? <div className="absolute bottom-6 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-white/15 bg-black/70 p-3 shadow-2xl backdrop-blur"><div className="mb-2 flex items-center justify-center gap-3">{STORY_REACTIONS.map((reaction) => <button aria-label={`React ${reaction}`} className={`grid h-9 w-9 place-items-center rounded-full text-lg transition hover:scale-110 ${storyViewer.reactionSent === reaction ? "bg-atseen-blue/30 ring-1 ring-atseen-blue" : "bg-white/10"}`} disabled={storyActionBusy} key={reaction} onClick={() => reactToOpenStory(reaction)} type="button">{reaction}</button>)}</div><form className="flex gap-2" onSubmit={replyToOpenStory}><input className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/55" maxLength={1000} onChange={(event) => setStoryReplyDraft(event.target.value)} placeholder={`Reply to ${storyViewer.story.name}…`} value={storyReplyDraft} /><button aria-label="Send story reply" className="grid h-10 w-10 place-items-center rounded-full bg-atseen-blue text-atseen-bg disabled:opacity-40" disabled={!storyReplyDraft.trim() || storyActionBusy} type="submit"><FiSend /></button></form>{storyViewer.replySent ? <p className="mt-2 text-center text-[10px] text-atseen-success">Reply sent</p> : null}{storyViewer.actionError ? <p className="mt-2 text-center text-[10px] text-atseen-danger">{storyViewer.actionError}</p> : null}</div> : null}
  </div>;
}
