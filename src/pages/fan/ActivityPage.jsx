import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiBookmark,
  FiChevronRight,
  FiClock,
  FiCornerUpLeft,
  FiDollarSign,
  FiGift,
  FiHeart,
  FiLock,
  FiMessageCircle,
  FiRefreshCw,
  FiRepeat,
  FiUserPlus,
  FiZap,
} from "react-icons/fi";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import ProfileConnectionsModal from "../../components/profile/ProfileConnectionsModal";
import { useAuth } from "../../hooks/useAuth";
import { fanService } from "../../services/fanService";
import { walletService } from "../../services/walletService";
import { getMessageSocket } from "../../services/messageSocket";
import ActivityGiftPreview from "../../components/activity/ActivityGiftPreview";
import { isGiftActivity, mergeActivitySources } from "../../utils/activitySources";
import { relativeTime } from "../../utils/relativeTime";
import { GIFT_THANKS_OPEN_EVENT } from "../../components/fanWeb/shared/giftThanksEvent";
import { storyActivityRoute } from "../../utils/storyPresentation";
import ActivityContentPreview from "../../components/activity/ActivityContentPreview";
import CoinIcon from "../../components/branding/CoinIcon";
import ActivityFollowAction from "../../components/activity/ActivityFollowAction";
import StoryMentionSheet from "../../components/activity/StoryMentionSheet";
import { SeenNavIcon } from "../../components/social/socialNavItems";

const RECEIVED_FILTERS = [
  ["All", "all"],
  ["Mentions", "mentions"],
  ["Support", "support"],
  ["Saves", "saves"],
  ["Comments", "comments"],
  ["Follows", "follows"],
  ["Earnings", "earnings"],
];

const SENT_FILTERS = [
  ["All", "all"],
  ["Mentions", "mentions"],
  ["Support", "support"],
  ["Saves", "saves"],
  ["Comments", "comments"],
  ["Follows", "follows"],
  ["Purchases", "purchases"],
];

const FILTER_VALUES = ["seen", "mentions", "support", "saves", "comments", "follows", "earnings", "purchases"];
const ACK_KEY = "atseen_activity_acknowledged";
const PAGE_SIZE = 30;

const ACTIVITY_REACTION_EMOJI = {
  LIKE: "🤝",
  LOVE: "❤️",
  CARE: "🤗",
  FIRE: "🔥",
  CLAP: "👏",
  LAUGH: "😂",
  SEE_YOU: "👁️",
  WOW: "😮",
  TEARY: "🥹",
  ADMIRE: "😍",
  SAD: "😢",
  HUG: "🫂",
  STRONG: "💪",
  PRAY: "🙏",
  HUNDRED: "💯",
  SPARKLES: "✨",
  INSIGHTFUL: "🔥",
  PHONE: "📱",
};

const LEGACY_ROUTES = {
  "/fan/activity": "/activity",
  "/fan/messages": "/messages",
  "/fan/profile": "/profile",
  "/fan/subscriptions": "/memberships",
  "/fan/wallet": "/wallet",
  "/fan/worlds": "/memberships",
};

