/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useMemo, useState } from "react";
import { FiEye, FiMessageCircle, FiPause, FiPlay, FiRepeat, FiX } from "react-icons/fi";
import { atseenCreators } from "../../data/atseenMockData";
import { useStoryViewerPosition } from "../../hooks/useStoryViewerPosition";
import { officialPortrait } from "../../utils/officialPortrait";

function BrandEye({ className = "" }) {
  __useUiLanguage();
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 64 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 20 C14 3 50 3 62 20 C50 37 14 37 2 20 Z" fill="currentColor" />
      <circle cx="32" cy="20" fill="#0A0C0F" r="8.5" />
    </svg>
  );
}

function SeenAvatar({ size = 34 }) {
  __useUiLanguage();
  return (
    <span className="official-seen-avatar" style={{ "--seen-avatar-size": `${size}px` }}>
      <BrandEye />
    </span>
  );
}

function MiniAvatar({ creatorId, label, muted = false }) {
  __useUiLanguage();
  const creator = atseenCreators[creatorId];
  return (
    <div className="official-seen-mini">
      <span className={muted ? "official-seen-mini-ring is-muted" : "official-seen-mini-ring"}>
        <img alt="" src={officialPortrait(creatorId)} />
      </span>
      <span>{label || creator?.name?.split(" ")[0]}</span>
    </div>
  );
}

function ChapterCard() {
  __useUiLanguage();
  return (
    <div className="official-seen-card official-seen-chapter-card">
      <div className="official-seen-card-author">
        <img alt="" src={officialPortrait("ethan")} />
        <strong>{__msg("stories.ethanBrooks")}</strong>
      </div>
      <strong className="official-seen-card-title">{__msg("stories.8WeekTransformation")}</strong>
      <span className="official-seen-card-meta">{__msg("stories.5Chapters")}</span>
      <div className="official-seen-card-stats">
        <span className="official-seen-reactions">🤝 ❤️ 🔥 <b>90</b></span>
        <span>
          <FiRepeat aria-hidden="true" /> 126
        </span>
        <span>
          <FiEye aria-hidden="true" />{__msg("stories.72k")}</span>
      </div>
    </div>
  );
}

function WallNoteCard() {
  __useUiLanguage();
  return (
    <div className="official-seen-card official-seen-wall-card">
      <div className="official-seen-card-author">
        <img alt="" src={officialPortrait("omar")} />
        <strong>{__msg("search.omar")}</strong>
        <span>{__msg("stories.dubaiNow")}</span>
      </div>
      <p>{__msg("stories.needHelpLostAGreyCatAtMarinaIf")}</p>
      <div className="official-seen-wall-stats">
        <span>🤝 ❤️ 🔥 57</span>
        <span>
          <FiMessageCircle aria-hidden="true" /> 1
        </span>
        <span>
          <FiEye aria-hidden="true" />{__msg("stories.2k")}</span>
      </div>
    </div>
  );
}

function DiscoverPreview() {
  __useUiLanguage();
  return (
    <div className="official-seen-discover-art">
      <div className="official-seen-discover-minis">
        <MiniAvatar creatorId="lina" />
        <MiniAvatar creatorId="mia" />
        <div className="official-seen-mini">
          <span className="official-seen-add-mini">+</span>
          <span>{__msg("stories.friends")}</span>
        </div>
      </div>
      <div className="official-seen-discover-cards">
        <div className="official-seen-discover-card">
          <img alt="" src={officialPortrait("ethan")} />
          <span>
            <strong>{__msg("search.ethan")}</strong>
            <small>{__msg("stories.trainsAt5amNearYou")}</small>
          </span>
        </div>
        <div className="official-seen-discover-card is-offset">
          <img alt="" src={officialPortrait("anna")} />
          <span>
            <strong>{__msg("search.anna")}</strong>
            <small>{__msg("stories.3MutualFriends")}</small>
          </span>
        </div>
      </div>
    </div>
  );
}

function StoriesPreview() {
  __useUiLanguage();
  return (
    <div className="official-seen-stories-art">
      <div className="official-seen-story-mini-row">
        <MiniAvatar creatorId="lina" />
        <MiniAvatar creatorId="ethan" />
        <MiniAvatar creatorId="mia" muted />
      </div>
      <span className="official-seen-hours-pill">{__msg("stories.24HoursThenItSGone")}</span>
    </div>
  );
}

function CloserCard() {
  __useUiLanguage();
  return (
    <div className="official-seen-card official-seen-closer-card">
      <div className="official-seen-feature-row">
        <span className="official-seen-feature-icon">🪐</span>
        <span>
          <strong>{__msg("financial.premiumWorld")}</strong>
          <small>{__msg("stories.privateForTheClosest")}</small>
        </span>
      </div>
      <div className="official-seen-feature-row">
        <span className="official-seen-feature-dot">✦</span>
        <span>
          <strong>Direct Access</strong>
          <small>{__msg("stories.answeredIn48hOrRefunded")}</small>
        </span>
      </div>
      <div className="official-seen-feature-row">
        <span className="official-seen-preview-ring" />
        <span>
          <strong>{__msg("stories.previewStories")}</strong>
          <small>{__msg("stories.aFreeLookBeforeYouJoin")}</small>
        </span>
      </div>
    </div>
  );
}

function MoneyCard() {
  __useUiLanguage();
  return (
    <div className="official-seen-card official-seen-money-card">
      <div className="official-seen-money-row">
        <span className="official-seen-coin-pill"><img alt="" src="/brand/goldcoin.png" /> 100</span>
        <span className="official-seen-money-arrow">→</span>
        <span className="official-seen-dollar-pill">+$6.80</span>
      </div>
      <p>{__msg("stories.fanPaysCoinsCreatorEarnsDollarsBankPayoutFrom")}</p>
    </div>
  );
}

