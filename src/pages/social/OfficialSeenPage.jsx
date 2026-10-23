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
  return <img alt="" className={className} src={officialPortrait(person)} />;
}
function Planet({ className = "" }) {
  return <span aria-hidden="true" className={`seen-brand-planet ${className}`}><i /><b /></span>;
}
function BrandGlyph({ kind }) {
  const paths = {
    earn: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v9M9.5 9.8c0-1.2 1.1-2 2.5-2s2.5.7 2.5 1.8c0 2.6-5 1.5-5 4.4 0 1.1 1.1 2 2.5 2s2.5-.8 2.5-2" /></>,
    seen: <><path d="M2 12C5.3 7.8 18.7 7.8 22 12 18.7 16.2 5.3 16.2 2 12z" /><circle cx="12" cy="12" r="2.4" /></>,
    wall: <><rect x="3.5" y="4.5" width="17" height="12" rx="3" /><path d="M9 20.5h6" /></>,
    discover: <><rect x="3.5" y="3" width="8" height="12.5" rx="2.6" /><rect x="12.5" y="8.5" width="8" height="12.5" rx="2.6" /></>,
    stories: <><circle cx="12" cy="12" r="8.5" strokeDasharray="3 3" /><circle cx="12" cy="12" r="4" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg>;
}
function EarnIcon() { return <BrandGlyph kind="earn" />; }
function SeenIcon() { return <BrandGlyph kind="seen" />; }
function WallIcon() { return <BrandGlyph kind="wall" />; }
function DiscoverIcon() { return <BrandGlyph kind="discover" />; }
function StoriesIcon() { return <BrandGlyph kind="stories" />; }
function WorldIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="6.5" /><ellipse cx="12" cy="12" rx="10.5" ry="4" transform="rotate(-18 12 12)" /></svg>;
}
const highlights = [["Earn", EarnIcon, 6], ["Seen", SeenIcon, 1], ["Wall", WallIcon, 2], ["Discover", DiscoverIcon, 3], ["Stories", StoriesIcon, 4], ["Deeper", WorldIcon, 5]];
const earning = [["Direct Access", "$6.80", "per answer", FiMessageCircle], ["Experiences", "$12.92", "per unlock", FiLock], ["Your World", "$12.92", "a month per subscriber", WorldIcon], ["Gifts", "Gifts", "on stories, chats, Seens", FiGift], ["Dream support", "Dreams", "fans back your goal", FiStar]];
const modules = [
  { label: "Seen", title: "Your story, in chapters", text: "Up to five short chapters. People swipe through them right in the feed — no extra taps", Icon: SeenEyeMark, slide: 1 },
  { label: "Wall", title: "Real needs. Real help", text: "Ask for help, find a service, buy & sell, recommend. People nearby answer in the replies — then you mark it solved", Icon: WallIcon, slide: 2 },
  { label: "Discover", title: "People worth seeing", text: "Someone shows up for a real reason — same city, same dream, same taste. We always say why", Icon: DiscoverIcon, slide: 3 },
  { label: "Stories & status", title: "What’s happening now", text: "A ring on the avatar lives 24 hours. One line of status says what you’re up to", Icon: StoriesIcon, slide: 4 },
  { label: "Go deeper", title: "When you want more", text: "Creators sell premium experiences and open their World — a monthly subscription to everything they share", Icon: WorldIcon, slide: 5 },
];
const beliefs = [["Human first", "Real people, real lives. Safe for everyone"], ["Finished, not endless", "Chapters end. No doomscroll by design"], ["Creators keep what they earn", "One clear number — in dollars"]];

function ModuleArt({ slide }) {
  if (slide === 1) return <div className="seen-brand-chapters"><Portrait person="ethan" /><div><b>8-Week Transformation</b><span className="seen-brand-chapter-steps">{["Cover", "01", "02", "03", "04", "05"].map(label => <i key={label}>{label}</i>)}</span><small>swipe through it right in the feed →</small></div></div>;
  if (slide === 2) return <div className="seen-brand-wall">{[["Need help", "Lost a grey cat at Marina", "40m"], ["Looking for", "A babysitter tonight in JLT", "25m"], ["✓ Solved", "Quiet café with good Wi-Fi", "1d"]].map(([kind, text, time], index) => <div className={index === 2 ? "is-solved" : ""} key={kind}><i /><b>{kind}</b><span>{text}</span><small>{time}</small></div>)}</div>;
  if (slide === 3) return <div className="seen-brand-discover"><span>{["lina", "ethan", "mia"].map(person => <Portrait key={person} person={person} />)}</span><div>“Both training for a marathon”<small>why they’re here — always said</small></div></div>;
  if (slide === 4) return <div className="seen-brand-statuses">{[["lina", "At seen"], ["ethan", "At the gym"], ["mia", "Celebrating"], ["sofia", "Coffee walk"]].map(([person, label]) => <span key={person}><i><Portrait person={person} /></i><small>{label}</small></span>)}</div>;
  return <div className="seen-brand-world"><Planet /><span>Premium experiences — unlock once<small>One World per creator — a subscription to everything they share</small></span></div>;
}

