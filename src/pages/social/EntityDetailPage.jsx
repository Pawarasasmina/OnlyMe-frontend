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
  if (query.isError || !entity) return <section className="entity-detail-page"><button onClick={() => navigate(-1)} type="button"><FiArrowLeft /> Back</button><h1>This item is not available.</h1><button onClick={() => query.refetch()} type="button"><FiRefreshCw /> Retry</button></section>;

  return (
    <section className="entity-detail-page">
      <header>
        <button aria-label="Back" onClick={() => navigate(-1)} type="button"><FiArrowLeft /></button>
        <span>{type === CONTENT_ENTITY_TYPES.BOOK ? "Book" : "Place"}</span>
      </header>
      <div className="entity-detail-hero">
        {image ? <img alt="" src={image} /> : <Icon aria-hidden="true" />}
      </div>
      <main>
        <p>{entity.category || (type === CONTENT_ENTITY_TYPES.BOOK ? "Book" : "Place")}</p>
        <h1>{entity.title}</h1>
        {entity.subtitle ? <strong>{entity.subtitle}</strong> : null}
        {entity.address ? <small>{entity.address}</small> : null}
        {entity.description ? <span>{entity.description}</span> : null}
        {entity.creator?.username ? <Link to={`/profile/${encodeURIComponent(entity.creator.username)}`}>Recommended by {entity.creator.name || entity.creator.username}<FiExternalLink /></Link> : null}
        <button
          aria-label={entity.saved ? `Remove ${entity.title} from Saved` : `Save ${entity.title}`}
          className={entity.saved ? "is-saved" : ""}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          type="button"
        >
          <FiBookmark aria-hidden="true" fill={entity.saved ? "currentColor" : "none"} />
          {entity.saved ? "Saved" : "Save"}
        </button>
      </main>
    </section>
  );
}
