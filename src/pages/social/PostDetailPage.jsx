/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import LegacyWallNoteDetail from "../../components/fanWeb/home/LegacyWallNoteDetail";
import { wallService } from "../../services/wallService";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft } from "react-icons/fi";
import FeedPost from "../../components/fanWeb/home/FeedPost";
import FanCard from "../../components/fanWeb/shared/FanCard";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { postService } from "../../services/postService";
import { useState } from "react";
import { FiMoreHorizontal } from "react-icons/fi";

function PostDetailPage({ legacy = false }) {
  __useUiLanguage();
  const { id } = useParams();
  const location = useLocation();
  const returnTo = /^\/wall(?:\?|$)/.test(location.state?.wallReturnTo || "") ? location.state.wallReturnTo : "/wall";
  const [params] = useSearchParams();
  const [menuRequest, setMenuRequest] = useState({ id: "", count: 0 });
  const postQuery = useQuery({
    queryKey: [legacy ? "legacy-wall-post" : "feed-posts", "detail", id],
    queryFn: async () => {
      if (legacy) return { ...await wallService.get(id), legacy: true };
      try { return await postService.getPost(id); }
      catch (error) {
        if (error?.response?.status !== 404) throw error;
        return { ...await wallService.get(id), legacy: true };
      }
    },
    enabled: Boolean(id),
    retry: false,
  });

  if (postQuery.isLoading) {
    return <div><Link className="mb-4 inline-flex items-center gap-2 text-sm text-atseen-muted hover:text-white" to={returnTo}><FiArrowLeft data-ui-directional="true" /> {__msg("social.backToWall")}</Link><LoadingSkeleton className="h-48" count={1} /></div>;
  }

  if (postQuery.isError || !postQuery.data?.id) {
    return <div><Link className="mb-4 inline-flex items-center gap-2 text-sm text-atseen-muted hover:text-white" to={returnTo}><FiArrowLeft data-ui-directional="true" /> {__msg("social.backToWall")}</Link><FanCard className="text-center"><h1 className="text-lg font-bold">{__msg("social.postNotFound")}</h1><p className="mt-2 text-sm text-atseen-muted">{__msg("social.thisPostMayHaveBeenRemovedOrIsUnavailable")}</p></FanCard></div>;
  }

  return <div className="wall-note-detail">{postQuery.data.businessOffer && <Link className="mb-3 inline-flex rounded-xl bg-[#9CCBFF] px-4 py-3 text-sm font-bold text-slate-950" to={`/settings/business?offer=${encodeURIComponent(id)}`}>Request booking</Link>}<header className="wall-note-detail-header"><Link aria-label={__msg("social.backToWall")} to={returnTo}><FiArrowLeft data-ui-directional="true" /></Link><h1>{__msg("social.note_2c924e")}</h1>{!postQuery.data.legacy ? <button aria-label={__msg("fanWeb.moreActionsForSPost", { value0: postQuery.data.author?.name || __msg("fanWeb.author") })} onClick={() => setMenuRequest(value => ({ id, count: value.id === id ? value.count + 1 : 1 }))} type="button"><FiMoreHorizontal aria-hidden="true" /></button> : null}</header>{postQuery.data.legacy ? <LegacyWallNoteDetail post={postQuery.data} /> : <FeedPost key={id} fullText post={postQuery.data} menuRequest={menuRequest.id === id ? menuRequest.count : 0} focusReply={params.get("reply") === "1"} focusedCommentId={params.get("comment")} />}</div>;
}

export default PostDetailPage;
