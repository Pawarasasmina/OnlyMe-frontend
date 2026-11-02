import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import LoadingSkeleton from "../fanWeb/shared/LoadingSkeleton";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import { profileService } from "../../services/profileService";
import { orbitService } from "../../services/orbitService";
import { relativeTime } from "../../utils/relativeTime";

const TYPES = [
  ["followers", "Followers"],
  ["following", "Following"],
  ["seen-by", "Seen by"],
];

function compact(value) {
  if (value == null) return "…";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function ConnectionRow({ account, onClose }) {
  const queryClient = useQueryClient();
  const [following, setFollowing] = useState(Boolean(account.following));
  const mutation = useMutation({
    mutationFn: () => profileService.toggleFollow(account.username),
    onSuccess: (response) => {
      setFollowing(Boolean(response.data.data?.relationship?.active));
      queryClient.invalidateQueries({ queryKey: ["profile-connections"] });
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
    },
  });
  const subtitle = account.bio || account.tagline || (account.role === "creator" ? "Creator" : `@${account.username}`);

  return (
    <div className="profile-connections-row">
      <Link onClick={onClose} to={`/profile/${encodeURIComponent(account.username)}`}>
        <FanAvatar name={account.name} size="h-[42px] w-[42px]" src={account.avatar} />
        <span>
          <strong>{account.name}{account.verified ? <VerifiedBadge /> : null}</strong>
          <small>{subtitle}</small>
        </span>
      </Link>
      {!account.isSelf ? <button className={following ? "is-following" : ""} disabled={mutation.isPending} onClick={() => mutation.mutate()} type="button">{mutation.isPending ? "…" : following ? "Following" : "Follow"}</button> : null}
    </div>
  );
}

function timelineGroup(createdAt) {
  const value = new Date(createdAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const week = new Date(today);
  week.setDate(week.getDate() - 7);
  if (value >= today) return "Today";
  if (value >= week) return "This week";
  return "Earlier";
}

function SignalEyeIcon() {
  return <svg aria-hidden="true" width="13" viewBox="0 0 64 40"><path d="M2 20 C14 3 50 3 62 20 C50 37 14 37 2 20 Z" fill="currentColor" /><circle cx="32" cy="20" r="8.5" fill="#0A0C0F" /></svg>;
}

function MutualSignalIcon() {
  return <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="13" rx="9" ry="4" stroke="#9CCBFF" strokeWidth="1.5" transform="rotate(-15 12 13)" /><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" fill="#E4D46D" /></svg>;
}

function SeenByRow({ account, mutual, onClose, onSeeBack }) {
  return (
    <div className="profile-seen-by-row">
      <Link onClick={onClose} to={`/profile/${encodeURIComponent(account.username)}`}>
        <FanAvatar name={account.name} size="h-[42px] w-[42px]" src={account.avatar} />
        <span><strong>{account.name}{account.verified ? <VerifiedBadge /> : null}</strong><small>said &ldquo;I see you&rdquo;</small></span>
      </Link>
      <time dateTime={account.createdAt}>{relativeTime(account.createdAt)}</time>
      {mutual ? <span className="profile-seen-mutual"><MutualSignalIcon /> mutual</span> : <button disabled={onSeeBack.isPending} onClick={() => onSeeBack.mutate(account.id)} type="button"><SignalEyeIcon /> See back</button>}
    </div>
  );
}

function ProfileConnectionsModal({ counts = {}, displayName = "Profile", isOwn = false, onClose, type, username }) {
  const queryClient = useQueryClient();
  const { showToast } = useFanToast();
  const [activeType, setActiveType] = useState(type || "followers");
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState(undefined);

  useEffect(() => {
    if (type) setActiveType(type);
  }, [type]);

  useEffect(() => {
    if (!type) return undefined;
    const centerColumn = document.querySelector(".social-center-scroll");
    const updatePosition = () => {
      if (!centerColumn) return;
      const bounds = centerColumn.getBoundingClientRect();
      setPosition({ "--profile-connections-center-x": `${bounds.left + (bounds.width / 2)}px` });
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
  }, [onClose, type]);

  const query = useQuery({
    queryKey: ["profile-connections", username, activeType],
    queryFn: () => profileService.getConnections(username, activeType).then((response) => response.data.data),
    enabled: Boolean(type && username && activeType && !(isOwn && activeType === "seen-by")),
    retry: false,
  });
  const countsQuery = useQuery({
    queryKey: ["profile-connection-counts", username],
    queryFn: async () => {
      const results = await Promise.all(TYPES.map(([value]) => profileService.getConnections(username, value)));
      return Object.fromEntries(TYPES.map(([value], index) => [value, Number(results[index].data.data?.pagination?.total) || 0]));
    },
    enabled: Boolean(type && username),
    retry: false,
  });
  const viewersQuery = useQuery({
    queryKey: ["profile-viewers", "connections"],
    queryFn: async () => {
      const [viewers, sent] = await Promise.all([profileService.getOwnViewers({ limit: 100 }), orbitService.getSentSignals()]);
      return { viewers: viewers.data.data, sent: sent.data.data };
    },
    enabled: Boolean(type && isOwn && activeType === "seen-by"),
    retry: false,
  });
  const seeBack = useMutation({
    mutationFn: orbitService.sendSeeYouSignal,
    onSuccess: (_response, targetUserId) => {
      queryClient.setQueryData(["profile-viewers", "connections"], (current) => current ? { ...current, sent: { ...current.sent, signals: [...(current.sent?.signals || []), { targetUserId }] } } : current);
      queryClient.invalidateQueries({ queryKey: ["profile-viewers", "connections"] });
      queryClient.invalidateQueries({ queryKey: ["fan", "activity"] });
    },
    onError: () => showToast("Could not send your signal. Please try again."),
  });
  const visibleAccounts = useMemo(() => {
    const accounts = query.data?.accounts || [];
    const needle = search.trim().toLowerCase();
    if (!needle) return accounts;
    return accounts.filter((account) => [account.name, account.username, account.bio, account.tagline].some((value) => String(value || "").toLowerCase().includes(needle)));
  }, [query.data?.accounts, search]);
  const firstName = isOwn ? "You" : String(displayName || username || "Profile").trim().split(/\s+/)[0];
  const totalFor = (value) => countsQuery.data?.[value] ?? (value === activeType && query.data?.pagination ? query.data.pagination.total : counts[value]);
  const seenAccounts = (viewersQuery.data?.viewers?.signals || []).map((signal) => ({
    id: signal.actor?.id,
    name: signal.actor?.displayName,
    username: signal.actor?.username,
    avatar: signal.actor?.avatarUrl,
    verified: signal.actor?.verified,
    createdAt: signal.createdAt,
  })).filter((account) => account.id && account.username && (!search.trim() || [account.name, account.username].some((value) => String(value || "").toLowerCase().includes(search.trim().toLowerCase()))));
  const sentIds = new Set((viewersQuery.data?.sent?.signals || []).map((signal) => String(signal.targetUserId)));
  const seenGroups = seenAccounts.reduce((groups, account) => {
    const label = timelineGroup(account.createdAt);
    groups[label] ||= [];
    groups[label].push(account);
    return groups;
  }, {});
  const activeQuery = isOwn && activeType === "seen-by" ? viewersQuery : query;

  if (!type) return null;
  return (
    <div aria-modal="true" className="profile-connections-backdrop" role="dialog" style={position}>
      <section className={`profile-connections-page ${isOwn && activeType === "seen-by" ? "is-seen-by" : ""}`}>
        <header><button aria-label="Back to profile" onClick={onClose} type="button"><FiArrowLeft /></button><h1>{firstName}</h1></header>
        <nav aria-label="Profile connections">
          {TYPES.map(([value, label]) => <button className={activeType === value ? "is-active" : ""} key={value} onClick={() => { setActiveType(value); setSearch(""); }} type="button"><strong>{compact(totalFor(value))}</strong><span>{label}</span></button>)}
        </nav>
        <label className="profile-connections-search"><input aria-label="Search profile connections" onChange={(event) => setSearch(event.target.value)} placeholder="Search" value={search} /></label>
        <main>
          {activeQuery.isLoading ? <LoadingSkeleton className="h-14" count={5} /> : null}
          {activeQuery.isError ? <div className="profile-connections-state"><p>Unable to load these profiles.</p><button onClick={() => activeQuery.refetch()} type="button">Try again</button></div> : null}
          {!activeQuery.isLoading && !activeQuery.isError && isOwn && activeType === "seen-by" ? ["Today", "This week", "Earlier"].map((label) => seenGroups[label]?.length ? <section className="profile-seen-group" key={label}><h2>{label}</h2>{seenGroups[label].map((account) => <SeenByRow account={account} key={account.id} mutual={sentIds.has(String(account.id))} onClose={onClose} onSeeBack={seeBack} />)}</section> : null) : null}
          {!activeQuery.isLoading && !activeQuery.isError && !(isOwn && activeType === "seen-by") ? visibleAccounts.map((account) => <ConnectionRow account={account} key={account.id} onClose={onClose} />) : null}
          {!activeQuery.isLoading && !activeQuery.isError && (isOwn && activeType === "seen-by" ? !seenAccounts.length : !visibleAccounts.length) ? <p className="profile-connections-empty">{search ? "No matching profiles." : `No ${TYPES.find(([value]) => value === activeType)?.[1].toLowerCase()} yet.`}</p> : null}
        </main>
      </section>
    </div>
  );
}

export default ProfileConnectionsModal;
