import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiMessageCircle, FiRefreshCw, FiX } from "react-icons/fi";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import FanCard from "../../components/fanWeb/shared/FanCard";
import EmptyState from "../../components/fanWeb/shared/EmptyState";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import VerifiedBadge from "../../components/fanWeb/shared/VerifiedBadge";
import { useFanToast } from "../../components/fanWeb/shared/FanToastContext";
import {
  atseenCreators,
  atseenDirectAccessRequests,
  atseenMockConversations,
} from "../../data/atseenMockData";
import { fanService } from "../../services/fanService";
import { formatDateTime } from "../../utils/fanDashboardFormatters";

function getCreatorFromConversation(conversation) {
  if (conversation.creator) {
    return {
      avatar: conversation.creator.avatarUrl,
      name: conversation.creator.displayName || conversation.creator.username || "Creator",
      username: conversation.creator.username,
      verified: conversation.creator.isVerified,
    };
  }

  return atseenCreators[conversation.creatorId] || atseenCreators.lina;
}

function DirectAccessCard({ request }) {
  const { showToast } = useFanToast();
  const rawCreator = request.creator || atseenCreators[request.creatorId] || atseenCreators.lina;
  const creator = {
    avatar: rawCreator.avatar || rawCreator.avatarUrl,
    name: rawCreator.name || rawCreator.displayName || rawCreator.username || "Creator",
    verified: Boolean(rawCreator.verified || rawCreator.isVerified),
  };
  const state = request.state || request.status || "pending";
  const sparks = request.sparks || request.sparkAmount || request.coinAmount || 100;
  const labels = {
    pending: ["Pending / held", "Held Stars", "Waiting for reply"],
    answered: ["Answered / captured", "Captured", "Answer delivered"],
    expired: ["Expired / refunded", "Refunded", "No reply in time"],
    refunded: ["Expired / refunded", "Refunded", "Stars returned"],
  };
  const [stateLabel, sparkLabel, detail] = labels[state] || labels.pending;

  return (
    <FanCard className="mb-2.5">
      <div className="flex items-center gap-3">
        <FanAvatar name={creator.name} size="h-10 w-10" src={creator.avatar} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-sm font-bold text-atseen-text">
            {creator.name}
            {creator.verified ? <VerifiedBadge /> : null}
          </p>
          <p className="text-[10.5px] text-atseen-muted">{request.time} · {stateLabel}</p>
        </div>
        <p className="shrink-0 text-xs font-bold text-atseen-blue">✦ {sparks}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-white/85">{request.text}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-atseen-line bg-atseen-surface-2 px-3 py-1.5 text-[11px] font-bold text-atseen-muted">
          {sparkLabel}
        </span>
        <span className="text-[11px] text-atseen-muted">{detail}{request.expiresIn ? ` · ${request.expiresIn}` : ""}</span>
        {state === "pending" ? (
          <button
            className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold text-atseen-danger transition hover:bg-atseen-danger/10"
            onClick={() => showToast("Cancel rules depend on the Direct Access product window.")}
            type="button"
          >
            <FiX aria-hidden="true" /> Cancel
          </button>
        ) : null}
      </div>
    </FanCard>
  );
}

function ConversationRow({ conversation }) {
  const { showToast } = useFanToast();
  const creator = getCreatorFromConversation(conversation);
  const time = conversation.lastMessageAt?.includes?.("T") ? formatDateTime(conversation.lastMessageAt) : conversation.lastMessageAt;

  return (
    <button
      className="flex w-full items-center gap-3 border-b border-white/[0.05] py-3.5 text-left transition hover:bg-atseen-surface"
      onClick={() => showToast("Chats open in the app.")}
      type="button"
    >
      <FanAvatar name={creator.name} size="h-[46px] w-[46px]" src={creator.avatar} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-[13.5px] font-bold text-atseen-text">
          {creator.name}
          {creator.verified ? <VerifiedBadge /> : null}
        </p>
        <p className="truncate text-[11.5px] text-atseen-muted">{conversation.lastMessagePreview || "No message preview available."}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {conversation.unread ? <span aria-label="Unread" className="h-2.5 w-2.5 rounded-full bg-atseen-blue" /> : null}
        <span className="text-[10px] text-atseen-muted">{time || "Now"}</span>
      </div>
    </button>
  );
}

function MessagesPage() {
  const messagesQuery = useQuery({
    queryKey: ["fan", "messages"],
    queryFn: () => fanService.getMessages({ limit: 50 }).then((response) => response.data.data),
    retry: false,
  });

  const directAccess = useMemo(() => {
    const backend = messagesQuery.data?.directAccessRequests || messagesQuery.data?.directAccess || [];
    return backend.length ? backend : atseenDirectAccessRequests;
  }, [messagesQuery.data]);

  const conversations = useMemo(() => {
    const backend = messagesQuery.data?.recentConversations || [];
    return backend.length ? backend : atseenMockConversations;
  }, [messagesQuery.data]);

  const pending = directAccess.filter((request) => (request.state || request.status || "pending") === "pending");
  const earlier = directAccess.filter((request) => (request.state || request.status || "pending") !== "pending");

  return (
    <div>
      <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-atseen-text">Messages</h1>
      {messagesQuery.isLoading ? <div className="mt-5"><LoadingSkeleton count={5} /></div> : null}
      {messagesQuery.isError ? (
        <FanCard className="mt-5 border-atseen-danger/25 bg-atseen-danger/10">
          <p className="font-semibold text-atseen-danger">Unable to load messages.</p>
          <button
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-atseen-line px-4 py-2 text-sm font-semibold text-atseen-text"
            onClick={() => messagesQuery.refetch()}
            type="button"
          >
            <FiRefreshCw aria-hidden="true" /> Retry
          </button>
        </FanCard>
      ) : null}
      {!messagesQuery.isLoading && !messagesQuery.isError ? (
        <>
          <p className="mb-1 mt-[22px] text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">
            Direct Access · {pending.length} Waiting
          </p>
          <p className="mb-3 text-[11px] text-atseen-muted">
            Pending requests hold Stars until the creator answers or the window expires. Reply time is measured by @seen from real replies.
          </p>
          {pending.map((request) => (
            <DirectAccessCard key={request.id} request={request} />
          ))}

          <p className="mb-2 mt-6 text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Earlier Direct Access History</p>
          {earlier.map((request) => (
            <DirectAccessCard key={request.id} request={request} />
          ))}

          <p className="mb-1 mt-6 text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Conversations</p>
          {conversations.length ? (
            <div>
              {conversations.map((conversation) => (
                <ConversationRow conversation={conversation} key={conversation.id} />
              ))}
            </div>
          ) : (
            <EmptyState icon={FiMessageCircle} message="Creator conversations will appear here when they exist." title="No conversations yet" />
          )}
        </>
      ) : null}
    </div>
  );
}

export default MessagesPage;