const LEDGER_COPY = {
  get OPENING_BALANCE() { return __msg("fan.openingBalance"); },
  get CREDIT_ADMIN() { return __msg("fan.walletCredit"); },
  get CREDIT_TEST() { return __msg("fan.testWalletCredit"); },
  get WORLD_PURCHASE_DEBIT() { return __msg("fan.youUnlockedAWorld"); },
  get WORLD_CREATOR_EARNING() { return __msg("fan.worldEarning"); },
  get PREMIUM_JOIN_DEBIT() { return __msg("fan.youUnlockedAPremiumWorld"); },
  get PREMIUM_CREATOR_EARNING() { return __msg("fan.premiumWorldEarning"); },
  get PREMIUM_RENEWAL_DEBIT() { return __msg("fan.premiumWorldRenewal"); },
  get VERIFIED_CREATOR_DEBIT() { return __msg("fan.verifiedCreatorActivation"); },
  get DREAM_GIFT_DEBIT() { return __msg("fan.dreamSupportSent"); },
  get DREAM_CREATOR_EARNING() { return __msg("fan.dreamSupportReceived"); },
  get CHAT_GIFT_DEBIT() { return __msg("fan.giftSent"); },
  get CHAT_GIFT_EARNING() { return __msg("social.giftReceived"); },
  get DA_HOLD_DEBIT() { return __msg("fan.youOpenedDirectAccess"); },
  get DA_CREATOR_EARNING() { return __msg("fan.directAccessEarning"); },
  get DA_REFUND_CREDIT() { return __msg("fan.directAccessRefund"); },
  get CALL_HOLD_DEBIT() { return __msg("fan.youRequestedAPaidCall"); },
  get CALL_CREATOR_EARNING() { return __msg("fan.callEarning"); },
  get CALL_REFUND_CREDIT() { return __msg("fan.callRefund"); },
  get REFUND_CREDIT() { return __msg("fan.refundReceived"); },
  get CREATOR_EARNING_REVERSAL() { return __msg("fan.creatorEarningReversal"); },
  get MANUAL_ADJUSTMENT() { return __msg("fan.walletAdjustment"); },
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

function readActivityView(key) {
  try { const value = JSON.parse(sessionStorage.getItem(key) || "{}"); return { page: Math.max(1, Math.min(10, Number(value.page) || 1)), scroll: Math.max(0, Number(value.scroll) || 0) }; }
  catch { return { page: 1, scroll: 0 }; }
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
  if (text === "DA CREATOR EARNING") return __msg("fan.directAccessEarning");
  if (text === "DA HOLD DEBIT") return __msg("fan.directAccessPurchase");
  if (text === "CALL CREATOR EARNING") return __msg("fan.callEarning");
  if (text === "CALL HOLD DEBIT") return __msg("fan.paidCallRequest");
  if (/^[A-Z0-9_ -]+$/.test(text) && /[A-Z]/.test(text)) return titleCase(text);
  return text;
}

function isGiftThanksActivity(item) {
  return /gift.*thank|thank.*gift/i.test(`${item?.type || ""} ${item?.title || ""} ${item?.description || ""}`);
}

function creatorName(creator, fallback = __msg("fan.someone")) {
  return creator?.displayName || creator?.name || creator?.username || fallback;
}

function creatorForCounterparty(counterparty) {
  if (!counterparty) return null;
  return {
    id: counterparty.id || counterparty._id,
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
  const counterparty = creatorName(entry.counterparty, Number(entry.starsChange) < 0 ? __msg("fan.aCreator") : __msg("fan.someone"));
  const publicationTitle = previewForLedger(entry);
  const giftName = entry.metadata?.giftName || __msg("stories.aGift");

  switch (event) {
    case "WORLD_PURCHASE_DEBIT":
      return publicationTitle ? __msg("fan.youUnlockedValue0SWorld", { value0: counterparty }) : __msg("fan.youUnlockedAWorld");
    case "WORLD_CREATOR_EARNING":
      return entry.counterparty ? __msg("fan.value0UnlockedYourWorld", { value0: counterparty }) : __msg("fan.worldEarning");
    case "PREMIUM_JOIN_DEBIT":
      return __msg("fan.youUnlockedValue0SPremiumWorld", { value0: counterparty });
    case "PREMIUM_RENEWAL_DEBIT":
      return __msg("fan.youRenewedValue0SPremiumWorld", { value0: counterparty });
    case "PREMIUM_CREATOR_EARNING":
      return entry.counterparty ? __msg("fan.value0UnlockedYourPremiumWorld", { value0: counterparty }) : __msg("fan.premiumWorldEarning");
    case "DREAM_GIFT_DEBIT":
      return __msg("fan.youSentValue0TowardValue1SDream", { value0: giftName, value1: counterparty });
    case "DREAM_CREATOR_EARNING":
      return __msg("fan.value0SentValue1TowardYourDream", { value0: counterparty, value1: giftName });
    case "CHAT_GIFT_DEBIT":
      return __msg("fan.youSentAGiftToValue0", { value0: counterparty });
    case "CHAT_GIFT_EARNING":
      return __msg("fan.value0SentYouAGift", { value0: counterparty });
    case "DA_HOLD_DEBIT":
      return __msg("fan.youOpenedDirectAccessWithValue0", { value0: counterparty });
    case "DA_CREATOR_EARNING":
      return entry.counterparty ? __msg("fan.value0BookedDirectAccess", { value0: counterparty }) : __msg("fan.directAccessEarning");
    case "DA_REFUND_CREDIT":
      return __msg("fan.directAccessRefund");
    case "CALL_HOLD_DEBIT":
      return __msg("fan.youRequestedAPaidCallWithValue0", { value0: counterparty });
    case "CALL_CREATOR_EARNING":
      return entry.counterparty ? __msg("fan.value0CompletedAPaidCall", { value0: counterparty }) : __msg("fan.callEarning");
    case "CALL_REFUND_CREDIT":
      return __msg("fan.callRefund");
    case "VERIFIED_CREATOR_DEBIT":
      return __msg("fan.verifiedCreatorActivation");
    default:
      return LEDGER_COPY[event] || titleCase(event || __msg("fan.starsActivity"));
  }
}

function inferDirection(item) {
  if (item.direction === "received" || item.direction === "sent") return item.direction;

  const text = `${item.type || ""} ${item.description || ""} ${item.title || ""}`.toLowerCase();
  const sent =
    Number(item.starsChange) < 0 ||
    item.type === "wallet_debit" ||
    text.includes("subscribed to") ||
    text.includes("you sent") ||
    text.includes("you saved") ||
    text.includes("you followed") ||
    text.includes("you commented") ||
    text.includes("you mentioned") ||
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
  if (text.includes("mention") || text.includes("tagged")) keys.add("mentions");
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
  const storyRoute = storyActivityRoute(item);
  if (storyRoute) return storyRoute;
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
  const originalDescription = warning ? (item.title || __msg("layouts.accountWarning")) : cleanText(item.title || item.description || item.type || __msg("social.activity"));
  const actorName = actor?.displayName || actor?.name || actor?.username || originalDescription.match(/^(.+?) thanked you/i)?.[1] || __msg("fan.someone");
  const description = isGiftThanksActivity(item) ? __msg("fan.value0ThankedYouForYourGift", { value0: actorName }) : originalDescription;
  const preview = cleanText(item.preview || item.relatedContent?.title || item.target?.preview || item.message || (item.type === "story_mention" && direction === "received" ? __msg("fan.tapToAddItToYourStory") : ""));

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
    target: entry.publication ? { id: entry.publication.id, type: entry.publication.kind, imageUrl: entry.publication.imageUrl, videoUrl: entry.publication.videoUrl } : null,
    preview: previewForLedger(entry),
    createdAt: entry.createdAt,
    starsChange: Number(entry.starsChange) || 0,
    actionPath,
    reference: entry.reference,
    metadata: entry.metadata,
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

function aggregateAction(item) {
  const type = String(item.type || "").toLowerCase();
  if (type.includes("save")) return "save";
  if (type.includes("reaction")) return "reaction";
  if (type.includes("comment")) return "comment";
  if (type.includes("share") || type.includes("repost")) return "share";
  return null;
}

function aggregateTargetLabel(item) {
  const type = String(item.target?.type || item.relatedContent?.type || "").toUpperCase();
  if (type === "STORY") return "story";
  if (type.includes("SEEN") || type.includes("WORLD")) return "Seen";
  return "note";
}

function aggregateReceivedActivity(items) {
  const groups = new Map();
  const passthrough = [];

  const seenByDay = new Map();
  items.forEach((item) => {
    if (item.direction !== "received" || item.type !== "profile_seen") return;
    const date = new Date(item.createdAt);
    const dayKey = Number.isNaN(date.getTime()) ? "unknown" : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const group = seenByDay.get(dayKey) || [];
    group.push(item);
    seenByDay.set(dayKey, group);
  });

  seenByDay.forEach((group, dayKey) => {
    if (group.length < 2) return;
    const latest = [...group].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0];
    const people = group.map((item) => item.relatedCreator).filter(Boolean);
    const names = people.map((person) => person.displayName || person.name || person.username || __msg("fan.someone"));
    const leadNames = names.slice(0, 2).join(", ");
    const more = Math.max(0, group.length - 2);
    passthrough.push({
      ...latest,
      id: `profile-seen-group-${dayKey}`,
      type: "profile_seen_group",
      title: __msg("fan.value0Value1SaidISeeYou", { value0: leadNames, value1: more ? ` and ${more} more` : "" }),
      relatedCreator: null,
      relatedCreators: people,
      actor: null,
      route: null,
      actionPath: null,
      aggregate: { count: group.length, ids: group.map((item) => item.id), kind: "profile_seen" },
      canAcknowledge: false,
      acknowledged: group.every((item) => item.acknowledged || item.read),
    });
  });

  items.forEach((item) => {
    if (item.direction === "received" && item.type === "profile_seen") {
      const date = new Date(item.createdAt);
      const dayKey = Number.isNaN(date.getTime()) ? "unknown" : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if ((seenByDay.get(dayKey) || []).length > 1) return;
    }
    const action = aggregateAction(item);
    const targetId = item.target?.id || item.route || item.actionPath;
    if (item.direction !== "received" || item.aggregate || !action || !targetId) {
      passthrough.push(item);
      return;
    }

    const key = `${action}:${item.target?.type || item.relatedContent?.type || ""}:${targetId}:${action === "reaction" ? item.metadata?.reaction || "" : ""}`;
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  });

  groups.forEach((group, key) => {
    if (group.length === 1) {
      passthrough.push(group[0]);
      return;
    }

    const latest = [...group].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0];
    const action = aggregateAction(latest);
    const targetLabel = aggregateTargetLabel(latest);
    const people = group.map((item) => item.relatedCreator).filter(Boolean);
    const names = people.slice(0, 2).map((person) => person.displayName || person.name || person.username).filter(Boolean);
    const lead = names.length ? `${names.join(", ")}${group.length > 2 ? ` and ${group.length - 2} others` : ""}` : `${group.length} people`;
    const verbs = {
      save: __msg("fan.savedYourValue0", { value0: targetLabel }),
      reaction: __msg("fan.reactedToYourValue0", { value0: targetLabel }),
      comment: __msg("fan.commentedOnYourValue0", { value0: targetLabel }),
      share: __msg("fan.repostedYourValue0", { value0: targetLabel }),
    };

    passthrough.push({
      ...latest,
      id: `activity-group-${key}`,
      title: action === "save" ? __msg("activity.savedByPeople", { count: group.length, target: targetLabel }) : `${lead} ${verbs[action]}`,
      relatedCreators: action === "save" ? [] : people,
      relatedCreator: null,
      actor: null,
      aggregate: { count: group.length, ids: group.map((item) => item.id) },
      canAcknowledge: false,
      acknowledged: group.every((item) => item.acknowledged || item.read),
    });
  });

  return passthrough;
}

function normalizeActivity(activity = [], ledger = []) {
  const normalized = mergeActivitySources(
    activity.map(normalizeLegacyActivity),
    ledger.map(normalizeLedgerEntry),
  );

  const dedupeKeyFor = (item) => {
    const type = String(item.type || "");
    if (/^(premium_)?membership_cancelled$/.test(type) && item.metadata?.membershipId) {
      return `${item.direction}:membership-cancelled:${item.metadata.membershipId}`;
    }
    return `${item.direction}:${item.dedupeKey || `${item.reference?.type || item.type}:${item.reference?.id || item.id}`}`;
  };
  const richness = (item) => Number(Boolean(item.relatedCreator || item.actor)) * 8
    + Number(Boolean(item.target?.id || item.reference?.id)) * 4
    + Number(Boolean(item.preview || item.description)) * 2
    + Number(Boolean(item.actionPath));
  const byKey = new Map();
  normalized.forEach((item) => {
    const key = dedupeKeyFor(item);
    const current = byKey.get(key);
    if (!current || richness(item) > richness(current)) byKey.set(key, item);
  });
  const deduplicated = [...byKey.values()];

  return aggregateReceivedActivity(deduplicated)
    .sort((left, right) => (new Date(right.createdAt) - new Date(left.createdAt)) || (Number(right.priority) - Number(left.priority)));
}

function iconFor(item) {
  const text = `${item.event || ""} ${item.type || ""} ${item.title || ""} ${item.description || ""}`.toLowerCase();
  const filter = item.filter || item.filterKeys?.[0];
  if (text.includes("refund")) return FiCornerUpLeft;
  if (text.includes("react") || text.includes("love") || text.includes("care")) return FiHeart;
  if (text.includes("repost")) return FiRepeat;
  if (text.includes("unlock")) return FiLock;
  if (text.includes("gift") || text.includes("support")) return FiGift;
  if (text.includes("earning") || text.includes("credit") || text.includes("stars")) return FiDollarSign;
  if (filter === "support") return FiGift;
  if (filter === "follows") return FiUserPlus;
  if (filter === "saves") return FiBookmark;
  if (filter === "comments") return FiMessageCircle;
  if (filter === "earnings" || filter === "purchases") return FiZap;
  return SeenNavIcon;
}

function toneFor(item) {
  const text = `${item.event || ""} ${item.type || ""} ${item.title || ""} ${item.description || ""}`.toLowerCase();
  const filter = item.filter || item.filterKeys?.[0];
  if (text.includes("gift") || text.includes("support")) return "gift";
  if (text.includes("refund") || text.includes("earning") || text.includes("credit") || Number(item.starsChange) > 0) return "earning";
  if (text.includes("unlock") || text.includes("join")) return "unlock";
  if (text.includes("react") || text.includes("love") || text.includes("care")) return "reaction";
  if (text.includes("repost")) return "repost";
  if (filter === "saves") return "save";
  if (filter === "comments") return "comment";
  if (filter === "follows") return "follow";
  return "seen";
}

function reactionEmojiFor(item) {
  const key = String(item.metadata?.reaction || "").trim().toUpperCase();
  return ACTIVITY_REACTION_EMOJI[key] || (/\p{Extended_Pictographic}/u.test(key) ? key : "");
}

function titleMarkFor(item) {
  if (item.type === "profile_seen_group") return "";
  const reaction = reactionEmojiFor(item);
  if (reaction) return reaction;
  return "";
}

function displayAmount(item, starsPerUsd) {
  const value = Number(item.starsChange) || 0;
  if (!value) return null;
  const storedUsd = Number(item.metadata?.usdAmount ?? item.usdAmount);
  const rate = Number(item.metadata?.starsPerUsd || starsPerUsd || 10);
  const usd = Number.isFinite(storedUsd) && storedUsd > 0
    ? storedUsd
    : Math.abs(value) / (rate > 0 ? rate : 10);
  return {
    className: value < 0 ? "is-sent" : "",
    label: `${value > 0 ? "+" : "-"}${new Intl.NumberFormat(__uiLocale(), { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(usd)}`,
  };
}

function canPersistAcknowledge(item) {
  return Boolean(item?.direction === "received" && item?.canAcknowledge);
}

function ActivityAvatar({ item }) {
  __useUiLanguage();
  const creator = item.relatedCreator;
  const Icon = iconFor(item);

  if (item.relatedCreators?.length) {
    return (
      <span className="activity-avatar-stack" aria-label={__msg("fan.people", { value0: item.relatedCreators.length })}>
        {item.relatedCreators.slice(0, item.type === "profile_seen_group" ? 3 : 2).map((person, index) => (
          <FanAvatar
            className="activity-person-avatar"
            key={person.id || person.username || index}
            name={person.displayName || person.name || person.username || "Activity"}
            size="h-9 w-9"
            src={person.avatarUrl || person.avatar}
          />
        ))}
      </span>
    );
  }

  if (creator) {
    return (
      <FanAvatar
        className="activity-person-avatar"
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
  __useUiLanguage();
  const title = item.title || __msg("social.activity");
  const actorName = item.relatedCreator?.displayName || item.relatedCreator?.name || item.relatedCreator?.username || "";
  const titleMark = titleMarkFor(item);
  const actionIcon = titleMark && !title.includes(titleMark) ? <span aria-hidden="true" className="activity-title-event-icon is-reaction">{titleMark}</span> : null;

  if (item.direction === "received" && item.aggregate?.count && (item.filter === "saves" || item.filterKeys?.includes("saves"))) {
    const count = Number(item.aggregate.count);
    const target = item.metadata?.savedComment ? "comment" : /SEEN|WORLD/i.test(item.target?.type || item.relatedContent?.type || "") ? "Seen" : "note";
    return <p><b>{__msg("activity.savePeopleCount", { count })}</b> {__msg("fan.savedYourValue0", { value0: target })}</p>;
  }

  if (item.type === "profile_seen_group" && item.relatedCreators?.length) {
    const names = item.relatedCreators.map((person) => person.displayName || person.name || person.username || __msg("fan.someone"));
    const leadNames = names.slice(0, 2).join(", ");
    const more = Math.max(0, Number(item.aggregate?.count || names.length) - 2);
    return <p><b>{leadNames}</b>{more ? <> {__msg("fan.and")} <b>{more} {__msg("fan.more")}</b></> : null} {__msg("profile.saidISeeYou")}</p>;
  }

  if (actorName && title.startsWith(actorName)) {
    return (
      <p>
        <b>{actorName}</b>
        {title.slice(actorName.length)}
        {actionIcon}
      </p>
    );
  }

  if (title.startsWith("You ")) {
    const giftName = item.metadata?.giftName || item.gift?.name || title.match(/^You sent (.+?) to /)?.[1];
    const contentTitle = item.relatedContent?.title || item.target?.title;
    const emphasis = [giftName, contentTitle, actorName].filter(Boolean).find((label) => title.includes(label));
    const offset = emphasis ? title.indexOf(emphasis) : -1;
    return (
      <p>
        {offset >= 0 ? <>{title.slice(0, offset)}<b>{emphasis}</b>{title.slice(offset + emphasis.length)}</> : title}
      </p>
    );
  }

  return <p>{title}{actionIcon}</p>;
}

function ActivityItem({ item, onOpen, starsPerUsd }) {
  __useUiLanguage();
  const navigate = useNavigate();
  const amount = item.direction === "received" ? displayAmount(item, starsPerUsd) : null;
  const route = routeFor(item);
  const interactive = isGiftActivity(item) || Boolean(route);
  const tone = toneFor(item);
  const giftImageUrl = item.metadata?.giftImageUrl || item.giftImageUrl || "";

  const openItem = () => {
    if (!interactive) return;
    onOpen(item);
  };

  const handleKeyDown = (event) => {
    if (!interactive || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    openItem();
  };

  return (
    <article
      className={`activity-prototype-row is-${tone} ${item.warning ? "is-warning" : ""}${item.direction === "received" && tone === "save" && /NOTE|POST/i.test(item.target?.type || "") ? " is-note-save" : ""}`}
      onClick={openItem}
      onKeyDown={handleKeyDown}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <ActivityAvatar item={item} />

      <div className="activity-prototype-copy">
        {item.warning ? <strong>{__msg("fan.highPriorityAccountWarning")}</strong> : null}
        <ActivityTitle item={item} />
        {item.preview && !isGiftThanksActivity(item) ? <span className="activity-prototype-preview">&quot;{item.preview}&quot;</span> : null}
        <time dateTime={item.createdAt ? new Date(item.createdAt).toISOString() : undefined}>{relativeTime(item.createdAt)}{item.type === "profile_seen_group" ? ` · ${item.aggregate?.count || 0}` : ""}</time>
      </div>

      <div className="activity-prototype-right">
        {item.metadata?.canAnswer ? <button className="activity-follow-action activity-answer-action" onClick={event => { event.stopPropagation(); navigate(route); }} onKeyDown={event => event.stopPropagation()} type="button">{__msg("activity.answer")}</button> : null}
        {item.metadata?.refundCoins ? <span className="activity-refund-coins"><CoinIcon size={16} /><b>{item.metadata.refundCoins}</b></span> : null}
        {/^premium_renewal_(low_balance|failed)$/.test(item.type || "") ? <button className="activity-follow-action" onClick={event => { event.stopPropagation(); navigate("/wallet"); }} onKeyDown={event => event.stopPropagation()} type="button">{__msg("activity.topUp")}</button> : null}
        {item.type === "follow" && item.direction === "received" && item.relatedCreator?.username ? <ActivityFollowAction username={item.relatedCreator.username} /> : null}
        <ActivityContentPreview item={item} />
        {giftImageUrl && !isGiftThanksActivity(item) ? <img alt={item.metadata?.giftName || __msg("fan.gift")} className="activity-prototype-gift" src={giftImageUrl} /> : null}
        {amount ? <strong className={amount.className}>{amount.label}</strong> : null}
        {item.direction === "received" && (/mutual/i.test(item.type || "") || /see each other/i.test(item.title || "")) ? <span className="activity-mutual-eye" aria-label={__msg("fan.youSeeEachOther")}><ActivityEyeMark /></span> : null}
      </div>
    </article>
  );
}

function ActivitySkeleton() {
  __useUiLanguage();
  return (
    <div className="activity-prototype-skeleton" role="status">
      {Array.from({ length: 8 }).map((_, index) => <span key={index} />)}
      <span className="sr-only">{__msg("fan.loadingActivity")}</span>
    </div>
  );
}

function ActivityEmptyState({ direction, filter, onOpenOrbit }) {
  __useUiLanguage();
  const [title, description] = filter === "mentions"
    ? ["No mentions yet", direction === "sent" ? __msg("fan.peopleYouMentionInYourStoriesWillAppear") : __msg("fan.whenSomeoneMentionsYouItWillAppearHere")]
    : direction === "sent" && filter !== "all"
    ? EMPTY_COPY.purchases
    : EMPTY_COPY[filter] || EMPTY_COPY.all;

  return (
    <div className="activity-prototype-state">
      <FiClock aria-hidden="true" />
      <strong>{title}</strong>
      <p>{description}</p>
      {filter === "seen" ? <button onClick={onOpenOrbit} type="button">{__msg("fan.openYourOrbit")}</button> : null}
    </div>
  );
}

function ActivityEyeMark() {
  __useUiLanguage();
  return <SeenNavIcon aria-hidden="true" className="activity-eye-mark" />;
}

function FilterChips({ filter, filters, onChange }) {
  __useUiLanguage();
  return (
    <div className="activity-prototype-filters" aria-label={__msg("fan.activityFilters")}>
      {filters.map(([label, value]) => (
        <button
          aria-pressed={filter === value}
          className={filter === value ? "is-active" : ""}
          key={value}
          onClick={() => onChange(value)}
          type="button"
        >
          {value === "seen" ? <ActivityEyeMark /> : null}
          {label}
        </button>
      ))}
    </div>
  );
}

export default function ActivityPage() {
  __useUiLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const queryDirection = searchParams.get("direction") === "sent" ? "sent" : "received";
  const queryFilter = searchParams.get("filter") || "all";
  const [acknowledged, setAcknowledged] = useState(readAcknowledged);
  const [previewGift, setPreviewGift] = useState(null);
  const [previewMention, setPreviewMention] = useState(null);
  const [seenByOpen, setSeenByOpen] = useState(false);
  const closeGiftPreview = useCallback(() => setPreviewGift(null), []);
  const viewKey = `atseen_activity_view:${user?.id || user?._id}:${queryDirection}:${queryFilter}`;
  const [page, setPage] = useState(() => readActivityView(viewKey).page);
  const viewState = useRef({ key: viewKey, ...readActivityView(viewKey), restored: false });
  viewState.current.page = page;
  const [introOpen, setIntroOpen] = useState(() => {
    try { return localStorage.getItem("atseen_activity_intro_dismissed") !== "1"; }
    catch { return true; }
  });
  const direction = queryDirection;
  const allowedFilters = direction === "received" ? RECEIVED_FILTERS : SENT_FILTERS;
  const allowedFilterValues = new Set(allowedFilters.map(([, value]) => value));
  const filter = allowedFilterValues.has(queryFilter) ? queryFilter : "all";
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const activityQuery = useQuery({
    queryKey: ["fan", "activity", { direction, filter, limit: PAGE_SIZE, page, todayStart }],
    queryFn: () => fanService.getActivity({ direction, filter, limit: PAGE_SIZE, page, ...(direction === "received" && filter === "all" ? { todayStart } : {}) }).then((response) => response.data.data),
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
    if (viewState.current.key === viewKey) return;
    viewState.current = { key: viewKey, page: 1, scroll: 0, restored: true };
    setPage(1);
  }, [viewKey]);
  useEffect(() => {
    if (!activityQuery.data || viewState.current.restored) return undefined;
    const frame = requestAnimationFrame(() => { const element = document.querySelector(".social-center-scroll"); if (element) element.scrollTop = viewState.current.scroll; viewState.current.restored = true; });
    return () => cancelAnimationFrame(frame);
  }, [activityQuery.data]);
  useEffect(() => {
    const element = document.querySelector(".social-center-scroll");
    const remember = () => { viewState.current.scroll = element?.scrollTop || 0; };
    element?.addEventListener("scroll", remember, { passive: true });
    return () => {
      element?.removeEventListener("scroll", remember);
      try { sessionStorage.setItem(viewState.current.key, JSON.stringify({ page: viewState.current.page, scroll: viewState.current.scroll })); } catch { /* View restoration is best effort. */ }
    };
  }, []);

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
  const sentSeen = direction === "sent" && filter === "all"
    ? visible.filter((item) => item.type === "profile_seen" && item.relatedCreator)
    : [];
  const sentSeenPeople = [...new Map(sentSeen.map((item) => [item.relatedCreator.id || item.relatedCreator.username || creatorName(item.relatedCreator), item.relatedCreator])).values()];
  const todaySeen = direction === "received" && filter === "all" ? activityQuery.data?.todaySeen : null;
  const todaySeenPeople = todaySeen?.people || [];
  const todaySeenCount = Number(todaySeen?.count) || 0;
  const listItems = visible.filter((item) => {
    if (item.direction === "received" && (
      ["profile_view", "profile_viewed"].includes(item.type)
      || /\bsaw you\s*[.!]?$/i.test(item.title || item.description || "")
    )) return false;
    if (sentSeenPeople.length && sentSeen.includes(item)) return false;
    if (todaySeenCount && ["profile_seen", "profile_seen_group"].includes(item.type) && new Date(item.createdAt).getTime() >= new Date(todayStart).getTime()) return false;
    return true;
  });
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

  const acknowledgeVisibleActivity = useMutation({
    mutationFn: fanService.acknowledgeAllActivity,
    onSuccess: () => {
      queryClient.setQueryData(["fan", "activity", "unread-count"], 0);
      queryClient.invalidateQueries({ queryKey: ["fan", "activity"] });
      queryClient.invalidateQueries({ queryKey: ["moderation-warnings"] });
    },
  });

  useEffect(() => {
    if (direction !== "received" || !activityQuery.data?.unreadCount || acknowledgeVisibleActivity.isPending) return;
    acknowledgeVisibleActivity.mutate();
  }, [direction, activityQuery.data?.unreadCount, acknowledgeVisibleActivity.isPending]); // eslint-disable-line react-hooks/exhaustive-deps

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
      {seenByOpen && user?.username ? <ProfileConnectionsModal counts={{ "seen-by": todaySeenCount }} displayName={user.name} isOwn onClose={() => setSeenByOpen(false)} type="seen-by" username={user.username} /> : null}
      {previewGift ? <ActivityGiftPreview activity={previewGift} key={previewGift.id} onClose={closeGiftPreview} /> : null}
      {previewMention ? <StoryMentionSheet item={previewMention} key={previewMention.id} onClose={() => setPreviewMention(null)} /> : null}
      <header className="activity-prototype-header">
        <button className="activity-prototype-back" aria-label={__msg("profile.goBack")} onClick={goBack} type="button">
          <FiArrowLeft data-ui-directional="true" aria-hidden="true" />
        </button>
        {introOpen ? <><p>{__msg("fan.reactionsPeopleAndEarningsEverythingThatFoundYou")}</p><button className="activity-prototype-dismiss" aria-label={__msg("fan.dismissActivityIntroduction")} onClick={() => { try { localStorage.setItem("atseen_activity_intro_dismissed", "1"); } catch { /* best effort */ } setIntroOpen(false); }} type="button">&times;</button></> : null}
      </header>

      <div className="activity-prototype-segment" aria-label={__msg("fan.activityDirection")} role="tablist">
        <button
          aria-selected={direction === "received"}
          className={direction === "received" ? "is-active" : ""}
          onClick={() => updateSearch("received")}
          role="tab"
          type="button"
        >{__msg("fan.received")}</button>
        <button
          aria-selected={direction === "sent"}
          className={direction === "sent" ? "is-active" : ""}
          onClick={() => updateSearch("sent")}
          role="tab"
          type="button"
        >{__msg("fan.sent")}</button>
      </div>

      <p className="activity-prototype-direction-help">
        {direction === "received" ? __msg("fan.whatReachedYouOthersDidThis") : __msg("fan.whatYouDidThisIsWhatTheyReceive")}
      </p>

      <FilterChips filter={filter} filters={filters} onChange={(nextFilter) => updateSearch(direction, nextFilter)} />

      {direction === "received" && filter === "earnings" ? (
        <button className="activity-wallet-card" onClick={() => navigate("/wallet")} type="button">
          <FiZap aria-hidden="true" />
          <span>
            <strong>{Number(walletQuery.data?.balance || 0).toLocaleString(__uiLocale())} {__msg("admin.stars")}</strong>
            <small>{__msg("fan.walletBalance")}</small>
          </span>
          <FiChevronRight data-ui-directional="true" aria-hidden="true" />
        </button>
      ) : null}

      <section className="activity-prototype-list">
        {!loading && !failed && todaySeenCount > 0 && todaySeenPeople.length ? (
          <button className="activity-today-seen" onClick={() => setSeenByOpen(true)} type="button">
            <span className="activity-today-seen-avatars">
              {todaySeenPeople.slice(0, 3).map((person, index) => <FanAvatar key={person.id || person.username || index} name={creatorName(person)} size="h-[26px] w-[26px]" src={person.avatarUrl || person.avatar} />)}
            </span>
            <span className="activity-today-seen-copy">
              <span><b>{todaySeenPeople.slice(0, 2).map((person) => creatorName(person).split(" ")[0]).join(", ")}</b>{todaySeenCount > 2 ? __msg("fan.andMore", { value0: todaySeenCount - 2 }) : ""} {__msg("profile.saidISeeYou")}</span>
              <small>{__msg("fan.today")} {todaySeenCount}</small>
            </span>
            <FiChevronRight data-ui-directional="true" aria-hidden="true" />
          </button>
        ) : null}
        {!loading && sentSeenPeople.length ? (
          <article className="activity-prototype-row">
            <ActivityAvatar item={{ relatedCreators: sentSeenPeople }} />
            <div className="activity-prototype-copy">
              <p>{__msg("fan.youSaidISeeYou")} <b>{sentSeenPeople.slice(0, 2).map((person) => creatorName(person).split(" ")[0]).join(" and ")}</b>{sentSeenPeople.length > 2 ? __msg("fan.andMore", { value0: sentSeenPeople.length - 2 }) : ""}</p>
              <span className="activity-sent-seen-meta">{__msg("fan.theySeeItInTheirActivity")} {sentSeenPeople.length}</span>
            </div>
          </article>
        ) : null}
        {loading ? <ActivitySkeleton /> : null}
        {failed ? (
          <div className="activity-prototype-state">
            <FiRefreshCw aria-hidden="true" />
            <strong>{__msg("fan.couldNotLoadActivity")}</strong>
            <p>{__msg("fan.tryAgainWhenTheConnectionSettles")}</p>
            <button
              onClick={() => {
                activityQuery.refetch();
                ledgerQuery.refetch();
              }}
              type="button"
            >{__msg("discover.tryAgain")}</button>
          </div>
        ) : null}
        {!loading && !failed ? listItems.map((item) => (
          <ActivityItem
            acknowledged={isGiftThanksActivity(item)
              ? acknowledged.has(String(item.id))
              : item.acknowledged || acknowledged.has(String(item.id))}
            item={item}
            key={item.id}
            onAcknowledge={acknowledge}
            onOpen={(entry) => {
              if (entry.canAcknowledge && !entry.acknowledged) acknowledge(entry.id);
              if (entry.target?.type === "STORY" && entry.aggregate?.ids?.length && !entry.acknowledged) {
                setAcknowledged((current) => { const next = new Set([...current, entry.id, ...entry.aggregate.ids].map(String)); saveAcknowledged(next); return next; });
                for (const id of entry.aggregate.ids) activityAcknowledge.mutate(id);
              }
              if (entry.direction === "received" && ["profile_seen", "profile_seen_group"].includes(entry.type)) {
                setSeenByOpen(true);
              } else if (entry.type === "story_mention" && entry.direction === "received" && entry.target?.type === "STORY") {
                setPreviewMention(entry);
              } else if (isGiftThanksActivity(entry)) {
                window.dispatchEvent(new CustomEvent(GIFT_THANKS_OPEN_EVENT, { detail: entry }));
              } else if (isGiftActivity(entry)) {
                setPreviewGift(entry);
              } else {
                navigate(routeFor(entry));
              }
            }}
            starsPerUsd={walletQuery.data?.starsPerUsd}
          />
        )) : null}
        {!loading && !failed && !listItems.length && !todaySeenCount && !sentSeenPeople.length ? (
          <ActivityEmptyState direction={direction} filter={filter} onOpenOrbit={() => navigate("/orbit")} />
        ) : null}
        {!loading && !failed && visible.length && hasMore ? (
          <button className="activity-load-more" onClick={() => setPage((current) => current + 1)} type="button">{__msg("fan.loadMore")}</button>
        ) : null}
      </section>
    </main>
  );
}
