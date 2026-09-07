import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";
import { relativeTime } from "../../../utils/relativeTime";
import FanAvatar from "../shared/FanAvatar";

function SeenTodaySheet({ isOpen, people = [], count = 0, onClose }) {
  const navigate = useNavigate();
  const firstRowRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousActiveElement = document.activeElement;
    window.requestAnimationFrame(() => firstRowRef.current?.focus());

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      previousActiveElement?.focus?.();
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback((event) => {
    if (event.target === event.currentTarget) onClose?.();
  }, [onClose]);

  const handlePersonClick = useCallback((person) => {
    const username = person?.user?.username || person?.username;
    const route = person?.user?.profileUrl || person?.profileUrl || person?.route;
    const target = username ? `/profile/${encodeURIComponent(username)}` : route;
    if (!target) return;
    onClose?.();
    navigate(target);
  }, [navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div
      aria-modal="true"
      className="seen-today-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
    >
      <section aria-label={`${count} ${count === 1 ? "person" : "people"} said I see you today`} className="seen-today-sheet">
        <div className="seen-today-handle" aria-hidden="true" />
        <header className="seen-today-header">
          <strong>{count}</strong>
          <span>said &ldquo;I see you&rdquo; today</span>
        </header>

        <div className="seen-today-list">
          {people.map((person, index) => {
            const name = person.user?.displayName || person.user?.username || "Profile";
            return (
              <button
                className="seen-today-person"
                key={person.eventId || person.user?.id || person.user?.username}
                onClick={() => handlePersonClick(person)}
                ref={index === 0 ? firstRowRef : null}
                type="button"
              >
                <FanAvatar name={name} size="h-[38px] w-[38px]" src={person.user?.avatarUrl} />
                <span className="seen-today-person-copy">
                  <strong>{name}</strong>
                  <span>said &ldquo;I see you&rdquo; &middot; {relativeTime(person.occurredAt)}</span>
                </span>
                <FiChevronRight aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default SeenTodaySheet;
