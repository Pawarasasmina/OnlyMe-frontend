import { useFanToast } from "../../components/fanWeb/shared/FanToastContext";
import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import OwnerThingsSheet from "../../components/profile/OwnerThingsSheet";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiArrowLeft,
  FiBarChart2,
  FiBookmark,
  FiCalendar,
  FiChevronRight,
  FiEye,
  FiFlag,
  FiGift,
  FiGrid,
  FiMail,
  FiMapPin,
  FiMessageCircle,
  FiMoreHorizontal,
  FiPlus,
  FiUser,
  FiFileText,
  FiRefreshCw,
  FiRepeat,
  FiSend,
  FiSettings,
  FiSlash,
  FiPhone,
  FiLink,
  FiX,
} from "react-icons/fi";
import DirectAccessOfferModal from "../../components/profile/DirectAccessOfferModal";
import AppShareSheet from "../../components/share/ShareSheet";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import FanCreateSheet from "../../components/fanWeb/FanCreateSheet";
import FanCard from "../../components/fanWeb/shared/FanCard";
import FeedPost from "../../components/fanWeb/home/FeedPost";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import ProfileConnectionsModal from "../../components/profile/ProfileConnectionsModal";
import MemberTicket from "../../components/profile/MemberTicket";
import "../../styles/profileCategory.css";
import "../../styles/publicProfile.css";
import "../../styles/businessContactActions.css";
import ProfileContentGrid from "../../components/profile/ProfileContentGrid";
import ProfileDream, { GiftCelebration } from "../../components/profile/ProfileDream";
import ProfileMediaSection from "../../components/profile/ProfilePhotosSection";
import ProfileOrbit from "../../components/profile/ProfileOrbit";
import ShowMoreEyeIcon from "../../components/branding/ShowMoreEyeIcon";
import StoryHighlights from "../../components/profile/StoryHighlights";
import StoryCreator from "../../components/stories/StoryCreator";
import StoryGiftPicker from "../../components/stories/StoryGiftPicker";
import StoryViewer from "../../components/stories/StoryViewer";
import ContentEmptyState from "../../components/shared/ContentEmptyState";
import ActivitySparkMark from "../../components/activity/ActivitySparkMark";
import ProfileVerifiedSeal from "../../components/profile/ProfileVerifiedSeal";
import { useAuth } from "../../hooks/useAuth";
import { useUnreadActivityCount } from "../../hooks/useUnreadActivityCount";
import { useCreatorStories } from "../../hooks/useStories";
import { messageService } from "../../services/messageService";
import { analyticsService } from "../../services/analyticsService";
import { creatorService } from "../../services/creatorService";
import { sortedProfileGifts } from "../../utils/profileGifts";
import { profileGiftCopy } from "../../utils/profileGiftCopy";
import { profileService } from "../../services/profileService";
import { savedService } from "../../services/savedService";
import { resolveMediaUrl } from "../../utils/media";
import { followInvalidationKeys } from "../../utils/savedPeople";
import { canCreateFeedPost } from "../../utils/postPermissions";
import { canCreateStory } from "../../utils/storyPermissions";
import { atseenReportReasons } from "../../data/atseenMockData";
import { WaysToEarnDetailSheet } from "../creator/WaysToEarnPage";

function ReportDoneEyeIcon() {
  __useUiLanguage();
  return (
    <svg aria-hidden="true" className="profile-gift-report-eye" viewBox="0 0 64 40">
      <path d="M2 20 C14 3 50 3 62 20 C50 37 14 37 2 20 Z" fill="currentColor" />
      <circle cx="32" cy="20" r="8.5" fill="#0A0C0F" />
    </svg>
  );
}

