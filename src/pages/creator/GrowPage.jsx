import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiChevronRight, FiCopy, FiGift, FiShare2, FiUsers } from "react-icons/fi";
import ShareSheet from "../../components/share/ShareSheet";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import FanModal from "../../components/fanWeb/shared/FanModal";
import { creatorService } from "../../services/creatorService";
import { useAuth } from "../../hooks/useAuth";
import { resolveMediaUrl } from "../../utils/media";

async function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input = document.createElement("textarea");
  input.value = value; input.setAttribute("readonly", ""); input.style.position = "fixed"; input.style.opacity = "0";
  document.body.appendChild(input); input.select(); const copied = document.execCommand("copy"); input.remove();
  if (!copied) throw new Error(__msg("creator.copyFailed"));
}

function InvitationCard({ description, icon, label, onShare, url }) {
  __useUiLanguage();
  const [copied, setCopied] = useState(false);
  const copy = async () => { await copyText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  return <article className="grow-invite-row"><span>{icon}</span><div><b>{label}</b><small>{description}</small></div><button onClick={onShare} type="button"><FiShare2 /> {__msg("admin.share")}</button><button onClick={copy} type="button"><FiCopy /> {copied ? __msg("creator.copied") : __msg("creator.copy")}</button></article>;
}

export default function GrowPage() {
  __useUiLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sharePayload, setSharePayload] = useState(null);
  const [referralHelpOpen, setReferralHelpOpen] = useState(false);
  const [calculatorCreators, setCalculatorCreators] = useState(1);
  const [calculatorEarnings, setCalculatorEarnings] = useState(25);
  const calculatorInitialized = useRef(false);
  const query = useQuery({ queryKey: ["creator-grow"], queryFn: () => creatorService.getGrow().then((response) => response.data.data), staleTime: 30000 });
  const data = query.data || {};
  const creatorReferral = data.creatorReferral || { enabled: false, creators: [], thisMonthAmount: 0 };
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const links = useMemo(() => ({ creator: `${origin}/invite/${data.codes?.creator || ""}`, friend: `${origin}/invite/${data.codes?.friend || ""}`, gift: `${origin}/profile/${encodeURIComponent(user?.username || "")}?sendGift=1` }), [data.codes, origin, user?.username]);
  const share = (kind, title, text) => setSharePayload({ canonicalUrl: links[kind], contentId: user?.id || user?._id, contentType: "profile", route: links[kind], title, textPreview: text, author: { name: user?.name, username: user?.username, avatar: user?.avatar } });
  useEffect(() => {
    if (!query.data || calculatorInitialized.current) return;
    const creators = query.data.creatorReferral?.creators || [];
    const realCount = creators.length;
    const realMonthlyAverage = realCount ? creators.reduce((sum, row) => sum + Number(row.creatorMonthEarningsAmount || 0), 0) / realCount : 0;
    setCalculatorCreators(Math.max(1, Math.min(50, realCount || 1)));
    setCalculatorEarnings(Math.max(25, Math.min(3000, Math.round(realMonthlyAverage / 25) * 25 || 25)));
    calculatorInitialized.current = true;
  }, [query.data]);
  if (query.isLoading) return <main className="grow-page"><LoadingSkeleton className="h-14" count={1} /><LoadingSkeleton className="h-44" count={3} /></main>;
  if (query.isError) return <main className="grow-page"><button className="grow-back" onClick={() => navigate(-1)} type="button"><FiArrowLeft data-ui-directional="true" /></button><div className="grow-error"><h1>{__msg("creator.grow")}</h1><p>{__msg("creator.growCouldNotBeLoaded")}</p><button onClick={() => query.refetch()} type="button">{__msg("discover.tryAgain")}</button></div></main>;
  const total = data.counts?.total || 0;
  const goal = data.config?.spotlightGoal || 2500;
  const progress = Math.min(100, total / goal * 100);
  const recent = data.recent || [];
  const calculatorMonth = calculatorCreators * calculatorEarnings / 10;
  return <>
    <main className="grow-page">
      <header><button className="grow-back" aria-label={__msg("discover.back")} onClick={() => navigate(-1)} type="button"><FiArrowLeft data-ui-directional="true" /></button><h1>{__msg("creator.grow")}</h1></header>
      <section className="grow-intro"><h2>{__msg("creator.yourPeople")}<br />{__msg("creator.yourMoney")}</h2><p>{__msg("creator.everyoneWhoJoinsThroughYourLinkStaysYoursYou")}</p></section>
      <section className="grow-link-card"><small>{__msg("creator.yourLink")}</small><strong dir="auto">{__msg("creator.atseenCom")}{user?.username}</strong><div><button onClick={() => copyText(links.creator)} type="button">{__msg("profile.copyLink")}</button><button onClick={() => share("creator", "Create on @seen", `Join ${user?.name || "me"} on @seen.`)} type="button">{__msg("admin.share")}</button></div><p>{__msg("creator.putItInYourInstagramAndTiktokBioThat")}</p></section>
      <div className="grow-invites"><InvitationCard description={__msg("creator.atseenComGift", { value0: user?.username })} icon={<FiGift />} label={__msg("creator.giftLink")} onShare={() => share("gift", `Send ${user?.name || "me"} a gift`, "Support my work with a gift on @seen.")} url={links.gift} /></div>
      <p className="grow-label">{__msg("creator.cameThroughYou")}</p>
      <section className="grow-stats"><article><div><strong>{total.toLocaleString(__uiLocale())}</strong><span className="grow-stat-faces">{recent.slice(0, 3).map((row) => <i key={row.id}>{row.person?.avatar ? <img alt="" src={resolveMediaUrl(row.person.avatar)} /> : (row.person?.name || "?")[0]}</i>)}</span></div><small>{__msg("profile.people")}</small></article><article><strong>+${Number(creatorReferral.thisMonthAmount || 0).toFixed(2)}</strong><small>this month from<br />creators you brought</small></article></section>
      <section className="grow-progress"><div><b>{data.counts?.spotlightRemaining?.toLocaleString()} {__msg("creator.moreToSpotlight")}</b><span>{total.toLocaleString(__uiLocale())} / {goal.toLocaleString(__uiLocale())}</span></div><i><b style={{ width: `${progress}%` }} /></i><p>{__msg("creator.at")} {goal.toLocaleString(__uiLocale())} {__msg("creator.youReInTheSeenSpotlightForAWeek")}</p><div className="grow-milestones">{[[100, __msg("system.copy.808d6c074db1")], [250, __msg("system.copy.7733e797e39d")], [1000, __msg("discover.discover")], [2500, __msg("system.copy.14ab8041d739")]].map(([value, label]) => <span className={total >= value ? "is-done" : ""} key={value}><b>{total >= value ? "✓ " : ""}{value.toLocaleString(__uiLocale())}</b><small>{label}</small></span>)}</div></section>
      <p className="grow-label">{__msg("creator.recent")}</p>
      <section className="grow-recent">{recent.length ? recent.map((row) => <article key={row.id}><span>{row.person?.avatar ? <img alt="" src={resolveMediaUrl(row.person.avatar)} /> : (row.person?.name || "?")[0]}</span><div><b>{row.person?.name || __msg("creator.seenMember")}</b><small>{__msg("creator.viaYourLink")} {row.joinedLabel || new Date(row.attributedAt).toLocaleDateString(__uiLocale(), { month: "short", day: "numeric" })}</small></div><aside><strong>+${Number(row.earningsAmount || 0).toFixed(2)}</strong><small><i /> {Number(row.coins || 0).toLocaleString(__uiLocale())}</small></aside></article>) : <p>{__msg("creator.yourInvitationsWillAppearHereAfterSomeoneJoins")}</p>}</section>
      <p className="grow-label">CREATORS YOU BROUGHT</p>
      <section className="grow-creator-invite grow-referral-money"><header><span><small>THIS MONTH</small><strong>+${Number(creatorReferral.thisMonthAmount || 0).toFixed(2)}</strong></span><button onClick={() => setReferralHelpOpen(true)} type="button">How it works ›</button></header><p>$1 for every $10 they earn — for their first year. Paid by @seen, never taken from them.</p>{creatorReferral.creators.slice(0, 20).map((row) => <article key={row.id}><span>{row.person?.avatar ? <img alt="" src={resolveMediaUrl(row.person.avatar)} /> : (row.person?.name || "?")[0]}</span><p><b>{row.person?.name || __msg("discover.creator")}</b><small>{row.monthsLeft} months left</small></p><strong>+${Number(row.monthEarningsAmount || 0).toFixed(2)}</strong></article>)}{!creatorReferral.creators.length ? <div className="grow-creator-empty"><span><FiUsers /></span><p><b>Your invited creators appear here</b><small>{creatorReferral.enabled ? "Their cleared earnings are tracked automatically." : "Money stays hidden until creator payouts are switched on."}</small></p></div> : null}<button onClick={() => share("creator", "Create on @seen", "Join through my creator invitation.")} type="button">Invite a creator</button></section>
      <section className="grow-referral-calculator"><small>WHAT IT COULD BE · STARTS FROM YOUR REAL DATA</small><label><span>Creators you bring</span><b>{calculatorCreators}</b><input max="50" min="1" onChange={(event) => setCalculatorCreators(Number(event.target.value))} type="range" value={calculatorCreators} /></label><label><span>Each earns a month</span><b>${calculatorEarnings.toLocaleString()}</b><input max="3000" min="25" onChange={(event) => setCalculatorEarnings(Number(event.target.value))} step="25" type="range" value={calculatorEarnings} /></label><strong>${calculatorMonth.toLocaleString()} <em>a month to you</em></strong><p>that’s {(calculatorMonth * 12).toLocaleString(__uiLocale(), { style: "currency", currency: "USD", maximumFractionDigits: 0 })} over their first year</p></section>
      <Link className="grow-studio-link" to="/grow/fan-preview">{__msg("creator.seeWhatYourFansSee")} <FiChevronRight data-ui-directional="true" /></Link>
    </main>
    <ShareSheet isOpen={Boolean(sharePayload)} onClose={() => setSharePayload(null)} payload={sharePayload} />
    <FanModal isOpen={referralHelpOpen} onClose={() => setReferralHelpOpen(false)} overlayClassName="!absolute" title="Bring a creator, earn with them"><div className="grow-referral-help"><p>Simple, and the same for everyone.</p>{[["$1 for every $10 they earn", "For their first 12 months on @seen. Gifts, Worlds, paid Seens and Direct Access all count."], ["Never from their pocket", "It comes from @seen’s share. They keep every dollar."], ["Real creators, real money", "Only cleared earnings count. Refunds are clawed back and accounts you control do not count."], ["Lands in your Wallet", "Together with your other earnings. First payout after 60 days."], ["Private", "You see what you get from each creator. They only see that you invited them."]].map(([title, copy]) => <article key={title}><b>{title}</b><span>{copy}</span></article>)}<button onClick={() => { setReferralHelpOpen(false); share("creator", "Create on @seen", "Join through my creator invitation."); }} type="button">Invite a creator</button></div></FanModal>
  </>;
}
