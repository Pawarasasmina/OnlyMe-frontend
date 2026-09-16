import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiAperture, FiDisc, FiEdit3, FiEye, FiImage } from "react-icons/fi";

function FanCreateSheet({
  canCreateSeen = true,
  canCreateStoryNow = true,
  canCreateWorld = true,
  canPostNote = true,
  isOpen,
  onClose,
  onNote,
  onStory,
}) {
  const [position, setPosition] = useState(undefined);
  const options = [
    { disabled: !canCreateSeen, icon: FiEye, label: "Seen", to: "/create/seen" },
    { disabled: !canCreateWorld, icon: FiImage, label: "Experience", to: "/create/experience" },
    { disabled: !canCreateStoryNow, icon: FiAperture, label: "Story", onClick: onStory },
    { disabled: !canPostNote, icon: FiEdit3, label: "Note", onClick: onNote },
    { disabled: !canCreateWorld, icon: FiDisc, label: "World", to: "/create/premium-world" },
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
    const centerColumn = document.querySelector(".social-center-scroll");
    if (!centerColumn) return undefined;
    const updatePosition = () => {
      const bounds = centerColumn.getBoundingClientRect();
      setPosition({ "--create-menu-center-x": `${bounds.left + bounds.width / 2}px` });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    observer?.observe(centerColumn);
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
