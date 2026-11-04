/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiRefreshCw } from "react-icons/fi";
import { profileService } from "../../services/profileService";
import { resolveMediaUrl } from "../../utils/media";

function OrbitCreator({ creator, index }) {
  __useUiLanguage();
  const planets = creator.planets.filter((planet) => planet.kind === "PREMIUM_WORLD");
  const angle = (index * 137.5) * Math.PI / 180;
  const radius = 31 + (index % 3) * 7;
  const style = { left: `${50 + Math.cos(angle) * radius}%`, top: `${48 + Math.sin(angle) * radius}%` };
  return <Link className="orbit-creator-light" style={style} to={`/profile/${creator.username}`}><span className="orbit-creator-avatar">{creator.avatar ? <img alt="" src={resolveMediaUrl(creator.avatar)} /> : creator.name?.slice(0, 1)}</span>{planets.map((planet, planetIndex) => <span className={`orbit-riding-planet planet-${planetIndex}`} key={planet.id}>{planet.emoji}</span>)}<span dir="auto" className="orbit-creator-name">{creator.name}</span></Link>;
}

export default function OrbitPage() {
  __useUiLanguage();
  const query = useQuery({ queryKey: ["orbit-creators"], queryFn: () => profileService.getOrbitCreators().then((response) => response.data.data.creators), staleTime: 60_000, retry: false });
  if (query.isLoading) return <div><h1 className="text-2xl font-black">{__msg("social.orbit")}</h1><div className="mt-5 h-[520px] animate-pulse rounded-3xl bg-atseen-surface" /></div>;
  if (query.isError) return <div><h1 className="text-2xl font-black">{__msg("social.orbit")}</h1><div className="mt-5 rounded-3xl border border-atseen-line p-10 text-center"><p className="text-sm text-atseen-muted">{__msg("social.orbitCouldNotBeLoaded")}</p><button className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-atseen-blue" onClick={() => query.refetch()}><FiRefreshCw /> {__msg("discover.tryAgain")}</button></div></div>;
  const creators = (query.data || []).map((creator) => ({ ...creator, planets: creator.planets.filter((planet) => planet.kind === "PREMIUM_WORLD") }));
  return <div className="orbit-page"><header><p className="text-[10px] font-bold uppercase tracking-[.2em] text-atseen-muted">{__msg("onboarding.peopleWorthSeeing")}</p><h1 className="mt-1 text-3xl font-black">{__msg("social.orbit")}</h1></header>{creators.length ? <><section className="orbit-discovery-sky"><div className="orbit-discovery-stars"/><div className="orbit-discovery-ring ring-a"/><div className="orbit-discovery-ring ring-b"/><div className="orbit-discovery-center"><span>◉</span><small>{__msg("social.yourOrbit")}</small></div>{creators.slice(0, 12).map((creator, index) => <OrbitCreator creator={creator} index={index} key={creator.id} />)}</section><section className="orbit-people-list"><p className="orbit-list-label">{__msg("social.inYourSky")}</p>{creators.map((creator) => <Link className="orbit-person-row" key={creator.id} to={`/profile/${creator.username}`}><span className="orbit-row-avatar">{creator.avatar ? <img alt="" src={resolveMediaUrl(creator.avatar)} /> : creator.name?.slice(0, 1)}</span><span className="min-w-0 flex-1"><strong dir="auto">{creator.name}{creator.verified ? " ✓" : ""}</strong><small dir="auto">@{creator.username}{creator.location ? ` · ${creator.location}` : ""}</small></span>{creator.planets.length ? <span className="orbit-row-planets">{creator.planets.map((planet) => <i key={planet.id}>{planet.emoji}</i>)}</span> : null}</Link>)}</section></> : <div className="mt-5 rounded-3xl border border-atseen-line p-12 text-center"><span className="text-4xl">✦</span><h2 className="mt-4 font-black">{__msg("social.aYoungOrbit")}</h2><p className="mt-2 text-sm text-atseen-muted">{__msg("social.approvedPublicCreatorsWillAppearHere")}</p></div>}<p className="mt-4 text-center text-[10px] text-atseen-dim">{__msg("social.tapAPersonToSeeTheirProfileAndWorlds")}</p></div>;
}
