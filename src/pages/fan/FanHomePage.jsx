import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import FeedPost from "../../components/fanWeb/home/FeedPost";
import HomeHeader from "../../components/fanWeb/home/HomeHeader";
import PostComposer from "../../components/fanWeb/home/PostComposer";
import StoriesRow from "../../components/fanWeb/home/StoriesRow";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { useAuth } from "../../hooks/useAuth";
import { profileService } from "../../services/profileService";
import { wallService } from "../../services/wallService";
import { getUserDisplay } from "../../components/fanWeb/shared/userDisplay";

export default function FanHomePage() {
  const { status, setStatus } = useOutletContext(); const { user, loading } = useAuth(); const display = getUserDisplay(user, status);
  const profileQuery = useQuery({ queryKey: ["profile", "me", "social-home"], queryFn: () => profileService.getMe().then((response) => response.data.data), enabled: Boolean(user) && !loading, retry: false });
  const wallQuery = useQuery({ queryKey: ["wall-posts"], queryFn: () => wallService.list({ limit: 30 }).then((response) => response.data.data.items || []), retry: false });
  return <div><HomeHeader location={profileQuery.data?.profile?.city || display.location} /><StoriesRow currentUser={display} /><PostComposer currentUser={display} onStatusChange={setStatus} status={status} /><p className="mb-2 mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-atseen-dim">Wall · latest sightings</p>{wallQuery.isLoading ? <LoadingSkeleton className="h-40" count={2} /> : wallQuery.isError ? <div className="rounded-2xl border border-atseen-line p-6 text-center"><p className="text-sm text-atseen-muted">Unable to load the Wall.</p><button className="mt-3 text-sm font-bold text-atseen-blue" onClick={() => wallQuery.refetch()}>Try again</button></div> : wallQuery.data.length ? wallQuery.data.map((post) => <FeedPost key={post.id} post={post} />) : <div className="rounded-2xl border border-dashed border-atseen-line p-8 text-center text-sm text-atseen-muted">The Wall is quiet. An approved creator can publish the first sighting.</div>}</div>;
}
