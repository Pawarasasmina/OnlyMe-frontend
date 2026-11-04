import { enumLabel as __enumLabel } from "../../i18n/runtime.js";
import { localizedTuple as __uiTuple } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import "./OfficialSeenPage.css";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiChevronLeft, FiChevronRight, FiMessageCircle, FiLock, FiGift, FiStar } from "react-icons/fi";
import FanModal from "../../components/fanWeb/shared/FanModal";
import VerifiedBadge from "../../components/fanWeb/shared/VerifiedBadge";
import SeenEyeMark from "../../components/branding/SeenEyeMark";
import OfficialSeenStoryViewer from "../../components/stories/OfficialSeenStoryViewer";
import { useAuth } from "../../hooks/useAuth";
import { profileService } from "../../services/profileService";
import { officialPortrait } from "../../utils/officialPortrait";

function Portrait({ person, className = "" }) {
  __useUiLanguage();
  return <img alt="" className={className} src={officialPortrait(person)} />;
}
function Planet({ className = "" }) {
  __useUiLanguage();
  return <span aria-hidden="true" className={`seen-brand-planet ${className}`}><i /><b /></span>;
}
function BrandGlyph({ kind }) {
  __useUiLanguage();
  const paths = {
    earn: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v9M9.5 9.8c0-1.2 1.1-2 2.5-2s2.5.7 2.5 1.8c0 2.6-5 1.5-5 4.4 0 1.1 1.1 2 2.5 2s2.5-.8 2.5-2" /></>,
    seen: <><path d="M2 12C5.3 7.8 18.7 7.8 22 12 18.7 16.2 5.3 16.2 2 12z" /><circle cx="12" cy="12" r="2.4" /></>,
    wall: <><rect x="3.5" y="4.5" width="17" height="12" rx="3" /><path d="M9 20.5h6" /></>,
    discover: <><rect x="3.5" y="3" width="8" height="12.5" rx="2.6" /><rect x="12.5" y="8.5" width="8" height="12.5" rx="2.6" /></>,
    stories: <><circle cx="12" cy="12" r="8.5" strokeDasharray="3 3" /><circle cx="12" cy="12" r="4" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{__enumLabel(paths[kind])}</svg>;
}
function EarnIcon() {
  __useUiLanguage(); return <BrandGlyph kind="earn" />; }
function SeenIcon() {
  __useUiLanguage(); return <BrandGlyph kind="seen" />; }
function WallIcon() {
  __useUiLanguage(); return <BrandGlyph kind="wall" />; }
function DiscoverIcon() {
  __useUiLanguage(); return <BrandGlyph kind="discover" />; }
function StoriesIcon() {
  __useUiLanguage(); return <BrandGlyph kind="stories" />; }
function WorldIcon() {
  __useUiLanguage();
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="6.5" /><ellipse cx="12" cy="12" rx="10.5" ry="4" transform="rotate(-18 12 12)" /></svg>;
}
const highlights = [["Earn", EarnIcon, 6], ["Seen", SeenIcon, 1], ["Wall", WallIcon, 2], ["Discover", DiscoverIcon, 3], ["Stories", StoriesIcon, 4], ["Deeper", WorldIcon, 5]];
const earning = [["Direct Access", "$6.80", "per answer", FiMessageCircle], __uiTuple(["Experiences", "$12.92", { __uiMessage: "social.perUnlock" }, FiLock]), ["Your World", "$12.92", "a month per subscriber", WorldIcon], __uiTuple(["Gifts", { __uiMessage: "creator.gifts" }, { __uiMessage: "social.onStoriesChatsSeens" }, FiGift]), ["Dream support", "Dreams", "fans back your goal", FiStar]];
const modules = [
  { label: "Seen", get title() { return __msg("social.yourStoryInChapters"); }, get text() { return __msg("social.upToFiveShortChaptersPeopleSwipeThrough"); }, Icon: SeenEyeMark, slide: 1 },
  { get label() { return __msg("fanWeb.wall"); }, get title() { return __msg("social.realNeedsRealHelp"); }, get text() { return __msg("social.askForHelpFindAServiceBuySell"); }, Icon: WallIcon, slide: 2 },
  { get label() { return __msg("discover.discover"); }, get title() { return __msg("onboarding.peopleWorthSeeing"); }, get text() { return __msg("social.someoneShowsUpForARealReasonSame"); }, Icon: DiscoverIcon, slide: 3 },
  { get label() { return __msg("social.storiesStatus"); }, get title() { return __msg("social.whatSHappeningNow"); }, get text() { return __msg("social.aRingOnTheAvatarLives24Hours"); }, Icon: StoriesIcon, slide: 4 },
  { get label() { return __msg("social.goDeeper"); }, get title() { return __msg("social.whenYouWantMore"); }, get text() { return __msg("social.creatorsSellPremiumExperiencesAndOpenTheirWorld"); }, Icon: WorldIcon, slide: 5 },
];
const beliefs = [["Human first", "Real people, real lives. Safe for everyone"], ["Finished, not endless", "Chapters end. No doomscroll by design"], ["Creators keep what they earn", "One clear number — in dollars"]];

function ModuleArt({ slide }) {
  __useUiLanguage();
  if (slide === 1) return <div className="seen-brand-chapters"><Portrait person="ethan" /><div><b>{__msg("stories.8WeekTransformation")}</b><span className="seen-brand-chapter-steps">{["Cover", "01", "02", "03", "04", "05"].map(label => <i key={label}>{label}</i>)}</span><small>{__msg("social.swipeThroughItRightInTheFeed")}</small></div></div>;
  if (slide === 2) return <div className="seen-brand-wall">{[["Need help", "Lost a grey cat at Marina", "40m"], ["Looking for", "A babysitter tonight in JLT", "25m"], ["✓ Solved", "Quiet café with good Wi-Fi", "1d"]].map(([kind, text, time], index) => <div className={index === 2 ? "is-solved" : ""} key={kind}><i /><b>{__enumLabel(kind)}</b><span>{text}</span><small>{time}</small></div>)}</div>;
  if (slide === 3) return <div className="seen-brand-discover"><span>{["lina", "ethan", "mia"].map(person => <Portrait key={person} person={person} />)}</span><div>{__msg("social.bothTrainingForAMarathon")}<small>{__msg("social.whyTheyReHereAlwaysSaid")}</small></div></div>;
  if (slide === 4) return <div className="seen-brand-statuses">{[["lina", "At seen"], ["ethan", "At the gym"], ["mia", "Celebrating"], ["sofia", "Coffee walk"]].map(([person, label]) => <span key={person}><i><Portrait person={person} /></i><small>{label}</small></span>)}</div>;
  return <div className="seen-brand-world"><Planet /><span>{__msg("social.premiumExperiencesUnlockOnce")}<small>{__msg("social.oneWorldPerCreatorASubscriptionToEverythingThey")}</small></span></div>;
}

export default function OfficialSeenPage() {
  __useUiLanguage();
  const navigate = useNavigate();
  const pageRef = useRef(null);
  const [position, setPosition] = useState({});
  useEffect(() => {
    const column = pageRef.current?.closest(".social-center-scroll");
    if (!column) return undefined;
    const update = () => {
      const bounds = column.getBoundingClientRect();
      setPosition({ "--seen-brand-center-x": `${bounds.left + bounds.width / 2}px`, "--seen-brand-column-width": `${bounds.width}px` });
    };
    update();
    window.addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    observer.observe(column);
    return () => { window.removeEventListener("resize", update); observer.disconnect(); };
  }, []);
  const client = useQueryClient();
  const { user } = useAuth();
  const preferenceKey = `atseen:official-follow:${user?.id || user?._id || "guest"}`;
  const readPreference = (key) => {
    try { return localStorage.getItem(key) === "1"; } catch { return false; }
  };
  const [localFollowing, setLocalFollowing] = useState(() => readPreference(preferenceKey));
  const [localMode, setLocalMode] = useState(false);
  useEffect(() => {
    setLocalFollowing(readPreference(preferenceKey));
    setLocalMode(false);
  }, [preferenceKey]);
  const [contactOpen, setContactOpen] = useState(false);
  const [guide, setGuide] = useState(null);
  const profile = useQuery({ queryKey: ["unified-profile", "seen"], queryFn: () => profileService.getUnifiedProfile("seen").then(response => response.data.data), retry: false });
  const missingOfficialAccount = profile.error?.response?.status === 404;
  const following = localMode || missingOfficialAccount ? localFollowing : Boolean(profile.data?.viewerRelationship?.following);
  const follow = useMutation({
    mutationFn: async () => {
      const saveLocalPreference = () => {
        const next = !following;
        try { localStorage.setItem(preferenceKey, next ? "1" : "0"); } catch { /* Keep the choice in this session if storage is unavailable. */ }
        setLocalFollowing(next);
        setLocalMode(true);
        return { local: true };
      };
      if (localMode || missingOfficialAccount) return saveLocalPreference();
      try { return await profileService.toggleFollow("seen"); }
      catch (error) {
        if (error.response?.status === 404) return saveLocalPreference();
        throw error;
      }
    },
    onSuccess: async (response) => {
      if (!response?.local) await client.invalidateQueries({ queryKey: ["unified-profile", "seen"] });
      client.invalidateQueries({ queryKey: ["search"] });
    },
  });
  return <div className="seen-brand-page" ref={pageRef} style={position}>
    <header className="seen-brand-topbar"><button aria-label={__msg("profile.goBack")} onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/search?from=discover")} type="button"><FiChevronLeft data-ui-directional="true" /></button><b>{__msg("branding.seen")} <VerifiedBadge /></b><span /></header>
    <section className="seen-brand-intro">
      <div className="seen-brand-identity"><button aria-label={__msg("social.watchTheOfficialSeenStory")} className="seen-brand-avatar" onClick={() => setGuide(0)} type="button"><span><SeenEyeMark /></span></button><div><h1>{__msg("branding.seen")} <VerifiedBadge /></h1><p>{__msg("social.seenOfficialAccount")}</p></div></div>
      <p className="seen-brand-bio"><b>{__msg("social.weSeeYou")}</b><br /><span>{__msg("social.showYourRealLifeInChaptersAndHelpThe")}</span></p>
      <div className="seen-brand-actions"><button aria-pressed={following} className={following ? "is-following" : ""} disabled={follow.isPending || profile.isLoading} onClick={() => follow.mutate()} type="button">{follow.isPending ? __msg("financial.saving") : following ? __msg("activity.following") : __msg("discover.follow")}</button><button onClick={() => setContactOpen(true)} type="button">{__msg("social.sayHi")}</button></div>
      {follow.isError ? <p className="seen-brand-action-error" role="alert">{follow.error?.response?.data?.message || __msg("social.couldNotUpdateFollowPleaseTryAgain")}</p> : null}
    </section>
    <nav aria-label={__msg("social.officialSeenHighlights")} className="seen-brand-highlights">{highlights.map(([label, Icon, slide]) => <button key={label} onClick={() => setGuide(slide)} type="button"><span><Icon /></span><small>{label}</small></button>)}</nav>
    <section aria-labelledby="seen-brand-earn-title" className="seen-brand-earn"><header><h2 id="seen-brand-earn-title">{__msg("social.earnOnSeen")}</h2><button onClick={() => setGuide(6)} type="button">{__msg("social.howItWorks")}</button></header><div className="seen-brand-earning-cards">{earning.map(([label, amount, caption, Icon]) => <div key={label}><span><Icon />{label}</span><strong className={amount.startsWith("$") ? "" : "is-word"}>{amount}</strong><small>{caption}</small></div>)}</div><p><img alt="" src="/brand/goldcoin.png" /> {__msg("social.fansPayInCoinsYouKeep")} <b>68%</b> {__msg("social.inDollars")}</p></section>
    <div className="seen-brand-content"><h2 className="seen-brand-section-label">{__msg("social.howItWorks_1dd6a1")}</h2>
      {modules.map(({ label, title, text, Icon, slide }) => <button aria-label={__msg("social.learnAbout", { value0: label })} className="seen-brand-module" key={label} onClick={() => setGuide(slide)} type="button"><span className="seen-brand-eyebrow"><Icon />{label}<FiChevronRight data-ui-directional="true" /></span><h3>{title}</h3><p>{text}</p><div className="seen-brand-module-art"><ModuleArt slide={slide} /></div></button>)}
      <section aria-labelledby="seen-brand-beliefs"><h2 className="seen-brand-section-label" id="seen-brand-beliefs">{__msg("social.whatWeBelieve")}</h2>{beliefs.map(([title, text], index) => <div className="seen-brand-belief" key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}</section>
      <footer className="seen-brand-footer"><SeenEyeMark /><strong>{__msg("social.youVeBeenSeen")}</strong><button onClick={() => setContactOpen(true)} type="button">{__msg("settings.helloAtseenCom")}</button></footer>
    </div>
    <OfficialSeenStoryViewer initialIndex={guide ?? 0} isOpen={guide !== null} onClose={() => setGuide(null)} />
    <FanModal className="seen-brand-contact-sheet" hideHeader isOpen={contactOpen} onClose={() => setContactOpen(false)} overlayClassName="seen-brand-contact-backdrop" title={__msg("social.sayHiToTheTeam")}>
      <button aria-label={__msg("social.closeContactSheet")} className="seen-brand-contact-handle" onClick={() => setContactOpen(false)} type="button" />
      <div className="seen-brand-contact-content"><h2>{__msg("social.sayHiToTheTeam")}</h2><p>{__msg("settings.helloAtseenCom")}</p></div>
    </FanModal>
  </div>;
}
