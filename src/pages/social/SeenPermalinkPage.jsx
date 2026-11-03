/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiChevronLeft } from "react-icons/fi";
import { SeenFeedItem } from "./SeenFeedPage";
import { useAuth } from "../../hooks/useAuth";
import { publicationService } from "../../services/publicationService";

export default function SeenPermalinkPage() {
  __useUiLanguage();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const accessToken = searchParams.get("access") || searchParams.get("token") || "";
  const origin = location.state?.seenOrigin;
  const searchOrigin = origin?.pathname === "/search" ? origin : null;
  const originQuery = searchOrigin ? new URLSearchParams(searchOrigin.search || "") : null;
  const searchLabel = originQuery?.get("q")?.trim() || __msg("discover.search");
  const query = useQuery({
    queryKey: ["seen-permalink", id, accessToken],
    queryFn: () => publicationService.getPublicPublication(id, accessToken ? { access: accessToken } : undefined).then((response) => response.data.data.publication),
    retry: false,
  });
  const [localPublication, setLocalPublication] = useState(null);
  const publication = localPublication && String(localPublication.id || localPublication._id) === String(id)
    ? localPublication
    : query.data;

  if (query.isLoading) return <section className="seen-permalink-status" aria-label={__msg("social.loadingSeen")}><span /><span /><span /></section>;
  if (query.isError || !publication) return <section className="seen-permalink-error"><h1>{__msg("social.thisSeenIsNotAvailable")}</h1><Link to="/seen">{__msg("social.backToSeen")}</Link></section>;

  const replacePublication = (_seenId, nextPublication) => {
    setLocalPublication((current) => ({ ...(current || publication), ...nextPublication }));
  };
  const updateEngagement = (_seenId, engagement) => {
    setLocalPublication((current) => ({
      ...(current || publication),
      engagement: {
        ...(current || publication).engagement,
        reactionCount: engagement.reactionCount,
        reactionBreakdown: engagement.reactionBreakdown,
        topReactions: engagement.topReactions,
        commentCount: engagement.commentCount,
        shareCount: engagement.shareCount,
        saveCount: engagement.saveCount,
        viewCount: engagement.viewCount,
        viewerReaction: engagement.viewerReaction,
        viewerShared: engagement.viewerShared,
        viewerSaved: engagement.viewerSaved,
      },
      previewComment: engagement.comments?.at(-1) || (current || publication).previewComment,
    }));
  };
  const leaveRemovedSeen = () => navigate("/seen", { replace: true });
  const returnToSearch = () => {
    if (!searchOrigin) return;
    navigate(`${searchOrigin.pathname}${searchOrigin.search || ""}${searchOrigin.hash || ""}`, {
      replace: true,
      state: { restoreScroll: searchOrigin.scroll },
    });
  };

  return <section className={`seen-prototype-page seen-permalink-page ${searchOrigin ? "has-search-origin" : ""}`}>
    {searchOrigin ? <header className="seen-permalink-origin-header">
      <button aria-label={__msg("social.backToSearchFor", { value0: searchLabel })} onClick={returnToSearch} type="button"><FiChevronLeft data-ui-directional="true" /></button>
      <strong>{searchLabel === "Search" ? searchLabel : `“${searchLabel}”`}</strong>
    </header> : null}
    <div className="seen-feed-list">
      <SeenFeedItem
        animateOnScroll={false}
        currentUser={user}
        item={publication}
        onFeedRemove={leaveRemovedSeen}
        onFeedRemoveByCreator={leaveRemovedSeen}
        onFeedReplace={replacePublication}
        onFeedUpdate={updateEngagement}
      />
    </div>
  </section>;
}
