import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft, FiChevronRight, FiCreditCard, FiEye, FiGift, FiTrendingUp, FiX } from "react-icons/fi";
import { Link, Navigate, useNavigate } from "react-router-dom";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { creatorService } from "../../services/creatorService";
import { profileService } from "../../services/profileService";
import "./WaysToEarnPage.css";
import "./WaysToEarnPrototype.css";

const WORLD_PRICES = [190, 490, 990];
const SEEN_PRICES = [90, 190, 290, 490];
const money = value => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0);

function Calculator({ price, setPrice, people, setPeople, prices = WORLD_PRICES, recurring = true, rate = 10 }) {
  const result = price * people / rate;
  return <section className="earn-turn-card">
    <small>YOUR TURN</small><p>{recurring ? "Your monthly price" : "Your price"}</p>
    <div className="earn-price-grid">{prices.map(item => <button className={item === price ? "is-active" : ""} key={item} onClick={() => setPrice(item)} type="button">🪙 {item}</button>)}</div>
    <label><span>{recurring ? "Fans who join" : "People who buy it"}</span><b>{people}</b><input min="1" max="500" type="range" value={people} onChange={event => setPeople(Number(event.target.value))} /></label>
    <strong>{money(result)} <em>{recurring ? "every month" : "once — then it keeps selling"}</em></strong>
    <p className="earn-calc-note">at {price} coins {recurring ? `a month · that's ${money(result * 12)} a year` : `· ${money(price / rate)} to you from each`}</p>
  </section>;
}

function ExampleCard({ example, giftCatalog = [], giftOnly = false }) {
  const values = [Number(example.paidSeen?.income) || 0, Number(example.world?.income) || 0, Number(example.gifts?.income) || 0];
  const maximum = Math.max(...values, 1);
  const rows = [
    [example.paidSeen?.title ? `Paid Seen · ${example.paidSeen.title}` : "Paid Seen", values[0], `${example.paidSeen?.owners || 0} people bought it once — it keeps selling`, ""],
    ["Her World", values[1], `${example.world?.members || 0} members · every month`, "purple"],
    ["Gifts", values[2], `${example.gifts?.count || 0} gifts from fans`, "gold"],
  ];
  const total = values.reduce((sum, value) => sum + value, 0);
  return <section className={`earn-example${giftOnly ? " is-gift-example" : ""}`}><small>● A REAL EXAMPLE</small><Link className="earn-example-person" to={`/profile/${example.username}`}><FanAvatar name={example.name} size="h-[34px] w-[34px]" src={example.avatar} /><span><b>{example.name}</b><em>{Number(example.followers || 0).toLocaleString()} followers</em></span><i>Profile ›</i></Link>{giftOnly && giftCatalog.length ? <div className="earn-real-gifts">{giftCatalog.slice(0, 5).map((gift) => <span key={gift.id}><img alt={gift.name} src={gift.imageUrl} /></span>)}</div> : null}{giftOnly ? <div className="earn-gift-summary"><span>Her gifts · {example.gifts?.count || 0} gifts</span><strong>{money(values[2])}<small>from fans</small></strong></div> : <><h2>{money(total)} <em>earned on @seen</em></h2>{rows.map(([label, value, note, tone]) => <div className={`earn-line ${tone}`} key={label}><b>{label}</b><strong>{money(value)}</strong><i style={{ width: `${Math.max(value ? 4 : 0, value / maximum * 100)}%` }} /><small>{note}</small></div>)}</>}</section>;
}

