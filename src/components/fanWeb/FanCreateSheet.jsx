import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiAperture, FiChevronRight, FiLock, FiMonitor } from "react-icons/fi";

function ThinSeenEyeIcon() {
  return (
    <svg aria-hidden="true" className="seen-create-eye-mark" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 64 40">
      <path d="M4 20C12.5 10.6 22.2 7 32 7s19.5 3.6 28 13c-8.5 9.4-18.2 13-28 13S12.5 29.4 4 20Z" />
      <circle cx="32" cy="20" fill="currentColor" r="5.2" stroke="none" />
    </svg>
  );
}

function FanCreateSheet({
  canCreateSeen = true,
  canCreateStoryNow = true,
  canCreateWorld = true,
  canPostNote = true,
  isOpen,
  onClose,
  onNote,
  onStory,
  variant = "all",
  worldTarget = "",
}) {
  const [position, setPosition] = useState(undefined);
  const [panel, setPanel] = useState("create");
  const primaryOptions = [
    { description: "Gone in 24 hours", disabled: !canCreateStoryNow, icon: FiAperture, label: "Story", onClick: onStory },
    { description: "A story in chapters", disabled: !canCreateSeen, icon: ThinSeenEyeIcon, label: "Seen", onClick: () => setPanel("seen") },
    { description: "Ask, offer, recommend", disabled: !canPostNote, icon: FiMonitor, label: "Wall post", onClick: onNote },
  ];
  const creatorOptions = [
    { description: "Your subscription — everything you share", disabled: !canCreateWorld, icon: ThinSeenEyeIcon, label: "Open my World", to: worldTarget || "/create/premium-world" },
  ];

  useEffect(() => {
    if (!isOpen) setPanel("create");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const centerColumn = document.querySelector(".social-center-scroll");
    const updatePosition = () => {
      const compact = window.innerWidth < 881;
      const bounds = compact || !centerColumn
        ? { left: 0, width: window.innerWidth }
        : centerColumn.getBoundingClientRect();
      setPosition({
        "--create-menu-left": `${bounds.left}px`,
        "--create-menu-bottom": compact ? "0px" : "0px",
        "--create-menu-width": `${bounds.width}px`,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    if (centerColumn) observer?.observe(centerColumn);
    return () => {
      window.removeEventListener("resize", updatePosition);
      observer?.disconnect();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAction = (option) => {
    if (option.disabled) return;
    if (option.onClick) {
      option.onClick();
      return;
    }
    onClose();
  };

  return (
    <div aria-modal="true" className="seen-create-layer" role="dialog" style={position}>
      <button aria-label="Close create menu" className="seen-create-dim" onClick={onClose} type="button" />
      <section aria-label={variant === "seen" || panel === "seen" ? "Choose Seen type" : "Create"} className={`seen-create-sheet ${variant === "seen" || panel === "seen" ? "is-seen-type-picker" : ""}`}>
        <span className="seen-create-handle" aria-hidden="true" />
        {variant === "seen" || panel === "seen" ? <>
          <h2>New Seen</h2>
          <p className="seen-type-picker-intro">Pick the format first — they&apos;re built differently.</p>
          <div className="seen-type-picker-options">
            <Link className={`seen-type-picker-card ${!canCreateSeen ? "is-disabled" : ""}`} onClick={(event) => { if (!canCreateSeen) event.preventDefault(); else onClose(); }} to="/create/seen?type=free">
              <span className="seen-type-picker-icon"><ThinSeenEyeIcon /></span>
              <span className="seen-type-picker-copy"><b>Free Seen</b><small>Up to 5 short chapters</small><small>Everyone reads every chapter</small><em>Grows your audience</em></span>
              <FiChevronRight aria-hidden="true" />
            </Link>
            <Link className={`seen-type-picker-card ${!canCreateSeen ? "is-disabled" : ""}`} onClick={(event) => { if (!canCreateSeen) event.preventDefault(); else onClose(); }} to="/create/seen?type=paid">
              <span className="seen-type-picker-icon"><FiLock /></span>
              <span className="seen-type-picker-copy"><b>Paid Seen</b><small>Up to 10 chapters — deeper, more detailed</small><small>Chapter 1 is a free preview, the rest unlock once</small><em>You get $19 per unlock at 190 coins</em></span>
              <FiChevronRight aria-hidden="true" />
            </Link>
          </div>
        </> : <>
        <h2>Create</h2>
        <div className="seen-create-primary">
          {primaryOptions.map((option) => {
            const Icon = option.icon;
            const content = (
              <>
                <span className="seen-create-option-icon"><Icon aria-hidden="true" /></span>
                <span className="seen-create-option-copy"><b>{option.label}</b><small>{option.description}</small></span>
              </>
            );

            if (option.to) {
              return (
                <Link
                  aria-disabled={option.disabled}
                  className={`seen-create-card ${option.disabled ? "is-disabled" : ""}`}
                  key={option.label}
                  onClick={(event) => { if (option.disabled) event.preventDefault(); else onClose(); }}
                  to={option.to}
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                className={`seen-create-card ${option.disabled ? "is-disabled" : ""}`}
                disabled={option.disabled}
                key={option.label}
                onClick={() => handleAction(option)}
                type="button"
              >
                {content}
              </button>
            );
          })}
        </div>
        <p className="seen-create-section-label">For creators</p>
        <div className="seen-create-creator-list">
          {creatorOptions.map((option) => {
            const Icon = option.icon;
            return <Link aria-disabled={option.disabled} className={`seen-create-creator-option ${option.disabled ? "is-disabled" : ""}`} key={option.label} onClick={(event) => { if (option.disabled) event.preventDefault(); else onClose(); }} to={option.to}>
              <span className="seen-create-option-icon"><Icon aria-hidden="true" /></span>
              <span className="seen-create-option-copy"><b>{option.label}</b><small>{option.description}</small></span>
              <FiChevronRight aria-hidden="true" />
            </Link>;
          })}
        </div>
        </>}
      </section>
    </div>
  );
}

export default FanCreateSheet;
