import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import FeedPost from "../../components/fanWeb/home/FeedPost";
import HomeHeader from "../../components/fanWeb/home/HomeHeader";
import PostComposer from "../../components/fanWeb/home/PostComposer";
import StoriesRow from "../../components/fanWeb/home/StoriesRow";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { useAuth } from "../../hooks/useAuth";
import { useFeedPosts } from "../../hooks/useFeedPosts";
import { profileService } from "../../services/profileService";
import { getUserDisplay } from "../../components/fanWeb/shared/userDisplay";

function FanHomePage() {
  const { status, setStatus } = useOutletContext();
  const { user, loading: authLoading } = useAuth();
  const display = getUserDisplay(user, status);
  const profileQuery = useQuery({
    queryKey: ["profile", "me", "social-home"],
    queryFn: () => profileService.getMe().then((response) => response.data.data),
    enabled: Boolean(user) && !authLoading,
    retry: false,
  });
  const feedQuery = useFeedPosts({ limit: 30 });

  const location = profileQuery.data?.profile?.city || display.location;
  const feedPosts = feedQuery.data?.items || [];
  const loading = profileQuery.isLoading || feedQuery.isLoading;

  return (
    <div>
      <HomeHeader location={location} />
      <StoriesRow currentUser={display} />
      <PostComposer currentUser={display} onStatusChange={setStatus} status={status} />
      <p className="mb-2 mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-atseen-dim">Wall · Latest sightings</p>
      {loading ? <LoadingSkeleton className="h-28" count={2} /> : null}
      {feedQuery.isError ? <p className="mb-2 rounded-2xl border border-atseen-danger/20 bg-atseen-danger/10 px-4 py-3 text-xs text-atseen-danger">Unable to load posts from the database.</p> : null}
      {!loading && !feedQuery.isError && !feedPosts.length ? (
        <p className="rounded-2xl border border-atseen-line bg-atseen-surface px-4 py-5 text-sm text-atseen-muted">No posts in the database yet.</p>
      ) : null}
      <div aria-busy={loading ? "true" : "false"}>
        {feedPosts.map((post) => (
          <FeedPost key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

export default FanHomePage;
