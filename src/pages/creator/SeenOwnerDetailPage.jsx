import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
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

export default function SeenOwnerDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const fromDrafts = searchParams.get("from") === "drafts";
  const managerTarget = fromDrafts ? "/studio/seens?status=drafts" : "/studio/seens";
  const editTarget = `/studio/seens/${id}/edit${fromDrafts ? "?from=drafts" : ""}`;
  const [p, setP] = useState();
  const [error, setError] = useState("");

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
