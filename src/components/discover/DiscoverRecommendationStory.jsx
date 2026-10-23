import { memo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiX } from "react-icons/fi";
import StoryViewer from "../stories/StoryViewer";
import { storyService } from "../../services/storyService";

// Discover uses the same real story media, progress and actions as other entry points.
function DiscoverRecommendationStory({ card, onClose, onNext, onPrevious, initialIndex = 0 }) {
  const navigate = useNavigate();
  const creatorId = card?.userId || card?.creator?.id || card?.creatorId || card?.id;
  const name = card?.displayName || card?.name || card?.creator?.name || "Creator";
  const storiesQuery = useQuery({
    queryKey: ["stories", "creator", creatorId],
    queryFn: () => storyService.getCreatorStories(creatorId),
    enabled: Boolean(creatorId),
    initialData: card?.stories?.length ? card.stories : undefined,
    staleTime: 30000,
  });
  const stories = storiesQuery.data || [];
  const profileRoute = card?.profileUrl || card?.creator?.profileRoute || `/profile/${encodeURIComponent(card?.username || card?.creator?.username || creatorId)}`;
  useEffect(() => {
    if (storiesQuery.isSuccess && !storiesQuery.data?.length) navigate(profileRoute, { replace: true });
  }, [navigate, profileRoute, storiesQuery.data, storiesQuery.isSuccess]);
  return <section className="discover-rec-story" aria-label={`${name} discover story`}>
    {stories.length ? <StoryViewer
      discover
      initialIndex={initialIndex}
      isOpen
      onClose={onClose}
      onNextCreator={onNext}
      onPreviousCreator={onPrevious}
      presentation="inline"
      stories={stories}
    /> : <div className="discover-story-status">
      <button aria-label="Close discover story" onClick={onClose} type="button"><FiX /></button>
      <p role={storiesQuery.isError ? "alert" : "status"}>{storiesQuery.isPending ? "Loading stories…" : storiesQuery.isError ? "Could not load stories." : "Opening profile?"}</p>
      {storiesQuery.isError ? <button onClick={() => storiesQuery.refetch()} type="button">Retry</button> : null}
      {!storiesQuery.isPending ? <button onClick={onNext || onClose} type="button">{onNext ? "Next person" : "Back to Discover"}</button> : null}
    </div>}
  </section>;
}
export default memo(DiscoverRecommendationStory);
