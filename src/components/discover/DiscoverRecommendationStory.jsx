/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { memo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiX } from "react-icons/fi";
import StoryViewer from "../stories/StoryViewer";
import { storyService } from "../../services/storyService";

// Discover uses the same real story media, progress and actions as other entry points.
function DiscoverRecommendationStory({ card, onClose, onNext, onPrevious, initialIndex = 0 }) {
  __useUiLanguage();
  const navigate = useNavigate();
  const creatorId = card?.userId || card?.creator?.id || card?.creatorId || card?.id;
  const name = card?.displayName || card?.name || card?.creator?.name || __msg("discover.creator");
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
  return <section className="discover-rec-story" aria-label={__msg("discover.discoverStory", { value0: name })}>
    <StoryViewer
      discover
      initialIndex={initialIndex}
      isOpen
      onClose={onClose}
      onComplete={onNext || onClose}
      onPreviousComplete={onPrevious}
      onNextCreator={onNext}
      onPreviousCreator={onPrevious}
      presentation="inline"
      stories={stories}
    />{!stories.length ? <div className="discover-story-status">
      <button aria-label={__msg("discover.closeDiscoverStory")} onClick={onClose} type="button"><FiX /></button>
      <p role={storiesQuery.isError ? "alert" : "status"}>{storiesQuery.isPending ? __msg("discover.loadingStories") : storiesQuery.isError ? __msg("discover.couldNotLoadStories") : __msg("discover.openingProfile")}</p>
      {storiesQuery.isError ? <button onClick={() => storiesQuery.refetch()} type="button">{__msg("activity.retry")}</button> : null}
      {!storiesQuery.isPending ? <button onClick={onNext || onClose} type="button">{onNext ? __msg("discover.nextPerson") : __msg("discover.backToDiscover")}</button> : null}
    </div> : null}
  </section>;
}
export default memo(DiscoverRecommendationStory);
