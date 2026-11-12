/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import StoryViewer from "../../components/stories/StoryViewer";
import StoryCreator from "../../components/stories/StoryCreator";
import { storyService } from "../../services/storyService";
import { useAuth } from "../../hooks/useAuth";

export default function StoryPermalinkPage() {
  const { language: __uiLanguage } = __useUiLanguage();
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const story = useQuery({ queryKey: ["stories", "detail", id], queryFn: () => storyService.getStory(id), retry: false });
  const close = () => { if (window.history.state?.idx > 0) navigate(-1); else navigate("/wall", { replace: true }); };
  const initialContent = useMemo(() => story.data ? { sourceStoryId: story.data.id, sharedCard: { destinationRoute: `/stories/${story.data.id}`, kind: "story", username: story.data.owner.username, avatarUrl: story.data.owner.avatar, imageUrl: story.data.mediaUrl, mediaType: story.data.mediaType, title: story.data.owner.name, subtitle: __msg("social.value0OriginalStory", { value0: story.data.owner.username }), x: 50, y: 44 } } : null, [story.data, __uiLanguage]);
  const canReshare = story.data?.allowSharing && story.data.audience === "everyone" && !story.data.editorMetadata?.sourceStoryId && story.data.editorMetadata?.mentions?.some((item) => item.userId === String(user?.id || user?._id));
  if (story.isPending) return <div className="p-8" role="status">{__msg("activity.loadingStory")}</div>;
  if (story.isError) {
    const status = story.error?.response?.status;
    const unavailable = [400, 404, 410].includes(status);
    const forbidden = status === 403;
    return <section className="p-8 text-center" role="alert"><h1 className="text-xl font-bold">{forbidden ? __msg("social.storyAccessRestricted") : unavailable ? __msg("fan.storyUnavailable") : __msg("social.unableToLoadStory")}</h1><p className="my-4 text-atseen-muted">{forbidden ? __msg("social.youDoNotHaveAccessToThisStory") : unavailable ? __msg("social.thisStoryHasExpiredOrWasDeleted") : __msg("discover.checkYourConnectionAndTryAgain")}</p>{!unavailable && !forbidden ? <button className="me-5" onClick={() => story.refetch()} type="button">{__msg("activity.retry")}</button> : null}<button onClick={close} type="button">{__msg("profile.goBack")}</button></section>;
  }
  if (params.get("reshare") === "1") {
    if (!canReshare) return <section className="p-8"><p>{__msg("activity.thisStoryCannotBeReshared")}</p><button onClick={close} type="button">{__msg("profile.goBack")}</button></section>;
    return <StoryCreator initialContent={initialContent} isOpen onClose={() => navigate(`/stories/${id}`, { replace: true })} onPublished={() => navigate("/wall", { replace: true })} />;
  }
  return <StoryViewer isOpen onClose={close} onComplete={close} stories={[story.data]} />;
}
