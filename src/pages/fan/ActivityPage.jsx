import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiBookmark,
  FiCheck,
  FiChevronRight,
  FiClock,
  FiEye,
  FiGift,
  FiMessageCircle,
  FiRefreshCw,
  FiUserPlus,
  FiZap,
} from "react-icons/fi";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import { fanService } from "../../services/fanService";
import { walletService } from "../../services/walletService";
import { getMessageSocket } from "../../services/messageSocket";
import { relativeTime } from "../../utils/relativeTime";

const RECEIVED_FILTERS = [
  ["All", "all"],
  ["Seen", "seen"],
  ["Support", "support"],
  ["Saves", "saves"],
  ["Comments", "comments"],
  ["Follows", "follows"],
  ["Earnings", "earnings"],
];

const SENT_FILTERS = [
  ["All", "all"],
  ["Seen", "seen"],
  ["Support", "support"],
  ["Saves", "saves"],
  ["Comments", "comments"],
  ["Follows", "follows"],
  ["Purchases", "purchases"],
];

const FILTER_VALUES = ["seen", "support", "saves", "comments", "follows", "earnings", "purchases"];
const ACK_KEY = "atseen_activity_acknowledged";
const PAGE_SIZE = 30;

const LEGACY_ROUTES = {
  "/fan/activity": "/activity",
  "/fan/messages": "/messages",
  "/fan/profile": "/profile",
  "/fan/subscriptions": "/memberships",
  "/fan/wallet": "/wallet",
  "/fan/worlds": "/memberships",
};

const LEDGER_COPY = {
  OPENING_BALANCE: "Opening balance",
  CREDIT_ADMIN: "Wallet credit",
  CREDIT_TEST: "Test wallet credit",
  WORLD_PURCHASE_DEBIT: "You unlocked a World",
  WORLD_CREATOR_EARNING: "World earning",
  PREMIUM_JOIN_DEBIT: "You unlocked a Premium World",
  PREMIUM_CREATOR_EARNING: "Premium World earning",
  PREMIUM_RENEWAL_DEBIT: "Premium World renewal",
  VERIFIED_CREATOR_DEBIT: "Verified Creator activation",
  DREAM_GIFT_DEBIT: "Dream support sent",
  DREAM_CREATOR_EARNING: "Dream support received",
  CHAT_GIFT_DEBIT: "Gift sent",
  CHAT_GIFT_EARNING: "Gift received",
  DA_HOLD_DEBIT: "You opened Direct Access",
  DA_CREATOR_EARNING: "Direct Access earning",
  DA_REFUND_CREDIT: "Direct Access refund",
  CALL_HOLD_DEBIT: "You requested a paid call",
  CALL_CREATOR_EARNING: "Call earning",
  CALL_REFUND_CREDIT: "Call refund",
  REFUND_CREDIT: "Refund received",
  CREATOR_EARNING_REVERSAL: "Creator earning reversal",
  MANUAL_ADJUSTMENT: "Wallet adjustment",
};

const EMPTY_COPY = {
  seen: ["Your Orbit is tuning to you", "The moment someone sees you, it lands here."],
  support: ["No support activity yet.", "Support, gifts and Dream moments will land here."],
  saves: ["No saves here yet.", "When people save your work, it appears here."],
  comments: ["No comment activity yet.", "Replies and comments will appear in this filter."],
  follows: ["No new follows yet.", "New people entering your world will appear here."],
  earnings: ["No earnings activity yet.", "Creator earnings will appear once they settle."],
  purchases: ["You have not sent anything in this category yet.", "Purchases and paid access will appear here."],
  all: ["Nothing here yet", "Your world is just waking up."],
};

