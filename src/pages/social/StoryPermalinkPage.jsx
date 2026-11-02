import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import StoryViewer from "../../components/stories/StoryViewer";
import StoryCreator from "../../components/stories/StoryCreator";
import { storyService } from "../../services/storyService";
import { useAuth } from "../../hooks/useAuth";

export default function StoryPermalinkPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const story = useQuery({ queryKey: ["stories", "detail", id], queryFn: () => storyService.getStory(id), retry: false });
  const close = () => { if (window.history.state?.idx > 0) navigate(-1); else navigate("/wall", { replace: true }); };
  const initialContent = useMemo(() => story.data ? { sourceStoryId: story.data.id, sharedCard: { destinationRoute: `/stories/${story.data.id}`, kind: "story", username: story.data.owner.username, avatarUrl: story.data.owner.avatar, imageUrl: story.data.mediaUrl, mediaType: story.data.mediaType, title: story.data.owner.name, subtitle: `@${story.data.owner.username} · Original story`, x: 50, y: 44 } } : null, [story.data]);
  const canReshare = story.data?.allowSharing && story.data.audience === "everyone" && !story.data.editorMetadata?.sourceStoryId && story.data.editorMetadata?.mentions?.some((item) => item.userId === String(user?.id || user?._id));
  if (story.isPending) return <div className="p-8" role="status">Loading story…</div>;
  if (story.isError) {
    const status = story.error?.response?.status;
    const unavailable = [400, 404, 410].includes(status);
    const forbidden = status === 403;
    return <section className="p-8 text-center" role="alert"><h1 className="text-xl font-bold">{forbidden ? "Story access restricted" : unavailable ? "Story unavailable" : "Unable to load story"}</h1><p className="my-4 text-atseen-muted">{forbidden ? "You do not have access to this story." : unavailable ? "This story has expired or was deleted." : "Check your connection and try again."}</p>{!unavailable && !forbidden ? <button className="mr-5" onClick={() => story.refetch()} type="button">Retry</button> : null}<button onClick={close} type="button">Go back</button></section>;
  }
  if (params.get("reshare") === "1") {
    if (!canReshare) return <section className="p-8"><p>This story cannot be reshared.</p><button onClick={close} type="button">Go back</button></section>;
    return <StoryCreator initialContent={initialContent} isOpen onClose={() => navigate(`/stories/${id}`, { replace: true })} onPublished={() => navigate("/wall", { replace: true })} />;
  }
  return <StoryViewer isOpen onClose={close} onComplete={close} stories={[story.data]} />;
}
