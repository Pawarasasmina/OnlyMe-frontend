import { getLocale as __uiLocale } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft, FiChevronRight, FiCreditCard, FiEye, FiGift, FiTrendingUp, FiX } from "react-icons/fi";
import { Link, Navigate, useNavigate } from "react-router-dom";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { authService } from "../../services/authService";
import { creatorService } from "../../services/creatorService";
import { profileService } from "../../services/profileService";
import "./WaysToEarnPage.css";
import "./WaysToEarnPrototype.css";

const WORLD_PRICES = [190, 490, 990];
const SEEN_PRICES = [90, 190, 290, 490];
const money = value => new Intl.NumberFormat(__uiLocale(), { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0);

function Calculator({ price, setPrice, people, setPeople, prices = WORLD_PRICES, recurring = true, rate = 10 }) {
  __useUiLanguage();
  const result = price * people / rate;
  return <section className="earn-turn-card">
    <small>{__msg("system.WaysToEarnPage.09ea0a9efb")}</small><p>{recurring ? __msg("system.WaysToEarnPage.605c9a5920") : __msg("system.WaysToEarnPage.16a067af17")}</p>
    <div className="earn-price-grid">{prices.map(item => <button className={item === price ? "is-active" : ""} key={item} onClick={() => setPrice(item)} type="button">🪙 {item}</button>)}</div>
    <label><span>{recurring ? __msg("system.WaysToEarnPage.20ec0e09ef") : __msg("system.WaysToEarnPage.121343beb3")}</span><b>{people}</b><input min="1" max="500" type="range" value={people} onChange={event => setPeople(Number(event.target.value))} /></label>
    <strong>{money(result)} <em>{recurring ? __msg("system.WaysToEarnPage.7336ae13a2") : __msg("system.WaysToEarnPage.af0953c6a6")}</em></strong>
    <p className="earn-calc-note">{__msg("system.WaysToEarnPage.27e90dfa57")} {price} {__msg("profile.coins")} {recurring ? __msg("system.WaysToEarnPage.dd39f6be64", { value0: money(result * 12) }) : __msg("system.WaysToEarnPage.aed6647c7b", { value0: money(price / rate) })}</p>
  </section>;
}

function ExampleCard({ example, giftCatalog = [], giftOnly = false }) {
  __useUiLanguage();
  const values = [Number(example.paidSeen?.income) || 0, Number(example.world?.income) || 0, Number(example.gifts?.income) || 0];
  const maximum = Math.max(...values, 1);
  const rows = [
    [example.paidSeen?.title ? __msg("creator.paidSeenValue0", { value0: example.paidSeen.title }) : __msg("system.FanCreateSheet.7068381e0b"), values[0], __msg("creator.value0PeopleBoughtItOnceItKeepsSelling", { value0: example.paidSeen?.owners || 0 }), ""],
    [__msg("system.herWorld"), values[1], __msg("creator.value0MembersEveryMonth", { value0: example.world?.members || 0 }), "purple"],
    [__msg("creator.gifts"), values[2], __msg("creator.value0GiftsFromFans", { value0: example.gifts?.count || 0 }), "gold"],
  ];
  const total = values.reduce((sum, value) => sum + value, 0);
  return <section className={`earn-example${giftOnly ? " is-gift-example" : ""}`}><small>{__msg("system.WaysToEarnPage.2633f8da2b")}</small><Link className="earn-example-person" to={`/profile/${example.username}`}><FanAvatar name={example.name} size="h-[34px] w-[34px]" src={example.avatar} /><span><b>{example.name}</b><em>{Number(example.followers || 0).toLocaleString(__uiLocale())} {__msg("discover.followers_09322a")}</em></span><i>{__msg("system.WaysToEarnPage.2ac124e7bc")}</i></Link>{giftOnly && giftCatalog.length ? <div className="earn-real-gifts">{giftCatalog.slice(0, 5).map((gift) => <span key={gift.id}><img alt={gift.name} src={gift.imageUrl} /></span>)}</div> : null}{giftOnly ? <div className="earn-gift-summary"><span>{__msg("system.WaysToEarnPage.dbf974a364")} {example.gifts?.count || 0} {__msg("system.WaysToEarnPage.ca2f29fecf")}</span><strong>{money(values[2])}<small>{__msg("system.WaysToEarnPage.f66d750345")}</small></strong></div> : <><h2>{money(total)} <em>{__msg("system.WaysToEarnPage.dc4d407790")}</em></h2>{rows.map(([label, value, note, tone]) => <div className={`earn-line ${tone}`} key={label}><b>{label}</b><strong>{money(value)}</strong><i style={{ width: `${Math.max(value ? 4 : 0, value / maximum * 100)}%` }} /><small>{note}</small></div>)}</>}</section>;
}

export function WaysToEarnDetailSheet({ type, onClose, profile, example, rate }) {
  __useUiLanguage();
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
    ? [__msg("system.copy.e5865c3391e7"), __msg("system.copy.b9be4e0fbfee"), __msg("fanWeb.openMyWorld")]
    : type === "seen"
      ? [__msg("system.copy.3b4ef0281bd7"), __msg("system.copy.fc2effa65404"), __msg("system.copy.bdf67f3b2763")]
      : [__msg("system.copy.048c0c365f83"), __msg("system.copy.e48e03b79ace"), __msg("system.copy.95184493ac0b")];
  const act = async () => {
    if (type === "world") navigate("/create/premium-world");
    else if (type === "seen") navigate("/create/seen?type=paid");
    else await navigator.clipboard?.writeText(giftUrl);
  };
  useEffect(() => {
    document.body.dataset.earnPitch = type;
    return () => { delete document.body.dataset.earnPitch; };
  }, [type]);
  return <div className="earn-sheet-layer" onClick={onClose}><section className="earn-detail-sheet" onClick={event => event.stopPropagation()}><span className="earn-sheet-handle"/><button className="earn-sheet-close" onClick={onClose} type="button"><FiX /></button><h2>{copy[0]}</h2><p>{copy[1]}</p><ExampleCard example={example} giftCatalog={giftCatalog.data || []} giftOnly={type === "gift"}/>{type === "gift" ? <section className="earn-gift-link"><small>{__msg("system.WaysToEarnPage.dff860a402")}</small><strong>{giftUrl.replace(/^https?:\/\//, "")}</strong><p>{__msg("system.WaysToEarnPage.886bfa4dc8")}</p></section> : <Calculator people={people} price={price} prices={type === "seen" ? SEEN_PRICES : WORLD_PRICES} rate={rate} recurring={type === "world"} setPeople={setPeople} setPrice={setPrice}/>}<button className="earn-primary" onClick={act} type="button">{copy[2]}</button>{type === "gift" ? <Link className="earn-fan-preview" onClick={onClose} to={`/profile/${profile.username}?sendGift=1`}>{__msg("system.WaysToEarnPage.253e42ad38")}</Link> : null}</section></div>;
}

export default function WaysToEarnPage() {
  const { language: __uiLanguage } = __useUiLanguage();
  const navigate = useNavigate();
  const [price, setPrice] = useState(490);
  const [people, setPeople] = useState(25);
  const [detail, setDetail] = useState("");
  const earnQuery = useQuery({ queryKey: ["ways-to-earn"], queryFn: () => creatorService.getWaysToEarn().then(response => response.data.data) });
  const profileQuery = useQuery({ queryKey: ["unified-profile", "me"], queryFn: () => profileService.getUnifiedMe().then(response => response.data.data) });
  const monetizationQuery = useQuery({ queryKey: ["monetization"], queryFn: () => authService.getMonetization().then(response => response.data.data), retry: false, staleTime: 30000 });
  const own = earnQuery.data?.dashboard || {};
  const profile = profileQuery.data?.profile || {};
  const example = earnQuery.data?.example || { name: profile.displayName, username: profile.username, avatar: profile.avatar, followers: 0, paidSeen: {}, world: {}, gifts: {} };
  const path = own.creatorPath || {};
  const steps = useMemo(() => [
    { type: "world", Icon: FiEye, title: __msg("profile.openYourWorld"), note: __msg("creator.aMonthlyIncomeFromYourClosestFans") },
    { type: "seen", Icon: FiTrendingUp, title: __msg("system.WaysToEarnPage.f6485c28ac"), note: __msg("creator.whatYouKnowPackedIntoChapters") },
    { type: "gift", Icon: FiGift, title: __msg("system.WaysToEarnPage.bdd98cf2cd"), note: __msg("creator.oneLinkInYourBioFansGiftIn") },
  ], [__uiLanguage]);
  if (earnQuery.isLoading || profileQuery.isLoading || monetizationQuery.isLoading) return <main className="ways-to-earn-page"><LoadingSkeleton className="h-20" count={1}/><LoadingSkeleton className="mt-5 h-72" count={2}/></main>;
  if (earnQuery.isError || profileQuery.isError) return <main className="ways-to-earn-page"><h1>{__msg("creator.waysToEarn")}</h1><p>{__msg("system.WaysToEarnPage.7f232b41bd")}</p></main>;
  const monetizationActive = Boolean(monetizationQuery.data?.verified && monetizationQuery.data?.enabled);
  if (monetizationActive) return <Navigate replace to="/studio" />;
  const rate = Number(own.exchangeRate?.starsPerUsd) || 10;
  return <main className="ways-to-earn-page"><header className="earn-page-head"><button onClick={() => navigate(-1)} type="button"><FiArrowLeft /></button><span><b>{__msg("creator.creatorDashboard")}</b><small>{__msg("admin.thisMonth")}</small></span><Link to="/wallet"><FiCreditCard /></Link></header><h1>{__msg("creator.waysToEarn")}</h1><p className="earn-lead">{__msg("system.WaysToEarnPage.2fb179d8fa")}</p><ExampleCard example={example}/><Calculator people={people} price={price} rate={rate} setPeople={setPeople} setPrice={setPrice}/><h3 className="earn-section-title">{__msg("system.WaysToEarnPage.5c9f9ad79c")}</h3><section className="earn-start-list">{steps.map(({ Icon, ...step }) => <button key={step.type} onClick={() => setDetail(step.type)} type="button"><span><Icon /></span><b>{step.title}<small>{step.note}</small></b><FiChevronRight /></button>)}</section><nav className="earn-dashboard-tabs"><b>{__msg("stories.overview")}</b><span>{__msg("creator.audience")}</span><span>{__msg("layouts.earnings")}</span></nav><section className="earn-path"><header><b>{__msg("creator.creatorPath")}</b><strong>{path.completed || 0}/{path.total || 4}</strong></header><p className={path.publishedSeen ? "is-done" : ""}>{path.publishedSeen ? "✓" : "○"} {__msg("creator.publishYourFirstSeen")}</p><p className={path.wallPost ? "is-done" : ""}>{path.wallPost ? "✓" : "○"} {__msg("system.WaysToEarnPage.4eb1baec89")}</p><p className={path.followsThree ? "is-done" : ""}>{path.followsThree ? "✓" : "○"} {__msg("creator.follow3People")}</p><p className={path.profilePhotos ? "is-done" : ""}>{path.profilePhotos ? "✓" : "○"} {__msg("creator.addPhotosToYourProfile")}</p></section><section className="earn-reach"><span>{__msg("creator.reachThisMonth")}</span><strong>{Number(own.overview?.reach?.value || 0).toLocaleString(__uiLocale())}</strong><small>{__msg("system.WaysToEarnPage.176bfaad8a")}</small></section>{detail ? <WaysToEarnDetailSheet example={example} onClose={() => setDetail("")} profile={profile} rate={rate} type={detail}/> : null}</main>;
}
