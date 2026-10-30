import { useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiChevronLeft } from "react-icons/fi";
import { SeenFeedItem } from "./SeenFeedPage";
import { useAuth } from "../../hooks/useAuth";
import { publicationService } from "../../services/publicationService";
import { profileService } from "../../services/profileService";
import SeenReaderPage from "./SeenReaderPage";

export default function SeenPermalinkPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const accessToken = searchParams.get("access") || searchParams.get("token") || "";
  const origin = location.state?.seenOrigin;
  const searchOrigin = origin?.pathname === "/search" ? origin : null;
  const originQuery = searchOrigin ? new URLSearchParams(searchOrigin.search || "") : null;
  const searchLabel = originQuery?.get("q")?.trim() || "Search";
  const query = useQuery({
    queryKey: ["seen-permalink", id, accessToken],
    queryFn: () => publicationService.getPublicPublication(id, accessToken ? { access: accessToken } : undefined).then((response) => response.data.data.publication),
    retry: false,
  });
  const [localPublication, setLocalPublication] = useState(null);
  const publication = localPublication && String(localPublication.id || localPublication._id) === String(id)
    ? localPublication
    : query.data;
  const creatorUsername = publication?.creator?.username || "";
  const creatorProfileQuery = useQuery({
    enabled: Boolean(creatorUsername),
    queryKey: ["seen-permalink-creator", creatorUsername],
    queryFn: () => profileService.getUnifiedProfile(creatorUsername).then((response) => response.data.data),
    retry: false,
  });
  const followingFreeSeens = (creatorProfileQuery.data?.seens || []).filter((item) => String(item.id || item._id) !== String(id) && item.pricing?.mode !== "ONE_TIME" && item.status !== "DRAFT");
  const paidSeen = publication?.pricing?.mode === "ONE_TIME";

  // Paid profile tiles deliberately open the chapter overview instead of the
  // standard feed permalink. The route is shared, so hand it to the reader.
  if (searchParams.get("overview") === "1") return <SeenReaderPage />;

  if (query.isLoading) return <section className="seen-permalink-status" aria-label="Loading Seen"><span /><span /><span /></section>;
  if (query.isError || !publication) return <section className="seen-permalink-error"><h1>This Seen is not available.</h1><Link to="/seen">Back to Seen</Link></section>;

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
      <button aria-label={`Back to search for ${searchLabel}`} onClick={returnToSearch} type="button"><FiChevronLeft /></button>
      <strong>{searchLabel === "Search" ? searchLabel : `“${searchLabel}”`}</strong>
    </header> : null}
    {!searchOrigin && paidSeen ? <header className="seen-paid-permalink-header"><button aria-label="Back" onClick={() => window.history.length > 1 ? navigate(-1) : navigate(`/profile/${encodeURIComponent(publication.creator?.username || "")}`)} type="button"><FiChevronLeft /></button><strong>{String(publication.creator?.name || publication.creator?.username || "Creator").split(" ")[0]} · Seen</strong></header> : null}
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
      {followingFreeSeens.map((item, index) => <SeenFeedItem animateOnScroll={false} currentUser={user} item={item} key={item.id || item._id} onFeedRemove={() => {}} onFeedRemoveByCreator={() => {}} onFeedReplace={() => {}} onFeedUpdate={() => {}} position={index + 1} />)}
    </div>
  </section>;
}