function getSlides() {
  return [
    {
      title: __msg("stories.youVeBeenSeen"),
      body: __msg("stories.seenIsWhereBeingSeenMattersMoreThan"),
      art: (
        <div className="official-seen-large-eye">
          <BrandEye />
        </div>
      ),
    },
    {
      title: __msg("stories.seensLifeInChapters"),
      body: __msg("stories.peoplePostWhatTheyReallyLiveShortChapters"),
      art: <ChapterCard />,
    },
    {
      title: __msg("stories.theWallHearsYou"),
      body: __msg("stories.sayWhatYouSeeRightNowOneHonest"),
      art: <WallNoteCard />,
    },
    {
      title: __msg("stories.meetDiscover"),
      body: __msg("stories.peopleDriftCloserForRealReasonsAndWe"),
      art: <DiscoverPreview />,
    },
    {
      title: __msg("stories.storiesLiveOnPeople"),
      body: __msg("stories.aRingOnTheAvatarMeansThereS"),
      art: <StoriesPreview />,
    },
    {
      title: __msg("stories.closerWhenYouReReady"),
      body: __msg("stories.creatorsOpenTheirWorldAMonthlySubscriptionTo"),
      art: <CloserCard />,
    },
    {
      title: __msg("stories.moneyHonestByDesign"),
      body: __msg("stories.fansPayWithCoinsTheMomentTheyDo"),
      art: <MoneyCard />,
    },
  ];
}

function OfficialSeenStoryViewer({ initialIndex = 0, isOpen, onClose, onComplete }) {
  __useUiLanguage();
  const slides = useMemo(getSlides, []);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [holdPaused, setHoldPaused] = useState(false);
  const [manualPaused, setManualPaused] = useState(false);
  const [systemPaused, setSystemPaused] = useState(false);
  const paused = holdPaused || manualPaused || systemPaused;
  const viewerPosition = useStoryViewerPosition(isOpen);
  const slide = slides[index];

  useEffect(() => {
    if (!isOpen) return undefined;
    setIndex(Math.max(0, Math.min(initialIndex, slides.length - 1)));
    setProgress(0);
    setManualPaused(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [initialIndex, isOpen, slides.length]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const pause = () => setSystemPaused(true);
    const resume = () => setSystemPaused(false);
    const onVisibility = () => setSystemPaused(document.hidden);
    window.addEventListener("blur", pause);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", pause);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isOpen]);

  useEffect(() => {
    setProgress(0);
  }, [index]);

  useEffect(() => {
    if (!isOpen || paused) return undefined;
    const timer = window.setInterval(() => {
      setProgress((current) => {
        const next = current + 2;
        if (next < 100) return next;
        window.clearInterval(timer);
        window.setTimeout(() => {
          if (index >= slides.length - 1) onComplete?.();
          else setIndex(index + 1);
        }, 0);
        return 100;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [index, isOpen, onComplete, paused, slides.length]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((current) => {
          if (current >= slides.length - 1) {
            onComplete?.();
            return current;
          }
          return current + 1;
        });
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((current) => Math.max(0, current - 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onComplete, slides.length]);

  if (!isOpen) return null;

  const step = (direction) => {
    setIndex((current) => {
      const next = current + direction;
      if (next < 0) return current;
      if (next >= slides.length) {
        onComplete?.();
        return current;
      }
      return next;
    });
  };

  return (
    <div aria-label={__msg("stories.seenStory")} aria-modal="true" className="official-seen-story-overlay story-viewer-overlay" role="dialog" style={viewerPosition}>
      <div className="official-seen-story-surface story-viewer-surface" onPointerCancel={() => setHoldPaused(false)} onPointerDown={() => setHoldPaused(true)} onPointerLeave={() => setHoldPaused(false)} onPointerUp={() => setHoldPaused(false)}>
        <div className="official-seen-story-bg" />
        <header className="official-seen-story-head">
          <span className="official-seen-story-brand">
            <SeenAvatar size={36} />
            <span className="official-seen-story-owner"><b>{__msg("branding.seen")} <i>✓</i></b><small>{__msg("stories.aboutTheProject")}</small></span>
            <span>✓</span>
          </span>
          <span className="official-seen-story-kicker">{__msg("stories.aboutTheProject")}</span>
          <button aria-label={paused ? __msg("stories.resumeStory") : __msg("stories.pauseStory")} className="official-seen-story-control" onClick={(event) => { event.stopPropagation(); setManualPaused((current) => !current); }} onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} type="button">
            {paused ? <FiPlay aria-hidden="true" /> : <FiPause aria-hidden="true" />}
          </button>
          <button aria-label={__msg("stories.closeSeenStory")} className="official-seen-story-close" onClick={onClose} type="button">
            <FiX aria-hidden="true" />
          </button>
        </header>
        <div aria-hidden="true" className="official-seen-story-progress">
          {slides.map((item, itemIndex) => (
            <span key={item.title}><b style={{ width: `${itemIndex < index ? 100 : itemIndex === index ? progress : 0}%` }} /></span>
          ))}
        </div>
        <main className="official-seen-story-body" key={slide.title}>
          <div className="official-seen-story-art">{slide.art}</div>
          <h2 dir="auto">{slide.title}</h2>
          <p dir="auto">{slide.body}</p>
        </main>
        <button aria-label={__msg("stories.previousSeenStory")} className="official-seen-story-zone is-left" onClick={() => step(-1)} type="button" />
        <button aria-label={__msg("stories.nextSeenStory")} className="official-seen-story-zone is-right" onClick={() => step(1)} type="button" />
      </div>
    </div>
  );
}

export default OfficialSeenStoryViewer;
