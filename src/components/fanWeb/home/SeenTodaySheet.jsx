/* i18n-source-migrated */
import { msg as __msg } from "../../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../../hooks/useLanguage.js";
import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";
import { relativeTime } from "../../../utils/relativeTime";
import FanAvatar from "../shared/FanAvatar";
import { useStoryViewerPosition } from "../../../hooks/useStoryViewerPosition";

function SeenTodaySheet({ isOpen, people = [], count = 0, onClose }) {
  __useUiLanguage();
  const navigate = useNavigate();
  const firstRowRef = useRef(null);
  const columnPosition = useStoryViewerPosition(isOpen);

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
      <section aria-label={__msg("fanWeb.saidISeeYouToday", { value0: count, value1: count === 1 ? "person" : "people" })} className="seen-today-sheet" style={columnPosition}>
        <div className="seen-today-handle" aria-hidden="true" />
        <header className="seen-today-header">
          <strong>{count}</strong>
          <span>{__msg("fanWeb.saidISeeYouToday_c1913a")}</span>
        </header>

        <div className="seen-today-list">
          {people.map((person, index) => {
            const name = person.user?.displayName || person.user?.username || __msg("social.profile");
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
                  <span>{__msg("fanWeb.saidISeeYou")} {relativeTime(person.occurredAt)}</span>
                </span>
                <FiChevronRight data-ui-directional="true" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default SeenTodaySheet;