export function WaysToEarnDetailSheet({ type, onClose, profile, example, rate }) {
  const navigate = useNavigate();
  const [price, setPrice] = useState(type === "seen" ? 190 : 490);
  const [people, setPeople] = useState(25);
  const giftUrl = `${window.location.origin}/profile/${encodeURIComponent(profile.username)}?sendGift=1`;
  const giftCatalog = useQuery({
    queryKey: ["settings", "gifts", "ways-to-earn"],
    queryFn: () => profileService.getGiftSettings().then((response) => response.data.data.gifts.filter((gift) => gift.enabled)),
    enabled: type === "gift",
    retry: false,
    staleTime: 60000,
  });
  const copy = type === "world"
    ? ["A World — income every month", "Your closest fans pay monthly for everything you share: stories, chapters and private circles.", "Open my World"]
    : type === "seen"
      ? ["Paid Seen — make it once, it keeps selling", "A path you walked, packed into chapters. People pay once and own it forever.", "Create a paid Seen"]
      : ["Gifts — fans saying thank you", "Fans send gifts on your profile, Seens and stories. Nothing to set up — every gift lands on your balance as money.", "Copy gift link"];
  const act = async () => {
    if (type === "world") navigate("/create/premium-world");
    else if (type === "seen") navigate("/create/seen?type=paid");
    else await navigator.clipboard?.writeText(giftUrl);
  };
  useEffect(() => {
    document.body.dataset.earnPitch = type;
    return () => { delete document.body.dataset.earnPitch; };
  }, [type]);
  return <div className="earn-sheet-layer" onClick={onClose}><section className="earn-detail-sheet" onClick={event => event.stopPropagation()}><span className="earn-sheet-handle"/><button className="earn-sheet-close" onClick={onClose} type="button"><FiX /></button><h2>{copy[0]}</h2><p>{copy[1]}</p><ExampleCard example={example} giftCatalog={giftCatalog.data || []} giftOnly={type === "gift"}/>{type === "gift" ? <section className="earn-gift-link"><small>YOUR GIFT LINK</small><strong>{giftUrl.replace(/^https?:\/\//, "")}</strong><p>Put it in your bio — fans tap it and send a gift in seconds, even if they’ve never used @seen.</p></section> : <Calculator people={people} price={price} prices={type === "seen" ? SEEN_PRICES : WORLD_PRICES} rate={rate} recurring={type === "world"} setPeople={setPeople} setPrice={setPrice}/>}<button className="earn-primary" onClick={act} type="button">{copy[2]}</button>{type === "gift" ? <Link className="earn-fan-preview" onClick={onClose} to={`/profile/${profile.username}?sendGift=1`}>See what fans see ›</Link> : null}</section></div>;
}

export default function WaysToEarnPage() {
  const navigate = useNavigate();
  const [price, setPrice] = useState(490);
  const [people, setPeople] = useState(25);
  const [detail, setDetail] = useState("");
  const earnQuery = useQuery({ queryKey: ["ways-to-earn"], queryFn: () => creatorService.getWaysToEarn().then(response => response.data.data) });
  const profileQuery = useQuery({ queryKey: ["unified-profile", "me"], queryFn: () => profileService.getUnifiedMe().then(response => response.data.data) });
  const own = earnQuery.data?.dashboard || {};
  const profile = profileQuery.data?.profile || {};
  const example = earnQuery.data?.example || { name: profile.displayName, username: profile.username, avatar: profile.avatar, followers: 0, paidSeen: {}, world: {}, gifts: {} };
  const path = own.creatorPath || {};
  const steps = useMemo(() => [
    { type: "world", Icon: FiEye, title: "Open your World", note: "a monthly income from your closest fans" },
    { type: "seen", Icon: FiTrendingUp, title: "Sell one paid Seen", note: "what you know, packed into chapters" },
    { type: "gift", Icon: FiGift, title: "Get your gift link", note: "one link in your bio — fans gift in seconds" },
  ], []);
  if (earnQuery.isLoading || profileQuery.isLoading) return <main className="ways-to-earn-page"><LoadingSkeleton className="h-20" count={1}/><LoadingSkeleton className="mt-5 h-72" count={2}/></main>;
  if (earnQuery.isError || profileQuery.isError) return <main className="ways-to-earn-page"><h1>Ways to earn</h1><p>Could not load the creator earnings data.</p></main>;
  const profileData = profileQuery.data || {};
  const hasPublishedContent = Boolean(
    Number(profileData.publicMetrics?.publishedContentCount || 0)
    || profileData.seens?.length
    || profileData.wallPosts?.length
    || profileData.media?.length
    || profileData.profileStories?.length
    || profileData.experiences?.length
    || profileData.planets?.length
  );
  const isVerifiedCreator = Boolean(
    profile.verified
    || profile.creatorApprovalStatus === "approved"
    || profile.creatorApplicationStatus === "verified"
    || profileData.viewerCapabilities?.canAccessStudio
  );
  if (isVerifiedCreator || hasPublishedContent) return <Navigate replace to={isVerifiedCreator ? "/studio" : "/profile"} />;
  const rate = Number(own.exchangeRate?.starsPerUsd) || 10;
  return <main className="ways-to-earn-page"><header className="earn-page-head"><button onClick={() => navigate(-1)} type="button"><FiArrowLeft /></button><span><b>Creator Dashboard</b><small>This month</small></span><Link to="/wallet"><FiCreditCard /></Link></header><h1>Ways to earn</h1><p className="earn-lead">How creators earn on @seen — using live data from your system.</p><ExampleCard example={example}/><Calculator people={people} price={price} rate={rate} setPeople={setPeople} setPrice={setPrice}/><h3 className="earn-section-title">START HERE</h3><section className="earn-start-list">{steps.map(({ Icon, ...step }) => <button key={step.type} onClick={() => setDetail(step.type)} type="button"><span><Icon /></span><b>{step.title}<small>{step.note}</small></b><FiChevronRight /></button>)}</section><nav className="earn-dashboard-tabs"><b>Overview</b><span>Audience</span><span>Earnings</span></nav><section className="earn-path"><header><b>Creator path</b><strong>{path.completed || 0}/{path.total || 4}</strong></header><p className={path.publishedSeen ? "is-done" : ""}>{path.publishedSeen ? "✓" : "○"} Publish your first Seen</p><p className={path.wallPost ? "is-done" : ""}>{path.wallPost ? "✓" : "○"} Write a note on the Wall</p><p className={path.followsThree ? "is-done" : ""}>{path.followsThree ? "✓" : "○"} Follow 3 people</p><p className={path.profilePhotos ? "is-done" : ""}>{path.profilePhotos ? "✓" : "○"} Add photos to your profile</p></section><section className="earn-reach"><span>Reach this month</span><strong>{Number(own.overview?.reach?.value || 0).toLocaleString()}</strong><small>Live Seen, story and profile activity.</small></section>{detail ? <WaysToEarnDetailSheet example={example} onClose={() => setDetail("")} profile={profile} rate={rate} type={detail}/> : null}</main>;
}
