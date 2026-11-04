/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
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
  __useUiLanguage();
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
    onError: (error) => onNotice?.(error?.response?.data?.message || __msg("contentEntities.savedCouldNotBeUpdated")),
    onSuccess: (response) => {
      const nextSaved = Boolean(response?.data?.data?.saved);
      updateAttachedEntitySaved(queryClient, detail, nextSaved);
      onNotice?.(nextSaved ? __msg("contentEntities.savedToValue0", { value0: detail.type === "book" ? __msg("social.books") : detail.type === "journey" ? __msg("social.journeys") : __msg("data.places") }) : __msg("contentEntities.removedFromSaved"));
    },
  });

  return (
    <FanModal className="attached-entity-preview" isOpen={isOpen} onClose={onClose} title={detail.title || __msg("contentEntities.attachedItem")}>
      {query.isLoading ? <div className="attached-entity-loading" aria-label={__msg("contentEntities.loadingAttachedItem")} /> : null}
      {query.isError ? (
        <div className="attached-entity-error" role="alert">
          <p>{__msg("contentEntities.thisAttachedItemIsNotAvailable")}</p>
          <button onClick={() => query.refetch()} type="button"><FiRefreshCw aria-hidden="true" /> {__msg("activity.retry")}</button>
        </div>
      ) : null}
      {!query.isLoading && !query.isError ? (
        <article>
          <div className="attached-entity-hero">
            {image ? <img alt="" src={image} /> : <span><Icon aria-hidden="true" /></span>}
          </div>
          <div className="attached-entity-copy">
            <p>{detail.category || (detail.type === CONTENT_ENTITY_TYPES.BOOK ? __msg("contentEntities.book") : detail.type === CONTENT_ENTITY_TYPES.EXPERIENCE ? __msg("contentEntities.experience") : detail.type === CONTENT_ENTITY_TYPES.JOURNEY ? __msg("contentEntities.journey") : __msg("contentEntities.place"))}</p>
            <h2 dir="auto">{detail.title}</h2>
            {detail.subtitle ? <strong>{detail.subtitle}</strong> : null}
            {detail.address ? <small>{detail.address}</small> : null}
            {detail.description ? <span>{detail.description}</span> : null}
            {detail.creator?.name ? <em>{__msg("contentEntities.by")} {detail.creator.name}</em> : null}
          </div>
          <div className="attached-entity-actions">
            {canSave ? (
              <button
                aria-label={detail.saved ? __msg("contentEntities.removeFromSaved", { value0: detail.title }) : __msg("contentEntities.save", { value0: detail.title })}
                className={detail.saved ? "is-saved" : ""}
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
                type="button"
              >
                <FiBookmark aria-hidden="true" fill={detail.saved ? "currentColor" : "none"} />
                {detail.saved ? __msg("contentEntities.saved") : __msg("contentEntities.save_efc007")}
              </button>
            ) : null}
            {detail.route ? <Link to={detail.route} onClick={onClose}><FiExternalLink aria-hidden="true" /> {__msg("contentEntities.viewMore")}</Link> : null}
            <button aria-label={__msg("contentEntities.closeAttachedItem")} onClick={onClose} type="button"><FiX aria-hidden="true" /> {__msg("activity.close")}</button>
          </div>
        </article>
      ) : null}
    </FanModal>
  );
}
