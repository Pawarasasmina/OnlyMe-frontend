import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft } from "react-icons/fi";
import FeedPost from "../../components/fanWeb/home/FeedPost";
import FanCard from "../../components/fanWeb/shared/FanCard";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { postService } from "../../services/postService";

function PostDetailPage() {
  const { id } = useParams();
  const postQuery = useQuery({
    queryKey: ["feed-posts", "detail", id],
    queryFn: () => postService.getPost(id),
    enabled: Boolean(id),
    retry: false,
  });

  if (postQuery.isLoading) {
    return <div><Link className="mb-4 inline-flex items-center gap-2 text-sm text-atseen-muted hover:text-white" to="/wall"><FiArrowLeft /> Back to Wall</Link><LoadingSkeleton className="h-48" count={1} /></div>;
  }

  if (postQuery.isError || !postQuery.data?.id) {
    return <div><Link className="mb-4 inline-flex items-center gap-2 text-sm text-atseen-muted hover:text-white" to="/wall"><FiArrowLeft /> Back to Wall</Link><FanCard className="text-center"><h1 className="text-lg font-bold">Post not found</h1><p className="mt-2 text-sm text-atseen-muted">This post may have been removed or is unavailable.</p></FanCard></div>;
  }

  return <div><Link className="mb-4 inline-flex items-center gap-2 text-sm text-atseen-muted hover:text-white" to="/wall"><FiArrowLeft /> Back to Wall</Link><FeedPost post={postQuery.data} /></div>;
}

export default PostDetailPage;
