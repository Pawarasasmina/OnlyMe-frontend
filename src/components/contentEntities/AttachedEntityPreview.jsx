import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FiBookmark, FiBookOpen, FiCompass, FiExternalLink, FiLock, FiMapPin, FiRefreshCw, FiX } from "react-icons/fi";
import FanModal from "../fanWeb/shared/FanModal";
import { CONTENT_ENTITY_TYPES } from "../../constants/contentEntityTypes";
import { contentEntityService } from "../../services/contentEntityService";
import { savedService } from "../../services/savedService";
import { resolveMediaUrl } from "../../utils/media";
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

export default function AttachedEntityPreview({ entity, isOpen, onClose, onNotice }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    enabled: isOpen && Boolean(entity?.id && entity?.type),
    queryKey: ["content-entity", entity?.type, entity?.id],
    queryFn: () => contentEntityService.detail(entity.type, entity.id),
    retry: false,
  });
  const detail = query.data?.entity || entity || {};
  const Icon = icons[detail.type] || FiMapPin;
  const image = resolveMediaUrl(detail.image);
  const canSave = [CONTENT_ENTITY_TYPES.PLACE, CONTENT_ENTITY_TYPES.BOOK, CONTENT_ENTITY_TYPES.JOURNEY].includes(detail.type);
  const mutation = useMutation({
    mutationFn: () => saveAction(detail),
    onError: (error) => onNotice?.(error?.response?.data?.message || "Saved could not be updated."),
    onSuccess: (response) => {
      const nextSaved = Boolean(response?.data?.data?.saved);
      updateAttachedEntitySaved(queryClient, detail, nextSaved);
      onNotice?.(nextSaved ? `Saved to ${detail.type === "book" ? "Books" : detail.type === "journey" ? "Journeys" : "Places"}.` : "Removed from Saved.");
    },
  });

  return (
    <FanModal className="attached-entity-preview" isOpen={isOpen} onClose={onClose} title={detail.title || "Attached item"}>
      {query.isLoading ? <div className="attached-entity-loading" aria-label="Loading attached item" /> : null}
      {query.isError ? (
        <div className="attached-entity-error" role="alert">
          <p>This attached item is not available.</p>
          <button onClick={() => query.refetch()} type="button"><FiRefreshCw aria-hidden="true" /> Retry</button>
        </div>
      ) : null}
      {!query.isLoading && !query.isError ? (
        <article>
          <div className="attached-entity-hero">
            {image ? <img alt="" src={image} /> : <span><Icon aria-hidden="true" /></span>}
          </div>
          <div className="attached-entity-copy">
            <p>{detail.category || (detail.type === CONTENT_ENTITY_TYPES.BOOK ? "Book" : detail.type === CONTENT_ENTITY_TYPES.EXPERIENCE ? "Experience" : detail.type === CONTENT_ENTITY_TYPES.JOURNEY ? "Journey" : "Place")}</p>
            <h2>{detail.title}</h2>
            {detail.subtitle ? <strong>{detail.subtitle}</strong> : null}
            {detail.address ? <small>{detail.address}</small> : null}
            {detail.description ? <span>{detail.description}</span> : null}
            {detail.creator?.name ? <em>By {detail.creator.name}</em> : null}
          </div>
          <div className="attached-entity-actions">
            {canSave ? (
              <button
                aria-label={detail.saved ? `Remove ${detail.title} from Saved` : `Save ${detail.title}`}
                className={detail.saved ? "is-saved" : ""}
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
                type="button"
              >
                <FiBookmark aria-hidden="true" fill={detail.saved ? "currentColor" : "none"} />
                {detail.saved ? "Saved" : "Save"}
              </button>
            ) : null}
            {detail.route ? <Link to={detail.route} onClick={onClose}><FiExternalLink aria-hidden="true" /> View more</Link> : null}
            <button aria-label="Close attached item" onClick={onClose} type="button"><FiX aria-hidden="true" /> Close</button>
          </div>
        </article>
      ) : null}
    </FanModal>
  );
}
