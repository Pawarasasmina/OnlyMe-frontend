import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiCornerUpLeft, FiEdit, FiMessageCircle, FiSearch, FiSend, FiSmile, FiX } from "react-icons/fi";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import VerifiedBadge from "../../components/fanWeb/shared/VerifiedBadge";
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

const MESSAGE_EMOJIS = ["😀", "😂", "🥰", "😍", "😊", "😉", "😎", "🥳", "😭", "😮", "😅", "🤔", "🙌", "👏", "🙏", "👍", "👎", "💪", "❤️", "🔥", "✨", "🎉", "💯", "👀", "🌍", "🪐", "⭐", "💙"];
const MESSAGE_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

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
    return userId ? { id: userId } : null;
  });
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [reactionFor, setReactionFor] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [newChat, setNewChat] = useState(false);
  const [inboxTab, setInboxTab] = useState("all");
  const [requestBusy, setRequestBusy] = useState(false);
  const [storyViewer, setStoryViewer] = useState(null);
  const [expiredStoryIds, setExpiredStoryIds] = useState(() => new Set());
  const [search, setSearch] = useState("");
  const [presence, setPresence] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const bottomRef = useRef(null);
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
    queryFn: () => messageService.getMessages(selected.id).then((r) => r.data.data),
    enabled: Boolean(selected?.id),
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: "always",
    staleTime: 0,
  });
  const peopleQuery = useQuery({ queryKey: ["messages", "people", search], queryFn: () => messageService.searchPeople(search).then((r) => r.data.data.people), enabled: newChat && user?.role === "fan" });
  const conversations = useMemo(() => conversationsQuery.data || [], [conversationsQuery.data]);
  const participant = messagesQuery.data?.participant || selected?.participant || selected;
  const messages = useMemo(() => messagesQuery.data?.messages || [], [messagesQuery.data?.messages]);
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
      queryClient.setQueryData(["messages", "conversations"], (current = []) => {
        const existing = current.find((item) => item.id === otherId);
        const next = existing
          ? { ...existing, lastMessage: message, status: conversationStatus, unreadCount: selected?.id === otherId ? 0 : (existing.unreadCount || 0) + 1 }
          : { id: otherId, participant: sender, lastMessage: message, status: conversationStatus, unreadCount: selected?.id === otherId ? 0 : 1 };
        return [next, ...current.filter((item) => item.id !== otherId)];
      });
      if (selected?.id === otherId) {
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
    socket.on("messages:read", markMessagesRead);
    socket.on("message:reaction", updateReaction);
    socket.on("presence:update", updatePresence);
    socket.on("conversation:status", updateConversationStatus);
    return () => { socket.off("connect", onConnected); socket.off("disconnect", disconnected); socket.off("connect_error", disconnected); socket.off("message:new", receiveMessage); socket.off("messages:read", markMessagesRead); socket.off("message:reaction", updateReaction); socket.off("presence:update", updatePresence); socket.off("conversation:status", updateConversationStatus); };
  }, [myId, queryClient, selected?.id]);

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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

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
    setSelected(conversation);
    setSearchParams({ with: conversation.id }, { replace: true });
  };
  const closeConversation = () => { setSelected(null); setSearchParams({}, { replace: true }); };
  const openPerson = (person) => { chooseConversation({ id: person.id, participant: person }); setNewChat(false); setSearch(""); };
  const send = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selected?.id || sending) return;
    setSending(true); setError("");
    try {
      const response = await messageService.send(selected.id, body, replyTo?.id || null);
      const { message: sentMessage, conversationStatus = "ACTIVE" } = response.data.data;
      queryClient.setQueryData(["messages", selected.id], (current) => {
        if (!current || current.messages.some((item) => item.id === sentMessage.id)) return current;
        return { ...current, messages: [...current.messages, sentMessage], conversationStatus, requestRequired: false };
      });
      queryClient.setQueryData(["messages", "conversations"], (current = []) => {
        const existing = current.find((item) => item.id === selected.id);
        const next = existing
          ? { ...existing, lastMessage: sentMessage, status: conversationStatus }
          : { id: selected.id, participant, lastMessage: sentMessage, status: conversationStatus, unreadCount: 0 };
        return [next, ...current.filter((item) => item.id !== selected.id)];
      });
      setDraft("");
      setReplyTo(null);
      setEmojiOpen(false);
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
    } catch (requestError) {
      setError(requestError.response?.status === 429
        ? requestError.response?.data?.message || "You are sending messages too quickly. Please wait a moment."
        : requestError.response?.data?.message || "Could not send this message.");
    }
    finally { setSending(false); }
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
            const count = tab.id === "requests" ? conversations.filter((item) => item.status === "REQUEST").length : 0;
            return <button className={`border-b-2 px-2 py-3 text-xs font-bold transition ${inboxTab === tab.id ? "border-atseen-blue text-atseen-blue" : "border-transparent text-atseen-muted hover:text-white"}`} key={tab.id} onClick={() => setInboxTab(tab.id)} type="button">{tab.label}{count ? <span className="ml-1">{count}</span> : null}</button>;
          })}
        </nav>
        <div className="atseen-hide-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {conversationsQuery.isLoading ? <p className="p-6 text-sm text-atseen-muted">Loading conversations…</p> : null}
          {conversationsQuery.isError ? <p className="p-6 text-sm text-atseen-danger">Conversations are unavailable. Please retry.</p> : null}
          {!conversationsQuery.isLoading && !shownConversations.length ? <div className="grid place-items-center px-8 py-20 text-center"><FiMessageCircle className="text-4xl text-atseen-blue" /><h2 className="mt-4 font-bold">{inboxTab === "requests" ? "No message requests" : inboxTab === "direct" ? user?.role === "fan" ? "No Priority messages" : "No Direct Access messages" : "No conversations yet"}</h2><p className="mt-2 text-sm text-atseen-muted">{inboxTab === "direct" ? user?.role === "fan" ? "Priority messaging will be available later." : "Direct Access will be available later." : inboxTab === "requests" ? "Messages from non-following fans appear here." : user?.role === "fan" ? "Start a private chat with a creator." : "Accepted fan conversations appear here."}</p></div> : null}
          {shownConversations.map((conversation) => <button className={`flex w-full items-center gap-3 border-b border-white/[0.05] px-4 py-4 text-left transition hover:bg-white/[0.03] ${selected?.id === conversation.id ? "bg-atseen-blue/10" : ""}`} key={conversation.id} onClick={() => chooseConversation(conversation)}>
            <Identity compact person={conversation.participant} presence={presence[conversation.id]} subtitle={`${conversation.lastMessage.senderId === myId ? "You: " : ""}${conversation.lastMessage.body}`} />
            <span className="ml-auto flex max-w-[95px] flex-col items-end gap-1"><span className="text-[10px] text-atseen-muted">{new Date(conversation.lastMessage.createdAt).toLocaleDateString()}</span>{conversation.unreadCount ? <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-atseen-blue px-1 text-[10px] font-black text-atseen-bg">{conversation.unreadCount}</span> : null}</span>
          </button>)}
        </div>
      </aside>

      <main className={`${selected ? "flex" : "hidden"} h-full min-h-0 min-w-0 flex-1 flex-col`}>
        {selected ? <>
          <header className="flex shrink-0 items-center gap-3 border-b border-atseen-line bg-atseen-bg-2/95 px-4 py-3 backdrop-blur">
            <button aria-label="Back to conversations" className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-white/5" onClick={closeConversation}><FiArrowLeft /></button>
            {participant ? <button className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atseen-blue" onClick={() => participant.username && navigate(`/profile/${encodeURIComponent(participant.username)}`)} type="button"><Identity person={participant} presence={presence[selected.id]} /></button> : null}
            {!socketConnected ? <span className="ml-auto hidden text-[10px] font-semibold text-atseen-warning sm:block">Reconnecting…</span> : null}
          </header>
          <section className="atseen-hide-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top,rgba(94,155,255,0.07),transparent_36%)] px-4 py-6 sm:px-8">
            <p className="mx-auto mb-7 max-w-sm text-center text-[11px] leading-5 text-atseen-dim">Text messages are private between you and this {participant?.role === "creator" ? "creator" : "fan"}.</p>
            {messagesQuery.isLoading ? <p className="text-center text-sm text-atseen-muted">Loading messages…</p> : null}
            {messages.map((message) => {
              const mine = message.senderId === myId;
              const showReadAvatar = mine && message.id === lastReadOutgoingMessageId;
              const reactions = message.reactions || [];
              const groupedReactions = Object.entries(reactions.reduce((groups, reaction) => ({ ...groups, [reaction.emoji]: (groups[reaction.emoji] || 0) + 1 }), {}));
              return <div className={`group mb-2 flex ${mine ? "justify-end" : "justify-start"}`} key={message.id}>
                <div className={`flex max-w-[82%] flex-col ${mine ? "items-end" : "items-start"}`}>
                  <div className={`rounded-[19px] px-4 py-2.5 text-sm leading-6 ${mine ? "rounded-br-md bg-atseen-blue font-medium text-atseen-bg" : "rounded-bl-md border border-atseen-line bg-atseen-surface-2 text-atseen-text"}`}>
                    {message.replyTo ? <button className={`mb-2 block w-full rounded-xl border-l-2 px-3 py-1.5 text-left ${mine ? "border-atseen-bg/40 bg-atseen-bg/10 text-atseen-bg/70" : "border-atseen-blue bg-black/20 text-atseen-muted"}`} onClick={() => document.querySelector(`[data-message-id="${message.replyTo.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })} type="button"><span className="block text-[10px] font-bold">{message.replyTo.senderId === myId ? "You" : participant?.displayName}</span><span className="block max-w-[230px] truncate text-xs">{message.replyTo.body}</span></button> : null}
                    {message.storyReply ? <StoryReplyPreview forceExpired={expiredStoryIds.has(message.storyReply.storyId)} mine={mine} onOpen={openStoryReply} reply={message.storyReply} /> : null}
                    <p className="whitespace-pre-wrap break-words" data-message-id={message.id}>{message.body}</p>
                    <p className={`mt-0.5 text-right text-[9px] ${mine ? "text-atseen-bg/60" : "text-atseen-muted"}`}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{mine && !message.readAt ? " · Sent" : ""}</p>
                  </div>
                  {groupedReactions.length ? <div className={`-mt-1 flex flex-wrap gap-1 ${mine ? "mr-2 justify-end" : "ml-2"}`}>{groupedReactions.map(([emoji, count]) => <button aria-label={`${emoji} reaction, ${count}`} className={`rounded-full border px-1.5 py-0.5 text-xs shadow ${reactions.some((reaction) => reaction.userId === myId && reaction.emoji === emoji) ? "border-atseen-blue bg-atseen-blue/20" : "border-atseen-line bg-atseen-bg-2"}`} key={emoji} onClick={() => reactToMessage(message, emoji)} type="button">{emoji}{count > 1 ? <span className="ml-1 text-[9px]">{count}</span> : null}</button>)}</div> : null}
                  <div className={`relative mt-0.5 flex items-center gap-1 text-atseen-muted opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 ${mine ? "flex-row-reverse" : ""}`}>
                    <button aria-label="Reply to message" className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/5 hover:text-white" onClick={() => { setReplyTo(message); setReactionFor(null); }} title="Reply" type="button"><FiCornerUpLeft /></button>
                    <button aria-label="React to message" className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/5 hover:text-white" onClick={() => setReactionFor((current) => current === message.id ? null : message.id)} title="React" type="button"><FiSmile /></button>
                    {reactionFor === message.id ? <div className={`absolute bottom-8 z-20 flex gap-1 rounded-full border border-atseen-line bg-atseen-bg-2 p-1.5 shadow-2xl ${mine ? "right-0" : "left-0"}`}>{MESSAGE_REACTIONS.map((emoji) => <button className="grid h-8 w-8 place-items-center rounded-full text-lg transition hover:bg-white/10 hover:scale-110" key={emoji} onClick={() => reactToMessage(message, emoji)} type="button">{emoji}</button>)}</div> : null}
                  </div>
                  {showReadAvatar && participant ? <span aria-label={`Seen by ${participant.displayName}`} className="mt-1 block" title={`Seen by ${participant.displayName}`}><FanAvatar name={participant.displayName} size="h-4 w-4" src={participant.avatarUrl} /></span> : null}
                </div>
              </div>;
            })}
            <div ref={bottomRef} />
          </section>
          {messagesQuery.data?.conversationStatus === "REQUEST" && user?.role === "creator" ? <div className="shrink-0 border-t border-atseen-line bg-atseen-bg-2 p-3 sm:p-4">
            <p className="mb-3 text-center text-xs text-atseen-muted">Accept this request before replying.</p>
            {error ? <p className="mb-2 text-xs text-atseen-danger">{error}</p> : null}
            <div className="flex gap-2"><button className="flex-1 rounded-full border border-atseen-line py-3 text-sm font-bold" disabled={requestBusy} onClick={() => handleRequest(false)} type="button">Delete</button><button className="flex-[1.4] rounded-full bg-atseen-blue py-3 text-sm font-bold text-atseen-bg" disabled={requestBusy} onClick={() => handleRequest(true)} type="button">Accept</button></div>
          </div> : messagesQuery.data?.conversationStatus === "REQUEST" && user?.role === "fan" ? <div className="shrink-0 border-t border-atseen-line bg-atseen-bg-2 p-4 text-center text-xs text-atseen-muted">Message request sent. You can continue after the creator accepts it.</div> : <form className="relative shrink-0 border-t border-atseen-line bg-atseen-bg-2 p-3 sm:p-4" onSubmit={send}>
            {error ? <p className="mb-2 text-xs text-atseen-danger">{error}</p> : null}
            {replyTo ? <div className="mb-2 flex items-center gap-3 rounded-xl border-l-2 border-atseen-blue bg-atseen-surface-2 px-3 py-2"><FiCornerUpLeft className="shrink-0 text-atseen-blue" /><div className="min-w-0 flex-1"><p className="text-[10px] font-bold text-atseen-blue">Replying to {replyTo.senderId === myId ? "yourself" : participant?.displayName}</p><p className="truncate text-xs text-atseen-muted">{replyTo.body}</p></div><button aria-label="Cancel reply" className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/5" onClick={() => setReplyTo(null)} type="button"><FiX /></button></div> : null}
            {emojiOpen ? <div className="absolute bottom-[4.5rem] left-3 z-20 w-[min(19rem,calc(100%-1.5rem))] rounded-2xl border border-atseen-line bg-atseen-bg-2 p-3 shadow-2xl"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold text-atseen-muted">Emojis</p><button aria-label="Close emoji picker" className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/5" onClick={() => setEmojiOpen(false)} type="button"><FiX /></button></div><div className="grid grid-cols-7 gap-1">{MESSAGE_EMOJIS.map((emoji) => <button className="grid h-9 w-9 place-items-center rounded-lg text-xl transition hover:bg-white/10" key={emoji} onClick={() => setDraft((current) => `${current}${emoji}`)} type="button">{emoji}</button>)}</div></div> : null}
            <div className="flex items-end gap-2"><button aria-expanded={emojiOpen} aria-label="Open emoji picker" className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition ${emojiOpen ? "border-atseen-blue bg-atseen-blue/10 text-atseen-blue" : "border-atseen-line text-atseen-muted hover:text-white"}`} onClick={() => setEmojiOpen((current) => !current)} type="button"><FiSmile /></button><textarea aria-label="Message" className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl border border-atseen-line bg-atseen-surface-2 px-4 py-2.5 text-sm outline-none placeholder:text-atseen-dim focus:border-atseen-blue/60" maxLength={2000} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }} placeholder="Message…" rows={1} value={draft} /><button aria-label="Send message" className="grid h-11 w-11 place-items-center rounded-full bg-atseen-blue text-atseen-bg disabled:opacity-40" disabled={!draft.trim() || sending}><FiSend /></button></div>
          </form>}
        </> : null}
      </main>
    </div>

    {newChat ? <div className="absolute inset-0 z-40 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center"><div className="max-h-[75vh] w-full max-w-md overflow-hidden rounded-3xl border border-atseen-line bg-atseen-bg-2 shadow-2xl"><header className="flex items-center justify-between p-5"><h2 className="text-lg font-bold">New message</h2><button className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5" onClick={() => setNewChat(false)}><FiX /></button></header><label className="mx-4 mb-3 flex items-center gap-2 rounded-2xl border border-atseen-line bg-atseen-surface-2 px-4"><FiSearch className="text-atseen-muted" /><input autoFocus className="w-full bg-transparent py-3 text-sm outline-none" onChange={(e) => setSearch(e.target.value)} placeholder="Search creators" value={search} /></label><div className="atseen-hide-scrollbar max-h-[52vh] overflow-y-auto pb-3">{peopleQuery.isLoading ? <p className="p-5 text-sm text-atseen-muted">Finding creators…</p> : null}{orderedPeople.map((person) => <button className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-white/[0.04]" key={person.id} onClick={() => openPerson(person)}><Identity compact person={person} presence={presence[person.id]} /></button>)}{!peopleQuery.isLoading && !orderedPeople.length ? <p className="p-8 text-center text-sm text-atseen-muted">No message-enabled creators found.</p> : null}</div></div></div> : null}
    {storyViewer ? <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-4"><div className="relative flex h-[min(78vh,620px)] w-full max-w-sm items-center justify-center overflow-hidden rounded-3xl border border-atseen-line bg-atseen-bg shadow-2xl"><button aria-label="Close story" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white" onClick={() => setStoryViewer(null)} type="button"><FiX /></button>{storyViewer.loading ? <p className="text-sm text-atseen-muted">Loading story…</p> : storyViewer.expired ? <div className="px-8 text-center"><div className="text-5xl">⌛</div><h2 className="mt-5 text-xl font-bold">Story unavailable</h2><p className="mt-2 text-sm leading-6 text-atseen-muted">This story expired after 24 hours or was deleted by its creator.</p></div> : storyViewer.error ? <div className="px-8 text-center"><h2 className="text-xl font-bold">Unable to open story</h2><p className="mt-2 text-sm text-atseen-muted">Please check your connection and try again.</p></div> : storyViewer.story ? <><img alt={storyViewer.story.caption || "Story"} className="h-full w-full object-cover" src={resolveMediaUrl(storyViewer.story.image)} /><div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/75" /><div className="absolute left-5 right-14 top-5 flex items-center gap-3"><FanAvatar name={storyViewer.story.name} size="h-10 w-10" src={storyViewer.story.avatar} /><div><p className="text-sm font-bold text-white">{storyViewer.story.name}</p><p className="text-[10px] text-white/65">Story</p></div></div>{storyViewer.story.caption ? <p className="absolute bottom-7 left-5 right-5 text-base font-bold leading-7 text-white">{storyViewer.story.caption}</p> : null}</> : null}</div></div> : null}
  </div>;
}
