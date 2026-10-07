import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiArrowLeft,
  FiArchive,
  FiBarChart2,
  FiBookmark,
  FiCalendar,
  FiChevronRight,
  FiEdit3,
  FiEye,
  FiFlag,
  FiGift,
  FiGrid,
  FiMoreHorizontal,
  FiPlus,
  FiRefreshCw,
  FiRepeat,
  FiSend,
  FiSettings,
  FiShare2,
  FiSlash,
  FiX,
  FiZap,
} from "react-icons/fi";
import DirectAccessOfferModal from "../../components/profile/DirectAccessOfferModal";
import AppShareSheet from "../../components/share/ShareSheet";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import FanCreateSheet from "../../components/fanWeb/FanCreateSheet";
import FanCard from "../../components/fanWeb/shared/FanCard";
import FeedPost from "../../components/fanWeb/home/FeedPost";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import ProfileConnectionsModal from "../../components/profile/ProfileConnectionsModal";
import ProfileContentGrid from "../../components/profile/ProfileContentGrid";
import ProfileDream, { GiftCelebration } from "../../components/profile/ProfileDream";
import ProfileMediaSection from "../../components/profile/ProfileMediaSection";
import ProfileOrbit from "../../components/profile/ProfileOrbit";
import ProfileExperiences from "../../components/profile/ProfileExperiences";
import StoryCreator from "../../components/stories/StoryCreator";
import StoryGiftPicker from "../../components/stories/StoryGiftPicker";
import ActivitySparkMark from "../../components/activity/ActivitySparkMark";
import VerifiedBadge from "../../components/fanWeb/shared/VerifiedBadge";
import { useAuth } from "../../hooks/useAuth";
import { useUnreadActivityCount } from "../../hooks/useUnreadActivityCount";
import { messageService } from "../../services/messageService";
import { analyticsService } from "../../services/analyticsService";
import { dreamService } from "../../services/dreamService";
import { profileService } from "../../services/profileService";
import { savedService } from "../../services/savedService";
import { walletService } from "../../services/walletService";
import { resolveMediaUrl } from "../../utils/media";
import { followInvalidationKeys } from "../../utils/savedPeople";
import { canCreateFeedPost } from "../../utils/postPermissions";
import { canCreateStory } from "../../utils/storyPermissions";
import { atseenReportReasons } from "../../data/atseenMockData";

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
  return number.toLocaleString();
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
        <button aria-label="Close who saw you" className="profile-viewers-close" onClick={onClose} type="button"><FiX /></button>
        <div className="profile-viewers-summary">
          {viewersQuery.isLoading ? <LoadingSkeleton className="h-16" count={1} /> : (
            <>
              <strong>{compact(count)}</strong>
              <span>saw you today</span>
              <small>Who exactly stays private</small>
            </>
          )}
        </div>
        {viewersQuery.isError ? (
          <button className="profile-viewers-retry" onClick={() => viewersQuery.refetch()} type="button"><FiRefreshCw /> Unable to load activity. Retry</button>
        ) : null}
        {!viewersQuery.isLoading && !viewersQuery.isError ? (
          <div className="profile-viewers-list">
            {todaySignals.map((item) => {
              const actor = item.actor;
              return (
                <Link className="profile-viewers-row" key={item.id} to={actor?.username ? `/profile/${actor.username}` : "/activity"}>
                  <FanAvatar name={actor?.displayName || "Activity"} size="h-[42px] w-[42px]" src={actor?.avatarUrl} />
                  <span>
                    <b>{actor?.displayName || "Recent activity"}</b>
                    <small>{item.description || "saw your profile"} {relativeTime(item.createdAt) ? `- ${relativeTime(item.createdAt)}` : ""}</small>
                  </span>
                  <FiChevronRight />
                </Link>
              );
            })}
            {hiddenCount > 0 ? (
              <Link className="profile-viewers-row is-aggregate" to="/activity">
                <span>{compact(hiddenCount)} stepped inside your worlds</span>
                <FiChevronRight />
              </Link>
            ) : null}
            {worldVisitorCount > 0 ? (
              <Link className="profile-viewers-row is-aggregate" to="/activity">
                <span>{compact(worldVisitorCount)} stepped inside your worlds</span>
                <FiChevronRight />
              </Link>
            ) : null}
            {!count ? <p className="profile-viewers-empty">No one is At seen right now.</p> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ProfileShareSheet({ isOpen, onClose, profile, shareUrl }) {
  const firstName = String(profile.displayName || profile.username || "Profile").trim().split(/\s+/)[0] || "Profile";

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
  return <FanCreateSheet canCreateSeen={canCreateSeen} canCreateStoryNow={canCreateStoryNow} canCreateWorld={canCreateWorld} canPostNote={canPostNote} isOpen={isOpen} onClose={onClose} onNote={onNote} onStory={onStory} worldTarget={worldTarget} />;
}

function TopProfileBar({ planets = [], profile, viewerCapabilities = {} }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const unread = useUnreadActivityCount(Boolean(user));
  const [createOpen, setCreateOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const createTarget = viewerCapabilities.canCreate ? "/create" : "/wall";
  const canCreateStoryNow = viewerCapabilities.canCreate && canCreateStory(user);
  const canPostNote = canCreateFeedPost(user);
  const worldTarget = worldCreateTarget(planets);
  const openCreate = () => {
    if (!viewerCapabilities.canCreate) return;
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
        <span><b>@</b>{profile.username}</span>
        <div>
          {viewerCapabilities.canCreate ? (
            <button aria-expanded={createOpen} aria-label="Create" className="profile-top-icon" onClick={openCreate} type="button"><FiPlus /></button>
          ) : (
            <Link aria-label="Wall" to={createTarget}><FiPlus /></Link>
          )}
          <Link aria-label="Activity" className="is-activity" to="/activity">
            <ActivitySparkMark className="h-5 w-5" />
            {unread ? <i className="activity-count-badge">{unread > 99 ? "99+" : unread}</i> : null}
          </Link>
        </div>
      </header>
      <ProfileCreateSheet
        canCreateSeen={viewerCapabilities.canCreate}
        canCreateWorld={viewerCapabilities.canAccessStudio}
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

function OwnerQuickActionsSheet({ isOpen, onClose }) {
  const [view, setView] = useState("menu");
  const experiencesQuery = useQuery({
    queryKey: ["profile-owner-experiences"],
    queryFn: () => savedService.category("experiences", { page: 1, limit: 50 }).then((response) => response.data.data.items || []),
    enabled: isOpen && view === "experiences",
    retry: false,
  });
  const walletQuery = useQuery({
    queryKey: ["wallet"],
    queryFn: () => walletService.getWallet().then((response) => response.data.data.wallet),
    enabled: isOpen,
    retry: false,
  });
  useEffect(() => {
    if (!isOpen) setView("menu");
  }, [isOpen]);
  if (!isOpen) return null;
  const wallet = walletQuery.data;
  const walletSummary = wallet
    ? `${Number(wallet.balance || 0).toLocaleString()} · $${Number(wallet.balanceUsd || 0).toFixed(2)}`
    : "Coins & earnings";
  const actions = [
    {
      icon: FiBookmark,
      label: "Unlocked",
      sub: "Experiences you own — forever",
      onClick: () => setView("experiences"),
    },
    {
      icon: FiArchive,
      label: "Archive",
      sub: "hidden from your profile",
      to: "/archive",
    },
    {
      icon: FiZap,
      label: "Wallet",
      sub: walletSummary,
      to: "/wallet",
    },
    {
      icon: FiSettings,
      label: "Settings",
      sub: "Account & privacy",
      to: "/settings",
    },
  ].filter(Boolean);

  return (
    <div aria-modal="true" className="profile-quick-actions-backdrop" onClick={onClose} role="dialog">
      <section className={`profile-quick-actions-sheet ${view === "experiences" ? "is-experiences" : "is-your-things"}`} onClick={(event) => event.stopPropagation()}>
        <span className="profile-quick-actions-handle" />
        {view === "experiences" ? <>
          <h2>Premium Experiences</h2>
          <div className="profile-owner-experience-list">
            {experiencesQuery.isLoading ? <p className="profile-owner-experience-state">Loading Experiences…</p> : null}
            {experiencesQuery.isError ? <p className="profile-owner-experience-state is-error">Experiences could not be loaded.</p> : null}
            {(experiencesQuery.data || []).map((item) => {
              const destination = item.kind === "EXPERIENCE" ? `/experience/${item.id}` : `/world/${item.id}`;
              return <Link key={item.id} onClick={onClose} to={destination}>
                <span>{item.coverMedia?.secureUrl ? <img alt="" src={item.coverMedia.secureUrl} /> : <b>✦</b>}</span>
                <i><strong>{item.title || "Untitled Experience"}</strong><small>{item.creator?.name || "Experience"}</small></i>
                <FiChevronRight />
              </Link>;
            })}
            {!experiencesQuery.isLoading && !experiencesQuery.isError && !(experiencesQuery.data || []).length ? <p className="profile-owner-experience-state">No Experiences yet.</p> : null}
          </div>
        </> : <>
          <h2>Your things</h2>
          <div className="profile-quick-actions-list">
            {actions.map(({ icon: Icon, label, onClick, sub, to }) => {
              const content = <><span className="profile-quick-action-icon"><Icon /></span><span className="profile-quick-action-copy"><b>{label}</b><small>{sub}</small></span><FiChevronRight /></>;
              return to
                ? <Link className="profile-quick-action-row" key={label} onClick={onClose} to={to}>{content}</Link>
                : <button className="profile-quick-action-row" key={label} onClick={onClick} type="button">{content}</button>;
            })}
          </div>
        </>}
      </section>
    </div>
  );
}

function VisitorMoreSheet({ isOpen, onClose, profile }) {
  const client = useQueryClient();
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
      setSheetPosition({ "--visitor-menu-center-x": `${bounds.left + (bounds.width / 2)}px` });
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
  const firstName = String(profile.displayName || profile.username || "Profile").trim().split(/\s+/)[0];

  const run = async (name, action) => {
    setBusy(name);
    setError("");
    try { await action(); } catch (requestError) { setError(requestError.response?.data?.message || `Could not ${name.toLowerCase()}.`); } finally { setBusy(""); }
  };
  const share = () => run("Share profile", async () => {
    if (navigator.share) await navigator.share({ title: `${profile.displayName} on @seen`, url: shareTarget });
    else await copyText(shareTarget);
    onClose();
  });
  const report = (reason) => run("Report", async () => {
    await profileService.reportProfile(profile.username, { reason });
    setReporting(false);
    setReportDone(true);
  });
  const block = () => {
    if (!blocked && !window.confirm(`Block ${profile.displayName}? They will not be able to message or interact with you.`)) return;
    run(blocked ? "Unblock" : "Block", async () => {
      if (blocked) await messageService.unblock(profile.ownerUserId); else await messageService.block(profile.ownerUserId);
      setBlocked((value) => !value);
      await client.invalidateQueries({ queryKey: ["unified-profile"] });
      onClose();
    });
  };
  return (
    <div aria-modal="true" className="profile-quick-actions-backdrop is-visitor-menu" onClick={() => { setReporting(false); setReportDone(false); onClose(); }} role="dialog" style={sheetPosition}>
      <section className={`profile-quick-actions-sheet is-visitor ${reportDone ? "is-report-done" : !reporting ? "is-main" : ""}`} onClick={(event) => event.stopPropagation()}>
        <span className="profile-quick-actions-handle" />
        {reportDone ? <div className="profile-report-done-panel"><FiEye aria-hidden="true" /><h2>Thank you</h2><p>Our team will review this shortly.</p><button onClick={() => { setReportDone(false); onClose(); }} type="button">Done</button></div> : reporting ? <><h2>{`Report ${firstName}`}</h2><div className="profile-quick-actions-list"><p className="px-4 py-2 text-xs text-white/50">Why are you reporting this profile?</p>{atseenReportReasons.map((reason) => <button className="profile-quick-action-row" disabled={Boolean(busy)} key={reason} onClick={() => report(reason)} type="button"><span className="profile-quick-action-icon"><FiFlag /></span><span className="profile-quick-action-copy"><b>{reason}</b></span></button>)}<button className="profile-quick-action-row" disabled={Boolean(busy)} onClick={() => setReporting(false)} type="button"><span className="profile-quick-action-copy"><b>Back</b></span></button></div></> : <><h2>{firstName}</h2><div className="profile-quick-actions-list">
          <button className="profile-quick-action-row" disabled={Boolean(busy)} onClick={share} type="button"><span className="profile-quick-action-icon"><FiSend /></span><span className="profile-quick-action-copy"><b>Share profile</b></span></button>
          <button className="profile-quick-action-row" disabled={Boolean(busy)} onClick={() => setReporting(true)} type="button"><span className="profile-quick-action-icon"><FiFlag /></span><span className="profile-quick-action-copy"><b>Report</b></span></button>
          <button className="profile-quick-action-row is-danger" disabled={Boolean(busy)} onClick={block} type="button"><span className="profile-quick-action-icon"><FiSlash /></span><span className="profile-quick-action-copy"><b>{blocked ? `Unblock ${firstName}` : `Block ${firstName}`}</b><small>{blocked ? "allow them to find and message you" : "they won’t find you or message you"}</small></span></button>
        </div></>}
        {error ? <p className="profile-visitor-action-error" role="alert">{error}</p> : null}
      </section>
    </div>
  );
}

function MoreMenu({ isOwner, profile, relationship = {} }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="profile-more-wrap">
      <button aria-expanded={open} aria-label="More profile actions" className="profile-action-chip is-icon" onClick={() => setOpen((value) => !value)} type="button"><FiMoreHorizontal /></button>
      {isOwner ? (
        <OwnerQuickActionsSheet isOpen={open} onClose={() => setOpen(false)} />
      ) : (
        <VisitorMoreSheet isOpen={open} onClose={() => setOpen(false)} profile={profile} relationship={relationship} />
      )}
    </span>
  );
}

function VisitorProfileBar({ profile, relationship, viewerCapabilities }) {
  const navigate = useNavigate();
  return (
    <header className="profile-prototype-topbar profile-visitor-topbar">
      <button aria-label="Go back" className="profile-visitor-back" onClick={() => navigate(-1)} type="button"><FiArrowLeft /></button>
      <span className="sr-only">@{profile.username}</span>
      <div><MoreMenu isOwner={false} profile={profile} relationship={relationship} viewerCapabilities={viewerCapabilities} /></div>
    </header>
  );
}

function metricValue(metrics = {}, key, fallback = 0) {
  return metrics[key] ?? metrics[`${key}Count`] ?? fallback;
}

function IdentitySection({ metrics = {}, onConnectionsOpen, profile, relationship = {}, viewerCapabilities }) {
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
      {!isOwner && seenConfirmation ? <div className="profile-seen-confirmation" role="status"><FiEye /> Only {profile.displayName?.split(" ")[0] || "they"} sees this</div> : null}
      <div className="profile-identity-row">
        <span className="profile-avatar-ring" style={{ "--profile-status-color": statusColor }}>
          <FanAvatar name={profile.displayName} size="h-[70px] w-[70px]" src={avatar} />
        </span>
        <div className="profile-copy">
          <h1>
            {profile.displayName}
            {profile.verified ? <VerifiedBadge /> : null}
          </h1>
          <div className="profile-identity-metrics" aria-label="Profile metrics">
            {identityMetrics.map(([key, label, value, onClick]) => (
              <button aria-label={label} key={key} onClick={onClick} type="button">
                <strong>{compact(value)}</strong>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {isOwner || statusText ? (
        <button className={`profile-status-pill ${statusText ? "has-status" : "is-empty"}`} disabled={!isOwner} onClick={editStatus} style={{ "--profile-status-color": statusColor }} type="button">
          {statusText ? statusText : "Right now..."}
          {isOwner ? <FiChevronRight aria-hidden="true" /> : null}
        </button>
      ) : null}
      <div className="profile-action-row">
        {isOwner ? <Link className="profile-action-chip" to="/settings/profile"><FiEdit3 /> Edit</Link> : null}
        {!isOwner ? <button aria-label={`Let ${profile.displayName} know you saw them`} className={`profile-visitor-eye ${relationship.seeSignalSent ? "is-seen" : ""}`} disabled={seeSignal.isPending} onClick={markProfileSeen} type="button"><FiEye /></button> : null}
        {!isOwner && viewerCapabilities.canFollow ? <VisitorFollowButton profile={profile} relationship={relationship} /> : null}
        {!isOwner && viewerCapabilities.canMessage ? <button className="profile-action-chip" onClick={() => navigate(`/messages?with=${encodeURIComponent(profile.ownerUserId)}`)} type="button">Message</button> : null}
        {!isOwner && viewerCapabilities.canMessage ? <button aria-label={`Send ${profile.displayName} a gift`} className="profile-visitor-gifts" onClick={() => setDirectGiftOpen(true)} type="button"><FiGift /></button> : null}
        {isOwner ? <button className="profile-action-chip" onClick={() => setShareOpen(true)} type="button"><FiShare2 /> Share</button> : null}
        {isOwner ? <MoreMenu isOwner profile={profile} relationship={relationship} viewerCapabilities={viewerCapabilities} /> : null}
      </div>
      <ProfileViewersSheet isOpen={viewersOpen} onClose={() => setViewersOpen(false)} />
      <ProfileShareSheet isOpen={shareOpen} onClose={() => setShareOpen(false)} profile={profile} shareUrl={shareUrl} />
      {directGiftOpen ? <StoryGiftPicker onClose={() => setDirectGiftOpen(false)} recipient={{ id: profile.ownerUserId, name: profile.displayName }} sourceType="DIRECT" /> : null}
    </section>
  );
}

function VisitorFollowButton({ profile, relationship = {} }) {
  const client = useQueryClient();
  const follow = useMutation({
    mutationFn: () => profileService.toggleFollow(profile.username),
    onSuccess: () => invalidateFollowSurfaces(client),
  });
  const following = Boolean(relationship.following);
  return <button className={`profile-action-chip profile-follow-action ${following ? "is-following" : ""}`} disabled={follow.isPending} onClick={() => follow.mutate()} type="button">{following ? "Following" : "Follow"}</button>;
}

function DirectAccessRow({ profile, viewerCapabilities }) {
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
  const open = () => viewerCapabilities.isOwner ? navigate("/messages?tab=direct") : setOfferOpen(true);
  return (
    <>
      <button className="profile-row profile-direct-row" onClick={open} type="button">
        <span className="profile-row-orb"><FiZap /></span>
        <span className="min-w-0 flex-1">
          <b>Direct Access {waiting ? <i> - {waiting} waiting</i> : null}</b>
          <small>{meta}</small>
        </span>
        {viewerCapabilities.isOwner ? <Link aria-label="Direct Access settings" onClick={(event) => event.stopPropagation()} to="/messages?tab=direct"><FiSettings /></Link> : null}
        <FiChevronRight />
      </button>
      {offerOpen ? <DirectAccessOfferModal onClose={() => setOfferOpen(false)} profile={profile} /> : null}
    </>
  );
}

function ProfileAccessGroup({ profile, viewerCapabilities }) {
  const canShowDashboard = profile.isCreator && viewerCapabilities.isOwner && viewerCapabilities.canAccessStudio;
  const canShowDirect = profile.isCreator && (viewerCapabilities.isOwner || viewerCapabilities.canMessage) && (viewerCapabilities.isOwner || profile.directAccess?.enabled || profile.directAccess?.callEnabled);
  if (!canShowDashboard && !canShowDirect) return null;
  return (
    <section className="profile-access-group">
      {canShowDirect ? <DirectAccessRow profile={profile} viewerCapabilities={viewerCapabilities} /> : null}
      {canShowDashboard ? (
        <Link className="profile-row profile-dashboard-row" to="/studio">
          <FiBarChart2 />
          <span>Professional dashboard</span>
          <FiChevronRight />
        </Link>
      ) : null}
    </section>
  );
}

function ProfileGiftStrip({ profile, viewerCapabilities }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldOpenGiftPicker = searchParams.get("sendGift") === "1" && !viewerCapabilities.isOwner && Boolean(profile?.ownerUserId);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const [sendGiftOpen, setSendGiftOpen] = useState(shouldOpenGiftPicker);
  const [giftRecipient, setGiftRecipient] = useState(() => shouldOpenGiftPicker
    ? { id: profile.ownerUserId, name: profile.displayName, avatar: resolveMediaUrl(profile.avatar) }
    : null);
  useEffect(() => {
    if (!shouldOpenGiftPicker) return;
    setGiftRecipient({ id: profile.ownerUserId, name: profile.displayName, avatar: resolveMediaUrl(profile.avatar) });
    setSendGiftOpen(true);
  }, [profile?.avatar, profile?.displayName, profile?.ownerUserId, shouldOpenGiftPicker]);
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
  const dreamQuery = useQuery({
    queryKey: ["creator-dream", profile?.username],
    queryFn: () => dreamService.getCreatorDream(profile.username).then((response) => response.data.data),
    enabled: profile?.role === "creator" && Boolean(profile?.username) && !viewerCapabilities.isOwner,
    retry: false,
    staleTime: 30000,
  });
  const receivedQuery = useQuery({
    queryKey: ["profile", "received-gifts", viewerCapabilities.isOwner ? "me" : profile?.username],
    queryFn: () => (viewerCapabilities.isOwner ? profileService.getOwnReceivedGifts() : profileService.getReceivedGifts(profile.username)).then((response) => response.data.data),
    enabled: viewerCapabilities.isOwner || Boolean(profile?.username),
    retry: false,
    staleTime: 30000,
  });
  const directGiftPicker = sendGiftOpen && giftRecipient
    ? <StoryGiftPicker onClose={closeGiftPicker} recipient={giftRecipient} sourceType="DIRECT" />
    : null;
  if (profile?.role !== "creator" && !viewerCapabilities.isOwner) return directGiftPicker;
  const dream = dreamQuery.data?.dream;
  const gifts = receivedQuery.data?.gifts || [];
  const count = Number(receivedQuery.data?.total || gifts.length || 0);
  if (!dream && !gifts.length && !viewerCapabilities.isOwner) return directGiftPicker;
  return (
    <>
    <button className="profile-gift-strip" id="profile-gifts" onClick={() => setGiftsOpen(true)} type="button">
      <span className="profile-gift-art" aria-hidden="true">
        {gifts.slice(0, 4).map((gift) => gift.imageUrl ? <img alt="" key={gift.key || gift.id || gift.name} src={gift.imageUrl} /> : <i key={gift.key || gift.id || gift.name}><FiGift /></i>)}
        {!gifts.length ? <i><FiGift /></i> : null}
      </span>
      <span className="profile-gift-copy">
        <b>{viewerCapabilities.isOwner ? `${compact(count || gifts.length)} ${(count || gifts.length) === 1 ? "gift" : "gifts"}` : `${compact(count || gifts.length)} ${(count || gifts.length) === 1 ? "gift" : "gifts"}`}</b>
        {!viewerCapabilities.isOwner ? <small>{dream ? "Dream support and received gifts" : "Gift support opens with Dream"}</small> : null}
      </span>
      <FiChevronRight />
    </button>
    <ReceivedGiftsSheet isOpen={giftsOpen} isOwner={viewerCapabilities.isOwner} onClose={() => setGiftsOpen(false)} onSendGift={(recipient = null) => { setGiftRecipient(recipient || { id: profile.ownerUserId, name: profile.displayName, avatar: resolveMediaUrl(profile.avatar) }); setGiftsOpen(false); setSendGiftOpen(true); }} profile={profile} />
    {directGiftPicker}
    </>
  );
}

function ReceivedGiftsSheet({ isOpen, isOwner, onClose, onSendGift, profile }) {
  const queryClient = useQueryClient();
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
    const centerColumn = document.querySelector(".social-center-scroll");
    if (!centerColumn) return undefined;
    const updatePosition = () => {
      const bounds = centerColumn.getBoundingClientRect();
      setSheetPosition({ "--profile-gifts-center-x": `${bounds.left + bounds.width / 2}px` });
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
  const gifts = query.data?.gifts || [];
  const total = Number(query.data?.total || gifts.length || 0);
  const selectedSender = detailGift?.sender || {};
  const giftValue = Number(detailGift?.stars || 0);
  const profileStateMutation = useMutation({
    mutationFn: ({ giftId, payload }) => profileService.updateReceivedGiftProfileState(giftId, payload).then((response) => response.data.data.gift),
    onError: (error) => setThankNotice(error.response?.data?.message || "Gift setting could not be saved"),
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
    onError: (error) => setReportError(error.response?.data?.message || "Report could not be submitted."),
    onSuccess: () => {
      setReportDone(true);
      setThankNotice("Report submitted.");
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
      setThankNotice("They’ll know you appreciated it ✦");
      await query.refetch();
    } catch (requestError) {
      setThankNotice(requestError.response?.data?.message || "Could not send your thanks");
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
    const parts = [gift.sender?.name || gift.source || "Gift"];
    if (gift.visibility === "RECIPIENT_ONLY") parts.push("private");
    if (gift.hiddenFromProfile) parts.push("hidden");
    return parts.join(" · ");
  };
  const reportSheet = reportOpen && detailGift ? (
    <section aria-label="Report Gift" className="profile-gift-report-sheet">
      <button aria-label="Back to gift details" className="profile-gift-detail-handle" onClick={() => { setReportOpen(false); setReportDone(false); }} type="button" />
      {reportDone ? (
        <div className="profile-gift-report-done">
          <FiEye aria-hidden="true" />
          <h2>Thank you</h2>
          <p>Our team will review this shortly.</p>
          <button onClick={() => { setReportOpen(false); setReportDone(false); }} type="button">Done</button>
        </div>
      ) : (
        <>
          <h2>Report Gift</h2>
          <p>Why are you reporting this?</p>
          <div className="profile-gift-report-reasons">
            {atseenReportReasons.map((reason) => (
              <button disabled={reportMutation.isPending} key={reason} onClick={() => reportMutation.mutate({ giftId: detailGift.id, reason })} type="button">
                <span>{reportingReason === reason ? "Reporting..." : reason}</span>
                <FiChevronRight aria-hidden="true" />
              </button>
            ))}
          </div>
          {reportError ? <p className="profile-gift-report-error">{reportError}</p> : null}
        </>
      )}
    </section>
  ) : null;
  if (!isOpen) return null;
  return <div aria-labelledby="received-gifts-title" aria-modal="true" className="profile-received-gifts-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()} role="dialog" style={sheetPosition}>
    {thankNotice ? <div aria-live="polite" className="profile-gift-thank-toast">{thankNotice}</div> : null}
    {previewGift ? <GiftCelebration detail={previewGift.detail} gift={previewGift} key={previewGift.celebrationId} message="Gift received" variant="is-profile-gift" /> : null}
    {reportSheet || (detailGift ? <section aria-label={`${detailGift.name} gift details`} className="profile-gift-detail-sheet">
      <button aria-label="Back to received gifts" className="profile-gift-detail-handle" onClick={() => setDetailGift(null)} type="button" />
      <button aria-label="Replay gift animation" className="profile-gift-detail-art" onClick={() => { setDetailGift(null); setPreviewGift({ ...detailGift, celebrationId: `${detailGift.id}-${Date.now()}` }); }} type="button"><span aria-hidden="true" /><img alt={detailGift.name} src={detailGift.imageUrl} /></button>
      <h2>{detailGift.name}</h2>
      {detailGift.message ? <blockquote>&ldquo;{detailGift.message}&rdquo;</blockquote> : null}
      <button className="profile-gift-detail-replay" onClick={() => { setDetailGift(null); setPreviewGift({ ...detailGift, celebrationId: `${detailGift.id}-${Date.now()}` }); }} type="button">▶ Replay</button>
      <p className="profile-gift-detail-sender">from {selectedSender.name || detailGift.source || "a supporter"}{relativeTime(detailGift.createdAt) ? ` · ${relativeTime(detailGift.createdAt)}` : ""}</p>
      {giftValue > 0 ? <p className="profile-gift-detail-balance">+✦{giftValue.toLocaleString()} <span>{isOwner ? "already on your balance" : "gift value"}</span></p> : null}
      <p className="profile-gift-detail-source">{detailGift.visibility === "RECIPIENT_ONLY" ? "Sender visible only to you" : detailGift.hiddenFromProfile ? "Only you can see this gift" : "Sender visible on your profile"}<br />{detailGift.hiddenFromProfile ? "hidden from profile" : "on your profile"}</p>
      {selectedSender.avatar || selectedSender.name ? (selectedSender.username ? <Link className="profile-gift-detail-person" onClick={onClose} to={`/profile/${encodeURIComponent(selectedSender.username)}`}><FanAvatar name={selectedSender.name || "Supporter"} size="h-7 w-7" src={selectedSender.avatar} /><span>{String(selectedSender.name || "Supporter").split(" ")[0]} ›</span></Link> : <div className="profile-gift-detail-person"><FanAvatar name={selectedSender.name || "Supporter"} size="h-7 w-7" src={selectedSender.avatar} /><span>{String(selectedSender.name || "Supporter").split(" ")[0]} ›</span></div>) : null}
      <div className="profile-gift-detail-actions">
        {isOwner && selectedSender.id ? <button className={detailGift.thankedAt ? "is-thanked" : ""} disabled={Boolean(detailGift.thankedAt) || thanking} onClick={thankGift} type="button">{detailGift.thankedAt ? "Thanked ✓" : thanking ? "Thanking..." : "Thank them"}</button> : null}
        {isOwner ? (selectedSender.id ? <button onClick={() => { onSendGift({ id: selectedSender.id, name: selectedSender.name, avatar: selectedSender.avatar }); }} type="button">Send one back</button> : null) : <button onClick={() => onSendGift()} type="button">Send a gift</button>}
      </div>
      {isOwner ? <div className="profile-gift-detail-controls"><button className={detailGift.featuredOnProfile ? "is-featured" : ""} disabled={profileStateMutation.isPending} onClick={toggleFeatured} type="button">{detailGift.featuredOnProfile ? "✦ Featured" : "Pin to profile"}</button><button disabled={profileStateMutation.isPending} onClick={toggleHidden} type="button">{detailGift.hiddenFromProfile ? "Show on profile" : "Hide from profile"}</button></div> : null}
      {detailGift.hiddenFromProfile ? <p className="profile-gift-detail-private-note">Only you can see this gift</p> : null}
      {isOwner ? <button className="profile-gift-detail-report" onClick={() => setReportOpen(true)} type="button">Report this gift or note</button> : null}
    </section> : <section className="profile-received-gifts-sheet">
      <span className="profile-received-gifts-handle" />
      <header className="profile-received-gifts-head"><FiGift /><div><h2 id="received-gifts-title">{isOwner ? "My gifts" : `${profile?.displayName?.split(" ")[0] || "Creator"}'s gifts`}</h2><p>{query.isLoading ? "Loading..." : `${total} ${total === 1 ? "gift" : "gifts"}`}</p></div>{!isOwner ? <button className="profile-send-gift-action" onClick={onSendGift} type="button">Send a gift</button> : null}</header>
      {query.isError ? <p className="py-16 text-center text-sm text-red-300">Gifts could not be loaded.</p> : null}
      {!query.isLoading && !query.isError && !gifts.length ? <p className="py-16 text-center text-sm text-white/45">No gifts received yet.</p> : null}
      <div className="profile-received-gifts-grid">
        {gifts.map((gift) => <button aria-label={`Play ${gift.name} gift animation`} className={gift.featuredOnProfile ? "profile-received-gift is-featured" : "profile-received-gift"} key={gift.id} onClick={() => setPreviewGift({ ...gift, celebrationId: `${gift.id}-${Date.now()}`, detail: gift.sender?.name ? `From ${gift.sender.name}` : `Received via ${gift.source || "gift"}` })} type="button">
          <span><img alt={gift.name} src={gift.imageUrl} /></span>
          <strong>{gift.name}</strong>
          <small>{senderLine(gift)}</small>
        </button>)}
      </div>
    </section>)}
  </div>;
}

function ProfileTabs({ tab, setTab }) {
  const tabs = [
    ["seens", "Seens", FiGrid],
    ["reposts", "Reposts", FiRepeat],
    ["saved", "Saved", FiBookmark],
  ];
  return (
    <nav className="profile-icon-tabs" aria-label="Profile content">
      {tabs.map(([value, label, Icon]) => <button aria-label={label} className={tab === value ? "is-active" : ""} key={value} onClick={() => setTab(value)} type="button"><Icon /></button>)}
    </nav>
  );
}

function ProfileMixedContentPanel({ emptyText, reposted = false, seens = [], wallPosts = [] }) {
  if (!seens.length && !wallPosts.length) return <div className="profile-empty-state">{emptyText}</div>;
  return <div className="profile-mixed-content">
    {seens.length ? <section className="profile-mixed-section is-seens">
      <header><h2>Seens</h2><span>{seens.length}</span></header>
      <ProfileContentGrid content={seens} kind="seens" reposted={reposted} />
    </section> : null}
    {wallPosts.length ? <section className="profile-mixed-section is-wall-notes">
      <header><h2>Wall notes</h2><span>{wallPosts.length}</span></header>
      <div className="profile-notes-list">{wallPosts.map((post) => <FeedPost key={post.feedId || post.shareId || post.id} post={post} />)}</div>
    </section> : null}
  </div>;
}

function ContentTabsPanel({ data, isOwner, tab }) {
  const saved = useQuery({
    queryKey: ["saved-content"],
    queryFn: () => savedService.list().then((response) => response.data.data),
    enabled: isOwner && tab === "saved",
    retry: false,
  });
  if (tab === "seens") return <ProfileContentGrid content={data.seens || []} emptyText={isOwner ? "Your Seens live here - create one with +" : "No Seens yet."} kind="seens" owner={isOwner} series={data.series || []} />;
  if (tab === "reposts") return <ProfileMixedContentPanel emptyText="No reshared Wall notes or Seens yet." reposted seens={data.sharedSeens || []} wallPosts={data.sharedWallPosts || []} />;
  if (!isOwner) return <div className="profile-empty-state">Saved items are private.</div>;
  if (saved.isLoading) return <LoadingSkeleton className="h-40" count={1} />;
  if (saved.isError) return <div className="profile-empty-state">Saved items could not be loaded.</div>;
  return <ProfileMixedContentPanel emptyText="No saved Wall notes or Seens yet." seens={saved.data?.seens || []} wallPosts={saved.data?.wallPosts || []} />;
}

function ProfileNotes({ isOwner, posts = [] }) {
  return (
    <section className="profile-section profile-wall-section">
      <header className="profile-section-head">
        <h2>Notes</h2>
        <span>{compact(posts.length)} {posts.length === 1 ? "note" : "notes"}</span>
      </header>
      {posts.length ? <div className="home-feed-list profile-notes-list">{posts.map((post) => <FeedPost key={post.feedId || post.id} post={post} profileMenu={isOwner} />)}</div> : <p className="profile-empty-state">{isOwner ? "Your notes will appear here." : "No notes yet."}</p>}
    </section>
  );
}

function ProfileBody({ data, setConnectionsType }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [tab, setTabState] = useState(["seens", "reposts", "saved"].includes(requestedTab) ? requestedTab : "seens");
  const [activeSeriesId, setActiveSeriesId] = useState("");
  const [activeSeenListId, setActiveSeenListId] = useState("");
  const [experienceCreateOpen, setExperienceCreateOpen] = useState(false);
  const [experienceStoryOpen, setExperienceStoryOpen] = useState(false);
  const [draftSavedCount, setDraftSavedCount] = useState(() => Math.min(3, Math.max(0, Number(searchParams.get("draftSaved")) || 0)));
  const { profile, publicMetrics, viewerCapabilities } = data;
  const isOwner = viewerCapabilities.isOwner;
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
      {draftSavedCount ? <p className="profile-draft-saved-toast" role="status">Saved for later · {draftSavedCount}/3 ✍️</p> : null}
      {isOwner
        ? <TopProfileBar planets={data.planets || []} profile={profile} viewerCapabilities={viewerCapabilities} />
        : <VisitorProfileBar profile={profile} relationship={data.viewerRelationship} viewerCapabilities={viewerCapabilities} />}
      <IdentitySection metrics={publicMetrics} onConnectionsOpen={setConnectionsType} planets={data.planets || []} profile={profile} relationship={data.viewerRelationship} viewerCapabilities={viewerCapabilities} />
      <ProfileAccessGroup profile={profile} viewerCapabilities={viewerCapabilities} />
      <ProfileGiftStrip profile={profile} viewerCapabilities={viewerCapabilities} />
      <ProfileMediaSection initialMedia={data.media || []} isOwner={isOwner} username={profile.username} />
      <ProfileExperiences creatorUsername={profile.username} experiences={data.experiences || []} onCreate={() => setExperienceCreateOpen(true)} owner={isOwner} />
      <ProfileTabs setTab={setTab} tab={tab} />
      <section className="profile-grid-panel">
        {tab === "seens" ? (
          <ProfileContentGrid
            content={data.seens || []}
            emptyText={isOwner ? "Your Seens live here - create one with +" : "No Seens yet."}
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
      <ProfileOrbit capabilities={viewerCapabilities} planets={data.planets || []} profile={profile} role={profile.role} />
      {profile.joinedAt ? <p className="profile-joined"><FiCalendar /> Joined {new Date(profile.joinedAt).toLocaleDateString()}</p> : null}
      {isOwner ? <FanCreateSheet
        canCreateSeen={viewerCapabilities.canCreate}
        canCreateStoryNow={canCreateStoryNow}
        canCreateWorld={viewerCapabilities.canAccessStudio}
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
      <StoryCreator isOpen={experienceStoryOpen} onClose={() => setExperienceStoryOpen(false)} />
    </div>
  );
}

function UnifiedProfilePage({ embedded = false, owner = false }) {
  const { username } = useParams();
  const [connectionsType, setConnectionsType] = useState("");
  const profileQuery = useQuery({
    queryKey: ["unified-profile", owner ? "me" : username],
    queryFn: () => (owner ? profileService.getUnifiedMe() : profileService.getUnifiedProfile(username)).then((response) => response.data.data),
    enabled: owner || Boolean(username),
    retry: false,
  });

  useEffect(() => {
    const profileUserId = profileQuery.data?.profile?.ownerUserId;
    if (owner || !profileUserId || profileQuery.data?.viewerCapabilities?.isOwner) return;
    void analyticsService.trackProfileView({ profileUserId, source: "profile" });
  }, [owner, profileQuery.data?.profile?.ownerUserId, profileQuery.data?.viewerCapabilities?.isOwner]);

  let body;
  if (profileQuery.isLoading) body = <ProfileSkeleton />;
  else if (profileQuery.isError) {
    const status = profileQuery.error?.response?.status;
    body = <FanCard className="border-atseen-danger/25 bg-atseen-danger/10 text-center"><h1 className="text-lg font-bold">{status === 404 ? "Profile not found" : status === 403 ? "Profile is unavailable" : "Unable to load profile"}</h1><p className="mt-2 text-sm text-atseen-muted">{status === 404 ? "This profile may be private, inactive, or unavailable." : "Please try again when the service is available."}</p><button className="mt-4 text-sm font-bold text-atseen-blue" onClick={() => profileQuery.refetch()} type="button"><FiRefreshCw className="mr-2 inline" />Retry</button></FanCard>;
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
