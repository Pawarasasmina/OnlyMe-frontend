import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiAperture, FiDisc, FiEdit3, FiImage } from "react-icons/fi";

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
  worldTarget = "",
}) {
  const [position, setPosition] = useState(undefined);
  const options = [
    { disabled: !canCreateSeen, icon: ThinSeenEyeIcon, label: "Seen", to: "/create/seen" },
    { disabled: !canCreateWorld, icon: FiImage, label: "Experience", to: "/create/experience" },
    { disabled: !canCreateStoryNow, icon: FiAperture, label: "Story", onClick: onStory },
    { disabled: !canPostNote, icon: FiEdit3, label: "Note", onClick: onNote },
    { disabled: !canCreateWorld, icon: FiDisc, label: "World", to: worldTarget || "/create/premium-world" },
  ];

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const createButton = document.querySelector('.seen-proto-header-actions button[aria-label="Create"], .profile-top-icon[aria-label="Create"], .sidebar-create-action');
    const updatePosition = () => {
      if (!createButton) {
        setPosition(undefined);
        return;
      }
      const bounds = createButton.getBoundingClientRect();
      const menuWidth = Math.min(184, window.innerWidth - 16);
      const left = Math.min(Math.max(8, bounds.left + bounds.width / 2 - 136), window.innerWidth - menuWidth - 8);
      const menuHeight = 252;
      const bottom = Math.max(82, Math.min(window.innerHeight - bounds.bottom - 8, 118));
      setPosition({
        "--create-menu-left": `${left}px`,
        "--create-menu-bottom": `${Math.max(8, Math.min(bottom, window.innerHeight - menuHeight - 8))}px`,
        "--create-menu-width": `${menuWidth}px`,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    observer?.observe(createButton);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
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
      <section aria-label="Create" className="seen-create-sheet">
        <div className="seen-create-list">
          {options.map((option) => {
            const Icon = option.icon;
            const content = (
              <>
                <span className="seen-create-option-icon"><Icon aria-hidden="true" /></span>
                <span className="seen-create-option-copy"><b>{option.label}</b></span>
              </>
            );

            if (option.to) {
              return (
                <Link
                  className={`seen-create-option ${option.disabled ? "is-disabled" : ""}`}
                  key={option.label}
                  onClick={onClose}
                  to={option.disabled ? "/create" : option.to}
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                className={`seen-create-option ${option.disabled ? "is-disabled" : ""}`}
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
      </section>
    </div>
  );
}

export default FanCreateSheet;
