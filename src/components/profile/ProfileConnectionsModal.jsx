import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiSearch } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import LoadingSkeleton from "../fanWeb/shared/LoadingSkeleton";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import { profileService } from "../../services/profileService";

const TYPES = [
  ["followers", "Followers"],
  ["following", "Following"],
  ["seen-by", "Seen by"],
];

function compact(value) {
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

function ProfileConnectionsModal({ counts = {}, displayName = "Profile", onClose, type, username }) {
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
    enabled: Boolean(type && username && activeType),
    retry: false,
  });
  const visibleAccounts = useMemo(() => {
    const accounts = query.data?.accounts || [];
    const needle = search.trim().toLowerCase();
    if (!needle) return accounts;
    return accounts.filter((account) => [account.name, account.username, account.bio, account.tagline].some((value) => String(value || "").toLowerCase().includes(needle)));
  }, [query.data?.accounts, search]);
  const firstName = String(displayName || username || "Profile").trim().split(/\s+/)[0];
  const totalFor = (value) => value === activeType && query.data?.pagination ? query.data.pagination.total : counts[value];

  if (!type) return null;
  return (
    <div aria-modal="true" className="profile-connections-backdrop" role="dialog" style={position}>
      <section className="profile-connections-page">
        <header><button aria-label="Back to profile" onClick={onClose} type="button"><FiArrowLeft /></button><h1>{firstName}</h1></header>
        <nav aria-label="Profile connections">
          {TYPES.map(([value, label]) => <button className={activeType === value ? "is-active" : ""} key={value} onClick={() => { setActiveType(value); setSearch(""); }} type="button"><strong>{compact(totalFor(value))}</strong><span>{label}</span></button>)}
        </nav>
        <label className="profile-connections-search"><FiSearch /><input aria-label="Search profile connections" onChange={(event) => setSearch(event.target.value)} placeholder="Search" value={search} /></label>
        <main>
          {query.isLoading ? <LoadingSkeleton className="h-14" count={5} /> : null}
          {query.isError ? <div className="profile-connections-state"><p>Unable to load these profiles.</p><button onClick={() => query.refetch()} type="button">Try again</button></div> : null}
          {!query.isLoading && !query.isError ? visibleAccounts.map((account) => <ConnectionRow account={account} key={account.id} onClose={onClose} />) : null}
          {!query.isLoading && !query.isError && !visibleAccounts.length ? <p className="profile-connections-empty">{search ? "No matching profiles." : `No ${TYPES.find(([value]) => value === activeType)?.[1].toLowerCase()} yet.`}</p> : null}
        </main>
      </section>
    </div>
  );
}

export default ProfileConnectionsModal;
