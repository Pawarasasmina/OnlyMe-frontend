import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import FanCard from "../shared/FanCard";
import FanAvatar from "../shared/FanAvatar";
import ContentEntityList from "../../contentEntities/ContentEntityList";
import { wallService } from "../../../services/wallService";

export default function LegacyWallNoteDetail({ post }) {
  const comments = useQuery({ queryKey: ["legacy-wall-comments", post.id], queryFn: () => wallService.comments(post.id).then((response) => response.data?.data?.comments || []), retry: false });
  return <FanCard>
    <header className="flex items-center gap-3"><FanAvatar name={post.creator?.name} src={post.creator?.avatar} /><div><Link className="font-bold" to={`/profile/${encodeURIComponent(post.creator?.username || "")}`}>{post.creator?.name || "Author"}</Link><p className="text-xs text-atseen-muted">{post.location}</p></div></header>
    <p className="my-4 whitespace-pre-wrap text-sm leading-7">{post.text}</p>
    <ContentEntityList entities={post.attachedEntities || []} />
    {post.media?.map((item) => <img alt="Wall note attachment" className="my-3 max-w-full rounded-xl" key={item.assetId || item.url} src={item.url} />)}
    <section className="mt-5 border-t border-atseen-line pt-4"><h2 className="text-sm font-bold">Replies</h2>{comments.isLoading ? <p className="mt-3 text-sm text-atseen-muted">Loading replies...</p> : comments.isError ? <button className="mt-3 text-sm text-atseen-blue" onClick={() => comments.refetch()} type="button">Retry loading replies</button> : !comments.data?.length ? <p className="mt-3 text-sm text-atseen-muted">No replies yet.</p> : comments.data.map((comment) => <div className="mt-3" key={comment.id}><strong className="text-xs">{comment.author?.name || "Member"}</strong><p className="whitespace-pre-wrap text-sm text-atseen-muted">{comment.text}</p></div>)}</section>
  </FanCard>;
}
