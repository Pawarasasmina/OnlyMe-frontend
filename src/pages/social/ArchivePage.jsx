import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiBookOpen } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { postService } from "../../services/postService";
import { publicationService } from "../../services/publicationService";
import { useFanToast } from "../../components/fanWeb/shared/FanToastContext";
import { relativeTime } from "../../utils/relativeTime";
import { resolveMediaUrl } from "../../utils/media";
import "./ArchivePage.css";

async function allPages(load) {
  const items = [];
  let page = 1, pages = 1;
  do { const data = await load(page); items.push(...(data.items || [])); pages = data.pagination?.pages || 1; page += 1; } while (page <= pages);
  return items;
}
export default function ArchivePage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { showToast } = useFanToast();
  const query = useQuery({ queryKey: ["profile-archive"], queryFn: async () => {
    const [publications, posts] = await Promise.all([
      allPages(page => publicationService.listMyPublications({ status: "ARCHIVED", limit: 100, page }).then(response => response.data.data)),
      allPages(page => postService.getMyPosts({ status: "archived", limit: 100, page })),
    ]);
    return { posts, publications };
  }, retry: false });
  const restore = useMutation({
    mutationFn: ({ item, type }) => type === "posts" ? postService.restorePost(item.id) : publicationService.restorePublication(item.id, item.statusVersion),
    onSuccess: (_data, { item, type }) => {
      client.setQueryData(["profile-archive"], current => ({ ...current, [type]: current[type].filter(row => row.id !== item.id) }));
      showToast("Restored ✓", { variant: "archive", duration: 1600 });
      for (const key of ["profile-archive", "unified-profile", "feed-posts", "seen-feed", "my-publications", "series", "saved"]) client.invalidateQueries({ queryKey: [key] });
    },
    onError: error => { showToast(error?.response?.data?.message || "Could not restore. Please try again.", { variant: "archive" }); query.refetch(); },
  });
  const publications = query.data?.publications || [], posts = query.data?.posts || [];
  const button = (item, type) => <button disabled={restore.isPending} onClick={() => restore.mutate({ item, type })} type="button">{restore.isPending && restore.variables?.item.id === item.id ? "Restoring…" : "Restore ›"}</button>;
  return <main className="profile-archive-page">
    <header><button aria-label="Back to profile" onClick={() => navigate("/profile")} type="button">{String.fromCharCode(8249)}</button><h1>Archive</h1></header>
    <p className="profile-archive-lead">What you took off your profile lives here — nothing is deleted.</p>
    {query.isLoading ? <p className="profile-archive-state" role="status">Loading archive...</p> : null}
    {query.isError ? <div className="profile-archive-state is-error" role="alert">Archive could not be loaded. <button onClick={() => query.refetch()} type="button">Try again</button></div> : null}
    {!query.isLoading && !query.isError && !publications.length && !posts.length ? <section className="profile-archive-empty"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M1 12s4-6 11-6 11 6 11 6-4 6-11 6S1 12 1 12Zm11 4a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" fill="currentColor" fillRule="evenodd" /></svg><p>Empty — archive a Seen or a note from its ⋯ menu.</p></section> : null}
    <div className="profile-archive-list">{publications.map(item => <article className="profile-archive-row" key={item.id}><span className="profile-archive-thumb">{item.coverMedia?.secureUrl ? <img alt="" src={resolveMediaUrl(item.coverMedia.secureUrl)} /> : <FiBookOpen />}</span><div className="profile-archive-copy"><b>{item.title || "Untitled"}</b><small>{item.kind === "EXPERIENCE" ? "Experience" : "Seen"} · {item.chapterCount || 0} chapters · {relativeTime(item.createdAt)}</small></div>{button(item, "publications")}</article>)}
    {posts.map(item => <article className="profile-archive-row is-note" key={item.id}><div className="profile-archive-copy"><p>{item.text || "Wall note"}</p><small>Wall note · {relativeTime(item.createdAt)}</small></div>{button(item, "posts")}</article>)}</div>
  </main>;
}
