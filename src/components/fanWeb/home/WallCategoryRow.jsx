import { Link, useLocation } from "react-router-dom";
import { FiMessageCircle } from "react-icons/fi";
import { msg, getLocale, optionLabel } from "../../../i18n/runtime.js";
import { useLanguage } from "../../../hooks/useLanguage";
import { WALL_FILTER_TYPES } from "../../../data/wallFilters";
import { relativeTime } from "../../../utils/relativeTime";
import { resolveMediaUrl } from "../../../utils/media";
import { wallClosedLabel } from "../../../utils/wallResolution";
import { wallIsClosed } from "../../../utils/wallLifecycle";
import { useAuth } from "../../../hooks/useAuth";
import FanAvatar from "../shared/FanAvatar";
import { wallPricePresentation } from "../../../utils/wallMarketplace";

export default function WallCategoryRow({ post, hideCategory = false }) {
  useLanguage();
  const { user } = useAuth();
  const location = useLocation();
  const author = post.author || post.creator || {};
  const own = post.isOwner || Boolean((user?.id || user?._id) && String(author.id || author._id) === String(user.id || user._id));
  const name = own ? msg("fanWeb.you") : author.name || author.displayName || author.username || msg("fanWeb.author");
  const media = post.media?.length ? post.media : (post.images || []).map(url => ({ type: "image", url }));
  const photo = media.find(item => ["image", "photo"].includes(String(item.type || item.mediaType || "image").toLowerCase()) && (item.url || item.secureUrl));
  const count = Number(post.commentCount ?? (Array.isArray(post.comments) ? post.comments.length : post.comments) ?? 0) || 0;
  const type = WALL_FILTER_TYPES.find(item => item.value !== "all" && item.sourceLabel.toLowerCase() === String(post.postType || post.context || "").toLowerCase());
  const closed = wallIsClosed(post);
  const successfulClose = Boolean(post.resolvedAt && !["Offering", "Recommendation", "Event"].includes(post.postType));
  const category = closed ? wallClosedLabel(post) : type?.label || optionLabel(post.postType || post.context || "Community");
  const id = post.originalPostId || post.id || post._id;
  const price = wallPricePresentation(post, { locale: getLocale(), freeLabel: msg("profile.free") });
  return <Link className={`wall-category-row${closed ? " is-closed" : ""}${successfulClose ? " is-resolved" : ""}`} to={`/posts/${encodeURIComponent(id)}`} state={{ wallReturnTo: location.pathname + location.search }}>
    <FanAvatar name={author.name || author.displayName || author.username} src={author.avatar || author.avatarUrl} size="h-8 w-8" />
    <span className="wall-category-copy">
      <span className="wall-category-meta">
        {!hideCategory || closed ? <><em>{successfulClose ? "✓ " : ""}{category}</em><span aria-hidden="true"> · </span></> : null}
        <b>{name}</b>
        <span> · {relativeTime(post.publishedAt || post.createdAt)}</span>
        {post.editedAt ? <span> &middot; {msg("wallEdit.edited")}</span> : null}
        {post.location ? <span> · {String(post.location).split(",")[0]}</span> : null}
      </span>
      {price ? <span className="wall-category-price">{price}</span> : null}
      <span className="wall-category-text" dir="auto">{post.text || post.transcript || media.find(item => item.transcript)?.transcript || ""}</span>
    </span>
    {photo ? <img className="wall-category-thumbnail" src={resolveMediaUrl(photo.url || photo.secureUrl)} alt="" loading="lazy" /> : <span className="wall-category-comments" aria-label={msg("common.commentsCount", { count })}><FiMessageCircle aria-hidden="true" />{count}</span>}
  </Link>;
}