function relativeTime(value) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return "";
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function compact(value) {
  const number = Number(value) || 0;
  if (number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}K`;
  return number.toLocaleString(__uiLocale());
}

function groupedProfileGifts(gifts) {
  const grouped = new Map();
  gifts.forEach((gift) => {
    const key = [gift.name, gift.sender?.id || gift.sender?.username || "private", gift.visibility].join(":");
    const current = grouped.get(key);
    if (current) {
      current.quantity += 1;
      return;
    }
    grouped.set(key, { ...gift, quantity: 1 });
  });
  return [...grouped.values()];
}

const PUBLIC_WORLD_STATUSES = new Set(["PUBLISHED", "CHANGES_REQUESTED", "PENDING_REVIEW", "REJECTED"]);

function worldCreateTarget(planets = []) {
  const existing = planets.find((planet) => PUBLIC_WORLD_STATUSES.has(planet.status))
    || planets.find((planet) => planet.status === "DRAFT");
  if (!existing?.id) return "";
  return PUBLIC_WORLD_STATUSES.has(existing.status) ? `/world/${existing.id}` : `/studio/worlds/${existing.id}/edit`;
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}


async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
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
  return copied;
}

function invalidateFollowSurfaces(queryClient) {
  return Promise.all(followInvalidationKeys().map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

function ProfileViewersSheet({ isOpen, onClose }) {
  __useUiLanguage();
  const viewersQuery = useQuery({
    queryKey: ["profile", "me", "viewers"],
    queryFn: () => profileService.getOwnViewers({ limit: 30 }).then((response) => response.data.data),
    enabled: isOpen,
    retry: false,
    staleTime: 30000,
  });
  const signals = viewersQuery.data?.signals || [];
  const todaySignals = signals.filter((item) => isToday(item.createdAt));
  const count = Number(viewersQuery.data?.seenTodayCount) || 0;
  const worldVisitorCount = Number(viewersQuery.data?.worldVisitorCount) || 0;
  const hiddenCount = Math.max(0, count - todaySignals.length);

  if (!isOpen) return null;

  return (
    <div aria-modal="true" className="profile-viewers-backdrop" onClick={onClose} role="dialog">
      <section className="profile-viewers-sheet" onClick={(event) => event.stopPropagation()}>
        <span className="profile-viewers-handle" />
        <button aria-label={__msg("social.closeWhoSawYou")} className="profile-viewers-close" onClick={onClose} type="button"><FiX /></button>
        <div className="profile-viewers-summary">
          {viewersQuery.isLoading ? <LoadingSkeleton className="h-16" count={1} /> : (
            <>
              <strong>{compact(count)}</strong>
              <span>{__msg("fanWeb.sawYouToday")}</span>
              <small>{__msg("social.whoExactlyStaysPrivate")}</small>
            </>
          )}
        </div>
        {viewersQuery.isError ? (
          <button className="profile-viewers-retry" onClick={() => viewersQuery.refetch()} type="button"><FiRefreshCw /> {__msg("social.unableToLoadActivityRetry")}</button>
        ) : null}
        {!viewersQuery.isLoading && !viewersQuery.isError ? (
          <div className="profile-viewers-list">
            {todaySignals.map((item) => {
              const actor = item.actor;
              return (
                <Link className="profile-viewers-row" key={item.id} to={actor?.username ? `/profile/${actor.username}` : "/activity"}>
                  <FanAvatar name={actor?.displayName || "Activity"} size="h-[42px] w-[42px]" src={actor?.avatarUrl} />
                  <span>
                    <b>{actor?.displayName || __msg("creator.recentActivity")}</b>
                    <small>{item.description || __msg("social.sawYourProfile")} {relativeTime(item.createdAt) ? `- ${relativeTime(item.createdAt)}` : ""}</small>
                  </span>
                  <FiChevronRight data-ui-directional="true" />
                </Link>
              );
            })}
            {hiddenCount > 0 ? (
              <Link className="profile-viewers-row is-aggregate" to="/activity">
                <span>{compact(hiddenCount)} {__msg("social.steppedInsideYourWorlds")}</span>
                <FiChevronRight data-ui-directional="true" />
              </Link>
            ) : null}
            {worldVisitorCount > 0 ? (
              <Link className="profile-viewers-row is-aggregate" to="/activity">
                <span>{compact(worldVisitorCount)} {__msg("social.steppedInsideYourWorlds")}</span>
                <FiChevronRight data-ui-directional="true" />
              </Link>
            ) : null}
            {!count ? <p className="profile-viewers-empty">{__msg("social.noOneIsAtSeenRightNow")}</p> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ProfileShareSheet({ isOpen, onClose, profile, shareUrl }) {
  __useUiLanguage();
  const firstName = String(profile.displayName || profile.username || __msg("social.profile")).trim().split(/\s+/)[0] || __msg("social.profile");

  if (!isOpen) return null;
  return <AppShareSheet
    isOpen
    onClose={onClose}
    payload={{
      canonicalUrl: shareUrl,
      contentId: String(profile.ownerUserId || profile.id || profile._id || ""),
      contentType: "profile",
      destinationRoute: `/profile/${encodeURIComponent(profile.username)}`,
      imageUrl: resolveMediaUrl(profile.avatar),
      textPreview: firstName,
      title: `${profile.displayName || firstName} on @seen`,
    }}
    variant="seen"
  />;
}

function ProfileSkeleton() {
  __useUiLanguage();
  return (
    <div className="profile-prototype">
      <LoadingSkeleton className="h-10" count={1} />
      <LoadingSkeleton className="h-[150px]" count={1} />
      <LoadingSkeleton className="h-20" count={1} />
      <LoadingSkeleton className="h-14" count={2} />
      <LoadingSkeleton className="h-36" count={1} />
      <LoadingSkeleton className="h-28" count={1} />
      <LoadingSkeleton className="h-64" count={1} />
    </div>
  );
}

function ProfileCreateSheet({ canCreateSeen, canCreateStoryNow, canCreateWorld, canPostNote, isOpen, onClose, onNote, onStory, worldTarget = "" }) {
  __useUiLanguage();
  return <FanCreateSheet canCreateSeen={canCreateSeen} canCreateStoryNow={canCreateStoryNow} canCreateWorld={canCreateWorld} canPostNote={canPostNote} isOpen={isOpen} onClose={onClose} onNote={onNote} onStory={onStory} worldTarget={worldTarget} />;
}

function TopProfileBar({ planets = [], profile, viewerCapabilities = {} }) {
  __useUiLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const unread = useUnreadActivityCount(Boolean(user));
  const [createOpen, setCreateOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const canCreateStoryNow = viewerCapabilities.canCreate && canCreateStory(user);
  const canPostNote = canCreateFeedPost(user);
  const worldTarget = worldCreateTarget(planets);
  const openCreate = () => {
    setCreateOpen(true);
  };

  const openStory = () => {
    setCreateOpen(false);
    setStoryOpen(true);
  };

  const openNote = () => {
    setCreateOpen(false);
    navigate(`/wall?compose=note&composeRequest=${Date.now()}`);
  };

  return (
    <>
      <header className="profile-prototype-topbar">
        <span dir="auto"><b>@</b>{profile.username}</span>
        <div>
          <button aria-expanded={createOpen} aria-label={__msg("fanWeb.create")} className="profile-top-icon" onClick={openCreate} type="button"><FiPlus /></button>
          <Link aria-label={__msg("social.activity")} className="is-activity" to="/activity">
            <ActivitySparkMark className="h-5 w-5" />
            {unread > 0 ? <i className="activity-count-badge">{unread > 99 ? "99+" : unread}</i> : null}
          </Link>
        </div>
      </header>
      <ProfileCreateSheet
        canCreateSeen={viewerCapabilities.canCreate}
        canCreateWorld={profile.profileAccountType !== "personal" && viewerCapabilities.canAccessStudio}
        canCreateStoryNow={canCreateStoryNow}
        canPostNote={canPostNote}
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onNote={openNote}
        onStory={openStory}
        worldTarget={worldTarget}
      />
      <StoryCreator isOpen={storyOpen} onClose={() => setStoryOpen(false)} />
    </>
  );
}

function OwnerQuickActionsSheet(props) {
  __useUiLanguage();
  return <OwnerThingsSheet {...props} />;
}

export function VisitorMoreSheet({ isOpen, onClose, profile }) {
  __useUiLanguage();
  const client = useQueryClient();
  const { showToast } = useFanToast();
  const [busy, setBusy] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [sheetPosition, setSheetPosition] = useState(undefined);
  useEffect(() => {
    if (!isOpen) return undefined;
    const centerColumn = document.querySelector(".social-center-scroll");
    const updatePosition = () => {
      if (!centerColumn) return;
      const bounds = centerColumn.getBoundingClientRect();
      setSheetPosition({ "--visitor-menu-center-x": `${bounds.left + (bounds.width / 2)}px`, "--visitor-menu-column-width": `${bounds.width}px` });
    };
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("keydown", closeOnEscape);
    const observer = typeof ResizeObserver === "undefined" || !centerColumn ? null : new ResizeObserver(updatePosition);
    observer?.observe(centerColumn);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("keydown", closeOnEscape);
      observer?.disconnect();
    };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  const publicPath = `/profile/${encodeURIComponent(profile.username)}`;
  const shareTarget = `${window.location.origin}${publicPath}`;
  const firstName = String(profile.displayName || profile.username || __msg("social.profile")).trim().split(/\s+/)[0];

  const run = async (name, action) => {
    setBusy(name);
    setError("");
    try { await action(); } catch (requestError) { setError(requestError.response?.data?.message || __msg("social.couldNotValue0", { value0: name.toLowerCase() })); } finally { setBusy(""); }
  };
  const share = () => run(__msg("profile.shareProfile"), async () => {
    await copyText(shareTarget);
    showToast(__msg("profile.linkCopied"));
    onClose();
  });
  const report = (reason) => run(__msg("discover.report"), async () => {
    await profileService.reportProfile(profile.username, { reason });
    setReporting(false);
    setReportDone(true);
  });
  const block = () => {
    run(blocked ? __msg("fan.unblock") : __msg("profile.block"), async () => {
      if (blocked) await messageService.unblock(profile.ownerUserId); else await messageService.block(profile.ownerUserId);
      setBlocked((value) => !value);
      await Promise.all([client.invalidateQueries({ queryKey: ["unified-profile"] }), client.invalidateQueries({ queryKey: ["settings", "blocked-accounts"] }), client.invalidateQueries({ queryKey: ["messages"] })]);
      onClose();
    });
  };
  return (
    <div aria-modal="true" className="profile-quick-actions-backdrop is-visitor-menu" onClick={() => { setReporting(false); setReportDone(false); onClose(); }} role="dialog" style={sheetPosition}>
      <section className={`profile-quick-actions-sheet is-visitor ${reportDone ? "is-report-done" : !reporting ? "is-main" : ""}`} onClick={(event) => event.stopPropagation()}>
        <span className="profile-quick-actions-handle" />
        {reportDone ? <div className="profile-report-done-panel"><FiEye aria-hidden="true" /><h2>{__msg("social.thankYou")}</h2><p>{__msg("social.ourTeamWillReviewThisShortly")}</p><button onClick={() => { setReportDone(false); onClose(); }} type="button">{__msg("comments.done")}</button></div> : reporting ? <><h2>{__msg("profile.report", { value0: firstName })}</h2><div className="profile-quick-actions-list"><p className="px-4 py-2 text-xs text-white/50">{__msg("social.whyAreYouReportingThisProfile")}</p>{atseenReportReasons.map((reason) => <button className="profile-quick-action-row" disabled={Boolean(busy)} key={reason} onClick={() => report(reason)} type="button"><span className="profile-quick-action-icon"><FiFlag /></span><span className="profile-quick-action-copy"><b>{reason}</b></span></button>)}<button className="profile-quick-action-row" disabled={Boolean(busy)} onClick={() => setReporting(false)} type="button"><span className="profile-quick-action-copy"><b>{__msg("discover.back")}</b></span></button></div></> : <><h2>{firstName}</h2><div className="profile-quick-actions-list">
          <button className="profile-quick-action-row" disabled={Boolean(busy)} onClick={share} type="button"><span className="profile-quick-action-icon"><FiSend /></span><span className="profile-quick-action-copy"><b>{__msg("profile.shareProfile")}</b></span></button>

          <button className="profile-quick-action-row" disabled={Boolean(busy)} onClick={() => setReporting(true)} type="button"><span className="profile-quick-action-icon"><FiFlag /></span><span className="profile-quick-action-copy"><b>{__msg("discover.report")}</b></span></button>
            <button className="profile-quick-action-row is-danger has-description" disabled={Boolean(busy)} onClick={block} type="button"><span className="profile-quick-action-icon"><FiSlash /></span><span className="profile-quick-action-copy"><b>{blocked ? __msg("social.unblock", { value0: firstName }) : __msg("social.block", { value0: firstName })}</b><small>{blocked ? __msg("social.allowThemToFindAndMessageYou") : __msg("social.theyWonTFindYouOrMessageYou")}</small></span></button>
        </div></>}
        {error ? <p className="profile-visitor-action-error" role="alert">{__systemMessage(error)}</p> : null}
      </section>
    </div>
  );
}

function MoreMenu({ isOwner, profile, relationship = {} }) {
  __useUiLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const bringFriends = searchParams.get("bringFriends") === "1";
  const [open, setOpen] = useState(false);
  useEffect(() => { if (isOwner && bringFriends) setOpen(true); }, [isOwner, bringFriends]);
  const closeOwner = () => { setOpen(false); if (bringFriends) { const params = new URLSearchParams(searchParams); params.delete("bringFriends"); setSearchParams(params, { replace: true }); } };
  return (
    <span className="profile-more-wrap">
      <button aria-expanded={open} aria-label={__msg("social.moreProfileActions")} className="profile-action-chip is-icon" onClick={() => setOpen((value) => !value)} type="button"><FiMoreHorizontal /></button>
      {isOwner ? (
        <OwnerQuickActionsSheet initialView={bringFriends ? "friends" : "menu"} isOpen={open} onClose={closeOwner} />
      ) : (
        <VisitorMoreSheet isOpen={open} onClose={() => setOpen(false)} profile={profile} relationship={relationship} />
      )}
    </span>
  );
}

function VisitorProfileBar({ profile, relationship, viewerCapabilities }) {
  __useUiLanguage();
  const navigate = useNavigate();
  return (
    <header className="profile-prototype-topbar profile-visitor-topbar">
      <button aria-label={__msg("profile.goBack")} className="profile-visitor-back" onClick={() => navigate(-1)} type="button"><FiArrowLeft data-ui-directional="true" /></button>
      <div><span dir="auto" className="profile-visitor-username"><b>@</b>{profile.username}</span><MoreMenu isOwner={false} profile={profile} relationship={relationship} viewerCapabilities={viewerCapabilities} /></div>
    </header>
  );
}

function metricValue(metrics = {}, key, fallback = 0) {
  return metrics[key] ?? metrics[`${key}Count`] ?? fallback;
}

function IdentitySection({ hasStories = false, metrics = {}, onConnectionsOpen, onStoriesCreate, onStoriesOpen, planets = [], profile, relationship = {}, viewerCapabilities }) {
  __useUiLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewersOpen, setViewersOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [directGiftOpen, setDirectGiftOpen] = useState(false);
  const [seenConfirmation, setSeenConfirmation] = useState(false);
  const isOwner = viewerCapabilities.isOwner;
  const avatar = resolveMediaUrl(profile.avatar);
  const activeStatus = profile.activeStatus || null;
  const statusColor = activeStatus?.color || "#9CCBFF";
  const shareUrl = `${window.location.origin}/profile/${profile.username}`;
  const editStatus = () => isOwner && navigate("/profile/status");
  const statusText = activeStatus?.label || "";
  const world = profile.profileAccountType === "personal" ? null : planets.find((item) => item.kind === "PREMIUM_WORLD");
  const worldTarget = world?.id ? `/world/${world.id}` : "";
  const showSeenConfirmation = () => setSeenConfirmation(true);
  const seeSignal = useMutation({
    mutationFn: () => profileService.toggleSeeSignal(profile.username),
    onSuccess: () => {
      showSeenConfirmation();
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      queryClient.invalidateQueries({ queryKey: ["wall", "saw-you-today"] });
      queryClient.invalidateQueries({ queryKey: ["profile", "me", "viewers"] });
      queryClient.invalidateQueries({ queryKey: ["fan", "activity"] });
    },
  });

  useEffect(() => {
    if (!seenConfirmation) return undefined;
    const timer = window.setTimeout(() => setSeenConfirmation(false), 3200);
    return () => window.clearTimeout(timer);
  }, [seenConfirmation]);

  const markProfileSeen = () => {
    if (!seeSignal.isPending) seeSignal.mutate();
  };
  const seenByCount = metricValue(metrics, "seenBy", 0);
  const identityMetrics = [
    ["followers", "Followers", metrics.followerCount, () => onConnectionsOpen?.("followers")],
    ["following", "Following", metrics.followingCount, () => onConnectionsOpen?.("following")],
    ["seen-by", "Seen by", seenByCount, () => onConnectionsOpen?.("seen-by")],
  ];

  return (
    <section className="profile-identity is-owner">
      {!isOwner && seenConfirmation ? <div className="profile-seen-confirmation" role="status"><FiEye /> {__msg("social.only")} {profile.displayName?.split(" ")[0] || __msg("stories.they_f1fdd4")} {__msg("social.seesThis")}</div> : null}
      <div className="profile-identity-row">
        <div className={`profile-avatar-orbit-shell ${profile.friendInviteRingEarned ? "has-invite-gold-ring" : ""} ${world ? "has-world" : ""}`}>
          {world ? <span aria-hidden="true" className="profile-avatar-world-orbit-ring" /> : null}
          <button aria-label={hasStories ? __msg("social.viewSStories", { value0: profile.displayName }) : __msg("social.checkSStories", { value0: profile.displayName })} className={`profile-avatar-ring ${hasStories ? "has-stories" : "no-stories"}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onStoriesOpen?.(); }} style={{ "--profile-status-color": statusColor }} type="button">
            <FanAvatar name={profile.displayName} size="h-[70px] w-[70px]" src={avatar} />
          </button>
          {world ? <span className="profile-avatar-world-rotor"><Link aria-label={__msg("contentEntities.open", { value0: world.title || `${profile.displayName}'s World` })} className="profile-avatar-world-planet" to={worldTarget} title={world.title || __msg("financial.openWorld")}>{world.planet?.emoji || "🪐"}</Link></span> : null}
          {activeStatus ? <span aria-label={__msg("social.onlineNow")} className="profile-avatar-now-dot" role="img" /> : null}
          {isOwner ? <button aria-label={__msg("social.createAStory")} className="profile-avatar-story-create" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onStoriesCreate?.(); }} type="button">+</button> : null}
        </div>
        <div className="profile-copy">
          <h1 dir="auto">
            {profile.displayName}
            {isOwner ? <MemberTicket profile={profile} /> : null}
            {profile.verified ? <ProfileVerifiedSeal isOwner={isOwner} name={profile.displayName} /> : null}
          </h1>
          <div className="profile-identity-metrics" aria-label={__msg("social.profileMetrics")}>
            {identityMetrics.map(([key, label, value, onClick]) => (
              <button aria-label={label} key={key} onClick={onClick} type="button">
                <strong>{compact(value)}</strong>
                <span>{label}</span>
              </button>
            ))}
          </div>
          {profile.bio?.trim() ? <p dir="auto" className="profile-identity-bio">{profile.bio}</p> : null}
          {isOwner && profile.email?.trim() ? <p dir="auto" className="profile-identity-email"><FiMail aria-hidden="true" />{profile.email}</p> : null}
        </div>
      </div>
      {isOwner || statusText ? (
        <button className={`profile-status-pill ${statusText ? "has-status" : "is-empty"}`} disabled={!isOwner} onClick={editStatus} style={{ "--profile-status-color": statusColor }} type="button">
          {statusText ? statusText : __msg("stories.rightNow")}
          {isOwner ? <FiChevronRight data-ui-directional="true" aria-hidden="true" /> : null}
        </button>
      ) : null}
      {profile.profileCategory ? <p className="profile-account-category">{profile.profileCategory}</p> : null}
      <div className={`profile-action-row ${isOwner ? "is-owner-actions" : ""}`}>
        {isOwner ? <Link className="profile-action-chip" to="/settings/profile">{__msg("profile.edit")}</Link> : null}
        {!isOwner ? <button aria-label={__msg("social.letKnowYouSawThem", { value0: profile.displayName })} className={`profile-visitor-eye ${relationship.seeSignalSent ? "is-seen" : ""}`} disabled={seeSignal.isPending} onClick={markProfileSeen} type="button"><ShowMoreEyeIcon /></button> : null}
        {!isOwner && viewerCapabilities.canFollow ? <VisitorFollowButton profile={profile} relationship={relationship} /> : null}
        {!isOwner && viewerCapabilities.canMessage ? <button className="profile-action-chip" onClick={() => navigate(`/messages?with=${encodeURIComponent(profile.ownerUserId)}`)} type="button">{__msg("discover.message")}</button> : null}
        {!isOwner && viewerCapabilities.canMessage ? <button aria-label={__msg("social.sendAGift", { value0: profile.displayName })} className="profile-visitor-gifts" onClick={() => setDirectGiftOpen(true)} type="button"><FiGift /></button> : null}
        {isOwner ? <button className="profile-action-chip" onClick={() => setShareOpen(true)} type="button">{__msg("admin.share")}</button> : null}
        {isOwner ? <MoreMenu isOwner profile={profile} relationship={relationship} viewerCapabilities={viewerCapabilities} /> : null}
      </div>
      <ProfileViewersSheet isOpen={viewersOpen} onClose={() => setViewersOpen(false)} />
      <ProfileShareSheet isOpen={shareOpen} onClose={() => setShareOpen(false)} profile={profile} shareUrl={shareUrl} />
      {directGiftOpen ? <StoryGiftPicker onClose={() => setDirectGiftOpen(false)} recipient={{ id: profile.ownerUserId, name: profile.displayName, username: profile.username, avatar: resolveMediaUrl(profile.avatar) }} sourceType="DIRECT" /> : null}
    </section>
  );
}

