import { useEffect, useMemo, useState } from "react";
import { FiEye, FiMessageCircle, FiRepeat, FiX } from "react-icons/fi";
import { atseenCreators } from "../../data/atseenMockData";

function BrandEye({ className = "" }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 64 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 20 C14 3 50 3 62 20 C50 37 14 37 2 20 Z" fill="currentColor" />
      <circle cx="32" cy="20" fill="#0A0C0F" r="8.5" />
    </svg>
  );
}

function SeenAvatar({ size = 34 }) {
  return (
    <span className="official-seen-avatar" style={{ "--seen-avatar-size": `${size}px` }}>
      <BrandEye />
    </span>
  );
}

function MiniAvatar({ creatorId, label, muted = false }) {
  const creator = atseenCreators[creatorId];
  return (
    <div className="official-seen-mini">
      <span className={muted ? "official-seen-mini-ring is-muted" : "official-seen-mini-ring"}>
        <img alt="" src={creator?.avatar} />
      </span>
      <span>{label || creator?.name?.split(" ")[0]}</span>
    </div>
  );
}

function ChapterCard() {
  return (
    <div className="official-seen-card official-seen-chapter-card">
      <div className="official-seen-card-author">
        <img alt="" src={atseenCreators.ethan.avatar} />
        <strong>Ethan Brooks</strong>
      </div>
      <strong className="official-seen-card-title">8-Week Transformation</strong>
      <span className="official-seen-card-meta">3 chapters</span>
      <div className="official-seen-card-stats">
        <span className="official-seen-reactions">🤝 ❤️ 🔥 <b>90</b></span>
        <span>
          <FiRepeat aria-hidden="true" /> 126
        </span>
        <span>
          <FiEye aria-hidden="true" /> 7.2K
        </span>
      </div>
    </div>
  );
}

function WallNoteCard() {
  return (
    <div className="official-seen-card official-seen-wall-card">
      <div className="official-seen-card-author">
        <img alt="" src={atseenCreators.omar.avatar} />
        <strong>Omar</strong>
        <span>· Dubai · now</span>
      </div>
      <p>Kite Beach night market opens this Friday — free entry, runs till 2 AM.</p>
      <div className="official-seen-wall-stats">
        <span>🤝 ❤️ 🔥 57</span>
        <span>
          <FiMessageCircle aria-hidden="true" /> 1
        </span>
        <span>
          <FiEye aria-hidden="true" /> 2K
        </span>
      </div>
    </div>
  );
}

function DiscoverPreview() {
  return (
    <div className="official-seen-discover-art">
      <div className="official-seen-discover-minis">
        <MiniAvatar creatorId="lina" />
        <MiniAvatar creatorId="mia" />
        <div className="official-seen-mini">
          <span className="official-seen-add-mini">+</span>
          <span>friends</span>
        </div>
      </div>
      <div className="official-seen-discover-cards">
        <div className="official-seen-discover-card">
          <img alt="" src={atseenCreators.ethan.avatar} />
          <span>
            <strong>Ethan</strong>
            <small>trains at 5am · near you</small>
          </span>
        </div>
        <div className="official-seen-discover-card is-offset">
          <img alt="" src={atseenCreators.anna.avatar} />
          <span>
            <strong>Anna</strong>
            <small>3 mutual friends</small>
          </span>
        </div>
      </div>
    </div>
  );
}

function StoriesPreview() {
  return (
    <div className="official-seen-stories-art">
      <div className="official-seen-story-mini-row">
        <MiniAvatar creatorId="lina" />
        <MiniAvatar creatorId="ethan" />
        <MiniAvatar creatorId="mia" muted />
      </div>
      <span className="official-seen-hours-pill">✦ 24 hours — then it’s gone</span>
    </div>
  );
}

function CloserCard() {
  return (
    <div className="official-seen-card official-seen-closer-card">
      <div className="official-seen-feature-row">
        <span className="official-seen-feature-icon">🪐</span>
        <span>
          <strong>Premium World</strong>
          <small>private · for the closest</small>
        </span>
      </div>
      <div className="official-seen-feature-row">
        <span className="official-seen-feature-dot">✦</span>
        <span>
          <strong>Direct Access</strong>
          <small>answered in 48h — or refunded</small>
        </span>
      </div>
      <div className="official-seen-feature-row">
        <span className="official-seen-preview-ring" />
        <span>
          <strong>Preview stories</strong>
          <small>a free look — before you join</small>
        </span>
      </div>
    </div>
  );
}

