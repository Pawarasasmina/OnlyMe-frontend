import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiAperture,
  FiArrowLeft,
  FiBarChart2,
  FiBell,
  FiBookmark,
  FiCalendar,
  FiCamera,
  FiCheck,
  FiChevronRight,
  FiEdit3,
  FiEye,
  FiEyeOff,
  FiFlag,
  FiGift,
  FiGlobe,
  FiGrid,
  FiImage,
  FiLink,
  FiMapPin,
  FiMessageCircle,
  FiMessageSquare,
  FiMoreHorizontal,
  FiPenTool,
  FiPlus,
  FiRefreshCw,
  FiRepeat,
  FiSettings,
  FiShare2,
  FiSlash,
  FiUserCheck,
  FiUserPlus,
  FiX,
  FiZap,
} from "react-icons/fi";
import DirectAccessOfferModal from "../../components/profile/DirectAccessOfferModal";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import FanCard from "../../components/fanWeb/shared/FanCard";
import FeedPostComposer from "../../components/posts/FeedPostComposer";
import FeedPost from "../../components/fanWeb/home/FeedPost";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import ProfileConnectionsModal from "../../components/profile/ProfileConnectionsModal";
import ProfileContentGrid from "../../components/profile/ProfileContentGrid";
import ProfileDream from "../../components/profile/ProfileDream";
import ProfileMediaSection from "../../components/profile/ProfileMediaSection";
import ProfileOrbit from "../../components/profile/ProfileOrbit";
import StoryCreator from "../../components/stories/StoryCreator";
import VerifiedBadge from "../../components/fanWeb/shared/VerifiedBadge";
import { useAuth } from "../../hooks/useAuth";
import { messageService } from "../../services/messageService";
import { analyticsService } from "../../services/analyticsService";
import { dreamService } from "../../services/dreamService";
import { profileService } from "../../services/profileService";
import { savedService } from "../../services/savedService";
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

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

