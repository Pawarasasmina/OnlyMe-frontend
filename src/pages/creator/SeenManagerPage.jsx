import { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiPlus } from "react-icons/fi";
import { Link, useSearchParams } from "react-router-dom";
import SeenCard from "../../components/publication/SeenCard";
import { publicationService } from "../../services/publicationService";
import { publicationError } from "../../utils/publicationValidation";

const statuses = ["", "DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", "PUBLISHED", "REJECTED", "ARCHIVED"];

function formatStatus(value = "") {
  return String(value || "DRAFT").replaceAll("_", " ");
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : "Recently";
}

function normalizeSeen(item = {}) {
  const coverMedia = item.coverMedia && typeof item.coverMedia === "object" ? item.coverMedia : null;

  return {
    id: String(item.id || item._id || ""),
    title: item.title || "Untitled Seen",
    status: item.status || "DRAFT",
    updatedAt: item.updatedAt || item.createdAt || item.submittedAt || item.publishedAt || "",
    chapterCount: Number(item.chapterCount || item.chapters?.length || 0),
    coverMedia,
  };
}

export default function SeenManagerPage() {
  const [searchParams] = useSearchParams();
  const requestedStatus = searchParams.get("status")?.toUpperCase() === "DRAFTS" ? "DRAFT" : "";
  const [status, setStatus] = useState(requestedStatus);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    publicationService
      .listMyPublications({ kind: "SEEN", ...(status ? { status } : {}) })
      .then((response) => {
        if (!active) return;
        const rows = response.data?.data?.items;
        setItems(Array.isArray(rows) ? rows.map(normalizeSeen).filter((item) => item.id) : []);
      })
      .catch((requestError) => {
        if (active) setError(publicationError(requestError, "Unable to load Seens"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [status]);

  const heading = useMemo(() => (requestedStatus ? "Drafts" : "Seens"), [requestedStatus]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-5 text-white md:px-6">
      <Link className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-atseen-muted transition hover:text-atseen-blue" to="/profile">
        <FiArrowLeft /> Back to Profile
      </Link>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-atseen-blue">Creator Studio</p>
          <h1 className="mt-2 text-3xl font-black">{heading}</h1>
        </div>
        <Link className="inline-flex items-center gap-2 rounded-full bg-atseen-blue px-4 py-2 text-sm font-black text-atseen-bg" to="/create/seen">
          <FiPlus /> Create Seen
        </Link>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        {statuses.map((value) => (
          <button
            className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold ${status === value ? "bg-atseen-blue text-atseen-bg" : "border border-atseen-line text-atseen-muted hover:text-white"}`}
            key={value || "ALL"}
            onClick={() => setStatus(value)}
            type="button"
          >
            {value ? formatStatus(value) : "ALL"}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}
      {loading ? <p className="mt-8 text-atseen-muted">Loading Seens...</p> : null}

      {!loading && !error && items.length ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.id}>
              <SeenCard item={item} to={`/studio/seens/${item.id}`} />
              <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                <strong className="truncate text-white">{formatStatus(item.status)}</strong>
                <span className="shrink-0 text-atseen-muted">{formatDate(item.updatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !error && !items.length ? (
        <div className="mt-6 rounded-2xl border border-dashed border-atseen-line p-10 text-center text-atseen-muted">
          No structured Seens in this view.
        </div>
      ) : null}
    </main>
  );
}
