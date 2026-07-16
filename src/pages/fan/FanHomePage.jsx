import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import FeedPost from "../../components/fanWeb/home/FeedPost";
import HomeHeader from "../../components/fanWeb/home/HomeHeader";
import PostComposer from "../../components/fanWeb/home/PostComposer";
import StoriesRow from "../../components/fanWeb/home/StoriesRow";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { atseenFeedPosts } from "../../data/atseenMockData";
import { useAuth } from "../../hooks/useAuth";
import { fanService } from "../../services/fanService";
import { getUserDisplay } from "../../components/fanWeb/shared/userDisplay";

function FanHomePage() {
  const { status, setStatus } = useOutletContext();
  const { user, loading: authLoading } = useAuth();
  const display = getUserDisplay(user, status);
  const dashboardQuery = useQuery({
    queryKey: ["fan", "dashboard", "home"],
    queryFn: () => fanService.getDashboard().then((response) => response.data.data),
    enabled: Boolean(user) && !authLoading,
    retry: false,
  });

  const location = dashboardQuery.data?.profile?.city || display.location;

  return (
    <div>
      <HomeHeader location={location} />
      <StoriesRow currentUser={display} />
      <PostComposer currentUser={display} onStatusChange={setStatus} status={status} />
      {dashboardQuery.isLoading ? <LoadingSkeleton className="h-28" count={2} /> : null}
      <div aria-busy={dashboardQuery.isLoading ? "true" : "false"}>
        {atseenFeedPosts.map((post) => (
          <FeedPost key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

export default FanHomePage;