export default function OfficialSeenPage() {
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
    <header className="seen-brand-topbar"><button aria-label="Go back" onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/search?from=discover")} type="button"><FiChevronLeft /></button><b>seen <VerifiedBadge /></b><span /></header>
    <section className="seen-brand-intro">
      <div className="seen-brand-identity"><button aria-label="Watch the official seen story" className="seen-brand-avatar" onClick={() => setGuide(0)} type="button"><span><SeenEyeMark /></span></button><div><h1>seen <VerifiedBadge /></h1><p>@seen · Official account</p></div></div>
      <p className="seen-brand-bio"><b>We see you</b><br /><span>Show your real life in chapters — and help the people around you</span></p>
      <div className="seen-brand-actions"><button aria-pressed={following} className={following ? "is-following" : ""} disabled={follow.isPending || profile.isLoading} onClick={() => follow.mutate()} type="button">{follow.isPending ? "Saving…" : following ? "Following" : "Follow"}</button><button onClick={() => setContactOpen(true)} type="button">Say hi</button></div>
      {follow.isError ? <p className="seen-brand-action-error" role="alert">{follow.error?.response?.data?.message || "Could not update follow. Please try again."}</p> : null}
    </section>
    <nav aria-label="Official seen highlights" className="seen-brand-highlights">{highlights.map(([label, Icon, slide]) => <button key={label} onClick={() => setGuide(slide)} type="button"><span><Icon /></span><small>{label}</small></button>)}</nav>
    <section aria-labelledby="seen-brand-earn-title" className="seen-brand-earn"><header><h2 id="seen-brand-earn-title">Earn on @seen</h2><button onClick={() => setGuide(6)} type="button">How it works ›</button></header><div className="seen-brand-earning-cards">{earning.map(([label, amount, caption, Icon]) => <div key={label}><span><Icon />{label}</span><strong className={amount.startsWith("$") ? "" : "is-word"}>{amount}</strong><small>{caption}</small></div>)}</div><p><img alt="" src="/brand/goldcoin.png" /> Fans pay in coins · you keep <b>68%</b> in dollars</p></section>
    <div className="seen-brand-content"><h2 className="seen-brand-section-label">How it works</h2>
      {modules.map(({ label, title, text, Icon, slide }) => <button aria-label={`Learn about ${label}`} className="seen-brand-module" key={label} onClick={() => setGuide(slide)} type="button"><span className="seen-brand-eyebrow"><Icon />{label}<FiChevronRight /></span><h3>{title}</h3><p>{text}</p><div className="seen-brand-module-art"><ModuleArt slide={slide} /></div></button>)}
      <section aria-labelledby="seen-brand-beliefs"><h2 className="seen-brand-section-label" id="seen-brand-beliefs">What we believe</h2>{beliefs.map(([title, text], index) => <div className="seen-brand-belief" key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}</section>
      <footer className="seen-brand-footer"><SeenEyeMark /><strong>You’ve been seen</strong><button onClick={() => setContactOpen(true)} type="button">hello@atseen.com</button></footer>
    </div>
    <OfficialSeenStoryViewer initialIndex={guide ?? 0} isOpen={guide !== null} onClose={() => setGuide(null)} />
    <FanModal className="seen-brand-contact-sheet" hideHeader isOpen={contactOpen} onClose={() => setContactOpen(false)} overlayClassName="seen-brand-contact-backdrop" title="Say hi to the team">
      <button aria-label="Close contact sheet" className="seen-brand-contact-handle" onClick={() => setContactOpen(false)} type="button" />
      <div className="seen-brand-contact-content"><h2>Say hi to the team</h2><p>hello@atseen.com</p></div>
    </FanModal>
  </div>;
}
