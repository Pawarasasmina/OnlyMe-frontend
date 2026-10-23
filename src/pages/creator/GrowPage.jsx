import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiChevronRight, FiCopy, FiGift, FiShare2, FiUsers } from "react-icons/fi";
import ShareSheet from "../../components/share/ShareSheet";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { creatorService } from "../../services/creatorService";
import { useAuth } from "../../hooks/useAuth";
import { resolveMediaUrl } from "../../utils/media";

async function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input = document.createElement("textarea");
  input.value = value; input.setAttribute("readonly", ""); input.style.position = "fixed"; input.style.opacity = "0";
  document.body.appendChild(input); input.select(); const copied = document.execCommand("copy"); input.remove();
  if (!copied) throw new Error("Copy failed");
}

function InvitationCard({ description, icon, label, onShare, url }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await copyText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  return <article className="grow-invite-row"><span>{icon}</span><div><b>{label}</b><small>{description}</small></div><button onClick={onShare} type="button"><FiShare2 /> Share</button><button onClick={copy} type="button"><FiCopy /> {copied ? "Copied" : "Copy"}</button></article>;
}

export default function GrowPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sharePayload, setSharePayload] = useState(null);
  const query = useQuery({ queryKey: ["creator-grow"], queryFn: () => creatorService.getGrow().then((response) => response.data.data), staleTime: 30000 });
  const data = query.data || {};
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const links = useMemo(() => ({ creator: `${origin}/invite/${data.codes?.creator || ""}`, friend: `${origin}/invite/${data.codes?.friend || ""}`, gift: `${origin}/profile/${encodeURIComponent(user?.username || "")}?sendGift=1` }), [data.codes, origin, user?.username]);
  const share = (kind, title, text) => setSharePayload({ canonicalUrl: links[kind], contentId: user?.id || user?._id, contentType: "profile", route: links[kind], title, textPreview: text, author: { name: user?.name, username: user?.username, avatar: user?.avatar } });
  if (query.isLoading) return <main className="grow-page"><LoadingSkeleton className="h-14" count={1} /><LoadingSkeleton className="h-44" count={3} /></main>;
  if (query.isError) return <main className="grow-page"><button className="grow-back" onClick={() => navigate(-1)} type="button"><FiArrowLeft /></button><div className="grow-error"><h1>Grow</h1><p>Grow could not be loaded.</p><button onClick={() => query.refetch()} type="button">Try again</button></div></main>;
  const total = data.counts?.total || 0;
  const goal = data.config?.spotlightGoal || 2500;
  const progress = Math.min(100, total / goal * 100);
  const recent = data.recent || [];
  return <>
    <main className="grow-page">
      <header><button className="grow-back" aria-label="Back" onClick={() => navigate(-1)} type="button"><FiArrowLeft /></button><h1>Grow</h1></header>
      <section className="grow-intro"><h2>Your people.<br />Your money.</h2><p>Everyone who joins through your link stays yours — you earn more from everything they buy, for 12 months.</p></section>
      <section className="grow-link-card"><small>YOUR LINK</small><strong>atseen.com/@{user?.username}</strong><div><button onClick={() => copyText(links.creator)} type="button">Copy link</button><button onClick={() => share("creator", "Create on @seen", `Join ${user?.name || "me"} on @seen.`)} type="button">Share</button></div><p>Put it in your Instagram and TikTok bio — that’s where your people already are.</p></section>
      <div className="grow-invites"><InvitationCard description={`atseen.com/@${user?.username}/gift`} icon={<FiGift />} label="Gift link" onShare={() => share("gift", `Send ${user?.name || "me"} a gift`, "Support my work with a gift on @seen.")} url={links.gift} /></div>
      <p className="grow-label">EVERY 190-COIN EXPERIENCE</p>
      <section className="grow-comparison"><div><b>Through your link</b><strong>$14.53</strong></div><i><b style={{ width: "76%" }} /></i><small>your fan, for 12 months</small><div><b>Found you on @seen</b><strong>$12.92</strong></div><i className="is-muted"><b style={{ width: "68%" }} /></i><small>per purchase</small><hr /><p><strong>−$1.61</strong><span>That’s what every fan who arrives without your link costs you — on every purchase.</span></p></section>
      <p className="grow-label">CAME THROUGH YOU</p>
      <section className="grow-stats"><article><div><strong>{total.toLocaleString()}</strong><span className="grow-stat-faces">{recent.slice(0, 3).map((row) => <i key={row.id}>{row.person?.avatar ? <img alt="" src={resolveMediaUrl(row.person.avatar)} /> : (row.person?.name || "?")[0]}</i>)}</span></div><small>people</small></article><article><strong>+${Number(data.earnings?.amount || 0).toFixed(2)}</strong><small>extra — because they came<br />through you</small></article></section>
      <section className="grow-progress"><div><b>{data.counts?.spotlightRemaining?.toLocaleString()} more to Spotlight</b><span>{total.toLocaleString()} / {goal.toLocaleString()}</span></div><i><b style={{ width: `${progress}%` }} /></i><p>At {goal.toLocaleString()} you’re in the @seen Spotlight for a week — on every fan’s Discover. Your Founding mark is already gold.</p><div className="grow-milestones">{[[100, "Link in bio"], [250, "Founding"], [1000, "Discover"], [2500, "Spotlight"]].map(([value, label]) => <span className={total >= value ? "is-done" : ""} key={value}><b>{total >= value ? "✓ " : ""}{value.toLocaleString()}</b><small>{label}</small></span>)}</div></section>
      <p className="grow-label">RECENT</p>
      <section className="grow-recent">{recent.length ? recent.map((row) => <article key={row.id}><span>{row.person?.avatar ? <img alt="" src={resolveMediaUrl(row.person.avatar)} /> : (row.person?.name || "?")[0]}</span><div><b>{row.person?.name || "@seen member"}</b><small>via your link · {row.joinedLabel || new Date(row.attributedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small></div><aside><strong>+${Number(row.earningsAmount || 0).toFixed(2)}</strong><small><i /> {Number(row.coins || 0).toLocaleString()}</small></aside></article>) : <p>Your invitations will appear here after someone joins.</p>}</section>
      <p className="grow-label">INVITE A CREATOR</p>
      <section className="grow-creator-invite"><h3>Earn from every sale they make — for a year</h3><p>Paid by @seen — it never comes out of their earnings.</p>{(data.invitedCreators?.length ? data.invitedCreators : recent.filter((row) => row.type === "creator")).slice(0, 2).map((row) => <article key={row.id}><span>{row.person?.avatar ? <img alt="" src={resolveMediaUrl(row.person.avatar)} /> : (row.person?.name || "?")[0]}</span><p>{row.person?.name || "Creator"} · {row.joinedLabel || `joined ${new Date(row.attributedAt).toLocaleDateString()}`}</p><strong>+${Number(row.earningsAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></article>)}{!data.invitedCreators?.length && !recent.some((row) => row.type === "creator") ? <div className="grow-creator-empty"><span><FiUsers /></span><p><b>Your invited creators appear here</b><small>Their settled referral earnings stay separate.</small></p></div> : null}<button onClick={() => share("creator", "Create on @seen", "Join through my creator invitation.")} type="button">Invite a creator</button></section>
      <Link className="grow-studio-link" to="/grow/fan-preview">See what your fans see <FiChevronRight /></Link>
    </main>
    <ShareSheet isOpen={Boolean(sharePayload)} onClose={() => setSharePayload(null)} payload={sharePayload} />
  </>;
}
