import { useEffect } from "react";
import { Link } from "react-router-dom";
import { FiAperture, FiDisc, FiEdit3, FiEye } from "react-icons/fi";

function FanCreateSheet({
  canCreateStoryNow = true,
  canPostNote = true,
  isOpen,
  onClose,
  onNote,
  onStory,
}) {
  const options = [
    { description: "A post of what you've seen", icon: FiEye, label: "Seen", to: "/create/seen" },
    { description: "24 hours - then it's gone", icon: FiAperture, label: "Story", onClick: onStory, disabled: !canCreateStoryNow },
    { description: "One line on the wall", icon: FiEdit3, label: "Note", onClick: onNote, disabled: !canPostNote },
    { description: "Your space by subscription", icon: FiDisc, label: "World", labelAccent: "\uD83E\uDE90", to: "/create/premium-world" },
  ];

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

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
    <div aria-modal="true" className="seen-create-layer" role="dialog">
      <button aria-label="Close create menu" className="seen-create-dim" onClick={onClose} type="button" />
      <section className="seen-create-sheet">
        <span aria-hidden="true" className="seen-create-grab" />
        <h2>Create</h2>
        <div className="seen-create-list">
          {options.map((option) => {
            const Icon = option.icon;
            const content = (
              <>
                <span className="seen-create-option-icon"><Icon aria-hidden="true" /></span>
                <span className="seen-create-option-copy">
                  <b>{option.label}{option.labelAccent ? <i aria-hidden="true">{option.labelAccent}</i> : null}</b>
                  <small>{option.description}</small>
                </span>
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