function readAcknowledged() {
  try {
    return new Set(JSON.parse(localStorage.getItem(ACK_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveAcknowledged(values) {
  try {
    localStorage.setItem(ACK_KEY, JSON.stringify([...values].slice(-250)));
  } catch {
    // Local acknowledgement is best-effort when a row has no backend read endpoint.
  }
}

function titleCase(value = "") {
  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cleanText(value = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text === "DA CREATOR EARNING") return "Direct Access earning";
  if (text === "DA HOLD DEBIT") return "Direct Access purchase";
  if (text === "CALL CREATOR EARNING") return "Call earning";
  if (text === "CALL HOLD DEBIT") return "Paid call request";
  if (/^[A-Z0-9_ -]+$/.test(text) && /[A-Z]/.test(text)) return titleCase(text);
  return text;
}

function creatorName(creator, fallback = "Someone") {
  return creator?.displayName || creator?.name || creator?.username || fallback;
}

function creatorForCounterparty(counterparty) {
  if (!counterparty) return null;
  return {
    displayName: counterparty.name || counterparty.displayName || counterparty.username,
    username: counterparty.username,
    avatarUrl: counterparty.avatar || counterparty.avatarUrl,
  };
}

function publicationRoute(publication) {
  if (!publication?.id) return null;
  return publication.kind?.includes("WORLD") ? `/world/${publication.id}` : `/seen/${publication.id}`;
}

function previewForLedger(entry) {
  return entry.publication?.title || entry.publication?.planet?.name || entry.metadata?.targetTitle || "";
}

function ledgerTitle(entry) {
  const event = entry.event || "";
  const counterparty = creatorName(entry.counterparty, Number(entry.starsChange) < 0 ? "a creator" : "Someone");
  const publicationTitle = previewForLedger(entry);
  const giftName = entry.metadata?.giftName || "a gift";

  switch (event) {
    case "WORLD_PURCHASE_DEBIT":
      return publicationTitle ? `You unlocked ${counterparty}'s World` : "You unlocked a World";
    case "WORLD_CREATOR_EARNING":
      return entry.counterparty ? `${counterparty} unlocked your World` : "World earning";
    case "PREMIUM_JOIN_DEBIT":
      return `You unlocked ${counterparty}'s Premium World`;
    case "PREMIUM_RENEWAL_DEBIT":
      return `You renewed ${counterparty}'s Premium World`;
    case "PREMIUM_CREATOR_EARNING":
      return entry.counterparty ? `${counterparty} unlocked your Premium World` : "Premium World earning";
    case "DREAM_GIFT_DEBIT":
      return `You sent ${giftName} toward ${counterparty}'s Dream`;
    case "DREAM_CREATOR_EARNING":
      return `${counterparty} sent ${giftName} toward your Dream`;
    case "CHAT_GIFT_DEBIT":
      return `You sent a gift to ${counterparty}`;
    case "CHAT_GIFT_EARNING":
      return `${counterparty} sent you a gift`;
    case "DA_HOLD_DEBIT":
      return `You opened Direct Access with ${counterparty}`;
    case "DA_CREATOR_EARNING":
      return entry.counterparty ? `${counterparty} booked Direct Access` : "Direct Access earning";
    case "DA_REFUND_CREDIT":
      return "Direct Access refund";
    case "CALL_HOLD_DEBIT":
      return `You requested a paid call with ${counterparty}`;
    case "CALL_CREATOR_EARNING":
      return entry.counterparty ? `${counterparty} completed a paid call` : "Call earning";
    case "CALL_REFUND_CREDIT":
      return "Call refund";
    case "VERIFIED_CREATOR_DEBIT":
      return "Verified Creator activation";
    default:
      return LEDGER_COPY[event] || titleCase(event || "Stars activity");
  }
}

function inferDirection(item) {
  if (item.direction === "received" || item.direction === "sent") return item.direction;

  const text = `${item.type || ""} ${item.description || ""}`.toLowerCase();
  const sent =
    Number(item.starsChange) < 0 ||
    item.type === "wallet_debit" ||
    text.includes("subscribed to") ||
    text.includes("you sent") ||
    text.includes("you saved") ||
    text.includes("you followed") ||
    text.includes("you commented") ||
    text.includes("you unlocked") ||
    text.includes("you opened") ||
    text.includes("you requested");

  return sent ? "sent" : "received";
}

function inferFilterKeys(item, direction) {
  const text = `${item.type || ""} ${item.event || ""} ${item.description || ""} ${item.title || ""}`.toLowerCase();
  const keys = new Set((item.filterKeys || []).filter((key) => FILTER_VALUES.includes(key)));
  if (FILTER_VALUES.includes(item.filter)) keys.add(item.filter);

  const dreamGift = ["DREAM_GIFT_DEBIT", "DREAM_CREATOR_EARNING"].includes(item.event) || item.reference?.type === "DREAM_GIFT" || text.includes("gift");
  const financial =
    item.type === "wallet_credit" ||
    item.type === "wallet_debit" ||
    Boolean(item.starsChange) ||
    text.includes("refund") ||
    text.includes("earning") ||
    text.includes("stars") ||
    text.includes("debit") ||
    text.includes("credit");

  if (dreamGift) keys.add("support");
  if (text.includes("reaction") || text.includes("reacted") || text.includes("liked")) keys.add("support");
  if (text.includes("follow")) keys.add("follows");
  if (text.includes("comment") || text.includes("reply") || text.includes("message")) keys.add("comments");
  if (text.includes("save") || text.includes("bookmark")) keys.add("saves");
  if (text.includes("seen") || text.includes("saw you") || text.includes("orbit")) keys.add("seen");
  if (financial) keys.add(direction === "sent" ? "purchases" : "earnings");
  if (!keys.size && item.filter && item.filter !== "all" && item.filter !== "other" && item.filter !== "moderation") keys.add(item.filter);

  return [...keys];
}

function routeFor(item) {
  if (item.route) return item.route;
  if (item.actionPath) return LEGACY_ROUTES[item.actionPath] || item.actionPath;
  if (item.relatedCreator?.username) return `/profile/${encodeURIComponent(item.relatedCreator.username)}`;
  if (item.filter === "system" || item.filter === "moderation") return item.warningId ? "/settings/support/safety" : null;
  if (item.filterKeys?.some((key) => key === "earnings" || key === "purchases") || item.filter === "earnings" || item.filter === "purchases") return "/wallet/ledger";
  if (item.filter === "comments") return "/messages";
  if (item.filter === "seen") return "/orbit";
  return "/wall";
}

function normalizeLegacyActivity(item) {
  const direction = inferDirection(item);
  const filterKeys = inferFilterKeys(item, direction);
  const warning = item.type === "moderation_warning";
  const actor = item.relatedCreator || item.actor || null;
  const description = warning ? (item.title || "Account warning") : cleanText(item.title || item.description || item.type || "Activity");
  const preview = cleanText(item.preview || item.relatedContent?.title || item.target?.preview || item.message || "");

  return {
    ...item,
    title: description,
    preview,
    direction,
    filter: filterKeys[0] || item.filter || "other",
    filterKeys,
    relatedCreator: actor,
    route: item.route ?? routeFor({ ...item, direction, filter: filterKeys[0] || item.filter, filterKeys }),
    canAcknowledge: item.canAcknowledge ?? direction === "received",
    acknowledged: Boolean(item.acknowledged || item.read),
    warning,
  };
}

function normalizeLedgerEntry(entry) {
  const direction = Number(entry.starsChange) < 0 ? "sent" : "received";
  const actionPath = publicationRoute(entry.publication) || (String(entry.reference?.type || "").includes("DA") ? "/messages?tab=direct" : "/wallet/ledger");
  const base = {
    id: `ledger-${entry.id}`,
    event: entry.event,
    type: Number(entry.starsChange) >= 0 ? "wallet_credit" : "wallet_debit",
    description: ledgerTitle(entry),
    title: ledgerTitle(entry),
    relatedCreator: creatorForCounterparty(entry.counterparty),
    relatedContent: entry.publication ? { title: previewForLedger(entry), type: entry.publication.kind || "publication" } : null,
    preview: previewForLedger(entry),
    createdAt: entry.createdAt,
    starsChange: Number(entry.starsChange) || 0,
    actionPath,
    reference: entry.reference,
  };
  const filterKeys = inferFilterKeys(base, direction);

  return {
    ...base,
    direction,
    filter: filterKeys[0] || (direction === "sent" ? "purchases" : "earnings"),
    filterKeys,
    route: actionPath,
    canAcknowledge: true,
    acknowledged: false,
    warning: false,
  };
}

function normalizeActivity(activity = [], ledger = []) {
  const normalized = [
    ...activity.map(normalizeLegacyActivity),
    ...ledger.map(normalizeLedgerEntry),
  ];

  const seen = new Set();
  return normalized
    .filter((item) => {
      const key = String(item.dedupeKey || `${item.reference?.type || item.type}:${item.reference?.id || item.id}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => (new Date(right.createdAt) - new Date(left.createdAt)) || (Number(right.priority) - Number(left.priority)));
}

function iconFor(item) {
  const filter = item.filter || item.filterKeys?.[0];
  if (filter === "support") return FiGift;
  if (filter === "follows") return FiUserPlus;
  if (filter === "saves") return FiBookmark;
  if (filter === "comments") return FiMessageCircle;
  if (filter === "earnings" || filter === "purchases") return FiZap;
  return FiEye;
}

function displayAmount(item) {
  const value = Number(item.starsChange) || 0;
  if (!value) return null;
  return {
    className: value < 0 ? "is-sent" : "",
    label: `${value > 0 ? "+" : "-"}${Math.abs(value).toLocaleString()} Stars`,
  };
}

function canPersistAcknowledge(item) {
  return Boolean(
    item?.warningId ||
    String(item?.id || "").startsWith("notification-") ||
    String(item?.id || "").startsWith("profile-see-received-"),
  );
}

function ActivityAvatar({ item }) {
  const creator = item.relatedCreator;
  const Icon = iconFor(item);

  if (creator) {
    return (
      <FanAvatar
        name={creator.displayName || creator.name || creator.username || "Activity"}
        size="h-10 w-10"
        src={creator.avatarUrl || creator.avatar}
      />
    );
  }

  return (
    <span className={`activity-prototype-icon ${item.aggregate ? "is-aggregate" : ""}`.trim()}>
      <Icon aria-hidden="true" />
    </span>
  );
}

function ActivityTitle({ item }) {
  const title = item.title || "Activity";
  const actorName = item.relatedCreator?.displayName || item.relatedCreator?.name || item.relatedCreator?.username || "";

  if (actorName && title.startsWith(actorName)) {
    return (
      <p>
        <b>{actorName}</b>
        {title.slice(actorName.length)}
      </p>
    );
  }

  if (title.startsWith("You ")) {
    return (
      <p>
        <b>You</b>
        {" "}
        {title.slice(3)}
      </p>
    );
  }

  return <p>{title}</p>;
}

function ActivityItem({ acknowledged, item, onAcknowledge, onOpen }) {
  const amount = displayAmount(item);
  const route = routeFor(item);
  const interactive = Boolean(route);
  const featuredSupport = item.event?.includes("DREAM") || item.reference?.type === "DREAM_GIFT";

  const openItem = () => {
    if (!interactive) return;
    if (item.canAcknowledge && !acknowledged) onAcknowledge(item.id);
    onOpen(item);
  };

  const handleKeyDown = (event) => {
    if (!interactive || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    openItem();
  };

  return (
    <article
      className={`activity-prototype-row ${featuredSupport ? "is-dream-gift" : ""} ${item.warning ? "is-warning" : ""}`}
      onClick={openItem}
      onKeyDown={handleKeyDown}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <ActivityAvatar item={item} />

      <div className="activity-prototype-copy">
        {item.warning ? <strong>{"HIGH PRIORITY \u00b7 ACCOUNT WARNING"}</strong> : null}
        <ActivityTitle item={item} />
        {item.preview ? <span className="activity-prototype-preview">&quot;{item.preview}&quot;</span> : null}
        <time dateTime={item.createdAt ? new Date(item.createdAt).toISOString() : undefined}>{relativeTime(item.createdAt)}</time>
      </div>

      <div className="activity-prototype-right">
        {amount ? <strong className={amount.className}>{amount.label}</strong> : null}
        {item.canAcknowledge ? (
          <button
            aria-label={acknowledged ? "Marked as seen" : "Mark activity as seen"}
            className={acknowledged ? "is-seen" : ""}
            onClick={(event) => {
              event.stopPropagation();
              onAcknowledge(item.id);
            }}
            type="button"
          >
            {acknowledged ? <><span>Seen</span><FiCheck aria-hidden="true" /></> : <FiEye aria-hidden="true" />}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function ActivitySkeleton() {
  return (
    <div className="activity-prototype-skeleton" role="status">
      {Array.from({ length: 8 }).map((_, index) => <span key={index} />)}
      <span className="sr-only">Loading activity</span>
    </div>
  );
}

function ActivityEmptyState({ direction, filter, onOpenOrbit }) {
  const [title, description] = direction === "sent" && filter !== "all"
    ? EMPTY_COPY.purchases
    : EMPTY_COPY[filter] || EMPTY_COPY.all;

  return (
    <div className="activity-prototype-state">
      <FiClock aria-hidden="true" />
      <strong>{title}</strong>
      <p>{description}</p>
      {filter === "seen" ? <button onClick={onOpenOrbit} type="button">Open your Orbit</button> : null}
    </div>
  );
}

function FilterChips({ filter, filters, onChange }) {
  return (
    <div className="activity-prototype-filters" aria-label="Activity filters">
      {filters.map(([label, value]) => (
        <button
          aria-pressed={filter === value}
          className={filter === value ? "is-active" : ""}
          key={value}
          onClick={() => onChange(value)}
          type="button"
        >
          {value === "seen" ? <FiEye aria-hidden="true" /> : null}
          {label}
        </button>
      ))}
    </div>
  );
}

export default function ActivityPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const queryDirection = searchParams.get("direction") === "sent" ? "sent" : "received";
  const queryFilter = searchParams.get("filter") || "all";
  const [acknowledged, setAcknowledged] = useState(readAcknowledged);
  const [page, setPage] = useState(1);
  const direction = queryDirection;
  const allowedFilters = direction === "received" ? RECEIVED_FILTERS : SENT_FILTERS;
  const allowedFilterValues = new Set(allowedFilters.map(([, value]) => value));
  const filter = allowedFilterValues.has(queryFilter) ? queryFilter : "all";

  const activityQuery = useQuery({
    queryKey: ["fan", "activity", { direction, filter, limit: PAGE_SIZE, page }],
    queryFn: () => fanService.getActivity({ direction, filter, limit: PAGE_SIZE, page }).then((response) => response.data.data),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    retry: false,
    placeholderData: (previous) => previous,
  });
  const walletQuery = useQuery({
    queryKey: ["wallet"],
    queryFn: () => walletService.getWallet().then((response) => response.data.data.wallet),
    retry: false,
  });
  const ledgerQuery = useQuery({
    queryKey: ["wallet-ledger", "activity", { limit: PAGE_SIZE * page }],
    queryFn: () => walletService.getLedger({ limit: PAGE_SIZE * page }).then((response) => response.data.data),
    retry: false,
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    setPage(1);
  }, [direction, filter]);

  useEffect(() => {
    const socket = getMessageSocket();
    if (!socket) return undefined;

    const refreshActivity = () => queryClient.invalidateQueries({ queryKey: ["fan", "activity"] });
    socket.on("activity:updated", refreshActivity);
    return () => socket.off("activity:updated", refreshActivity);
  }, [queryClient]);

  const items = useMemo(() => {
    const apiActivity = activityQuery.data?.items || activityQuery.data?.activity || [];
    const ledgerItems = ledgerQuery.data?.items || [];
    return normalizeActivity(apiActivity, ledgerItems);
  }, [activityQuery.data, ledgerQuery.data]);
  const visible = items.filter((item) => item.direction === direction && (filter === "all" || item.filterKeys?.includes(filter) || item.filter === filter));
  const filters = allowedFilters;
  const loading = activityQuery.isLoading || ledgerQuery.isLoading;
  const failed = activityQuery.isError && ledgerQuery.isError;
  const hasMore = Boolean(activityQuery.data?.pageInfo?.hasMore || (ledgerQuery.data?.pagination && page < ledgerQuery.data.pagination.pages));

  const updateSearch = (nextDirection, nextFilter = "all") => {
    const params = new URLSearchParams();
    if (nextDirection === "sent") params.set("direction", "sent");
    if (nextFilter !== "all") params.set("filter", nextFilter);
    setPage(1);
    setSearchParams(params, { replace: true });
  };

  const activityAcknowledge = useMutation({
    mutationFn: fanService.acknowledgeActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fan", "activity"] });
      queryClient.invalidateQueries({ queryKey: ["moderation-warnings"] });
    },
  });

  const acknowledge = (id) => {
    const item = items.find((entry) => entry.id === id);
    setAcknowledged((current) => {
      const next = new Set(current);
      next.add(String(id));
      saveAcknowledged(next);
      return next;
    });

    if (canPersistAcknowledge(item)) {
      activityAcknowledge.mutate(item.id);
      return;
    }
  };

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/wall");
  };

  return (
    <main className="activity-prototype-page">
      <header className="activity-prototype-header">
        <button className="activity-prototype-back" aria-label="Go back" onClick={goBack} type="button">
          <FiArrowLeft aria-hidden="true" />
        </button>
        <p>Reactions, people and earnings &mdash; everything that found you</p>
      </header>

      <div className="activity-prototype-segment" aria-label="Activity direction" role="tablist">
        <button
          aria-selected={direction === "received"}
          className={direction === "received" ? "is-active" : ""}
          onClick={() => updateSearch("received")}
          role="tab"
          type="button"
        >
          Received
        </button>
        <button
          aria-selected={direction === "sent"}
          className={direction === "sent" ? "is-active" : ""}
          onClick={() => updateSearch("sent")}
          role="tab"
          type="button"
        >
          Sent
        </button>
      </div>

      <FilterChips filter={filter} filters={filters} onChange={(nextFilter) => updateSearch(direction, nextFilter)} />

      {direction === "received" && filter === "earnings" ? (
        <button className="activity-wallet-card" onClick={() => navigate("/wallet")} type="button">
          <FiZap aria-hidden="true" />
          <span>
            <strong>{Number(walletQuery.data?.balance || 0).toLocaleString()} Stars</strong>
            <small>Wallet balance</small>
          </span>
          <FiChevronRight aria-hidden="true" />
        </button>
      ) : null}

      <section className="activity-prototype-list">
        {loading ? <ActivitySkeleton /> : null}
        {failed ? (
          <div className="activity-prototype-state">
            <FiRefreshCw aria-hidden="true" />
            <strong>Could not load activity.</strong>
            <p>Try again when the connection settles.</p>
            <button
              onClick={() => {
                activityQuery.refetch();
                ledgerQuery.refetch();
              }}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : null}
        {!loading && !failed ? visible.map((item) => (
          <ActivityItem
            acknowledged={item.acknowledged || acknowledged.has(String(item.id))}
            item={item}
            key={item.id}
            onAcknowledge={acknowledge}
            onOpen={(entry) => navigate(routeFor(entry))}
          />
        )) : null}
        {!loading && !failed && !visible.length ? (
          <ActivityEmptyState direction={direction} filter={filter} onOpenOrbit={() => navigate("/orbit")} />
        ) : null}
        {!loading && !failed && visible.length && hasMore ? (
          <button className="activity-load-more" onClick={() => setPage((current) => current + 1)} type="button">
            Load more
          </button>
        ) : null}
      </section>
    </main>
  );
}