function MoneyCard() {
  return (
    <div className="official-seen-card official-seen-money-card">
      <div className="official-seen-money-row">
        <span className="official-seen-coin-pill">🪙 100</span>
        <span className="official-seen-money-arrow">→</span>
        <span className="official-seen-dollar-pill">+$7.00</span>
      </div>
      <p>fan pays coins · creator earns dollars · bank payout from $20</p>
    </div>
  );
}

function getSlides() {
  return [
    {
      title: "You’ve been seen.",
      body: "@seen is where being seen matters more than being scrolled.",
      art: (
        <div className="official-seen-large-eye">
          <BrandEye />
        </div>
      ),
    },
    {
      title: "Seens — life in chapters",
      body: "People post what they really live: short chapters you can walk through. React, repost, save — one tap.",
      art: <ChapterCard />,
    },
    {
      title: "The wall hears you",
      body: "Say what you see right now — one honest note. Your city reads it, reacts, and answers.",
      art: <WallNoteCard />,
    },
    {
      title: "Meet Discover",
      body: "People drift closer for real reasons — and we always tell you why.",
      art: <DiscoverPreview />,
    },
    {
      title: "Stories live on people",
      body: "A ring on the avatar means there’s something to see. Your day lives 24 hours — write on it, color it, drop a photo.",
      art: <StoriesPreview />,
    },
    {
      title: "Closer — when you’re ready",
      body: "Some creators open a private world 🪐 for their closest people, and a direct line with guaranteed answers. Quiet, optional, never in your way.",
      art: <CloserCard />,
    },
    {
      title: "Money — honest by design",
      body: "Fans pay with coins. The moment they do, the creator gets dollars — real, withdrawable, instant. Coins never turn back into money.",
      art: <MoneyCard />,
    },
  ];
}

function OfficialSeenStoryViewer({ isOpen, onClose }) {
  const slides = useMemo(getSlides, []);
  const [index, setIndex] = useState(0);
  const slide = slides[index];

  useEffect(() => {
    if (!isOpen) return undefined;
    setIndex(0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

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
            onClose();
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
  }, [isOpen, onClose, slides.length]);

  if (!isOpen) return null;

  const step = (direction) => {
    setIndex((current) => {
      const next = current + direction;
      if (next < 0) return current;
      if (next >= slides.length) {
        onClose();
        return current;
      }
      return next;
    });
  };

  return (
    <div aria-label="@seen story" aria-modal="true" className="official-seen-story-overlay" role="dialog">
      <div className="official-seen-story-surface">
        <div className="official-seen-story-bg" />
        <header className="official-seen-story-head">
          <span className="official-seen-story-brand">
            <SeenAvatar />
            <b>seen</b>
            <span>✓</span>
          </span>
          <span className="official-seen-story-kicker">About the project</span>
          <button aria-label="Close @seen story" className="official-seen-story-close" onClick={onClose} type="button">
            <FiX aria-hidden="true" />
          </button>
        </header>
        <div aria-hidden="true" className="official-seen-story-progress">
          {slides.map((item, itemIndex) => (
            <span className={itemIndex <= index ? "is-active" : ""} key={item.title} />
          ))}
        </div>
        <main className="official-seen-story-body" key={slide.title}>
          <div className="official-seen-story-art">{slide.art}</div>
          <h2>{slide.title}</h2>
          <p>{slide.body}</p>
        </main>
        <button aria-label="Previous @seen story" className="official-seen-story-zone is-left" onClick={() => step(-1)} type="button" />
        <button aria-label="Next @seen story" className="official-seen-story-zone is-right" onClick={() => step(1)} type="button" />
        <div aria-label={`Slide ${index + 1} of ${slides.length}`} className="official-seen-story-dots" role="status">
          {slides.map((item, itemIndex) => (
            <span className={itemIndex === index ? "is-current" : ""} key={item.title} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default OfficialSeenStoryViewer;
