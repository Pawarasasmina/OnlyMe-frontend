import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";
import { WaysToEarnDetailSheet } from "../../pages/creator/WaysToEarnPage";
import { authService } from "../../services/authService";
import { creatorService } from "../../services/creatorService";
import { resolveMediaUrl } from "../../utils/media";
import MinimalWorldIcon from "../world/MinimalWorldIcon";
import "./ProfileWorldCard.css";

function numberLabel(value, fallback = 0) {
  const number = Number(value ?? fallback) || 0;
  return number.toLocaleString(__uiLocale());
}

export default function ProfileOrbit({ capabilities, planets = [], profile, role }) {
  __useUiLanguage();
  const owner = Boolean(capabilities.isOwner);
  const [worldPitchOpen, setWorldPitchOpen] = useState(false);
  const premiumPlanets = planets.filter((planet) => planet.kind === "PREMIUM_WORLD");
  const bySlot = Object.fromEntries(premiumPlanets.map((planet) => [planet.planet?.slot, planet]));
  const primaryPlanet = bySlot.PREMIUM || premiumPlanets[0];
  const monetization = useQuery({
    queryKey: ["monetization"],
    queryFn: () => authService.getMonetization().then((response) => response.data.data),
    enabled: owner && !primaryPlanet,
    retry: false,
    staleTime: 30000,
  });
  const showWorldPitch = Boolean(owner && !primaryPlanet && !(monetization.data?.verified && monetization.data?.enabled));
  const earnings = useQuery({
    queryKey: ["ways-to-earn"],
    queryFn: () => creatorService.getWaysToEarn().then((response) => response.data.data),
    enabled: showWorldPitch,
    retry: false,
    staleTime: 30000,
  });
  if (profile?.profileAccountType === "personal" && !owner) return null;
  if ((!profile?.isCreator && role !== "creator" && !owner) || (!premiumPlanets.length && !owner)) return null;
  const creatorName = profile?.displayName?.split(" ")[0] || __msg("discover.creator");
  const title = primaryPlanet?.title || __msg("profile.setUpYourWorld");
  const worldTarget = primaryPlanet?.id ? `/world/${primaryPlanet.id}` : profile?.profileAccountType === "personal" ? "/settings/monetization" : "/create/premium-world";
  const price = Number(primaryPlanet?.pricing?.starsAmount || 0);
  const residents = Number(
    primaryPlanet?.memberCount ??
    primaryPlanet?.subscribers ??
    0,
  );
  const isInside = !owner && Boolean(primaryPlanet?.viewer?.isMember || ["ACTIVE_PREMIUM_MEMBER", "ENTITLED_WORLD"].includes(primaryPlanet?.access));
  const memberPreview = primaryPlanet?.memberPreview || [];

  if (owner) {
    const members = Number(primaryPlanet?.memberCount ?? primaryPlanet?.subscribers ?? 0);
    const income = primaryPlanet?.monthlyIncomeUsd;
    const incomeLabel = Number.isFinite(income)
      ? new Intl.NumberFormat(__uiLocale(), { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(income).replace(/\.00$/, "")
      : null;
    const worldCardContent = <>
        <MinimalWorldIcon />
        <span className="profile-owner-world-copy">
          <strong>{primaryPlanet ? __msg("profile.yourWorld") : __msg("profile.openYourWorld")}</strong>
          <small>{primaryPlanet ? title : __msg("profile.aMonthlySubscriptionToEverythingYouShare")}</small>
          {primaryPlanet ? <span className="profile-owner-world-members">
            {memberPreview.length ? <span className="profile-owner-world-faces">{memberPreview.slice(0, 3).map(member => <span key={member.id}>{member.avatar ? <img alt="" src={resolveMediaUrl(member.avatar)} /> : <span>{String(member.name || member.username || "?")[0]}</span>}</span>)}</span> : null}
            <span>{numberLabel(members)} {members === 1 ? __msg("profile.member_6467ba") : __msg("discover.members")}</span>
            {incomeLabel ? <><span aria-hidden="true">·</span><b>{incomeLabel}</b><span>{__msg("profile.aMonth")}</span></> : null}
          </span> : null}
        </span>
        <FiChevronRight data-ui-directional="true" aria-hidden="true" />
      </>;
    return <section className="profile-owner-world-section">
      {showWorldPitch
        ? <button aria-label={__msg("profile.openYourWorld")} className="profile-owner-world-card is-empty" onClick={() => setWorldPitchOpen(true)} type="button">{worldCardContent}</button>
        : <Link aria-label={primaryPlanet ? __msg("contentEntities.open", { value0: title }) : __msg("profile.openYourWorld")} className={`profile-owner-world-card ${primaryPlanet ? "" : "is-empty"}`} to={worldTarget}>{worldCardContent}</Link>}
      {worldPitchOpen ? <WaysToEarnDetailSheet example={earnings.data?.example || { name: profile.displayName, username: profile.username, avatar: profile.avatar, followers: 0, world: {}, paidSeen: {}, gifts: {} }} onClose={() => setWorldPitchOpen(false)} profile={profile} rate={Number(earnings.data?.dashboard?.exchangeRate?.starsPerUsd) || 10} type="world" /> : null}
    </section>;
  }

  if (isInside) {
    return (
      <section className="profile-planet-orbit profile-world-member-section">
        <div className="profile-orbit-heading">
          <p className="profile-orbit-overline">{creatorName}{__msg("profile.sWorld")}</p>
        </div>
        <Link aria-label={__msg("contentEntities.open", { value0: title })} className="profile-world-member-card" to={worldTarget}>
          <MinimalWorldIcon />
          <span className="profile-world-member-copy">
            <strong>{title}</strong>
            <small>{__msg("profile.oneWorldWhereYouStepCloser")}</small>
          </span>
          <span className="profile-world-member-status">{__msg("profile.inside")}</span>
        </Link>
      </section>
    );
  }

  return (
    <section className="profile-world-compact-section">
      <Link aria-label={__msg("contentEntities.open", { value0: title })} className={`profile-world-compact-card ${owner ? "is-owner-world" : "is-visitor-world"}`} to={worldTarget}>
        <MinimalWorldIcon />
        <span className="profile-world-compact-copy">
          <strong>{owner ? __msg("profile.yourWorld") : __msg("profile.sWorld_9663ba", { value0: creatorName })}</strong>
          <small>{title}</small>
          {primaryPlanet ? <span className="profile-world-compact-members">
            {memberPreview.length ? <i>{memberPreview.map((member) => <b key={member.id}>{member.avatar ? <img alt="" src={resolveMediaUrl(member.avatar)} /> : String(member.name || member.username || "?")[0]}</b>)}</i> : null}
            <em>{numberLabel(residents)} {residents === 1 ? __msg("profile.member_6467ba") : __msg("discover.members")}</em>

          </span> : <span className="profile-world-compact-members"><em>{__msg("profile.storiesExperiencesAndMembersLiveHere")}</em></span>}
        </span>
        <span className="profile-world-join">{__msg("profile.join")} · {numberLabel(price)} <span className="sr-only">{__msg("social.coins")}</span></span>
      </Link>
    </section>
  );
}
