import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import FeedPost from "../../components/fanWeb/home/FeedPost";
import HomeHeader from "../../components/fanWeb/home/HomeHeader";
import PostComposer from "../../components/fanWeb/home/PostComposer";
import StoriesRow from "../../components/fanWeb/home/StoriesRow";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { atseenFeedPosts } from "../../data/atseenMockData";
import { useAuth } from "../../hooks/useAuth";
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

  const location = profileQuery.data?.profile?.city || display.location;

  return (
    <div>
      <HomeHeader location={location} />
      <StoriesRow currentUser={display} />
      <PostComposer currentUser={display} onStatusChange={setStatus} status={status} />
      <p className="mb-2 mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-atseen-dim">Prototype feed preview</p>
      {profileQuery.isLoading ? <LoadingSkeleton className="h-28" count={2} /> : null}
      <div aria-busy={profileQuery.isLoading ? "true" : "false"}>
        {atseenFeedPosts.map((post) => (
          <FeedPost key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

export default FanHomePage;
