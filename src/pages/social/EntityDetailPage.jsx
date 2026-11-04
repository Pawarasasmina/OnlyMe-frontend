/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiBookmark, FiBookOpen, FiExternalLink, FiMapPin, FiRefreshCw } from "react-icons/fi";
import { CONTENT_ENTITY_TYPES } from "../../constants/contentEntityTypes";
import { contentEntityService } from "../../services/contentEntityService";
import { savedService } from "../../services/savedService";
import { resolveMediaUrl } from "../../utils/media";
import { updateAttachedEntitySaved } from "../../components/contentEntities/contentEntityCache";

function routeType(pathType = "") {
  return pathType.toLowerCase().startsWith("book") ? CONTENT_ENTITY_TYPES.BOOK : CONTENT_ENTITY_TYPES.PLACE;
}

function saveAction(entity) {
  if (entity.type === CONTENT_ENTITY_TYPES.BOOK) return entity.saved ? savedService.unsaveBook(entity.id) : savedService.saveBook(entity.id);
  return entity.saved ? savedService.unsavePlace(entity.id) : savedService.savePlace(entity.id);
}

export default function EntityDetailPage() {
  __useUiLanguage();
  const { id, type: pathType = "" } = useParams();
  const type = routeType(pathType || window.location.pathname.split("/")[1]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["content-entity", type, id],
    queryFn: () => contentEntityService.detail(type, id),
    retry: false,
  });
  const entity = query.data?.entity;
  const image = resolveMediaUrl(entity?.image);
  const Icon = type === CONTENT_ENTITY_TYPES.BOOK ? FiBookOpen : FiMapPin;
  const mutation = useMutation({
    mutationFn: () => saveAction(entity),
    onSuccess: (response) => updateAttachedEntitySaved(queryClient, entity, Boolean(response.data?.data?.saved)),
  });

  if (query.isLoading) return <section className="entity-detail-page"><div className="attached-entity-loading" /></section>;
  if (query.isError || !entity) return <section className="entity-detail-page"><button onClick={() => navigate(-1)} type="button"><FiArrowLeft data-ui-directional="true" /> {__msg("discover.back")}</button><h1>{__msg("social.thisItemIsNotAvailable")}</h1><button onClick={() => query.refetch()} type="button"><FiRefreshCw /> {__msg("activity.retry")}</button></section>;

  return (
    <section className="entity-detail-page">
      <header>
        <button aria-label={__msg("discover.back")} onClick={() => navigate(-1)} type="button"><FiArrowLeft data-ui-directional="true" /></button>
        <span>{type === CONTENT_ENTITY_TYPES.BOOK ? __msg("contentEntities.book") : __msg("contentEntities.place")}</span>
      </header>
      <div className="entity-detail-hero">
        {image ? <img alt="" src={image} /> : <Icon aria-hidden="true" />}
      </div>
      <main>
        <p>{entity.category || (type === CONTENT_ENTITY_TYPES.BOOK ? __msg("contentEntities.book") : __msg("contentEntities.place"))}</p>
        <h1 dir="auto">{entity.title}</h1>
        {entity.subtitle ? <strong>{entity.subtitle}</strong> : null}
        {entity.address ? <small>{entity.address}</small> : null}
        {entity.description ? <span>{entity.description}</span> : null}
        {entity.creator?.username ? <Link to={`/profile/${encodeURIComponent(entity.creator.username)}`}>{__msg("social.recommendedBy")} {entity.creator.name || entity.creator.username}<FiExternalLink /></Link> : null}
        <button
          aria-label={entity.saved ? __msg("contentEntities.removeFromSaved", { value0: entity.title }) : __msg("contentEntities.save", { value0: entity.title })}
          className={entity.saved ? "is-saved" : ""}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          type="button"
        >
          <FiBookmark aria-hidden="true" fill={entity.saved ? "currentColor" : "none"} />
          {entity.saved ? __msg("contentEntities.saved") : __msg("contentEntities.save_efc007")}
        </button>
      </main>
    </section>
  );
}
