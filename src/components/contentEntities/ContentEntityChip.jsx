import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiBookmark, FiBookOpen, FiCompass, FiLock, FiMapPin } from "react-icons/fi";
import { CONTENT_ENTITY_TYPES } from "../../constants/contentEntityTypes";
import { savedService } from "../../services/savedService";
import AttachedEntityPreview from "./AttachedEntityPreview";
import { updateAttachedEntitySaved } from "./contentEntityCache";

const icons = {
  [CONTENT_ENTITY_TYPES.BOOK]: FiBookOpen,
  [CONTENT_ENTITY_TYPES.EXPERIENCE]: FiLock,
  [CONTENT_ENTITY_TYPES.JOURNEY]: FiCompass,
  [CONTENT_ENTITY_TYPES.PLACE]: FiMapPin,
};

function saveAction(entity) {
  if (entity.type === CONTENT_ENTITY_TYPES.PLACE) return entity.saved ? savedService.unsavePlace(entity.id) : savedService.savePlace(entity.id);
  if (entity.type === CONTENT_ENTITY_TYPES.BOOK) return entity.saved ? savedService.unsaveBook(entity.id) : savedService.saveBook(entity.id);
  if (entity.type === CONTENT_ENTITY_TYPES.JOURNEY) return entity.saved ? savedService.unsaveJourney(entity.id) : savedService.saveJourney(entity.id);
  return Promise.resolve(null);
}

export default function ContentEntityChip({ entity = {}, onNotice }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentSaved, setCurrentSaved] = useState(Boolean(entity?.saved));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const displayEntity = { ...entity, saved: currentSaved };
  const Icon = icons[entity.type] || FiMapPin;
  const directSave = [CONTENT_ENTITY_TYPES.PLACE, CONTENT_ENTITY_TYPES.BOOK].includes(entity.type);
  const mutation = useMutation({
    mutationFn: () => saveAction(displayEntity),
    onError: (error) => onNotice?.(error?.response?.data?.message || "Saved could not be updated."),
    onSuccess: (response) => {
      const nextSaved = Boolean(response?.data?.data?.saved);
      setCurrentSaved(nextSaved);
      updateAttachedEntitySaved(queryClient, entity, nextSaved);
      onNotice?.(nextSaved ? `Saved to ${entity.type === "book" ? "Books" : "Places"}.` : "Removed from Saved.");
    },
  });

  useEffect(() => {
    setCurrentSaved(Boolean(entity.saved));
  }, [entity.saved]);

  useEffect(() => {
    const onSaved = (event) => {
      const detail = event.detail || {};
      if (String(detail.id) === String(entity.id) && detail.type === entity.type) setCurrentSaved(Boolean(detail.saved));
    };
    if (typeof window === "undefined") return undefined;
    window.addEventListener("atseen-content-entity-saved", onSaved);
    return () => window.removeEventListener("atseen-content-entity-saved", onSaved);
  }, [entity.id, entity.type]);
  const open = () => {
    if ([CONTENT_ENTITY_TYPES.JOURNEY, CONTENT_ENTITY_TYPES.EXPERIENCE].includes(entity.type) && entity.route) {
      navigate(entity.route);
      return;
    }
    setPreviewOpen(true);
  };

  if (!entity?.id || !entity?.type || !entity?.title) return null;

  return (
    <>
      <span className="content-entity-chip-wrap">
        <button aria-label={`Open ${entity.title}`} className="content-entity-chip" onClick={open} type="button">
          <Icon aria-hidden="true" />
          <span>
            <strong>{entity.title}</strong>
            {entity.subtitle ? <small>{entity.subtitle}</small> : null}
          </span>
        </button>
        {directSave ? (
          <button
            aria-label={currentSaved ? `Remove ${entity.title} from Saved ${entity.type === "book" ? "Books" : "Places"}` : `Save ${entity.title}`}
            className={currentSaved ? "content-entity-save is-saved" : "content-entity-save"}
            disabled={mutation.isPending}
            onClick={(event) => {
              event.stopPropagation();
              mutation.mutate();
            }}
            type="button"
          >
            <FiBookmark aria-hidden="true" fill={currentSaved ? "currentColor" : "none"} />
          </button>
        ) : null}
      </span>
      <AttachedEntityPreview entity={displayEntity} isOpen={previewOpen} onClose={() => setPreviewOpen(false)} onNotice={onNotice} />
    </>
  );
}
