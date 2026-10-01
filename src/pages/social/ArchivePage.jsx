import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft, FiBookOpen, FiEye, FiFileText } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { postService } from "../../services/postService";
import { publicationService } from "../../services/publicationService";

function archivedDate(item) {
  const value = item.archivedAt || item.updatedAt;
  return value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Archived";
}

export default function ArchivePage() {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["profile-archive"],
    queryFn: async () => {
      const [publications, posts] = await Promise.all([
        publicationService.listMyPublications({ status: "ARCHIVED", limit: 100 }).then((response) => response.data.data.items || []),
        postService.getMyPosts({ status: "archived", limit: 100 }).then((data) => data.items || []),
      ]);
      return { posts, publications };
    },
    retry: false,
  });
  const publications = query.data?.publications || [];
  const posts = query.data?.posts || [];
  const empty = !query.isLoading && !query.isError && !publications.length && !posts.length;

  return <main className="profile-archive-page">
    <header><button aria-label="Back to profile" onClick={() => navigate(-1)} type="button"><FiArrowLeft /></button><h1>Archive</h1></header>
    <p className="profile-archive-lead">What you took off your profile lives here — nothing is deleted.</p>
    {query.isLoading ? <p className="profile-archive-state">Loading archive…</p> : null}
    {query.isError ? <p className="profile-archive-state is-error">Archive could not be loaded.</p> : null}
    {empty ? <section className="profile-archive-empty"><FiEye /><p>Empty — archive a Seen or a note from its ··· menu.</p></section> : null}
    {publications.length ? <section className="profile-archive-group"><h2>Seens &amp; Experiences <span>{publications.length}</span></h2>{publications.map((item) => <Link className="profile-archive-row" key={item.id} to={item.kind === "EXPERIENCE" ? `/studio/experiences/${item.id}/edit` : `/studio/seens/${item.id}`}><span className="profile-archive-thumb">{item.coverMedia?.secureUrl ? <img alt="" src={item.coverMedia.secureUrl} /> : <FiBookOpen />}</span><i><strong>{item.title || "Untitled"}</strong><small>{item.kind === "EXPERIENCE" ? "Experience" : "Seen"} · {archivedDate(item)}</small></i></Link>)}</section> : null}
    {posts.length ? <section className="profile-archive-group"><h2>Wall notes <span>{posts.length}</span></h2>{posts.map((item) => <article className="profile-archive-row" key={item.id}><span className="profile-archive-thumb">{item.media?.[0]?.url ? <img alt="" src={item.media[0].url} /> : <FiFileText />}</span><i><strong>{item.text || "Wall note"}</strong><small>Wall note · {archivedDate(item)}</small></i></article>)}</section> : null}
  </main>;
}
