import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiEdit, FiMessageCircle, FiSearch, FiSend, FiX } from "react-icons/fi";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import VerifiedBadge from "../../components/fanWeb/shared/VerifiedBadge";
import { useAuth } from "../../hooks/useAuth";
import { messageService } from "../../services/messageService";
import { getMessageSocket } from "../../services/messageSocket";

const relative = (value) => {
  if (!value) return "Offline";
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Last seen just now";
  if (seconds < 3600) return `Last seen ${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `Last seen ${Math.floor(seconds / 3600)}h ago`;
  return `Last seen ${new Date(value).toLocaleDateString()}`;
};

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

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const myId = String(user?.id || user?._id || "");
  const [selected, setSelected] = useState(() => {
    const userId = searchParams.get("with");
    return userId ? { id: userId } : null;
  });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [newChat, setNewChat] = useState(false);
  const [search, setSearch] = useState("");
  const [presence, setPresence] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const bottomRef = useRef(null);
  const conversationsQuery = useQuery({ queryKey: ["messages", "conversations"], queryFn: () => messageService.getConversations().then((r) => r.data.data.conversations), staleTime: 30000 });
  const messagesQuery = useQuery({ queryKey: ["messages", selected?.id], queryFn: () => messageService.getMessages(selected.id).then((r) => r.data.data), enabled: Boolean(selected?.id), staleTime: 30000 });
  const peopleQuery = useQuery({ queryKey: ["messages", "people", search], queryFn: () => messageService.searchPeople(search).then((r) => r.data.data.people), enabled: newChat && user?.role === "fan" });
  const conversations = useMemo(() => conversationsQuery.data || [], [conversationsQuery.data]);
  const participant = messagesQuery.data?.participant || selected?.participant || selected;
  const messages = messagesQuery.data?.messages || [];

  useEffect(() => {
    const socket = getMessageSocket();
    if (!socket) return undefined;
    const connected = () => setSocketConnected(true);
    const disconnected = () => setSocketConnected(false);
    const receiveMessage = ({ message, participant: sender }) => {
      const otherId = message.senderId === myId ? message.recipientId : message.senderId;
      queryClient.setQueryData(["messages", "conversations"], (current = []) => {
        const existing = current.find((item) => item.id === otherId);
        const next = existing
          ? { ...existing, lastMessage: message, unreadCount: selected?.id === otherId ? 0 : (existing.unreadCount || 0) + 1 }
          : { id: otherId, participant: sender, lastMessage: message, unreadCount: selected?.id === otherId ? 0 : 1 };
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
    setSocketConnected(socket.connected);
    socket.on("connect", connected);
    socket.on("disconnect", disconnected);
    socket.on("connect_error", disconnected);
    socket.on("message:new", receiveMessage);
    socket.on("messages:read", () => selected?.id && queryClient.invalidateQueries({ queryKey: ["messages", selected.id] }));
    socket.on("presence:update", updatePresence);
    return () => { socket.off("connect", connected); socket.off("disconnect", disconnected); socket.off("connect_error", disconnected); socket.off("message:new", receiveMessage); socket.off("messages:read"); socket.off("presence:update", updatePresence); };
  }, [myId, queryClient, selected?.id]);

  useEffect(() => {
    const ids = conversations.map((item) => item.participant.id);
    if (selected?.id && !ids.includes(selected.id)) ids.push(selected.id);
    const socket = getMessageSocket();
    if (socket && ids.length) socket.emit("presence:query", ids, (rows) => setPresence((current) => ({ ...current, ...Object.fromEntries(rows.map((row) => [row.userId, { ...current[row.userId], ...row }])) })));
  }, [conversations, selected?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const orderedPeople = useMemo(() => peopleQuery.data || [], [peopleQuery.data]);
  const chooseConversation = (conversation) => { setSelected(conversation); setSearchParams({ with: conversation.id }, { replace: true }); };
  const closeConversation = () => { setSelected(null); setSearchParams({}, { replace: true }); };
  const openPerson = (person) => { chooseConversation({ id: person.id, participant: person }); setNewChat(false); setSearch(""); };
  const send = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selected?.id || sending) return;
    setSending(true); setError("");
    try {
      const response = await messageService.send(selected.id, body);
      const sentMessage = response.data.data.message;
      queryClient.setQueryData(["messages", selected.id], (current) => {
        if (!current || current.messages.some((item) => item.id === sentMessage.id)) return current;
        return { ...current, messages: [...current.messages, sentMessage] };
      });
      queryClient.setQueryData(["messages", "conversations"], (current = []) => {
        const existing = current.find((item) => item.id === selected.id);
        const next = existing
          ? { ...existing, lastMessage: sentMessage }
          : { id: selected.id, participant, lastMessage: sentMessage, unreadCount: 0 };
        return [next, ...current.filter((item) => item.id !== selected.id)];
      });
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
    } catch (requestError) {
      setError(requestError.response?.status === 429
        ? requestError.response?.data?.message || "You are sending messages too quickly. Please wait a moment."
        : requestError.response?.data?.message || "Could not send this message.");
    }
    finally { setSending(false); }
  };

  return <div className="relative h-full min-h-0 overflow-hidden rounded-2xl border border-atseen-line bg-atseen-bg-2">
    <div className="flex h-full min-h-0">
      <aside className={`${selected ? "hidden" : "flex"} h-full min-h-0 w-full flex-col`}>
        <header className="flex items-center justify-between border-b border-atseen-line px-5 py-5">
          <div><h1 className="text-2xl font-extrabold">Messages</h1><p className="mt-1 text-xs text-atseen-muted">Private fan–creator conversations</p></div>
          {user?.role === "fan" ? <button aria-label="New message" className="grid h-10 w-10 place-items-center rounded-full bg-atseen-blue text-atseen-bg transition hover:bg-white" onClick={() => setNewChat(true)}><FiEdit /></button> : null}
        </header>
        <div className="atseen-hide-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {conversationsQuery.isLoading ? <p className="p-6 text-sm text-atseen-muted">Loading conversations…</p> : null}
          {conversationsQuery.isError ? <p className="p-6 text-sm text-atseen-danger">Conversations are unavailable. Please retry.</p> : null}
          {!conversationsQuery.isLoading && !conversations.length ? <div className="grid place-items-center px-8 py-20 text-center"><FiMessageCircle className="text-4xl text-atseen-blue" /><h2 className="mt-4 font-bold">No conversations yet</h2><p className="mt-2 text-sm text-atseen-muted">{user?.role === "fan" ? "Start a private chat with a creator." : "Fan messages will appear here."}</p></div> : null}
          {conversations.map((conversation) => <button className={`flex w-full items-center gap-3 border-b border-white/[0.05] px-4 py-4 text-left transition hover:bg-white/[0.03] ${selected?.id === conversation.id ? "bg-atseen-blue/10" : ""}`} key={conversation.id} onClick={() => chooseConversation(conversation)}>
            <Identity compact person={conversation.participant} presence={presence[conversation.id]} subtitle={`${conversation.lastMessage.senderId === myId ? "You: " : ""}${conversation.lastMessage.body}`} />
            <span className="ml-auto flex max-w-[95px] flex-col items-end gap-1"><span className="text-[10px] text-atseen-muted">{new Date(conversation.lastMessage.createdAt).toLocaleDateString()}</span>{conversation.unreadCount ? <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-atseen-blue px-1 text-[10px] font-black text-atseen-bg">{conversation.unreadCount}</span> : null}</span>
          </button>)}
        </div>
      </aside>

      <main className={`${selected ? "flex" : "hidden"} h-full min-h-0 min-w-0 flex-1 flex-col`}>
        {selected ? <>
          <header className="flex shrink-0 items-center gap-3 border-b border-atseen-line bg-atseen-bg-2/95 px-4 py-3 backdrop-blur">
            <button aria-label="Back to conversations" className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-white/5" onClick={closeConversation}><FiArrowLeft /></button>
            {participant ? <Identity person={participant} presence={presence[selected.id]} /> : null}
            <span className={`ml-auto hidden text-[10px] font-semibold sm:block ${socketConnected ? "text-atseen-success" : "text-atseen-warning"}`}>{socketConnected ? "Live" : "Reconnecting…"}</span>
          </header>
          <section className="atseen-hide-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top,rgba(94,155,255,0.07),transparent_36%)] px-4 py-6 sm:px-8">
            <p className="mx-auto mb-7 max-w-sm text-center text-[11px] leading-5 text-atseen-dim">Text messages are private between you and this {participant?.role === "creator" ? "creator" : "fan"}.</p>
            {messagesQuery.isLoading ? <p className="text-center text-sm text-atseen-muted">Loading messages…</p> : null}
            {messages.map((message) => {
              const mine = message.senderId === myId;
              return <div className={`mb-2 flex ${mine ? "justify-end" : "justify-start"}`} key={message.id}><div className={`max-w-[78%] rounded-[19px] px-4 py-2.5 text-sm leading-6 ${mine ? "rounded-br-md bg-atseen-blue font-medium text-atseen-bg" : "rounded-bl-md border border-atseen-line bg-atseen-surface-2 text-atseen-text"}`}><p className="whitespace-pre-wrap break-words">{message.body}</p><p className={`mt-0.5 text-right text-[9px] ${mine ? "text-atseen-bg/60" : "text-atseen-muted"}`}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{mine ? ` · ${message.readAt ? "Seen" : "Sent"}` : ""}</p></div></div>;
            })}
            <div ref={bottomRef} />
          </section>
          <form className="shrink-0 border-t border-atseen-line bg-atseen-bg-2 p-3 sm:p-4" onSubmit={send}>
            {error ? <p className="mb-2 text-xs text-atseen-danger">{error}</p> : null}
            <div className="flex items-end gap-2"><textarea aria-label="Message" className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl border border-atseen-line bg-atseen-surface-2 px-4 py-2.5 text-sm outline-none placeholder:text-atseen-dim focus:border-atseen-blue/60" maxLength={2000} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }} placeholder="Message…" rows={1} value={draft} /><button aria-label="Send message" className="grid h-11 w-11 place-items-center rounded-full bg-atseen-blue text-atseen-bg disabled:opacity-40" disabled={!draft.trim() || sending}><FiSend /></button></div>
          </form>
        </> : null}
      </main>
    </div>

    {newChat ? <div className="absolute inset-0 z-40 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center"><div className="max-h-[75vh] w-full max-w-md overflow-hidden rounded-3xl border border-atseen-line bg-atseen-bg-2 shadow-2xl"><header className="flex items-center justify-between p-5"><h2 className="text-lg font-bold">New message</h2><button className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5" onClick={() => setNewChat(false)}><FiX /></button></header><label className="mx-4 mb-3 flex items-center gap-2 rounded-2xl border border-atseen-line bg-atseen-surface-2 px-4"><FiSearch className="text-atseen-muted" /><input autoFocus className="w-full bg-transparent py-3 text-sm outline-none" onChange={(e) => setSearch(e.target.value)} placeholder="Search creators" value={search} /></label><div className="max-h-[52vh] overflow-y-auto pb-3">{peopleQuery.isLoading ? <p className="p-5 text-sm text-atseen-muted">Finding creators…</p> : null}{orderedPeople.map((person) => <button className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-white/[0.04]" key={person.id} onClick={() => openPerson(person)}><Identity compact person={person} presence={presence[person.id]} /></button>)}{!peopleQuery.isLoading && !orderedPeople.length ? <p className="p-8 text-center text-sm text-atseen-muted">No message-enabled creators found.</p> : null}</div></div></div> : null}
  </div>;
}
