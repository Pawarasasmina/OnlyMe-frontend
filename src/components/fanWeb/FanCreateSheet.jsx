/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiChevronRight, FiMonitor } from "react-icons/fi";
import "./FanCreateSheet.css";

function StoryRingIcon() {
  __useUiLanguage();
  return <svg aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" strokeDasharray="4 3" /><circle cx="12" cy="12" r="3.6" /></svg>;
}

function WorldOrbitIcon() {
  __useUiLanguage();
  return <svg aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5.5" /><ellipse cx="12" cy="12" rx="10" ry="3.6" transform="rotate(-18 12 12)" /></svg>;
}

function ThinSeenEyeIcon() {
  __useUiLanguage();
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
  worldTarget = "",
}) {
  __useUiLanguage();
  const [position, setPosition] = useState(undefined);
  const primaryOptions = [
    { description: __msg("fanWeb.goneIn24Hours"), disabled: !canCreateStoryNow, icon: StoryRingIcon, label: __msg("activity.story"), onClick: onStory },
    { description: __msg("fanWeb.chaptersFreeOrPaid"), disabled: !canCreateSeen, icon: ThinSeenEyeIcon, label: "Seen", to: "/create/seen" },
    { description: __msg("fanWeb.askOfferRecommend"), disabled: !canPostNote, icon: FiMonitor, label: __msg("fanWeb.wallPost"), onClick: onNote },
  ];
  const creatorOptions = [
    { description: worldTarget ? __msg("fanWeb.yourSubscriptionEverythingYouShare") : __msg("fanWeb.aMonthlySubscriptionToYourWholeWorld"), disabled: !canCreateWorld, icon: WorldOrbitIcon, label: worldTarget ? __msg("fanWeb.openMyWorld") : __msg("admin.world"), to: worldTarget || "/create/premium-world" },
  ];

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
    <div aria-label={__msg("fanWeb.create")} aria-modal="true" className="seen-create-layer seen-create-prototype" role="dialog" style={position}>
      <button aria-label={__msg("fanWeb.closeCreateMenu")} className="seen-create-dim" onClick={onClose} type="button" />
      <section aria-label={__msg("fanWeb.create")} className="seen-create-sheet">
        <span className="seen-create-handle" aria-hidden="true" />
        <h2>{__msg("fanWeb.create")}</h2>
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
        <p className="seen-create-section-label">{__msg("fanWeb.forCreators")}</p>
        <div className="seen-create-creator-list">
          {creatorOptions.map((option) => {
            const Icon = option.icon;
            return <Link aria-disabled={option.disabled} className={`seen-create-creator-option ${option.disabled ? "is-disabled" : ""}`} key={option.label} onClick={(event) => { if (option.disabled) event.preventDefault(); else onClose(); }} to={option.to}>
              <span className="seen-create-option-icon"><Icon aria-hidden="true" /></span>
              <span className="seen-create-option-copy"><b>{option.label}</b><small>{option.description}</small></span>
              <FiChevronRight data-ui-directional="true" aria-hidden="true" />
            </Link>;
          })}
        </div>
      </section>
    </div>
  );
}

export default FanCreateSheet;
