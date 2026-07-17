import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft, FiCalendar } from "react-icons/fi";
import ProfileCompletionCard from "../../components/profile/ProfileCompletionCard";
import ProfileContentGrid from "../../components/profile/ProfileContentGrid";
import ProfileHeader from "../../components/profile/ProfileHeader";
import ProfileOrbit from "../../components/profile/ProfileOrbit";
import ProfileOwnerActions from "../../components/profile/ProfileOwnerActions";
import ProfileVerificationSummary from "../../components/profile/ProfileVerificationSummary";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import FanCard from "../../components/fanWeb/shared/FanCard";
import { profileService } from "../../services/profileService";

function UnifiedProfilePage({ embedded = false, owner = false }) {
  const { username } = useParams();
  const [tab, setTab] = useState("seens");
  const profileQuery = useQuery({
    queryKey: ["unified-profile", owner ? "me" : username],
    queryFn: () => (owner ? profileService.getUnifiedMe() : profileService.getUnifiedProfile(username)).then((response) => response.data.data),
    enabled: owner || Boolean(username),
    retry: false,
  });

  const body = (() => {
    if (profileQuery.isLoading) return <LoadingSkeleton className="h-44" count={2} />;
    if (profileQuery.isError) {
      const status = profileQuery.error?.response?.status;
      return <FanCard className="border-atseen-danger/25 bg-atseen-danger/10 text-center"><h1 className="text-lg font-bold">{status === 404 ? "Profile not found" : status === 403 ? "Profile is unavailable" : "Unable to load profile"}</h1><p className="mt-2 text-sm text-atseen-muted">{status === 404 ? "This profile may be private, inactive, or unavailable." : "Please try again when the service is available."}</p><button className="mt-4 text-sm font-bold text-atseen-blue" onClick={() => profileQuery.refetch()} type="button">Retry</button></FanCard>;
    }

    const data = profileQuery.data;
    const { profile, publicContent, publicMetrics, viewerCapabilities } = data;
    return <>
      {!owner ? <Link className="mb-4 inline-flex items-center gap-2 text-sm text-atseen-muted hover:text-white" to="/"><FiArrowLeft /> Back</Link> : null}
      <ProfileHeader profile={profile} />
      <ProfileOwnerActions capabilities={viewerCapabilities} role={profile.role} username={profile.username} />
      <ProfileVerificationSummary capabilities={viewerCapabilities} profile={profile} />
      {viewerCapabilities.isOwner && data.profileCompletion ? <div className="mt-4"><ProfileCompletionCard completion={data.profileCompletion} /></div> : null}
      <ProfileOrbit capabilities={viewerCapabilities} planets={data.planets} profile={profile} role={profile.role} />

      <div className="mt-6 flex border-b border-atseen-line">
        {["seens", "shared", "content", "about"].map((value) => <button className={`flex-1 border-b-2 px-3 py-3 text-xs font-bold uppercase tracking-wide ${tab === value ? "border-atseen-blue text-atseen-blue" : "border-transparent text-atseen-muted"}`} key={value} onClick={() => setTab(value)} type="button">{value}</button>)}
      </div>
      {tab === "seens" ? <div className="mt-4"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">Published Seens</h2>{viewerCapabilities.isOwner && profile.role === "creator" ? <Link className="text-xs font-bold text-atseen-blue" to="/studio/seens">Manage Seens</Link> : null}</div><ProfileContentGrid content={data.seens || []} kind="seens" /></div> : null}
      {tab === "shared" ? <div className="mt-4"><h2 className="mb-3 text-sm font-bold">Shared Seens</h2><ProfileContentGrid content={data.sharedSeens || []} kind="seens" /><h2 className="mb-3 mt-6 text-sm font-bold">Shared Wall posts</h2><div className="space-y-3">{data.sharedWallPosts?.map((post) => <FanCard key={post.id}><div className="flex items-center justify-between"><Link className="text-xs font-bold text-atseen-blue" to={`/profile/${post.creator.username}`}>@{post.creator.username}</Link><time className="text-[10px] text-atseen-muted">{new Date(post.createdAt).toLocaleDateString()}</time></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{post.text}</p>{post.media?.[0]?.url ? <img alt="Shared Wall post" className="mt-3 max-h-80 w-full rounded-xl object-cover" src={post.media[0].url} /> : null}</FanCard>)}{!data.sharedWallPosts?.length ? <p className="text-sm text-atseen-muted">No shared Wall posts yet.</p> : null}</div></div> : null}
      {tab === "content" ? <div className="mt-4"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">Published content</h2>{Number.isFinite(publicMetrics?.publishedContentCount) ? <span className="text-xs text-atseen-muted">{publicMetrics.publishedContentCount}</span> : null}</div><ProfileContentGrid content={publicContent} /></div> : null}
      {tab === "about" ? <FanCard className="mt-4"><h2 className="text-sm font-bold">About</h2>{profile.bio ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/80">{profile.bio}</p> : <p className="mt-3 text-sm text-atseen-muted">No public bio provided.</p>}{profile.joinedAt ? <p className="mt-4 flex items-center gap-2 text-xs text-atseen-muted"><FiCalendar /> Joined {new Date(profile.joinedAt).toLocaleDateString()}</p> : null}</FanCard> : null}
    </>;
  })();

  if (owner || embedded) return body;
  return <div className="min-h-screen bg-atseen-bg px-4 py-6 text-atseen-text sm:px-6"><main className="mx-auto max-w-[660px]">{body}</main></div>;
}

export default UnifiedProfilePage;
