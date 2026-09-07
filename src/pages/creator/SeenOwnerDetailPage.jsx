import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { FiCopy } from "react-icons/fi";
import { publicationService } from "../../services/publicationService";

function SeenCoverPreview({ media }) {
  if (!media?.secureUrl) {
    return (
      <div className="mt-6 grid aspect-video w-full place-items-center rounded-2xl border border-dashed border-atseen-line bg-atseen-surface text-sm font-bold text-atseen-muted">
        No cover uploaded
      </div>
    );
  }

  if (media.mediaType === "VIDEO" || media.resourceType === "video") {
    return (
      <video
        className="mt-6 aspect-video w-full rounded-2xl bg-black object-cover"
        controls
        playsInline
        preload="metadata"
        src={media.secureUrl}
      />
    );
  }

  return (
    <img
      alt="Seen cover"
      className="mt-6 aspect-video w-full rounded-2xl object-cover"
      src={media.secureUrl}
    />
  );
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

export default function SeenOwnerDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const fromDrafts = searchParams.get("from") === "drafts";
  const managerTarget = fromDrafts ? "/studio/seens?status=drafts" : "/studio/seens";
  const editTarget = `/studio/seens/${id}/edit${fromDrafts ? "?from=drafts" : ""}`;
  const [p, setP] = useState();
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = () =>
    publicationService
      .getMyPublication(id)
      .then((response) => {
        const publication = response.data?.data?.publication || {};
        setP({
          ...publication,
          chapters: Array.isArray(publication.chapters) ? publication.chapters : [],
          status: publication.status || "DRAFT",
        });
      })
      .catch((requestError) => setError(requestError.response?.data?.message || "Unable to load Seen"));

  useEffect(load, [id]);

  if (!p) return <p>{error || "Loading..."}</p>;

  return (
    <div>
      <Link reloadDocument to={managerTarget}>{"<-"} {fromDrafts ? "Back to Drafts" : "Manage Seens"}</Link>
      <div className="mt-5 flex justify-between">
        <div>
          <h1 className="text-3xl font-black">{p.title || "Untitled Seen"}</h1>
          <p className="text-sm text-atseen-blue">{p.status.replaceAll("_", " ")} · v{p.statusVersion}</p>
        </div>
        {["DRAFT", "CHANGES_REQUESTED", "PUBLISHED"].includes(p.status) ? (
          <Link className="rounded-full bg-atseen-blue px-4 py-2 font-bold text-atseen-bg" to={editTarget}>
            Edit
          </Link>
        ) : null}
      </div>

      {p.creatorVisibleFeedback ? <p className="mt-5 rounded-xl bg-orange-400/10 p-4">{p.creatorVisibleFeedback}</p> : null}
      {p.visibility === "LINK_ONLY" && p.shareUrl ? (
        <div className="mt-5 grid gap-2 rounded-2xl border border-atseen-blue/20 bg-atseen-blue/10 p-4 text-sm text-atseen-blue sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <span className="min-w-0 truncate">{p.shareUrl}</span>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-atseen-blue px-3 py-2 font-black text-atseen-bg" onClick={async () => { if (await copyText(p.shareUrl)) { setCopied(true); window.setTimeout(() => setCopied(false), 1600); } }} type="button"><FiCopy />{copied ? "Copied" : "Copy link"}</button>
        </div>
      ) : null}
      <SeenCoverPreview media={p.coverMedia} />
      <p className="mt-5 text-atseen-muted">{p.summary}</p>

      {p.chapters.map((chapter, index) => (
        <section className="mt-6 rounded-2xl border border-atseen-line bg-atseen-surface p-5" key={chapter.stableChapterId}>
          <h2 className="text-xl font-black">{index + 1}. {chapter.title}</h2>
          <p className="mt-3 text-sm text-atseen-muted">{Array.isArray(chapter.blocks) ? chapter.blocks.length : 0} ordered blocks</p>
        </section>
      ))}
    </div>
  );
}
