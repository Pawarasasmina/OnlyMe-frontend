import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiCornerUpLeft, FiEdit, FiFlag, FiImage, FiMessageCircle, FiMoreVertical, FiRefreshCw, FiSearch, FiSend, FiShield, FiSmile, FiTrash2, FiX } from "react-icons/fi";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import VerifiedBadge from "../../components/fanWeb/shared/VerifiedBadge";
import VoiceMessageBubble from "../../components/messaging/VoiceMessageBubble";
import VoiceRecorder from "../../components/messaging/VoiceRecorder";
import VideoNoteBubble from "../../components/messaging/VideoNoteBubble";
import { useAuth } from "../../hooks/useAuth";
import { UNREAD_MESSAGE_COUNT_EVENT } from "../../hooks/useUnreadMessageCount";
import { messageService } from "../../services/messageService";
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
  const online = presence?.online;
  return <>
    <span className="relative shrink-0">
      <FanAvatar name={person.displayName} size={compact ? "h-10 w-10" : "h-12 w-12"} src={person.avatarUrl} />
      <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-atseen-bg-2 ${online ? "bg-atseen-success" : "bg-atseen-dim"}`} />
    </span>
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-1 truncate text-sm font-bold">{person.displayName}{person.isVerified ? <VerifiedBadge /> : null}</span>
      <span className={`block truncate text-[11px] ${online && !subtitle ? "text-atseen-success" : "text-atseen-muted"}`}>{subtitle || (online ? "Online" : relative(presence?.lastSeenAt || person.lastSeenAt))}</span>
    </span>
  </>;
}

function StoryReplyPreview({ forceExpired = false, mine, onOpen, reply }) {
  const expired = forceExpired || Boolean(reply.expiresAt && new Date(reply.expiresAt).getTime() <= Date.now());
  return <button className={`mb-2 block w-full overflow-hidden rounded-xl border text-left ${mine ? "border-atseen-bg/15 bg-atseen-bg/10" : "border-white/10 bg-black/20"}`} onClick={() => onOpen(reply, expired)} type="button"><div className="flex items-center gap-2 p-2">{expired ? <span className={`grid h-12 w-10 shrink-0 place-items-center rounded-lg text-lg ${mine ? "bg-atseen-bg/10" : "bg-white/5"}`}>⌛</span> : <img alt="Story replied to" className="h-12 w-10 shrink-0 rounded-lg object-cover" src={resolveMediaUrl(reply.imageUrl)} />}<div className="min-w-0"><p className={`text-[10px] font-bold uppercase tracking-wide ${mine ? "text-atseen-bg/65" : "text-atseen-blue"}`}>{expired ? "Story unavailable" : mine ? "You replied to their story" : "Replied to your story"}</p><p className={`truncate text-xs ${mine ? "text-atseen-bg/75" : "text-atseen-muted"}`}>{expired ? "This story has expired" : reply.caption || "Tap to view story"}</p></div></div></button>;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const myId = String(user?.id || user?._id || "");
  const [selected, setSelected] = useState(() => {
    const userId = searchParams.get("with");
    const directAccessWindowId = searchParams.get("window");
    return userId ? { id: userId, ...(directAccessWindowId ? { directAccessWindowId } : {}) } : null;
  });
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [reactionFor, setReactionFor] = useState(null);
  const [reactionDetails, setReactionDetails] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [newChat, setNewChat] = useState(false);
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
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [storyReplyDraft, setStoryReplyDraft] = useState("");
  const [storyActionBusy, setStoryActionBusy] = useState(false);
  const [directAccessBusy, setDirectAccessBusy] = useState(false);
  const [directAccessSettings, setDirectAccessSettings] = useState({ enabled: false, priceStars: 100 });
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
  const conversationsQuery = useQuery({
    queryKey: ["messages", "conversations"],
    queryFn: () => messageService.getConversations().then((r) => r.data.data.conversations),
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: "always",
    staleTime: 0,
  });
  const messagesQuery = useQuery({
    queryKey: ["messages", selected?.id],
    queryFn: async () => {
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
  const peopleQuery = useQuery({ queryKey: ["messages", "people", search], queryFn: () => messageService.searchPeople(search).then((r) => r.data.data.people), enabled: newChat && user?.role === "fan" });
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
    enabled: user?.role === "fan" && Boolean(selected?.id),
    retry: false,
    staleTime: 30000,
  });
  useEffect(() => {
    if (creatorDirectAccessQuery.data) setDirectAccessSettings({
      enabled: creatorDirectAccessQuery.data.enabled,
      priceStars: creatorDirectAccessQuery.data.priceStars,
    });
  }, [creatorDirectAccessQuery.data]);
  const conversations = useMemo(() => conversationsQuery.data || [], [conversationsQuery.data]);
  const directWindowSections = useMemo(() => {
    const windows = directWindowsQuery.data || [];
    if (user?.role !== "creator") return [{ label: "MY DIRECT ACCESS", items: windows }];
    return [
      { label: "INCOMING · PAID", items: windows.filter((item) => item.settlementStatus === "HELD") },
      { label: "ANSWERED", items: windows.filter((item) => item.settlementStatus !== "HELD") },
    ];
  }, [directWindowsQuery.data, user?.role]);
  const participant = messagesQuery.data?.participant || selected?.participant || selected;
  const messages = useMemo(() => messagesQuery.data?.messages || [], [messagesQuery.data?.messages]);
  const directAccessWindow = messagesQuery.data?.directAccessWindow || null;
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
  const directAccessFanLocked = user?.role === "fan" && directAccessWindow
    && (directAccessWindow.messagesRemaining <= 0 || directAccessRemaining <= 0 || !["OPEN", "ANSWERED"].includes(directAccessWindow.status));
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
      (conversation) => (Number(conversation.unreadCount) || 0) > 0,
    ).length;
    window.dispatchEvent(new CustomEvent(UNREAD_MESSAGE_COUNT_EVENT, { detail: unreadChats }));
  }, [conversations]);

  useEffect(() => {
    const socket = getMessageSocket();
    if (!socket) return undefined;
    const connected = () => {
      setSocketConnected(true);
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      if (selected?.id) queryClient.invalidateQueries({ queryKey: ["messages", selected.id] });
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
      if (selected?.id === otherId && selected?.directAccessWindowId === windowItem.id) {
        queryClient.invalidateQueries({ queryKey: ["messages", otherId], exact: true });
      }
      queryClient.invalidateQueries({ queryKey: ["messages", "direct-access"] });
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
    return () => { socket.off("connect", onConnected); socket.off("disconnect", disconnected); socket.off("connect_error", disconnected); socket.off("message:new", receiveMessage); socket.off("messages:read", markMessagesRead); socket.off("message:reaction", updateReaction); socket.off("presence:update", updatePresence); socket.off("conversation:status", updateConversationStatus); socket.off("message:deleted", deleteRealtimeMessage); socket.off("message:hidden", hideRealtimeMessage); socket.off("conversation:hidden", hideRealtimeConversation); socket.off("account:block", updateBlock); socket.off("direct-access:updated", updateDirectAccess); };
  }, [myId, queryClient, selected?.id, setSearchParams]);

  useEffect(() => {
    if (!selected?.id) return;
    queryClient.invalidateQueries({ queryKey: ["messages", selected.id], exact: true });
  }, [queryClient, selected?.id]);

  useEffect(() => {
    const syncAfterResume = () => {
      if (document.visibilityState !== "visible") return;
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      if (selected?.id) queryClient.invalidateQueries({ queryKey: ["messages", selected.id], exact: true });
    };
    document.addEventListener("visibilitychange", syncAfterResume);
    window.addEventListener("online", syncAfterResume);
    return () => {
      document.removeEventListener("visibilitychange", syncAfterResume);
      window.removeEventListener("online", syncAfterResume);
    };
  }, [queryClient, selected?.id]);

  useEffect(() => {
    const ids = conversations.map((item) => item.participant.id);
    if (selected?.id && !ids.includes(selected.id)) ids.push(selected.id);
    const socket = getMessageSocket();
    if (socket && ids.length) socket.emit("presence:query", ids, (rows) => setPresence((current) => ({ ...current, ...Object.fromEntries(rows.map((row) => [row.userId, { ...current[row.userId], ...row }])) })));
  }, [conversations, selected?.id]);

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
    : conversations.filter((item) => {
      if (inboxTab === "requests") return user?.role === "creator" && item.status === "REQUEST";
      return user?.role === "fan" ? item.status !== "DECLINED" : !["REQUEST", "DECLINED"].includes(item.status);
    }), [conversations, inboxTab, user?.role]);
  const chooseConversation = (conversation) => {
    queryClient.setQueryData(["messages", "conversations"], (current = []) => current.map((item) => (
      item.id === conversation.id ? { ...item, unreadCount: 0 } : item
    )));
    queryClient.removeQueries({ queryKey: ["messages", conversation.id], exact: true });
    setSelected(conversation);
    setSearchParams({ with: conversation.id, ...(conversation.directAccessWindowId ? { window: conversation.directAccessWindowId } : {}) }, { replace: true });
  };
  const closeConversation = () => { setSelected(null); setSearchParams({}, { replace: true }); };
  const openPerson = (person) => { chooseConversation({ id: person.id, participant: person }); setNewChat(false); setSearch(""); };
  const loadOlder = async () => {
    const cursor = messagesQuery.data?.pageInfo?.nextCursor;
    if (!selected?.id || !cursor || loadingOlder) return;
    setLoadingOlder(true);
    setError("");
    try {
      const response = await messageService.getMessages(selected.id, { cursor, directAccessWindowId: selected.directAccessWindowId || null });
      const older = response.data.data;
      queryClient.setQueryData(["messages", selected.id], (current) => current ? {
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
      await messageService.updateDirectAccessSettings(nextSettings.enabled, Number(nextSettings.priceStars));
      await creatorDirectAccessQuery.refetch();
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
    if (creatorAskMode && user?.role === "creator") {
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
    queryClient.setQueryData(["messages", selected.id], (current) => current ? {
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
    queryClient.setQueryData(["messages", selected.id], (current) => current ? {
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
        ? await messageService.removeReaction(message.id)
        : await messageService.setReaction(message.id, emoji);
      const reactions = response.data.data.reactions || [];
      queryClient.setQueryData(["messages", selected.id], (current) => current ? {
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
      const response = await messageService.deleteMessage(message.id, scope);
      if (scope === "me") {
        queryClient.setQueryData(["messages", selected.id], (current) => current ? {
          ...current,
          messages: current.messages.filter((item) => item.id !== message.id),
        } : current);
      } else {
        const deleted = response.data.data.message;
        queryClient.setQueryData(["messages", selected.id], (current) => current ? {
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
  const submitReport = async (event) => {
    event.preventDefault();
    if (!reportTarget) return;
    setActionBusy(true);
    setError("");
    try {
      const payload = { reason: reportReason, details: reportDetails };
      if (reportTarget.type === "message") await messageService.reportMessage(reportTarget.message.id, payload);
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
      const response = await messageService.sendImage(selected.id, file, newClientMessageId(), null, directAccessWindow?.id || null);
      const { message, conversationStatus = "ACTIVE", directAccessWindow: updatedDirectAccessWindow } = response.data.data;
      queryClient.setQueryData(["messages", selected.id], (current) => current ? {
        ...current,
        messages: [...current.messages.filter((item) => item.id !== message.id), message],
        conversationStatus,
        directAccessWindow: updatedDirectAccessWindow || current.directAccessWindow,
        requestRequired: false,
      } : current);
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
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
      <aside className={`${selected ? "hidden" : "flex"} h-full min-h-0 w-full flex-col`}>
        <header className="flex items-center justify-between border-b border-atseen-line px-5 py-5">
          <div><h1 className="text-2xl font-extrabold">Messages</h1><p className="mt-1 text-xs text-atseen-muted">Private fan–creator conversations</p></div>
          {user?.role === "fan" ? <button aria-label="New message" className="grid h-10 w-10 place-items-center rounded-full bg-atseen-blue text-atseen-bg transition hover:bg-white" onClick={() => setNewChat(true)}><FiEdit /></button> : null}
        </header>
        <nav aria-label="Message inbox filters" className={`grid border-b border-atseen-line px-3 ${user?.role === "creator" ? "grid-cols-3" : "grid-cols-2"}`}>
          {(user?.role === "creator"
            ? [{ id: "all", label: "All" }, { id: "requests", label: "Requests" }, { id: "direct", label: "Direct Access" }]
            : [{ id: "all", label: "All" }, { id: "direct", label: "Priority" }]).map((tab) => {
            const count = tab.id === "requests"
              ? conversations.filter((item) => item.status === "REQUEST").length
              : tab.id === "direct" && user?.role === "creator"
                ? (directWindowsQuery.data || []).filter((item) => item.settlementStatus === "HELD").length
                : 0;
            return <button className={`border-b-2 px-2 py-3 text-xs font-bold transition ${inboxTab === tab.id ? "border-atseen-blue text-atseen-blue" : "border-transparent text-atseen-muted hover:text-white"}`} key={tab.id} onClick={() => setInboxTab(tab.id)} type="button">{tab.label}{count ? <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[9px] ${tab.id === "direct" ? "bg-atseen-warning/15 text-atseen-warning" : ""}`}>{count}</span> : null}</button>;
          })}
        </nav>
        <div className="atseen-hide-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {inboxTab === "direct" && user?.role === "creator" ? <div className="m-4 rounded-2xl border border-atseen-blue/20 bg-atseen-blue/[0.06] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold">Priority messages</p><p className="mt-1 text-[10px] text-atseen-muted">3 messages · expires after 48 hours · autosaved</p></div><label className="flex items-center gap-2 text-xs font-bold"><input checked={directAccessSettings.enabled} disabled={directAccessBusy} onChange={(event) => saveDirectAccessSettings({ ...directAccessSettings, enabled: event.target.checked })} type="checkbox" /> Enabled</label></div><div className="mt-3 flex flex-wrap gap-2">{[50, 100, 200, 500].map((price) => <button className={`rounded-full border px-3 py-2 text-xs font-black ${Number(directAccessSettings.priceStars) === price ? "border-atseen-blue bg-atseen-blue/15 text-atseen-blue" : "border-atseen-line text-atseen-muted"}`} disabled={directAccessBusy} key={price} onClick={() => saveDirectAccessSettings({ ...directAccessSettings, priceStars: price })} type="button">✦{price}</button>)}</div></div> : null}
          {inboxTab === "direct" && directWindowsQuery.isLoading ? <p className="p-6 text-sm text-atseen-muted">Loading Direct Access…</p> : null}
          {inboxTab !== "direct" && conversationsQuery.isLoading ? <p className="p-6 text-sm text-atseen-muted">Loading conversations…</p> : null}
          {conversationsQuery.isError ? <div className="p-6 text-sm text-atseen-danger"><p>Conversations are unavailable.</p><button className="mt-3 rounded-full border border-atseen-danger/30 px-4 py-2 text-xs font-bold" onClick={() => conversationsQuery.refetch()} type="button">Retry</button></div> : null}
          {inboxTab === "direct" ? directWindowSections.map((section) => section.items.length ? <section key={section.label}><h2 className="border-b border-white/[0.05] bg-white/[0.025] px-4 py-2 text-[9px] font-black tracking-[0.16em] text-atseen-muted">{section.label}</h2>{section.items.map((windowItem) => {
            const other = user?.role === "creator" ? windowItem.fan : windowItem.creator;
            if (!other) return null;
            const hoursLeft = Math.max(0, Math.ceil((new Date(windowItem.expiresAt).getTime() - Date.now()) / 3600000));
            return <button className="flex w-full items-center gap-3 border-b border-white/[0.05] px-4 py-4 text-left transition hover:bg-white/[0.03]" key={windowItem.id} onClick={() => chooseConversation({ id: other.id, participant: other, directAccessWindowId: windowItem.id })} type="button">
              <Identity compact person={other} presence={presence[other.id]} subtitle={windowItem.questionQuote ? `“${windowItem.questionQuote}”` : `${windowItem.messagesRemaining} messages left · ${hoursLeft}h`} />
              <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${windowItem.settlementStatus === "HELD" ? "bg-atseen-warning/15 text-atseen-warning" : windowItem.settlementStatus === "CAPTURED" ? "bg-atseen-success/15 text-atseen-success" : "bg-white/5 text-atseen-muted"}`}>{windowItem.settlementStatus === "HELD" ? `✦${windowItem.priceStars} held · ${hoursLeft}h` : windowItem.settlementStatus === "CAPTURED" ? `✦${windowItem.priceStars} captured` : windowItem.settlementStatus.replaceAll("_", " ")}</span>
            </button>;
          })}</section> : null) : null}
          {inboxTab === "direct" && !directWindowsQuery.isLoading && !(directWindowsQuery.data || []).length ? <div className="grid place-items-center px-8 py-20 text-center"><FiMessageCircle className="text-4xl text-atseen-blue" /><h2 className="mt-4 font-bold">{user?.role === "fan" ? "No Priority messages" : "No Direct Access messages"}</h2><p className="mt-2 text-sm text-atseen-muted">Direct Access windows will appear here.</p></div> : null}
          {inboxTab !== "direct" && !conversationsQuery.isLoading && !shownConversations.length ? <div className="grid place-items-center px-8 py-20 text-center"><FiMessageCircle className="text-4xl text-atseen-blue" /><h2 className="mt-4 font-bold">{inboxTab === "requests" ? "No message requests" : "No conversations yet"}</h2><p className="mt-2 text-sm text-atseen-muted">{inboxTab === "requests" ? "Messages from non-following fans appear here." : user?.role === "fan" ? "Start a private chat with a creator." : "Accepted fan conversations appear here."}</p></div> : null}
          {shownConversations.map((conversation) => <button className={`flex w-full items-center gap-3 border-b border-white/[0.05] px-4 py-4 text-left transition hover:bg-white/[0.03] ${selected?.id === conversation.id ? "bg-atseen-blue/10" : ""}`} key={conversation.id} onClick={() => chooseConversation(conversation)}>
            <Identity compact person={conversation.participant} presence={presence[conversation.id]} subtitle={conversation.lastMessage.deletedAt ? conversation.lastMessage.senderId === myId ? "You deleted this message" : "This message was deleted" : `${conversation.lastMessage.senderId === myId ? "You: " : ""}${conversation.lastMessage.body}`} />
            <span className="ml-auto flex max-w-[95px] flex-col items-end gap-1"><span className="text-[10px] text-atseen-muted">{new Date(conversation.lastMessage.createdAt).toLocaleDateString()}</span>{conversation.unreadCount ? <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-atseen-blue px-1 text-[10px] font-black text-atseen-bg">{conversation.unreadCount}</span> : null}</span>
          </button>)}
        </div>
      </aside>

      <main className={`${selected ? "flex" : "hidden"} isolate h-full min-h-0 min-w-0 flex-1 flex-col`}>
        {directAccessNotice ? <div className="absolute left-1/2 top-16 z-[90] -translate-x-1/2 rounded-full border border-atseen-line bg-atseen-bg-2/95 px-4 py-2 text-xs font-bold text-atseen-muted shadow-xl backdrop-blur">{directAccessNotice}</div> : null}
        {selected ? <>
          <header className="relative z-50 flex shrink-0 items-center gap-3 overflow-visible border-b border-atseen-line bg-atseen-bg-2/95 px-4 py-3 backdrop-blur">
            <button aria-label="Back to conversations" className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-white/5" onClick={closeConversation}><FiArrowLeft /></button>
            {participant ? <button className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atseen-blue" onClick={() => participant.username && navigate(`/profile/${encodeURIComponent(participant.username)}`)} type="button"><Identity person={participant} presence={presence[selected.id]} /></button> : null}
            {!socketConnected ? <span className="ml-auto hidden text-[10px] font-semibold text-atseen-warning sm:block">Reconnecting…</span> : null}
            <div className="relative">
              <button aria-expanded={chatMenuOpen} aria-label="Chat options" className="grid h-9 w-9 place-items-center rounded-full text-atseen-muted hover:bg-white/5 hover:text-white" onClick={() => setChatMenuOpen((current) => !current)} type="button"><FiMoreVertical /></button>
              {chatMenuOpen ? <div className="absolute right-0 top-11 z-[70] w-52 overflow-hidden rounded-2xl border border-atseen-line bg-atseen-bg-2 p-1.5 shadow-2xl">
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/5" disabled={actionBusy} onClick={() => { setChatMenuOpen(false); setReportTarget({ type: "conversation" }); }} type="button"><FiFlag className="text-atseen-warning" /> Report conversation</button>
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/5 ${messagesQuery.data?.blockStatus?.blockedByMe ? "text-atseen-blue" : "text-atseen-danger"}`} disabled={actionBusy} onClick={toggleBlock} type="button"><FiShield /> {messagesQuery.data?.blockStatus?.blockedByMe ? "Unblock account" : "Block account"}</button>
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-atseen-danger hover:bg-atseen-danger/5" disabled={actionBusy} onClick={deleteSelectedConversation} type="button"><FiTrash2 /> Delete chat</button>
              </div> : null}
            </div>
          </header>
          {hasActiveDirectAccessWindow ? <div className="shrink-0 border-b border-atseen-blue/20 bg-atseen-blue/[0.07] px-4 py-2 text-center text-[11px] text-atseen-blue"><b>Direct window open</b> · {directAccessTimeLabel} · {directAccessWindow.messagesRemaining} of {directAccessWindow.fanMessageLimit} messages left · {directAccessWindow.settlementStatus === "HELD" ? "Stars held" : directAccessWindow.settlementStatus === "INCLUDED" ? "Premium included" : "Answered"}</div> : directAccessEffectivelyClosed ? <div className="shrink-0 border-b border-atseen-line bg-atseen-bg-2 px-4 py-2 text-center text-[11px] text-atseen-muted">Direct window closed · This conversation remains readable</div> : user?.role === "fan" && participant?.role === "creator" && selectedDirectAccessOfferQuery.data?.enabled ? <div className="shrink-0 border-b border-atseen-line bg-atseen-bg-2 px-4 py-2 text-center"><button className="rounded-full border border-atseen-blue/40 px-4 py-2 text-xs font-bold text-atseen-blue disabled:opacity-50" disabled={directAccessBusy} onClick={openDirectAccess} type="button">{directAccessBusy ? "Opening…" : `Direct Access · ✦${selectedDirectAccessOfferQuery.data.priceStars}`}</button><p className="mt-1 text-[10px] text-atseen-muted">Guaranteed reply within 48 hours or a full refund</p></div> : null}
          <section className="atseen-hide-scrollbar relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top,rgba(94,155,255,0.07),transparent_36%)] px-4 py-6 sm:px-8" onScroll={handleThreadScroll} ref={threadRef}>
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
                <div className={`group mb-2 flex ${mine ? "justify-end" : "justify-start"}`} data-chat-date-label={dateLabel}>
                <div className={`relative flex max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
                  <div className={`min-w-[112px] rounded-[19px] px-4 py-2 text-sm leading-5 sm:min-w-[128px] ${mine ? "rounded-br-md bg-atseen-blue font-medium text-atseen-bg" : "rounded-bl-md border border-atseen-line bg-atseen-surface-2 text-atseen-text"}`} data-message-id={message.id} onDoubleClick={() => reactToMessage(message, "❤️")} title="Double-click to react with ❤️">
                    {message.replyTo ? <button className={`mb-2 block w-full rounded-xl border-l-2 px-3 py-1.5 text-left ${mine ? "border-atseen-bg/40 bg-atseen-bg/10 text-atseen-bg/70" : "border-atseen-blue bg-black/20 text-atseen-muted"}`} onClick={() => document.querySelector(`[data-message-id="${message.replyTo.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })} type="button"><span className="block text-[10px] font-bold">{message.replyTo.senderId === myId ? "You" : participant?.displayName}</span><span className="block max-w-[230px] truncate text-xs">{message.replyTo.body}</span></button> : null}
                    {message.storyReply ? <StoryReplyPreview forceExpired={expiredStoryIds.has(message.storyReply.storyId)} mine={mine} onOpen={openStoryReply} reply={message.storyReply} /> : null}
                    {message.messageKind === "CREATOR_ASK" ? <p className={`mb-1 text-[9px] font-black uppercase tracking-[0.16em] ${mine ? "text-atseen-bg/65" : "text-atseen-blue"}`}>Asks you</p> : null}
                    {message.deletedAt ? <p className="flex items-center gap-1.5 italic opacity-65"><FiTrash2 className="shrink-0" />{mine ? "You deleted this message" : "This message was deleted"}</p> : message.mediaType === "image" && message.image ? <div><img alt="Shared in chat" className="max-h-80 w-full rounded-xl object-cover" loading="lazy" src={message.image.url} />{message.body && message.body !== "Image" ? <p className="mt-2 whitespace-pre-wrap break-words">{message.body}</p> : null}</div> : message.mediaType === "audio" && message.audio ? <VoiceMessageBubble audio={message.audio} mine={mine} /> : message.mediaType === "video" && message.video ? <VideoNoteBubble mine={mine} video={message.video} /> : <p className="whitespace-pre-wrap break-words">{message.body}</p>}
                    <p className={`mt-0.5 flex items-center justify-end gap-1 text-right text-[9px] ${mine ? "text-atseen-bg/60" : "text-atseen-muted"}`}>
                      <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{mine && message.deliveryState === "sending" ? " · Sending…" : mine && message.deliveryState === "failed" ? " · Failed" : mine && !message.readAt ? " · Sent" : ""}</span>
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
                    const names = matching.map((reaction) => reaction.userId === myId ? "You" : participant?.displayName || "Participant");
                    const detailsOpen = reactionDetails?.messageId === message.id && reactionDetails?.emoji === emoji;
                    return <span className="relative" key={emoji}>
                      <button aria-expanded={detailsOpen} aria-label={`${emoji} reaction by ${names.join(" and ")}`} className={`rounded-full border px-1.5 py-0.5 text-xs shadow ${matching.some((reaction) => reaction.userId === myId) ? "border-atseen-blue bg-atseen-blue/20" : "border-atseen-line bg-atseen-bg-2"}`} onClick={() => setReactionDetails((current) => current?.messageId === message.id && current?.emoji === emoji ? null : { messageId: message.id, emoji })} title={names.join(", ")} type="button">{emoji}{count > 1 ? <span className="ml-1 text-[9px]">{count}</span> : null}</button>
                      {detailsOpen ? <span className={`absolute bottom-7 z-30 block min-w-40 rounded-xl border border-atseen-line bg-atseen-bg-2 p-2 text-left shadow-2xl ${mine ? "right-0" : "left-0"}`}>{matching.map((reaction) => {
                        const isMine = reaction.userId === myId;
                        return <span className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs" key={reaction.userId}><FanAvatar name={isMine ? user?.name || "You" : participant?.displayName} size="h-6 w-6" src={isMine ? user?.avatar || user?.avatarUrl : participant?.avatarUrl} /><span className="min-w-0 flex-1 truncate font-semibold">{isMine ? "You" : participant?.displayName}</span><span>{emoji}</span>{isMine ? <button className="ml-1 text-[10px] font-bold text-atseen-danger hover:underline" onClick={() => { setReactionDetails(null); reactToMessage(message, emoji); }} type="button">Remove</button> : null}</span>;
                      })}<span className="block px-2 pt-1 text-[9px] text-atseen-dim">{matching.some((reaction) => reaction.userId === myId) ? "Remove is available for your reaction." : "Reactions from this chat."}</span></span> : null}
                    </span>;
                  })}</div> : null}
                  {!message.deletedAt ? <div className={`absolute top-1/2 z-10 flex -translate-y-1/2 items-center gap-0.5 text-atseen-muted opacity-100 transition sm:opacity-45 sm:group-hover:opacity-100 ${mine ? "right-full mr-1 flex-row-reverse" : "left-full ml-1"}`}>
                    <button aria-label="Reply to message" className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/5 hover:text-white" onClick={() => { setReplyTo(message); setReactionFor(null); }} title="Reply" type="button"><FiCornerUpLeft /></button>
                    <button aria-label="React to message" className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/5 hover:text-white" onClick={() => setReactionFor((current) => current === message.id ? null : message.id)} title="React" type="button"><FiSmile /></button>
                    <button aria-label="Message options" className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/5 hover:text-white" onClick={() => setMessageMenu((current) => current === message.id ? null : message.id)} title="More" type="button"><FiMoreVertical /></button>
                    {reactionFor === message.id ? <div className={`absolute bottom-8 z-20 flex gap-1 rounded-full border border-atseen-line bg-atseen-bg-2 p-1.5 shadow-2xl ${mine ? "right-0" : "left-0"}`}>{MESSAGE_REACTIONS.map((emoji) => <button className="grid h-8 w-8 place-items-center rounded-full text-lg transition hover:scale-110 hover:bg-white/10" key={emoji} onClick={() => reactToMessage(message, emoji)} type="button">{emoji}</button>)}</div> : null}
                    {messageMenu === message.id ? <div className={`absolute bottom-8 z-30 w-40 overflow-hidden rounded-xl border border-atseen-line bg-atseen-bg-2 p-1 shadow-2xl ${mine ? "right-0" : "left-0"}`}>
                      {!message.id.startsWith("pending:") ? <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-atseen-danger hover:bg-white/5" disabled={actionBusy} onClick={() => { setMessageMenu(null); setDeleteDialog({ message, scope: null }); }} type="button"><FiTrash2 /> Delete</button> : null}
                      {!mine ? <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-atseen-warning hover:bg-white/5" onClick={() => { setMessageMenu(null); setReportTarget({ type: "message", message }); }} type="button"><FiFlag /> Report</button> : null}
                    </div> : null}
                  </div> : null}
                  {showReadAvatar && participant ? <span aria-label={`Seen by ${participant.displayName}`} className="mt-1 block" title={`Seen by ${participant.displayName}`}><FanAvatar name={participant.displayName} size="h-4 w-4" src={participant.avatarUrl} /></span> : null}
                </div>
              </div>
              </Fragment>;
            })}
            <div ref={bottomRef} />
          </section>
          {messagesQuery.data?.blockStatus?.blockedByMe || messagesQuery.data?.blockStatus?.blockedMe ? <div className="shrink-0 border-t border-atseen-line bg-atseen-bg-2 p-4 text-center"><p className="text-xs text-atseen-muted">{messagesQuery.data.blockStatus.blockedByMe ? "You blocked this account. Unblock them to send messages." : "Messaging is unavailable for this conversation."}</p>{messagesQuery.data.blockStatus.blockedByMe ? <button className="mt-3 rounded-full border border-atseen-blue/40 px-4 py-2 text-xs font-bold text-atseen-blue" disabled={actionBusy} onClick={toggleBlock} type="button">Unblock</button> : null}</div> : messagesQuery.data?.conversationStatus === "REQUEST" && user?.role === "creator" ? <div className="shrink-0 border-t border-atseen-line bg-atseen-bg-2 p-3 sm:p-4">
            <p className="mb-3 text-center text-xs text-atseen-muted">Accept this request before replying.</p>
            {error ? <p className="mb-2 text-xs text-atseen-danger">{error}</p> : null}
            <div className="flex gap-2"><button className="flex-1 rounded-full border border-atseen-line py-3 text-sm font-bold" disabled={requestBusy} onClick={() => handleRequest(false)} type="button">Delete</button><button className="flex-[1.4] rounded-full bg-atseen-blue py-3 text-sm font-bold text-atseen-bg" disabled={requestBusy} onClick={() => handleRequest(true)} type="button">Accept</button></div>
          </div> : messagesQuery.data?.conversationStatus === "REQUEST" && user?.role === "fan" ? <div className="shrink-0 border-t border-atseen-line bg-atseen-bg-2 p-4 text-center text-xs text-atseen-muted">Message request sent. You can continue after the creator accepts it.</div> : <form className="relative shrink-0 border-t border-atseen-line bg-atseen-bg-2 p-3 sm:p-4" onSubmit={send}>
            {error ? <p className="mb-2 text-xs text-atseen-danger">{error}</p> : null}
            {replyTo ? <div className="mb-2 flex items-center gap-3 rounded-xl border-l-2 border-atseen-blue bg-atseen-surface-2 px-3 py-2"><FiCornerUpLeft className="shrink-0 text-atseen-blue" /><div className="min-w-0 flex-1"><p className="text-[10px] font-bold text-atseen-blue">Replying to {replyTo.senderId === myId ? "yourself" : participant?.displayName}</p><p className="truncate text-xs text-atseen-muted">{replyTo.body}</p></div><button aria-label="Cancel reply" className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/5" onClick={() => setReplyTo(null)} type="button"><FiX /></button></div> : null}
            {emojiOpen ? <div className="absolute bottom-[4.5rem] left-3 z-20 w-[min(19rem,calc(100%-1.5rem))] rounded-2xl border border-atseen-line bg-atseen-bg-2 p-3 shadow-2xl"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold text-atseen-muted">Emojis</p><button aria-label="Close emoji picker" className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/5" onClick={() => setEmojiOpen(false)} type="button"><FiX /></button></div><div className="grid grid-cols-7 gap-1">{MESSAGE_EMOJIS.map((emoji) => <button className="grid h-9 w-9 place-items-center rounded-lg text-xl transition hover:bg-white/10" key={emoji} onClick={() => setDraft((current) => `${current}${emoji}`)} type="button">{emoji}</button>)}</div></div> : null}
            {user?.role === "creator" && directAccessEffectivelyClosed && ["CAPTURED", "INCLUDED"].includes(directAccessWindow?.settlementStatus) && !creatorAskMode ? <button className="mb-2 w-full text-left text-[11px] leading-5 text-atseen-dim hover:text-atseen-muted" onClick={() => {
              const lastFanMessage = [...messages].reverse().find((item) => item.senderId === selected.id && item.messageKind !== "CREATOR_ASK");
              const topic = lastFanMessage?.body && lastFanMessage.body.length < 80 ? ` about “${lastFanMessage.body}”` : "";
              setDraft(`What would you like me to go deeper on${topic}?`);
              setCreatorAskMode(true);
            }} type="button">Ask a useful follow-up · tap to prefill</button> : null}
            {creatorAskMode ? <div className="mb-2 flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-[11px] text-atseen-muted"><span><b className="text-atseen-blue">ASKS YOU</b> · Free to read; their answer opens a new paid window.</span><button className="ml-3 font-bold" onClick={() => { setCreatorAskMode(false); setDraft(""); }} type="button">Cancel</button></div> : null}
            {user?.role === "creator" && directAccessWindow?.settlementStatus === "HELD" ? <p className="mb-2 text-center text-[11px] text-atseen-dim">Answer the actual question — specific and real. That’s what fans stay for.</p> : null}
            {directAccessFanLocked ? <p className="mb-2 text-center text-xs font-bold text-atseen-warning">This Direct Access window cannot accept more fan messages.</p> : null}
            <div className="flex items-end gap-2"><VoiceRecorder disabled={sending || imageBusy || directAccessFanLocked} onSend={sendVoice} /><input accept="image/jpeg,image/png,image/webp" className="hidden" onChange={sendImage} ref={imageInputRef} type="file" /><button aria-label="Send image" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-atseen-line text-atseen-muted transition hover:text-white disabled:opacity-40" disabled={sending || imageBusy || directAccessFanLocked} onClick={() => imageInputRef.current?.click()} title="Send image" type="button">{imageBusy ? <FiRefreshCw className="animate-spin" /> : <FiImage />}</button><button aria-expanded={emojiOpen} aria-label="Open emoji picker" className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition ${emojiOpen ? "border-atseen-blue bg-atseen-blue/10 text-atseen-blue" : "border-atseen-line text-atseen-muted hover:text-white"}`} disabled={directAccessFanLocked} onClick={() => setEmojiOpen((current) => !current)} type="button"><FiSmile /></button><textarea aria-label="Message" className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl border border-atseen-line bg-atseen-surface-2 px-4 py-2.5 text-sm outline-none placeholder:text-atseen-dim focus:border-atseen-blue/60 disabled:opacity-50" disabled={directAccessFanLocked} maxLength={2000} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }} placeholder="Message…" rows={1} value={draft} /><button aria-label="Send message" className="grid h-11 w-11 place-items-center rounded-full bg-atseen-blue text-atseen-bg disabled:opacity-40" disabled={!draft.trim() || sending || imageBusy || directAccessFanLocked}><FiSend /></button></div>
          </form>}
        </> : null}
      </main>
    </div>

    {directAccessOffer && !hasActiveDirectAccessWindow ? <div className="absolute inset-0 z-[80] flex items-end justify-center bg-black/75 p-3 sm:items-center"><div className="w-full max-w-sm rounded-3xl border border-atseen-blue/25 bg-atseen-bg-2 p-5 shadow-2xl"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black">{directAccessOffer.reopenQuestionId ? "Answer with a new window" : "Open Direct Access"}</h2><p className="mt-1 text-xs text-atseen-muted">3 messages · expires after 48 hours</p></div><button className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5" disabled={directAccessBusy} onClick={() => setDirectAccessOffer(null)} type="button"><FiX /></button></div><div className="mt-5 rounded-2xl bg-atseen-surface-2 p-4"><div className="flex justify-between text-sm"><span className="text-atseen-muted">Price</span><b>✦{directAccessOffer.priceStars}</b></div><div className="mt-2 flex justify-between text-sm"><span className="text-atseen-muted">Your balance</span><b>✦{Number(directAccessOffer.walletBalance || 0)}</b></div><p className="mt-3 text-[10px] leading-4 text-atseen-muted">Stars are held now. The creator receives {directAccessOffer.reopenQuestionId ? "80%" : "90%"} after their first reply; unanswered windows are refunded in full.</p></div>{!directAccessOffer.reopenQuestionId && directAccessOffer.premiumAllowance?.available ? <button className="mt-4 w-full rounded-full border border-atseen-blue/40 py-3 text-sm font-bold text-atseen-blue" disabled={directAccessBusy} onClick={() => confirmDirectAccess("PREMIUM_INCLUDED")} type="button">Use included Premium window</button> : null}<button className="mt-3 w-full rounded-full bg-atseen-blue py-3 text-sm font-black text-atseen-bg disabled:opacity-40" disabled={directAccessBusy || Number(directAccessOffer.walletBalance || 0) < directAccessOffer.priceStars} onClick={() => confirmDirectAccess("PAID")} type="button">{directAccessBusy ? "Opening…" : directAccessOffer.reopenQuestionId ? `Answer · New window ✦${directAccessOffer.priceStars}` : `Pay ✦${directAccessOffer.priceStars}`}</button>{Number(directAccessOffer.walletBalance || 0) < directAccessOffer.priceStars && !directAccessOffer.premiumAllowance?.available ? <button className="mt-3 w-full text-xs font-bold text-atseen-warning" onClick={() => navigate("/fan/wallet")} type="button">Not enough Stars · Open Wallet</button> : null}</div></div> : null}

    {newChat ? <div className="absolute inset-0 z-40 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center"><div className="max-h-[75vh] w-full max-w-md overflow-hidden rounded-3xl border border-atseen-line bg-atseen-bg-2 shadow-2xl"><header className="flex items-center justify-between p-5"><h2 className="text-lg font-bold">New message</h2><button className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5" onClick={() => setNewChat(false)}><FiX /></button></header><label className="mx-4 mb-3 flex items-center gap-2 rounded-2xl border border-atseen-line bg-atseen-surface-2 px-4"><FiSearch className="text-atseen-muted" /><input autoFocus className="w-full bg-transparent py-3 text-sm outline-none" onChange={(e) => setSearch(e.target.value)} placeholder="Search creators" value={search} /></label><div className="atseen-hide-scrollbar max-h-[52vh] overflow-y-auto pb-3">{peopleQuery.isLoading ? <p className="p-5 text-sm text-atseen-muted">Finding creators…</p> : null}{orderedPeople.map((person) => <button className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-white/[0.04]" key={person.id} onClick={() => openPerson(person)}><Identity compact person={person} presence={presence[person.id]} /></button>)}{!peopleQuery.isLoading && !orderedPeople.length ? <p className="p-8 text-center text-sm text-atseen-muted">No message-enabled creators found.</p> : null}</div></div></div> : null}
    {deleteDialog ? <div className="absolute inset-0 z-[75] flex items-end justify-center bg-black/70 p-3 sm:items-center"><div aria-labelledby="delete-message-title" aria-modal="true" className="w-full max-w-[300px] rounded-2xl border border-atseen-line bg-atseen-bg-2 p-4 shadow-2xl" role="dialog"><div className="flex items-center justify-between"><h2 className="text-base font-bold" id="delete-message-title">{deleteDialog.scope ? "Confirm deletion" : "Delete message"}</h2><button aria-label="Close delete message" className="grid h-7 w-7 place-items-center rounded-full text-sm hover:bg-white/5" disabled={actionBusy} onClick={() => setDeleteDialog(null)} type="button"><FiX /></button></div>{deleteDialog.scope ? <><p className="mt-2 text-xs leading-5 text-atseen-muted">This disappears only from your chat.</p><div className="mt-4 flex gap-2"><button className="flex-1 rounded-full border border-atseen-line py-2 text-xs font-bold" disabled={actionBusy} onClick={() => setDeleteDialog((current) => ({ ...current, scope: null }))} type="button">Back</button><button className="flex-[1.3] rounded-full bg-atseen-danger px-3 py-2 text-xs font-bold text-white disabled:opacity-50" disabled={actionBusy} onClick={deleteSelectedMessage} type="button">{actionBusy ? "Deleting…" : "Delete"}</button></div></> : <><p className="mt-1 text-xs text-atseen-muted">Choose an option.</p><div className="mt-3 grid gap-1"><button className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-white/5" onClick={() => setDeleteDialog((current) => ({ ...current, scope: "me" }))} type="button"><FiTrash2 className="shrink-0 text-sm text-atseen-danger" /><span><b className="block text-xs">Delete for me</b><span className="mt-0.5 block text-[10px] text-atseen-muted">Only removes it from your chat.</span></span></button>{deleteDialog.message.senderId === myId ? <button className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-atseen-danger/5 disabled:opacity-50" disabled={actionBusy} onClick={() => deleteSelectedMessage({ message: deleteDialog.message, scope: "everyone" })} type="button"><FiTrash2 className="shrink-0 text-sm text-atseen-danger" /><span><b className="block text-xs text-atseen-danger">{actionBusy ? "Unsending…" : "Unsend for everyone"}</b><span className="mt-0.5 block text-[10px] text-atseen-muted">Replaces it for both people.</span></span></button> : null}</div></>}</div></div> : null}
    {reportTarget ? <div className="absolute inset-0 z-[70] flex items-end justify-center bg-black/75 p-3 sm:items-center"><form className="w-full max-w-md rounded-3xl border border-atseen-line bg-atseen-bg-2 p-5 shadow-2xl" onSubmit={submitReport}><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Report {reportTarget.type === "message" ? "message" : "conversation"}</h2><p className="mt-1 text-xs text-atseen-muted">Your report is private and will be reviewed.</p></div><button aria-label="Close report" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5" disabled={actionBusy} onClick={() => setReportTarget(null)} type="button"><FiX /></button></div><label className="mt-5 block text-xs font-bold text-atseen-muted">Reason<select className="mt-2 w-full rounded-xl border border-atseen-line bg-atseen-surface-2 px-3 py-3 text-sm text-white [color-scheme:dark] outline-none" onChange={(event) => setReportReason(event.target.value)} value={reportReason}>{REPORT_REASONS.map(([value, label]) => <option className="bg-atseen-bg-2 text-white" key={value} value={value}>{label}</option>)}</select></label><label className="mt-4 block text-xs font-bold text-atseen-muted">Additional details <span className="font-normal">(optional)</span><textarea className="mt-2 min-h-24 w-full resize-y rounded-xl border border-atseen-line bg-atseen-surface-2 p-3 text-sm text-white outline-none" maxLength={1000} onChange={(event) => setReportDetails(event.target.value)} value={reportDetails} /></label><button className="mt-5 w-full rounded-full bg-atseen-danger py-3 text-sm font-bold text-white disabled:opacity-50" disabled={actionBusy} type="submit">{actionBusy ? "Submitting…" : "Submit report"}</button></form></div> : null}
    {storyViewer ? <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-4"><div className="relative flex h-[min(78vh,620px)] w-full max-w-sm items-center justify-center overflow-hidden rounded-3xl border border-atseen-line bg-atseen-bg shadow-2xl"><button aria-label="Close story" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white" onClick={() => setStoryViewer(null)} type="button"><FiX /></button>{storyViewer.loading ? <p className="text-sm text-atseen-muted">Loading story…</p> : storyViewer.expired ? <div className="px-8 text-center"><div className="text-5xl">⌛</div><h2 className="mt-5 text-xl font-bold">Story unavailable</h2><p className="mt-2 text-sm leading-6 text-atseen-muted">This story expired after 24 hours or was deleted by its creator.</p></div> : storyViewer.error ? <div className="px-8 text-center"><h2 className="text-xl font-bold">Unable to open story</h2><p className="mt-2 text-sm text-atseen-muted">Please check your connection and try again.</p></div> : storyViewer.story ? <><img alt={storyViewer.story.caption || "Story"} className="h-full w-full object-cover" src={resolveMediaUrl(storyViewer.story.image)} /><div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/75" /><div className="absolute left-5 right-14 top-5 flex items-center gap-3"><FanAvatar name={storyViewer.story.name} size="h-10 w-10" src={storyViewer.story.avatar} /><div><p className="text-sm font-bold text-white">{storyViewer.story.name}</p><p className="text-[10px] text-white/65">Story</p></div></div>{storyViewer.story.caption ? <p className="absolute bottom-7 left-5 right-5 text-base font-bold leading-7 text-white">{storyViewer.story.caption}</p> : null}</> : null}</div></div> : null}
    {storyViewer?.story && !storyViewer.story.isOwn ? <div className="absolute bottom-6 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-white/15 bg-black/70 p-3 shadow-2xl backdrop-blur"><div className="mb-2 flex items-center justify-center gap-3">{STORY_REACTIONS.map((reaction) => <button aria-label={`React ${reaction}`} className={`grid h-9 w-9 place-items-center rounded-full text-lg transition hover:scale-110 ${storyViewer.reactionSent === reaction ? "bg-atseen-blue/30 ring-1 ring-atseen-blue" : "bg-white/10"}`} disabled={storyActionBusy} key={reaction} onClick={() => reactToOpenStory(reaction)} type="button">{reaction}</button>)}</div><form className="flex gap-2" onSubmit={replyToOpenStory}><input className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/55" maxLength={1000} onChange={(event) => setStoryReplyDraft(event.target.value)} placeholder={`Reply to ${storyViewer.story.name}…`} value={storyReplyDraft} /><button aria-label="Send story reply" className="grid h-10 w-10 place-items-center rounded-full bg-atseen-blue text-atseen-bg disabled:opacity-40" disabled={!storyReplyDraft.trim() || storyActionBusy} type="submit"><FiSend /></button></form>{storyViewer.replySent ? <p className="mt-2 text-center text-[10px] text-atseen-success">Reply sent</p> : null}{storyViewer.actionError ? <p className="mt-2 text-center text-[10px] text-atseen-danger">{storyViewer.actionError}</p> : null}</div> : null}
  </div>;
}