function VisitorFollowButton({ profile, relationship = {} }) {
  __useUiLanguage();
  const client = useQueryClient();
  const follow = useMutation({
    mutationFn: () => profileService.toggleFollow(profile.username),
    onSuccess: () => invalidateFollowSurfaces(client),
  });
  const following = Boolean(relationship.following);
  return <button className={`profile-action-chip profile-follow-action ${following ? "is-following" : ""}`} disabled={follow.isPending} onClick={() => follow.mutate()} type="button">{following ? __msg("activity.following") : __msg("discover.follow")}</button>;
}

function DirectAccessRow({ profile, viewerCapabilities }) {
  __useUiLanguage();
  const navigate = useNavigate();
  const [offerOpen, setOfferOpen] = useState(false);
  const windows = useQuery({
    queryKey: ["messages", "direct-access"],
    queryFn: () => messageService.getDirectAccessWindows().then((response) => response.data.data.windows),
    enabled: profile.isCreator && viewerCapabilities.isOwner,
    staleTime: 30000,
  });
  if (!profile.isCreator) return null;
  if (!viewerCapabilities.isOwner && !viewerCapabilities.canMessage) return null;
  if (!viewerCapabilities.isOwner && !profile.directAccess?.enabled && !profile.directAccess?.callEnabled) return null;
  const waiting = (windows.data || []).filter((item) => item.settlementStatus === "HELD").length;
  const meta = [
    profile.directAccess?.enabled ? `Messages ${String.fromCharCode(10022)}${profile.directAccess.priceStars}` : "",
    profile.directAccess?.callEnabled ? `Calls ${String.fromCharCode(10022)}${profile.directAccess.callPriceStars} / ${profile.directAccess.callDurationMinutes} min` : "",
    "chats & requests",
  ].filter(Boolean).join(" - ");
  const open = () => viewerCapabilities.isOwner
    ? navigate("/settings/direct-access", { state: { returnTo: "/profile" } })
    : setOfferOpen(true);
  return (
    <>
      <button className="profile-row profile-direct-row" onClick={open} type="button">
        <span className="profile-row-orb"><FiMessageCircle /></span>
        <span className="min-w-0 flex-1">
          <b>Direct Access {waiting ? <i> - {waiting} {__msg("profile.waiting")}</i> : null}</b>
          <small>{meta}</small>
        </span>
        {viewerCapabilities.isOwner ? <Link aria-label={__msg("settings.directAccessSettings")} onClick={(event) => event.stopPropagation()} state={{ returnTo: "/profile" }} to="/settings/direct-access"><FiSettings /></Link> : null}
        <FiChevronRight data-ui-directional="true" />
      </button>
      {offerOpen ? <DirectAccessOfferModal onClose={() => setOfferOpen(false)} profile={profile} /> : null}
    </>
  );
}