const PROFILE_FLOATING_HAND = String.fromCodePoint(0x1F4AA);
const PROFILE_FLOATING_PLANET = String.fromCodePoint(0x1FA90);

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
  const visibleRows = todaySignals.slice(0, 2);
  const count = Number(viewersQuery.data?.seenTodayCount) || 0;
  const worldVisitorCount = Number(viewersQuery.data?.worldVisitorCount) || 0;
  const hiddenCount = Math.max(0, count - visibleRows.length);

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
            {visibleRows.map((item) => {
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

function ProfileShareSheet({ isOpen, onClose, profile, shareUrl, viewerCapabilities = {} }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const avatar = resolveMediaUrl(profile.avatar);
  const shortUrl = shareUrl.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const firstName = String(profile.displayName || profile.username || "Profile").trim().split(/\s+/)[0] || "Profile";

  if (!isOpen) return null;

  const copy = async () => {
    setError("");
    try {
      const ok = await copyText(shareUrl);
      if (!ok) throw new Error("Copy failed");
    } catch {
      setError("Could not copy link.");
      return false;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
    return true;
  };

  const shareStory = async () => {
    await copy();
    onClose();
    navigate(viewerCapabilities.canCreate ? "/create" : "/wall");
  };

  const shareWhatsApp = () => {
    const text = `${profile.displayName} on @seen - ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div aria-modal="true" className="profile-share-backdrop" onClick={onClose} role="dialog">
      <section className="profile-share-sheet" onClick={(event) => event.stopPropagation()}>
        <span className="profile-share-handle" />
        <h2>Share</h2>
        <div className="profile-share-preview">
          <FanAvatar name={profile.displayName} size="h-[58px] w-[58px]" src={avatar} />
          <strong>{firstName}</strong>
          <small>@{profile.username} - step into my worlds</small>
          <span>{shortUrl}</span>
        </div>
        <div className="profile-share-actions">
          <button onClick={copy} type="button">
            <i>{copied ? <FiCheck /> : <FiLink />}</i>
            <span>{copied ? "Copied" : "Copy link"}</span>
          </button>
          <button onClick={shareStory} type="button">
            <i><FiCamera /></i>
            <span>Your story</span>
          </button>
          <button onClick={shareWhatsApp} type="button">
            <i><FiMessageSquare /></i>
            <span>WhatsApp</span>
          </button>
        </div>
        {error ? <p className="profile-share-error">{error}</p> : null}
        <Link className="profile-share-preview-link" onClick={onClose} to={`/profile/${encodeURIComponent(profile.username)}`}>
          <FiEye /> What your friend will see <FiChevronRight />
        </Link>
      </section>
    </div>
  );
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

function ProfileCreateSheet({ canCreateSeen, canCreateStoryNow, canCreateWorld, canPostNote, isOpen, onClose, onNote, onStory }) {
  if (!isOpen) return null;
  const options = [
    { icon: FiEye, label: "Seen", to: "/create/seen", disabled: !canCreateSeen },
    { icon: FiImage, label: "Experience", to: "/create/world", disabled: !canCreateWorld },
    { icon: FiAperture, label: "Story", onClick: onStory, disabled: !canCreateStoryNow },
    { icon: FiEdit3, label: "Note", onClick: onNote, disabled: !canPostNote },
    { icon: FiGlobe, label: "World", to: "/create/premium-world", disabled: !canCreateWorld },
  ];

  return (
    <div aria-modal="true" className="profile-create-backdrop" onMouseDown={onClose} role="dialog">
      <section className="profile-create-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <div className="profile-create-list">
          {options.map(({ disabled, icon: Icon, label, onClick, to }) => {
            const content = (
              <>
                <span className="profile-create-icon"><Icon /></span>
                <span className="profile-create-copy">
                  <b>{label}</b>
                </span>
              </>
            );
            if (to) {
              return (
                <Link className={`profile-create-row ${disabled ? "is-disabled" : ""}`} key={label} onClick={onClose} to={disabled ? "/create" : to}>
                  {content}
                </Link>
              );
            }
            return (
              <button className={`profile-create-row ${disabled ? "is-disabled" : ""}`} disabled={disabled} key={label} onClick={onClick} type="button">
                {content}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TopProfileBar({ profile, unread = 0, viewerCapabilities = {} }) {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const createTarget = viewerCapabilities.canCreate ? "/create" : "/wall";
  const canCreateStoryNow = viewerCapabilities.canCreate && canCreateStory(user);
  const canPostNote = canCreateFeedPost(user);
  const currentUser = {
    ...user,
    avatar: profile.avatar || user?.avatar,
    name: profile.displayName || user?.name || user?.username || "Creator",
  };

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
    setNoteOpen(true);
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
            <FiZap />
            {unread ? <i>{unread > 9 ? "9+" : unread}</i> : null}
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
      />
      <StoryCreator isOpen={storyOpen} onClose={() => setStoryOpen(false)} />
      <FeedPostComposer currentUser={currentUser} isOpen={noteOpen} onClose={() => setNoteOpen(false)} />
    </>
  );
}

function OwnerQuickActionsSheet({ isOpen, onClose, profile, viewerCapabilities = {} }) {
  if (!isOpen) return null;
  const isCreator = profile.isCreator;
  const actions = [
    isCreator && viewerCapabilities.canAccessStudio ? {
      icon: FiBarChart2,
      label: "Creator Studio",
      sub: "Analytics & payouts",
      to: "/studio",
    } : null,
    {
      icon: FiBell,
      label: "Activity",
      sub: "Notification history",
      to: "/activity",
    },
    {
      icon: FiZap,
      label: "Wallet",
      sub: "Stars & payments",
      to: "/wallet",
    },
    {
      icon: FiBookmark,
      label: "Saved",
      sub: "Your library",
      to: "/saved",
    },
    {
      icon: FiPenTool,
      label: "Drafts",
      sub: "Unfinished notes",
      to: isCreator && viewerCapabilities.canAccessStudio ? "/studio/seens?status=drafts" : "/create",
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
      <section className="profile-quick-actions-sheet" onClick={(event) => event.stopPropagation()}>
        <span className="profile-quick-actions-handle" />
        <h2>Quick actions</h2>
        <div className="profile-quick-actions-list">
          {actions.map(({ icon: Icon, label, sub, to }) => (
            <Link className="profile-quick-action-row" key={label} onClick={onClose} to={to}>
              <span className="profile-quick-action-icon"><Icon /></span>
              <span className="profile-quick-action-copy">
                <b>{label}</b>
                <small>{sub}</small>
              </span>
              <FiChevronRight />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function VisitorMoreSheet({ isOpen, onClose, profile, relationship = {} }) {
  const client = useQueryClient();
  const [busy, setBusy] = useState("");
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
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
  const follow = () => run(relationship.following ? "Unfollow" : "Follow", async () => {
    await profileService.toggleFollow(profile.username);
    await invalidateFollowSurfaces(client);
    onClose();
  });
  const mute = () => run(muted ? "Unmute" : "Mute", async () => {
    await messageService.muteConversation(profile.ownerUserId, !muted);
    setMuted((value) => !value);
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
    <div aria-modal="true" className="profile-quick-actions-backdrop" onClick={() => { setReporting(false); setReportDone(false); onClose(); }} role="dialog">
      <section className="profile-quick-actions-sheet is-visitor" onClick={(event) => event.stopPropagation()}>
        <span className="profile-quick-actions-handle" />
        <h2>{reportDone ? "Report received" : reporting ? `Report ${firstName}` : firstName}</h2>
        {reportDone ? <div className="profile-quick-actions-list px-4 pb-4"><p className="py-3 text-sm leading-6 text-white/60">Our team reviews every report. You will not be revealed as the reporter.</p><button className="w-full rounded-xl bg-atseen-blue px-4 py-3 text-sm font-bold text-slate-950" onClick={() => { setReportDone(false); onClose(); }} type="button">Done</button></div> : reporting ? <div className="profile-quick-actions-list"><p className="px-4 py-2 text-xs text-white/50">Why are you reporting this profile?</p>{atseenReportReasons.map((reason) => <button className="profile-quick-action-row" disabled={Boolean(busy)} key={reason} onClick={() => report(reason)} type="button"><span className="profile-quick-action-icon"><FiFlag /></span><span className="profile-quick-action-copy"><b>{reason}</b></span></button>)}<button className="profile-quick-action-row" disabled={Boolean(busy)} onClick={() => setReporting(false)} type="button"><span className="profile-quick-action-copy"><b>Back</b></span></button></div> : <div className="profile-quick-actions-list">
          <button className="profile-quick-action-row" disabled={Boolean(busy)} onClick={share} type="button"><span className="profile-quick-action-icon"><FiShare2 /></span><span className="profile-quick-action-copy"><b>Share profile</b></span></button>
          <button className="profile-quick-action-row" disabled={Boolean(busy)} onClick={follow} type="button"><span className="profile-quick-action-icon"><FiUserCheck /></span><span className="profile-quick-action-copy"><b>{relationship.following ? "Unfollow" : "Follow"}</b></span></button>
          <button className="profile-quick-action-row" disabled={Boolean(busy)} onClick={mute} type="button"><span className="profile-quick-action-icon"><FiEyeOff /></span><span className="profile-quick-action-copy"><b>{muted ? `Unmute ${firstName}` : `Mute ${firstName}`}</b><small>{muted ? "Show their updates again" : "Stay following, stop seeing their posts and stories"}</small></span></button>
          <button className="profile-quick-action-row" disabled={Boolean(busy)} onClick={() => setReporting(true)} type="button"><span className="profile-quick-action-icon"><FiFlag /></span><span className="profile-quick-action-copy"><b>Report</b></span></button>
          <button className="profile-quick-action-row is-danger" disabled={Boolean(busy)} onClick={block} type="button"><span className="profile-quick-action-icon"><FiSlash /></span><span className="profile-quick-action-copy"><b>{blocked ? `Unblock ${firstName}` : `Block ${firstName}`}</b></span></button>
        </div>}
        {error ? <p className="profile-visitor-action-error" role="alert">{error}</p> : null}
      </section>
    </div>
  );
}

function MoreMenu({ isOwner, profile, relationship = {}, viewerCapabilities = {} }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="profile-more-wrap">
      <button aria-expanded={open} aria-label="More profile actions" className="profile-action-chip is-icon" onClick={() => setOpen((value) => !value)} type="button"><FiMoreHorizontal /></button>
      {isOwner ? (
        <OwnerQuickActionsSheet isOpen={open} onClose={() => setOpen(false)} profile={profile} viewerCapabilities={viewerCapabilities} />
      ) : (
        <VisitorMoreSheet isOpen={open} onClose={() => setOpen(false)} profile={profile} relationship={relationship} />
      )}
    </span>
  );
}

function metricValue(metrics = {}, key, fallback = 0) {
  return metrics[key] ?? metrics[`${key}Count`] ?? fallback;
}

function IdentitySection({ metrics = {}, onConnectionsOpen, planets = [], profile, relationship = {}, viewerCapabilities }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewersOpen, setViewersOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [seenConfirmation, setSeenConfirmation] = useState(false);
  const isOwner = viewerCapabilities.isOwner;
  const cover = resolveMediaUrl(profile.cover);
  const avatar = resolveMediaUrl(profile.avatar);
  const activeStatus = profile.activeStatus || null;
  const statusColor = activeStatus?.color || "#9CCBFF";
  const shareUrl = `${window.location.origin}/profile/${profile.username}`;
  const editStatus = () => isOwner && navigate("/profile/status");
  const statusText = activeStatus?.label || "";
  const viewersSummary = useQuery({
    queryKey: ["profile", "me", "viewers", "summary"],
    queryFn: () => profileService.getOwnViewers({ limit: 2 }).then((response) => response.data.data),
    enabled: isOwner,
    retry: false,
    staleTime: 30000,
  });
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
  const profileWorld = planets.find((planet) => planet.kind === "PREMIUM_WORLD") || planets[0];
  const worldTarget = profileWorld
    ? isOwner
      ? ["DRAFT", "CHANGES_REQUESTED"].includes(profileWorld.status)
        ? `/studio/worlds/${profileWorld.id}/edit`
        : profileWorld.status === "PUBLISHED"
          ? `/world/${profileWorld.id}`
          : "/profile"
      : `/world/${profileWorld.id}`
    : isOwner
      ? "/create/premium-world"
      : "";
  const planetFace = profileWorld?.planet?.emoji || PROFILE_FLOATING_PLANET;
  const showWorldBadge = !isOwner && profile.isCreator && profileWorld;
  const seenByCount = viewersSummary.data?.seenTodayCount ?? metricValue(metrics, "seenBy", metricValue(metrics, "profileView", metrics.publishedContentCount));
  const identityMetrics = [
    ["followers", "Followers", metrics.followerCount, () => onConnectionsOpen?.("followers")],
    ["following", "Following", metrics.followingCount, () => onConnectionsOpen?.("following")],
    ["seen-by", "Seen by", seenByCount, () => (isOwner ? setViewersOpen(true) : null)],
  ];

  return (
    <section className={`profile-identity ${isOwner ? "is-owner" : "is-visitor"}`}>
      {!isOwner ? <div className="profile-cover">
        {cover ? <img alt={`${profile.displayName} cover`} src={cover} /> : null}
        <button aria-label="Go back" className="profile-cover-back" onClick={() => navigate(-1)} type="button"><FiArrowLeft /></button>
        <span className="profile-cover-more"><MoreMenu isOwner={false} profile={profile} relationship={relationship} viewerCapabilities={viewerCapabilities} /></span>
        {!isOwner && seenConfirmation ? <div className="profile-seen-confirmation" role="status"><FiEye /> Only {profile.displayName?.split(" ")[0] || "they"} sees this</div> : null}
      </div> : null}
      <div className="profile-identity-row">
        <span className="profile-avatar-ring" style={{ "--profile-status-color": statusColor }}>
          <FanAvatar name={profile.displayName} size="h-[70px] w-[70px]" src={avatar} />
          {showWorldBadge ? (
            <Link aria-label={profileWorld ? `Open ${profileWorld.title || "world"}` : "Create Premium World"} className="profile-avatar-world-badge" to={worldTarget}>
              <span>{PROFILE_FLOATING_HAND}</span>
              <span>{planetFace}</span>
            </Link>
          ) : null}
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
      {!isOwner && (profile.location || profile.bio || profile.categories?.length || profile.socialLinks?.length) ? (
        <div className="profile-secondary">
          {profile.bio ? <p>{profile.bio}</p> : null}
          {profile.socialLinks?.[0]?.url ? <p><FiLink /> <a href={profile.socialLinks[0].url} rel="noreferrer" target="_blank">{profile.socialLinks[0].url.replace(/^https?:\/\//, "")}</a></p> : null}
          {profile.location ? <p><FiMapPin /> {profile.location}</p> : null}
          {profile.categories?.length ? <p>{profile.categories.slice(0, 4).join(" / ")}</p> : null}
        </div>
      ) : null}
      <div className="profile-action-row">
        {isOwner ? <Link className="profile-action-chip" to="/settings/profile"><FiEdit3 /> Edit</Link> : null}
        {!isOwner ? <button aria-label={`Let ${profile.displayName} know you saw them`} className={`profile-visitor-eye ${relationship.seeSignalSent ? "is-seen" : ""}`} disabled={seeSignal.isPending} onClick={markProfileSeen} type="button"><FiEye /></button> : null}
        {!isOwner && viewerCapabilities.canFollow ? <VisitorFollowButton profile={profile} relationship={relationship} /> : null}
        {!isOwner && viewerCapabilities.canMessage ? <button className="profile-action-chip" onClick={() => navigate(`/messages?with=${encodeURIComponent(profile.ownerUserId)}`)} type="button"><FiMessageCircle /> Message</button> : null}
        {isOwner ? <button className="profile-action-chip" onClick={() => setShareOpen(true)} type="button"><FiShare2 /> Share</button> : null}
        {isOwner ? <MoreMenu isOwner profile={profile} relationship={relationship} viewerCapabilities={viewerCapabilities} /> : null}
      </div>
      <ProfileViewersSheet isOpen={viewersOpen} onClose={() => setViewersOpen(false)} />
      <ProfileShareSheet isOpen={shareOpen} onClose={() => setShareOpen(false)} profile={profile} shareUrl={shareUrl} viewerCapabilities={viewerCapabilities} />
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
  return <button className="profile-action-chip" disabled={follow.isPending} onClick={() => follow.mutate()} type="button">{following ? <FiUserCheck /> : <FiUserPlus />} {following ? "Following" : "Follow"}</button>;
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
  const canShowDashboard = profile.isCreator && viewerCapabilities.canAccessStudio;
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
  const query = useQuery({
    queryKey: ["creator-dream", profile?.username],
    queryFn: () => dreamService.getCreatorDream(profile.username).then((response) => response.data.data),
    enabled: profile?.role === "creator" && Boolean(profile?.username),
    retry: false,
    staleTime: 30000,
  });
  if (profile?.role !== "creator" || query.isLoading || query.isError) return null;
  const dream = query.data?.dream;
  const gifts = query.data?.gifts || [];
  const supporters = dream?.supporters || [];
  const count = Number(dream?.supporterCount || supporters.length || 0);
  if (!dream && !gifts.length && !viewerCapabilities.isOwner) return null;
  return (
    <section className="profile-gift-strip">
      <span className="profile-gift-art" aria-hidden="true">
        {gifts.slice(0, 4).map((gift) => gift.imageUrl ? <img alt="" key={gift.key || gift.id || gift.name} src={gift.imageUrl} /> : <i key={gift.key || gift.id || gift.name}><FiGift /></i>)}
        {!gifts.length ? <i><FiGift /></i> : null}
      </span>
      <span className="profile-gift-copy">
        <b>{count ? `${compact(count)} ${count === 1 ? "supporter" : "supporters"}` : "Gifts"}</b>
        <small>{dream ? "Dream support and received gifts" : "Gift support opens with Dream"}</small>
      </span>
      <FiChevronRight />
    </section>
  );
}

function ProfileExperiences({ isOwner, planets = [] }) {
  const experiences = planets.filter((planet) => planet.kind === "WORLD");
  if (!experiences.length && !isOwner) return null;
  return (
    <section className="profile-section profile-experiences-section">
      <header className="profile-section-head">
        <h2>Experiences</h2>
        <span>
          {isOwner ? <Link to="/studio">See all</Link> : null}
          {isOwner ? <Link aria-label="Create Experience" className="profile-section-plus" to="/create/world"><FiPlus /></Link> : null}
        </span>
      </header>
      {experiences.length ? experiences.slice(0, 2).map((item) => {
        const chapters = item.chapters?.length || item.chapterCount || 0;
        const target = isOwner && ["DRAFT", "CHANGES_REQUESTED"].includes(item.status) ? `/studio/worlds/${item.id}/edit` : `/world/${item.id}`;
        const price = Number(item.pricing?.starsAmount || 0);
        return (
          <Link className="profile-experience-row" key={item.id} to={target}>
            <span className="profile-experience-cover">
              {item.coverMedia?.secureUrl ? <img alt="" src={item.coverMedia.secureUrl} /> : <FiAperture />}
            </span>
            <span className="profile-experience-copy">
              <b>{item.title || "Untitled Experience"}</b>
              <small>{chapters} {chapters === 1 ? "chapter" : "chapters"}{item.category ? ` - ${item.category}` : ""}{relativeTime(item.publishedAt) ? ` - upd ${relativeTime(item.publishedAt)}` : ""}</small>
              <em>{price ? `${String.fromCharCode(10022)}${compact(price)} - one-time` : "Free"}</em>
            </span>
            <FiChevronRight />
          </Link>
        );
      }) : <p className="profile-empty-state">No Experiences yet.</p>}
    </section>
  );
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

function ContentTabsPanel({ data, isOwner, tab }) {
  const saved = useQuery({
    queryKey: ["saved-content"],
    queryFn: () => savedService.list().then((response) => response.data.data),
    enabled: isOwner && tab === "saved",
    retry: false,
  });
  if (tab === "seens") return <ProfileContentGrid content={data.seens || []} emptyText={isOwner ? "Your Seens live here - create one with +" : "No Seens yet."} kind="seens" owner={isOwner} />;
  if (tab === "reposts") return <ProfileContentGrid content={data.sharedSeens || []} emptyText="No reposted Seens yet." kind="seens" reposted />;
  if (!isOwner) return <div className="profile-empty-state">Saved items are private.</div>;
  if (saved.isLoading) return <LoadingSkeleton className="h-40" count={1} />;
  return <ProfileContentGrid content={saved.data?.seens || []} emptyText="No saved Seens yet." kind="seens" />;
}

function WallPreview({ isOwner, posts = [] }) {
  const visible = posts.slice(0, 2);
  return (
    <section className="profile-section profile-wall-section">
      <header className="profile-section-head">
        <h2>Wall</h2>
        <Link to="/wall">{compact(posts.length)} notes <FiChevronRight /></Link>
      </header>
      {visible.length ? <div className="profile-notes-list">{visible.map((post) => <FeedPost key={post.feedId || post.id} post={post} />)}</div> : <p className="profile-empty-state">{isOwner ? "Your notes will appear here." : "No Wall notes yet."}</p>}
      {posts.length ? <Link className="profile-open-wall" to="/wall">Open the Wall <FiChevronRight /></Link> : null}
    </section>
  );
}

function ProfileBody({ data, setConnectionsType }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [tab, setTabState] = useState(["seens", "reposts", "saved"].includes(requestedTab) ? requestedTab : "seens");
  const { profile, publicMetrics, viewerCapabilities } = data;
  const isOwner = viewerCapabilities.isOwner;
  useEffect(() => {
    setTabState(["seens", "reposts", "saved"].includes(requestedTab) ? requestedTab : "seens");
  }, [requestedTab]);
  const setTab = (nextTab) => {
    setTabState(nextTab);
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === "seens") nextParams.delete("tab");
    else nextParams.set("tab", nextTab);
    setSearchParams(nextParams, { replace: true });
  };
  return (
    <div className="profile-prototype">
      {isOwner ? <TopProfileBar profile={profile} viewerCapabilities={viewerCapabilities} /> : null}
      <IdentitySection metrics={publicMetrics} onConnectionsOpen={setConnectionsType} planets={data.planets || []} profile={profile} relationship={data.viewerRelationship} viewerCapabilities={viewerCapabilities} />
      <ProfileAccessGroup profile={profile} viewerCapabilities={viewerCapabilities} />
      <ProfileGiftStrip profile={profile} viewerCapabilities={viewerCapabilities} />
      <ProfileMediaSection initialMedia={data.media || []} isOwner={isOwner} username={profile.username} />
      <ProfileExperiences isOwner={isOwner} planets={data.planets || []} />
      <ProfileTabs setTab={setTab} tab={tab} />
      <section className="profile-grid-panel"><ContentTabsPanel data={data} isOwner={isOwner} tab={tab} /></section>
      <ProfileDream capabilities={viewerCapabilities} profile={profile} role={profile.role} />
      <WallPreview isOwner={isOwner} posts={data.wallPosts || []} />
      <ProfileOrbit capabilities={viewerCapabilities} planets={data.planets || []} profile={profile} role={profile.role} />
      {profile.joinedAt ? <p className="profile-joined"><FiCalendar /> Joined {new Date(profile.joinedAt).toLocaleDateString()}</p> : null}
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
        <ProfileConnectionsModal onClose={() => setConnectionsType("")} type={connectionsType} username={profileQuery.data.profile.username} />
        <ProfileBody data={profileQuery.data} setConnectionsType={setConnectionsType} />
      </>
    );
  }

  if (owner || embedded) return body;
  return <div className="min-h-screen bg-atseen-bg px-4 py-6 text-atseen-text sm:px-6"><main className="mx-auto max-w-[610px]">{body}</main></div>;
}

export default UnifiedProfilePage;