function ProfileAccessGroup({ profile, viewerCapabilities }) {
  __useUiLanguage();
  const canShowDashboard = profile.isCreator && viewerCapabilities.isOwner && viewerCapabilities.canAccessStudio;
  const canShowDirect = profile.profileAccountType !== "personal" && profile.isCreator && (viewerCapabilities.isOwner || viewerCapabilities.canMessage) && (viewerCapabilities.isOwner || profile.directAccess?.enabled || profile.directAccess?.callEnabled);
  if (!canShowDashboard && !canShowDirect) return null;
  return (
    <section className="profile-access-group">
      {canShowDirect ? <DirectAccessRow profile={profile} viewerCapabilities={viewerCapabilities} /> : null}
      {canShowDashboard ? (
        <>
          <Link className="profile-row profile-dashboard-row" to="/studio"><FiBarChart2 /><span>{profile.profileAccountType === "business" ? __msg("social.businessDashboard") : profile.profileAccountType === "personal" ? __msg("layouts.earnings") : __msg("social.creatorDashboard")}</span><FiChevronRight data-ui-directional="true" /></Link>
        </>
      ) : null}
    </section>
  );
}

function BusinessContactActions({ profile, isOwner }) {
  const navigate = useNavigate();
  if ((profile.profileAccountType || profile.profileType) !== "business") return null;
  const contact = profile.businessContact || {};
  const enabled = new Set(contact.enabled || []);
  const actions = [
    { id: "call", label: "Call", Icon: FiPhone, value: contact.call, href: contact.call ? `tel:${String(contact.call).replace(/[^+\d]/g, "")}` : "" },
    { id: "directions", label: "Directions", Icon: FiMapPin, value: contact.directions, href: contact.directions ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.directions)}` : "" },
    { id: "website", label: __msg("settings.website"), Icon: FiLink, value: contact.website, href: contact.website || "" },
  ].filter((item) => enabled.has(item.id) && (isOwner || item.value));
  if (!actions.length) return null;
  const open = (item) => {
    if (!item.href) return navigate("/settings/profile?from=profile");
    if (item.id === "call") window.location.href = item.href;
    else window.open(item.href, "_blank", "noopener,noreferrer");
  };
  return <div className="profile-business-contact-actions">{actions.map(({ Icon, ...item }) => <button key={item.id} onClick={() => open(item)} type="button"><Icon aria-hidden="true" />{item.label}</button>)}</div>;
}

function NewProfileStarter({ data, onStartSeen }) {
  const navigate = useNavigate();
  const { profile, viewerCapabilities } = data;
  const steps = [
    {
      key: "photo",
      title: "Add a profile photo",
      detail: "People follow faces",
      done: Boolean(profile.avatar),
      Icon: FiUser,
      to: "/settings/profile?from=profile",
    },
    {
      key: "status",
      title: "Set your status",
      detail: "What you're up to",
      done: Boolean(profile.activeStatus?.label),
      Icon: FiMessageCircle,
      to: "/profile/status",
    },
    {
      key: "seen",
      title: "Post your first Seen",
      detail: "A story in chapters",
      done: Boolean(data.seens?.length),
      Icon: FiFileText,
      to: "/create/seen?type=free",
    },
  ];
  const completed = steps.filter((step) => step.done).length;
  if (!viewerCapabilities.isOwner || completed === steps.length) return null;
  return (
    <section aria-label="Get started" className="profile-get-started">
      <header><strong>Get started</strong><span>{completed} of {steps.length}</span></header>
      <div aria-hidden="true" className="profile-get-started-progress"><i style={{ width: `${(completed / steps.length) * 100}%` }} /></div>
      <div className="profile-get-started-cards">
        {steps.map(({ Icon, ...step }) => (
          <button className={step.done ? "is-done" : ""} key={step.key} onClick={() => { if (step.done) return; if (step.key === "seen") onStartSeen?.(); else navigate(step.to); }} type="button">
            <span className="profile-get-started-icon">{step.done ? "✓" : <Icon aria-hidden="true" />}</span>
            <b>{step.title}</b><small>{step.detail}</small>
            <em>{step.done ? "Done" : "Start ›"}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

function ProfileWaysToEarn({ data }) {
  const { profile, publicMetrics, viewerCapabilities } = data;
  const [activePitch, setActivePitch] = useState("");
  const hasPublishedContent = Boolean(
    Number(publicMetrics?.publishedContentCount || 0)
    || data.seens?.length
    || data.wallPosts?.length
    || data.media?.length
    || data.profileStories?.length
    || data.experiences?.length
    || data.planets?.length
  );
  const isVerifiedCreator = Boolean(
    profile.verified
    || profile.creatorApprovalStatus === "approved"
    || profile.creatorApplicationStatus === "verified"
    || viewerCapabilities.canAccessStudio
  );
  const showNewCreatorEarnings = Boolean(viewerCapabilities.isOwner && !isVerifiedCreator && !hasPublishedContent);
  const examples = useQuery({
    queryKey: ["ways-to-earn"],
    queryFn: () => creatorService.getWaysToEarn().then((response) => response.data.data),
    enabled: showNewCreatorEarnings,
    retry: false,
    staleTime: 30000,
  });
  if (!showNewCreatorEarnings) return null;
  const example = examples.data?.example;
  const money = (value) => new Intl.NumberFormat(__uiLocale(), { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0);
  const cards = [
    { key: "world", label: "World", value: money(example?.world?.income), note: `${compact(example?.world?.members)} members` },
    { key: "seen", label: "Paid Seen", value: money(example?.paidSeen?.income), note: `${compact(example?.paidSeen?.owners)} owners` },
    { key: "gift", label: "Gifts", value: money(example?.gifts?.income), note: `${compact(example?.gifts?.count)} gifts` },
  ];
  return (
    <>
      <section aria-label="Ways to earn" className="profile-ways-to-earn">
        <header><span><b>Ways to earn</b><small>{`What ${example?.name?.split(" ")[0] || "creators"} makes with each`}</small></span><Link to="/ways-to-earn">How ›</Link></header>
        <div>{cards.map((card) => <button aria-label={`Learn about ${card.label} earnings`} key={card.key} onClick={() => setActivePitch(card.key)} type="button"><article><b>{card.label}</b><strong>{examples.isLoading ? "…" : card.value}</strong><small>{card.note}</small></article></button>)}</div>
      </section>
      {activePitch && example ? <WaysToEarnDetailSheet example={example} onClose={() => setActivePitch("")} profile={profile} rate={Number(examples.data?.dashboard?.exchangeRate?.starsPerUsd) || 10} type={activePitch} /> : null}
    </>
  );
}

function ProfileGiftStrip({ profile, viewerCapabilities, viewerId }) {
  __useUiLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldOpenGiftPicker = searchParams.get("sendGift") === "1" && Boolean(profile?.ownerUserId);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const [sendGiftOpen, setSendGiftOpen] = useState(shouldOpenGiftPicker);
  const [giftRecipient, setGiftRecipient] = useState(() => shouldOpenGiftPicker
    ? { id: profile.ownerUserId, name: profile.displayName, avatar: resolveMediaUrl(profile.avatar), username: profile.username }
    : null);
  useEffect(() => {
    if (!shouldOpenGiftPicker) return;
    setGiftRecipient({ id: profile.ownerUserId, name: profile.displayName, avatar: resolveMediaUrl(profile.avatar), username: profile.username });
    setSendGiftOpen(true);
  }, [profile?.avatar, profile?.displayName, profile?.ownerUserId, profile?.username, shouldOpenGiftPicker]);
  const closeGiftPicker = () => {
    setSendGiftOpen(false);
    setGiftRecipient(null);
    if (searchParams.get("sendGift") !== "1") return;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("sendGift");
      return next;
    }, { replace: true });
  };
  const receivedQuery = useQuery({
    queryKey: ["profile", "received-gifts", viewerCapabilities.isOwner ? "me" : profile?.username],
    queryFn: () => (viewerCapabilities.isOwner ? profileService.getOwnReceivedGifts() : profileService.getReceivedGifts(profile.username)).then((response) => response.data.data),
    enabled: viewerCapabilities.isOwner || Boolean(profile?.username),
    retry: false,
    staleTime: 30000,
  });
  const directGiftPicker = sendGiftOpen && giftRecipient
    ? <StoryGiftPicker landing onClose={closeGiftPicker} previewOnly={viewerCapabilities.isOwner} recipient={giftRecipient} sourceType="DIRECT" />
    : null;
  const gifts = sortedProfileGifts(receivedQuery.data?.gifts || [], viewerId);
  const count = Number(receivedQuery.data?.total || gifts.length || 0);
  if (!gifts.length && !viewerCapabilities.isOwner) return directGiftPicker;
  return (
    <>
    <button aria-label={__msg("social.viewSGifts", { value0: profile.displayName?.split(" ")[0] || "creator" })} className="profile-gift-strip" id="profile-gifts" onClick={() => setGiftsOpen(true)} type="button">
      <span className="profile-gift-art" aria-hidden="true">
        {gifts.filter((gift, index, all) => all.findIndex((item) => (item.giftId || item.name) === (gift.giftId || gift.name)) === index).slice(0, 3).map((gift) => gift.imageUrl ? <img alt="" key={gift.key || gift.id || gift.name} src={gift.imageUrl} /> : <i key={gift.key || gift.id || gift.name}><FiGift /></i>)}
        {!gifts.length ? <i><FiGift /></i> : null}
      </span>
      <span className="profile-gift-copy">
        <b>{viewerCapabilities.isOwner ? `${compact(count || gifts.length)} ${(count || gifts.length) === 1 ? "gift" : "gifts"}` : `${compact(count || gifts.length)} ${(count || gifts.length) === 1 ? "gift" : "gifts"}`}</b>
      </span>
      <FiChevronRight data-ui-directional="true" />
    </button>
    <ReceivedGiftsSheet isOpen={giftsOpen} isOwner={viewerCapabilities.isOwner} onClose={() => setGiftsOpen(false)} onSendGift={(recipient = null) => { setGiftRecipient(recipient || { id: profile.ownerUserId, name: profile.displayName, avatar: resolveMediaUrl(profile.avatar), username: profile.username }); setGiftsOpen(false); setSendGiftOpen(true); }} profile={profile} viewerId={viewerId} />
    {directGiftPicker}
    </>
  );
}

function ReceivedGiftsSheet({ isOpen, isOwner, onClose, onSendGift, profile, viewerId }) {
  __useUiLanguage();
  const queryClient = useQueryClient();
  const backdropRef = useRef(null);
  const [sheetPosition, setSheetPosition] = useState(undefined);
  const [previewGift, setPreviewGift] = useState(null);
  const [detailGift, setDetailGift] = useState(null);
  const [thanking, setThanking] = useState(false);
  const [thankNotice, setThankNotice] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportingReason, setReportingReason] = useState("");
  const query = useQuery({
    queryKey: ["profile", "received-gifts", isOwner ? "me" : profile?.username],
    queryFn: () => (isOwner ? profileService.getOwnReceivedGifts() : profileService.getReceivedGifts(profile.username)).then((response) => response.data.data),
    enabled: isOpen,
    retry: false,
  });
  useEffect(() => {
    if (isOpen) return;
    setPreviewGift(null);
    setDetailGift(null);
    setThankNotice("");
    setReportOpen(false);
    setReportDone(false);
    setReportError("");
    setReportingReason("");
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return undefined;
    const close = (event) => event.key === "Escape" && (detailGift ? setDetailGift(null) : onClose());
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [detailGift, isOpen, onClose]);
  useEffect(() => {
    if (!isOpen) return undefined;
    const centerColumn = backdropRef.current?.closest(".social-center-scroll");
    if (!centerColumn) return undefined;
    const updatePosition = () => {
      const bounds = centerColumn.getBoundingClientRect();
      setSheetPosition({
        "--profile-gifts-center-x": `${bounds.left + bounds.width / 2}px`,
        "--profile-gifts-column-width": `${bounds.width}px`,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    observer?.observe(centerColumn);
    return () => {
      window.removeEventListener("resize", updatePosition);
      observer?.disconnect();
    };
  }, [isOpen]);
  useEffect(() => {
    if (!previewGift) return undefined;
    const timeout = window.setTimeout(() => {
      setDetailGift(previewGift);
      setPreviewGift(null);
    }, 2600);
    return () => window.clearTimeout(timeout);
  }, [previewGift]);
  useEffect(() => {
    if (!thankNotice) return undefined;
    const timeout = window.setTimeout(() => setThankNotice(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [thankNotice]);
  const gifts = sortedProfileGifts(query.data?.gifts || [], viewerId);
  const displayGifts = groupedProfileGifts(gifts);
  const total = Number(query.data?.total || gifts.length || 0);
  const selectedSender = detailGift?.sender || {};
  const giftValue = Number(detailGift?.stars || 0);
  const profileStateMutation = useMutation({
    mutationFn: ({ giftId, payload }) => profileService.updateReceivedGiftProfileState(giftId, payload).then((response) => response.data.data.gift),
    onError: (error) => setThankNotice(error.response?.data?.message || __msg("social.giftSettingCouldNotBeSaved")),
    onSuccess: async (gift) => {
      setDetailGift((current) => current?.id === gift.id ? { ...current, ...gift } : current);
      await query.refetch();
      await queryClient.invalidateQueries({ queryKey: ["profile", "received-gifts"] });
    },
  });
  const reportMutation = useMutation({
    mutationFn: ({ giftId, reason }) => profileService.reportReceivedGift(giftId, { reason }).then((response) => response.data.data),
    onMutate: ({ reason }) => {
      setReportingReason(reason);
      setReportError("");
    },
    onError: (error) => setReportError(error.response?.data?.message || __msg("social.reportCouldNotBeSubmitted")),
    onSuccess: () => {
      setReportDone(true);
      setThankNotice(__msg("fanWeb.reportSubmitted"));
    },
    onSettled: () => setReportingReason(""),
  });
  const thankGift = async () => {
    if (!detailGift || detailGift.thankedAt || thanking) return;
    setThanking(true);
    try {
      const response = await profileService.thankReceivedGift(detailGift.id);
      const thankedAt = response.data.data.thankedAt;
      setDetailGift((current) => current ? { ...current, thankedAt } : current);
      setThankNotice(__msg("social.theyLlKnowYouAppreciatedIt"));
      await query.refetch();
    } catch (requestError) {
      setThankNotice(requestError.response?.data?.message || __msg("social.couldNotSendYourThanks"));
    } finally {
      setThanking(false);
    }
  };
  const toggleFeatured = () => {
    if (!detailGift || profileStateMutation.isPending) return;
    profileStateMutation.mutate({ giftId: detailGift.id, payload: { featuredOnProfile: !detailGift.featuredOnProfile } });
  };
  const toggleHidden = () => {
    if (!detailGift || profileStateMutation.isPending) return;
    profileStateMutation.mutate({ giftId: detailGift.id, payload: { hiddenFromProfile: !detailGift.hiddenFromProfile } });
  };
  const senderLine = (gift) => {
    const fromViewer = Boolean(viewerId && String(gift.sender?.id || gift.sender?._id || "") === String(viewerId));
    if (gift.visibility === "RECIPIENT_ONLY" && !isOwner && !fromViewer) return "";
    const from = fromViewer
      ? "you"
      : gift.sender?.username ? `@${gift.sender.username}` : gift.sender?.name || __msg("social.aSupporter");
    const parts = [`from ${from}`];
    if (gift.quantity > 1) parts.push(`×${gift.quantity}`);
    if (gift.visibility === "RECIPIENT_ONLY") parts.push("private");
    if (gift.hiddenFromProfile) parts.push("hidden");
    return parts.join(" · ");
  };
  const reportSheet = reportOpen && detailGift ? (
    <section aria-label={__msg("social.reportGift")} className={reportDone ? "profile-gift-report-sheet is-done" : "profile-gift-report-sheet"}>
      <button aria-label={__msg("social.backToGiftDetails")} className="profile-gift-detail-handle" onClick={() => { setReportOpen(false); setReportDone(false); }} type="button" />
      {reportDone ? (
        <div className="profile-gift-report-done">
          <ReportDoneEyeIcon />
          <h2>{__msg("social.thankYou")}</h2>
          <p>{__msg("social.ourTeamWillReviewThisShortly")}</p>
          <button onClick={() => { setReportOpen(false); setReportDone(false); }} type="button">{__msg("comments.done")}</button>
        </div>
      ) : (
        <>
          <h2>{__msg("social.reportGift")}</h2>
          <p>{__msg("fanWeb.whyAreYouReportingThis")}</p>
          <div className="profile-gift-report-reasons">
            {atseenReportReasons.map((reason) => (
              <button disabled={reportMutation.isPending} key={reason} onClick={() => reportMutation.mutate({ giftId: detailGift.id, reason })} type="button">
                <span>{reportingReason === reason ? __msg("profile.reporting") : reason}</span>
                <FiChevronRight data-ui-directional="true" aria-hidden="true" />
              </button>
            ))}
          </div>
          {reportError ? <p className="profile-gift-report-error">{reportError}</p> : null}
        </>
      )}
    </section>
  ) : null;
  if (!isOpen) return null;
  return <div aria-labelledby="received-gifts-title" aria-modal="true" className="profile-received-gifts-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()} ref={backdropRef} role="dialog" style={sheetPosition}>
    {thankNotice ? <div aria-live="polite" className="profile-gift-thank-toast">{thankNotice}</div> : null}
    {previewGift ? <GiftCelebration {...profileGiftCopy(previewGift, { isOwner, viewerId })} detail={previewGift.detail} gift={previewGift} key={previewGift.celebrationId} message={__msg("social.giftReceived")} variant="is-profile-gift" /> : null}
    {reportSheet || (detailGift ? <section aria-label={__msg("social.giftDetails", { value0: detailGift.name })} className="profile-gift-detail-sheet">
      <button aria-label={__msg("social.backToReceivedGifts")} className="profile-gift-detail-handle" onClick={() => setDetailGift(null)} type="button" />
      <button aria-label={__msg("social.replayGiftAnimation")} className="profile-gift-detail-art" onClick={() => { setDetailGift(null); setPreviewGift({ ...detailGift, celebrationId: `${detailGift.id}-${Date.now()}` }); }} type="button"><span aria-hidden="true" /><img alt={detailGift.name} src={detailGift.imageUrl} /></button>
      <h2 dir="auto">{detailGift.name}</h2>
      {profileGiftCopy(detailGift, { isOwner, viewerId }).caption ? <p dir="auto" className="profile-gift-detail-tagline">&ldquo;{profileGiftCopy(detailGift, { isOwner, viewerId }).caption}&rdquo;</p> : null}
      {detailGift.message ? <blockquote>&ldquo;{detailGift.message}&rdquo;</blockquote> : null}
      <button className="profile-gift-detail-replay" onClick={() => { setDetailGift(null); setPreviewGift({ ...detailGift, celebrationId: `${detailGift.id}-${Date.now()}` }); }} type="button">{__msg("social.replay")}</button>
      <p className="profile-gift-detail-sender">{__msg("activity.from")} {selectedSender.name || detailGift.source || __msg("social.aSupporter")}{relativeTime(detailGift.createdAt) ? ` · ${relativeTime(detailGift.createdAt)}` : ""}</p>
      {giftValue > 0 ? <p className="profile-gift-detail-balance">+✦{giftValue.toLocaleString(__uiLocale())} <span>{isOwner ? __msg("social.alreadyOnYourBalance") : __msg("social.giftValue")}</span></p> : null}
      <p className="profile-gift-detail-source">{detailGift.visibility === "RECIPIENT_ONLY" ? __msg("social.senderVisibleOnlyToYou") : detailGift.hiddenFromProfile ? __msg("social.onlyYouCanSeeThisGift") : __msg("social.senderVisibleOnYourProfile")}<br />{detailGift.hiddenFromProfile ? __msg("social.hiddenFromProfile") : __msg("social.onYourProfile")}</p>
      {selectedSender.avatar || selectedSender.name ? (selectedSender.username ? <Link className="profile-gift-detail-person" onClick={onClose} to={`/profile/${encodeURIComponent(selectedSender.username)}`}><FanAvatar name={selectedSender.name || "Supporter"} size="h-7 w-7" src={selectedSender.avatar} /><span>{String(selectedSender.name || __msg("social.supporter")).split(" ")[0]} ›</span></Link> : <div className="profile-gift-detail-person"><FanAvatar name={selectedSender.name || "Supporter"} size="h-7 w-7" src={selectedSender.avatar} /><span>{String(selectedSender.name || __msg("social.supporter")).split(" ")[0]} ›</span></div>) : null}
      <div className="profile-gift-detail-actions">
        {isOwner && selectedSender.id ? <button className={detailGift.thankedAt ? "is-thanked" : ""} disabled={Boolean(detailGift.thankedAt) || thanking} onClick={thankGift} type="button">{detailGift.thankedAt ? __msg("social.thanked") : thanking ? __msg("social.thanking") : __msg("social.thankThem")}</button> : null}
        {isOwner ? (selectedSender.id ? <button onClick={() => { onSendGift({ id: selectedSender.id, name: selectedSender.name, avatar: selectedSender.avatar }); }} type="button">{__msg("social.sendOneBack")}</button> : null) : <button onClick={() => onSendGift()} type="button">{__msg("profile.sendAGift")}</button>}
      </div>
      {isOwner ? <div className="profile-gift-detail-controls"><button className={detailGift.featuredOnProfile ? "is-featured" : ""} disabled={profileStateMutation.isPending} onClick={toggleFeatured} type="button">{detailGift.featuredOnProfile ? __msg("social.featured") : __msg("profile.pinToProfile")}</button><button disabled={profileStateMutation.isPending} onClick={toggleHidden} type="button">{detailGift.hiddenFromProfile ? __msg("social.showOnProfile") : __msg("social.hideFromProfile")}</button></div> : null}
      {detailGift.hiddenFromProfile ? <p className="profile-gift-detail-private-note">{__msg("social.onlyYouCanSeeThisGift")}</p> : null}
      {isOwner ? <button className="profile-gift-detail-report" onClick={() => setReportOpen(true)} type="button">{__msg("social.reportThisGiftOrNote")}</button> : null}
    </section> : <section className="profile-received-gifts-sheet">
      <span className="profile-received-gifts-handle" />
      <header className="profile-received-gifts-head"><FanAvatar name={profile.displayName} src={resolveMediaUrl(profile.avatar)} size="h-8 w-8" /><div><h2 id="received-gifts-title">{isOwner ? __msg("social.myGifts") : __msg("social.sGifts", { value0: profile?.displayName?.split(" ")[0] || __msg("discover.creator") })}</h2><p>{query.isLoading ? __msg("admin.loading") : `${total} ${total === 1 ? "gift" : "gifts"}`}</p></div>{!isOwner ? <button className="profile-send-gift-action" onClick={() => onSendGift()} type="button">{__msg("profile.sendAGift")}</button> : null}</header>
      {query.isError ? <p className="py-16 text-center text-sm text-red-300">{__msg("stories.giftsCouldNotBeLoaded")}</p> : null}
      {!query.isLoading && !query.isError && !gifts.length ? <p className="py-16 text-center text-sm text-white/45">{__msg("social.noGiftsReceivedYet")}</p> : null}
      <div className="profile-received-gifts-grid">
        {displayGifts.map((gift) => <button aria-label={__msg("social.playGiftAnimation", { value0: gift.name })} className={gift.featuredOnProfile ? "profile-received-gift is-featured" : "profile-received-gift"} key={gift.id} onClick={() => setPreviewGift({ ...gift, celebrationId: `${gift.id}-${Date.now()}`, detail: gift.sender?.name ? `From ${gift.sender.name}` : `Received via ${gift.source || "gift"}` })} type="button">
          <span><img alt={gift.name} onLoad={(event) => {
            const image = event.currentTarget;
            const ratio = image.naturalWidth / image.naturalHeight;
            image.style.setProperty("--profile-gift-art-height", ratio < .85 ? "78px" : ratio > 1.15 ? "60px" : "68px");
          }} src={resolveMediaUrl(gift.imageUrl)} style={{ transform: `translate(${Number(gift.imagePositionX || 0)}%, ${Number(gift.imagePositionY || 0)}%) scale(${Number(gift.displayScale || 100) / 100})` }} /></span>
          <strong dir="auto">{gift.name}</strong>
          <small>{senderLine(gift)}</small>
        </button>)}
      </div>
    </section>)}
  </div>;
}

function ProfileTabs({ tab, setTab }) {
  __useUiLanguage();
  const tabs = [
    ["seens", "Seens", FiGrid],
    ["reposts", "Reposts", FiRepeat],
    ["saved", "Saved", FiBookmark],
  ];
  return (
    <nav className="profile-icon-tabs" aria-label={__msg("social.profileContent")}>
      {tabs.map(([value, label, Icon]) => <button aria-label={label} className={tab === value ? "is-active" : ""} key={value} onClick={() => setTab(value)} type="button"><Icon /></button>)}
    </nav>
  );
}

function ProfileMixedContentPanel({ directSeenNavigation = false, emptyText, owner = false, reposted = false, seens = [], wallPosts = [] }) {
  __useUiLanguage();
  if (!seens.length && !wallPosts.length) return <ContentEmptyState compact message={owner ? __msg("social.itemsYouSaveOrShareWillBeCollectedHere") : __msg("social.thereIsNothingInThisSectionYet")} primaryAction={owner ? { label: __msg("social.exploreContent"), to: "/seen" } : { label: __msg("profile.discoverPeople"), to: "/discover" }} title={emptyText} variant="profile" />;
  return <div className="profile-mixed-content">
    {seens.length ? <section className="profile-mixed-section is-seens">
      <header><h2>{__msg("profile.seens")}</h2><span>{seens.length}</span></header>
      <ProfileContentGrid content={seens} directSeenNavigation={directSeenNavigation} kind="seens" reposted={reposted} />
    </section> : null}
    {wallPosts.length ? <section className="profile-mixed-section is-wall-notes">
      <header><h2>{__msg("social.wallNotes")}</h2><span>{wallPosts.length}</span></header>
      <div className="profile-notes-list">{wallPosts.map((post) => <FeedPost key={post.feedId || post.shareId || post.id} post={post} />)}</div>
    </section> : null}
  </div>;
}

function UnifiedRepostGrid({ items = [], owner = false }) {
  if (!items.length) return <ContentEmptyState compact message={owner ? "Repost a Seen, note, reply, or photo and it will appear here." : "There are no reposts yet."} primaryAction={owner ? { label: __msg("social.exploreContent"), to: "/seen" } : { label: __msg("profile.discoverPeople"), to: "/discover" }} title="No reposts yet" variant="profile" />;
  return <div className="profile-repost-grid">{items.map((item) => <Link aria-label={`Open reposted ${item.kind} by ${item.author?.name || "author"}`} className="profile-repost-tile" key={item.id} to={item.route || "#"}>
    {item.imageUrl ? <img alt="" src={item.imageUrl} /> : <span className="profile-repost-fallback">{item.kind === "cm" ? "“" : "↻"}</span>}
    <span className="profile-repost-shade" /><span className="profile-repost-mark"><FiRepeat /></span>
    <span className="profile-repost-author"><FanAvatar name={item.author?.name} size="h-6 w-6" src={item.author?.avatar} /><b>{item.author?.name || "Author"}</b></span><strong>{item.title}</strong>
  </Link>)}</div>;
}

function ContentTabsPanel({ data, isOwner, tab }) {
  __useUiLanguage();
  const saved = useQuery({
    queryKey: ["saved-content"],
    queryFn: () => savedService.list().then((response) => response.data.data),
    enabled: isOwner && tab === "saved",
    retry: false,
  });
  if (tab === "seens") return <ProfileContentGrid content={data.seens || []} emptyText={isOwner ? "Your Seens live here - create one with +" : "No Seens yet."} kind="seens" owner={isOwner} series={data.series || []} />;
  if (tab === "reposts") return data.reposts ? <UnifiedRepostGrid items={data.reposts} owner={isOwner} /> : <ProfileMixedContentPanel emptyText="No reshared Wall notes or Seens yet." owner={isOwner} reposted seens={data.sharedSeens || []} wallPosts={data.sharedWallPosts || []} />;
  if (!isOwner) return <div className="profile-empty-state">{__msg("social.savedItemsArePrivate")}</div>;
  if (saved.isLoading) return <LoadingSkeleton className="h-40" count={1} />;
  if (saved.isError) return <div className="profile-empty-state">{__msg("social.savedItemsCouldNotBeLoaded")}</div>;
  return <ProfileMixedContentPanel directSeenNavigation emptyText="No saved Wall notes or Seens yet." owner seens={saved.data?.seens || []} wallPosts={saved.data?.wallPosts || []} />;
}

function ProfileNotes({ isOwner, posts = [] }) {
  __useUiLanguage();
  return (
    <section className="profile-section profile-wall-section">
      <header className="profile-section-head">
        <h2>{__msg("social.notes")}</h2>
        <span>{compact(posts.length)} {posts.length === 1 ? __msg("social.note") : __msg("social.notes_3add7b")}</span>
      </header>
      {posts.length ? <div className="home-feed-list profile-notes-list">{posts.map((post) => <FeedPost key={post.feedId || post.id} post={post} profileMenu={isOwner} />)}</div> : <ContentEmptyState compact message={isOwner ? __msg("social.writeAWallNoteAndItWillAppearHere") : __msg("social.thisCreatorHasNotPostedAWallNoteYet")} primaryAction={isOwner ? { label: __msg("social.createAPost"), to: `/wall?compose=note&composeRequest=${Date.now()}` } : { label: __msg("profile.discoverPeople"), to: "/discover" }} title={isOwner ? __msg("fan.createYourFirstPost") : __msg("social.noPostsYet")} variant="wall" />}
    </section>
  );
}

function ProfileBody({ data, setConnectionsType }) {
  __useUiLanguage();
  const { showToast } = useFanToast();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [tab, setTabState] = useState(["seens", "reposts", "saved"].includes(requestedTab) ? requestedTab : "seens");
  const [activeSeriesId, setActiveSeriesId] = useState("");
  const [activeSeenListId, setActiveSeenListId] = useState("");
  const [experienceCreateOpen, setExperienceCreateOpen] = useState(false);
  const [starterSeenOpen, setStarterSeenOpen] = useState(false);
  const [experienceStoryOpen, setExperienceStoryOpen] = useState(false);
  const [profileStoryViewer, setProfileStoryViewer] = useState(null);
  const [draftSavedCount, setDraftSavedCount] = useState(() => Math.min(3, Math.max(0, Number(searchParams.get("draftSaved")) || 0)));
  const [publishedSeen, setPublishedSeen] = useState(() => location.state?.publishedSeen || null);
  const { profile, publicMetrics, viewerCapabilities } = data;
  const isOwner = viewerCapabilities.isOwner;
  const previewNewCreator = isOwner && searchParams.get("preview") === "new";
  useEffect(() => {
    if (previewNewCreator) showToast(__msg("profile.backToYourAccount"), { duration: 2800, placement: "profile" });
  }, [previewNewCreator, showToast]);
  const storiesQuery = useCreatorStories(profile.ownerUserId, { staleTime: 30000 });
  const profileStories = storiesQuery.data?.length ? storiesQuery.data : data.profileStories || [];
  const hasProfileStories = profile.hasActiveStories || profileStories.length > 0;
  const firstUnseenStoryIndex = Math.max(0, profileStories.findIndex((story) => !story.viewed));
  const openProfileStories = () => {
    if (profileStories.length) {
      setProfileStoryViewer({ index: firstUnseenStoryIndex, stories: profileStories });
      return;
    }
    void storiesQuery.refetch().then((result) => {
      const stories = result.data || [];
      if (!stories.length) return;
      const unseenIndex = stories.findIndex((story) => !story.viewed);
      setProfileStoryViewer({ index: unseenIndex >= 0 ? unseenIndex : 0, stories });
    });
  };
  const canCreateStoryNow = viewerCapabilities.canCreate && canCreateStory(user);
  const canPostNote = canCreateFeedPost(user);
  useEffect(() => {
    setTabState(["seens", "reposts", "saved"].includes(requestedTab) ? requestedTab : "seens");
  }, [requestedTab]);
  useEffect(() => {
    if (!draftSavedCount) return undefined;
    setSearchParams((current) => {
      const nextParams = new URLSearchParams(current);
      nextParams.delete("draftSaved");
      return nextParams;
    }, { replace: true });
    const timer = window.setTimeout(() => setDraftSavedCount(0), 3200);
    return () => window.clearTimeout(timer);
  }, [draftSavedCount, setSearchParams]);
  useEffect(() => {
    if (!publishedSeen) return undefined;
    const timer = window.setTimeout(() => setPublishedSeen(null), 4200);
    return () => window.clearTimeout(timer);
  }, [publishedSeen]);
  useEffect(() => {
    if (tab !== "seens") {
      setActiveSeriesId("");
      setActiveSeenListId("");
    }
  }, [tab]);
  useEffect(() => {
    if (!activeSeriesId && !activeSeenListId) return undefined;
    const frame = window.requestAnimationFrame(() => {
      document.querySelector(".social-center-scroll")?.scrollTo({ top: 0, behavior: "instant" });
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeSeenListId, activeSeriesId]);
  const setTab = (nextTab) => {
    setTabState(nextTab);
    setActiveSeriesId("");
    setActiveSeenListId("");
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === "seens") nextParams.delete("tab");
    else nextParams.set("tab", nextTab);
    setSearchParams(nextParams, { replace: true });
  };
  const setSeriesFocus = (nextId) => {
    setActiveSeriesId(nextId);
    if (nextId) setActiveSeenListId("");
  };
  const setSeenListFocus = (nextId) => {
    setActiveSeenListId(nextId);
    if (nextId) setActiveSeriesId("");
  };
  if ((activeSeriesId || activeSeenListId) && tab === "seens") {
    return (
      <div className="profile-prototype is-series-focused">
        <section className="profile-grid-panel">
          <ProfileContentGrid
            activeSeriesId={activeSeriesId}
            activeSeenListId={activeSeenListId}
            content={data.seens || []}
            emptyText={isOwner ? "Your Seens live here - create one with +" : "No Seens yet."}
            kind="seens"
            onActiveSeriesChange={setSeriesFocus}
            onActiveSeenListChange={setSeenListFocus}
            owner={isOwner}
            series={data.series || []}
          />
        </section>
      </div>
    );
  }
  return (
    <div className={`profile-prototype ${isOwner ? "is-owner-profile" : "is-public-profile"}`}>
      {publishedSeen ? <div className="profile-published-seen-banner" role="status"><span>{__msg("admin.published")}</span><button onClick={async () => { const url = `${window.location.origin}/seen/${publishedSeen.id}`; if (navigator.share) await navigator.share({ title: publishedSeen.title || "Seen", url }).catch(() => {}); else await navigator.clipboard?.writeText(url); }} type="button">{__msg("admin.share")}</button></div> : null}
      {draftSavedCount ? <p className="profile-draft-saved-toast" role="status">{__msg("social.savedForLater")} {draftSavedCount}/3 ✍️</p> : null}
      {isOwner
        ? <TopProfileBar planets={data.planets || []} profile={profile} viewerCapabilities={viewerCapabilities} />
        : <VisitorProfileBar profile={profile} relationship={data.viewerRelationship} viewerCapabilities={viewerCapabilities} />}
      <IdentitySection hasStories={hasProfileStories} metrics={publicMetrics} onConnectionsOpen={setConnectionsType} onStoriesCreate={() => setExperienceStoryOpen(true)} onStoriesOpen={openProfileStories} planets={data.planets || []} profile={profile} relationship={data.viewerRelationship} viewerCapabilities={viewerCapabilities} />
      <BusinessContactActions isOwner={isOwner} profile={profile} />
      <NewProfileStarter data={data} onStartSeen={() => setStarterSeenOpen(true)} />
      <StoryHighlights creatorUsername={profile.username} creatorId={profile.ownerUserId} isOwner={isOwner} />
      <ProfileWaysToEarn data={data} />
      <ProfileOrbit capabilities={viewerCapabilities} planets={data.planets || []} profile={profile} role={profile.role} />
      <ProfileAccessGroup profile={profile} viewerCapabilities={viewerCapabilities} />
      <ProfileGiftStrip profile={profile} viewerCapabilities={viewerCapabilities} viewerId={user?.id || user?._id} />
      <ProfileMediaSection initialMedia={data.media || []} isOwner={isOwner} profile={profile} username={profile.username} />
      <ProfileTabs setTab={setTab} tab={tab} />
      <section className="profile-grid-panel">
        {tab === "seens" ? (
          <ProfileContentGrid
            content={data.seens || []}
            emptyText={isOwner ? "Your Seens live here - create one with +" : "No Seens yet."}
            highlightSeenId={publishedSeen?.id || ""}
            kind="seens"
            onActiveSeriesChange={setSeriesFocus}
            onActiveSeenListChange={setSeenListFocus}
            owner={isOwner}
            series={data.series || []}
          />
        ) : <ContentTabsPanel data={data} isOwner={isOwner} tab={tab} />}
      </section>
      <ProfileDream capabilities={viewerCapabilities} profile={profile} role={profile.role} />
      <ProfileNotes isOwner={isOwner} posts={data.wallPosts || []} />
      {profile.joinedAt ? <p className="profile-joined"><FiCalendar /> {__msg("fan.joined")} {new Date(profile.joinedAt).toLocaleDateString(__uiLocale())}</p> : null}
      {isOwner ? <FanCreateSheet
        canCreateSeen={viewerCapabilities.canCreate}
        canCreateStoryNow={canCreateStoryNow}
        canCreateWorld={profile.profileAccountType !== "personal" && viewerCapabilities.canAccessStudio}
        canPostNote={canPostNote}
        isOpen={experienceCreateOpen}
        onClose={() => setExperienceCreateOpen(false)}
        onNote={() => {
          setExperienceCreateOpen(false);
          navigate(`/wall?compose=note&composeRequest=${Date.now()}`);
        }}
        onStory={() => { setExperienceCreateOpen(false); setExperienceStoryOpen(true); }}
        worldTarget={worldCreateTarget(data.planets || [])}
      /> : null}
      {isOwner ? <FanCreateSheet
        canCreateSeen={viewerCapabilities.canCreate}
        isOpen={starterSeenOpen}
        onClose={() => setStarterSeenOpen(false)}
        variant="seen"
      /> : null}
      <StoryCreator isOpen={experienceStoryOpen} onClose={() => setExperienceStoryOpen(false)} />
      <StoryViewer initialIndex={profileStoryViewer?.index || 0} isOpen={Boolean(profileStoryViewer?.stories?.length)} onClose={() => setProfileStoryViewer(null)} stories={profileStoryViewer?.stories || []} />
    </div>
  );
}

function UnifiedProfilePage({ embedded = false, owner = false }) {
  __useUiLanguage();
  const { username } = useParams();
  const [connectionsType, setConnectionsType] = useState("");
  const profileQuery = useQuery({
    queryKey: ["unified-profile", owner ? "me" : username],
    queryFn: () => (owner ? profileService.getUnifiedMe() : profileService.getUnifiedProfile(username)).then((response) => response.data.data),
    enabled: owner || Boolean(username),
    retry: false,
  });

  const refetchProfile = profileQuery.refetch;
  useEffect(() => {
    const refresh = () => { void refetchProfile(); };
    window.addEventListener("onlyme-verification-updated", refresh);
    return () => window.removeEventListener("onlyme-verification-updated", refresh);
  }, [refetchProfile]);

  useEffect(() => {
    const profileUserId = profileQuery.data?.profile?.ownerUserId;
    if (owner || !profileUserId || profileQuery.data?.viewerCapabilities?.isOwner) return;
    void analyticsService.trackProfileView({ profileUserId, source: "profile" });
  }, [owner, profileQuery.data?.profile?.ownerUserId, profileQuery.data?.viewerCapabilities?.isOwner]);

  let body;
  if (profileQuery.isLoading) body = <ProfileSkeleton />;
  else if (profileQuery.isError) {
    const status = profileQuery.error?.response?.status;
    body = <FanCard className="border-atseen-danger/25 bg-atseen-danger/10 text-center"><h1 className="text-lg font-bold">{status === 404 ? __msg("social.profileNotFound") : status === 403 ? __msg("social.profileIsUnavailable") : __msg("social.unableToLoadProfile")}</h1><p className="mt-2 text-sm text-atseen-muted">{status === 404 ? __msg("social.thisProfileMayBePrivateInactiveOrUnavailable") : __msg("social.pleaseTryAgainWhenTheServiceIsAvailable")}</p><button className="mt-4 text-sm font-bold text-atseen-blue" onClick={() => profileQuery.refetch()} type="button"><FiRefreshCw className="me-2 inline" />{__msg("activity.retry")}</button></FanCard>;
  } else {
    body = (
      <>
        <ProfileConnectionsModal
          counts={{
            followers: profileQuery.data.publicMetrics?.followerCount,
            following: profileQuery.data.publicMetrics?.followingCount,
            "seen-by": profileQuery.data.publicMetrics?.seenByCount ?? 0,
          }}
          displayName={profileQuery.data.profile.displayName}
          isOwn={Boolean(profileQuery.data.viewerCapabilities?.isOwner)}
          onClose={() => setConnectionsType("")}
          type={connectionsType}
          username={profileQuery.data.profile.username}
        />
        <ProfileBody data={profileQuery.data} setConnectionsType={setConnectionsType} />
      </>
    );
  }

  if (owner || embedded) return body;
  return body;
}

export default UnifiedProfilePage;
