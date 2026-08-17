import { useEffect, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { Link, useSearchParams } from "react-router-dom";
import SeenCard from "../../components/publication/SeenCard";
import { publicationService } from "../../services/publicationService";
import { publicationError } from "../../utils/publicationValidation";

const statuses = ["", "DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", "PUBLISHED", "REJECTED", "ARCHIVED"];

export default function SeenManagerPage() {
  const [searchParams] = useSearchParams();
  const requestedStatus = searchParams.get("status")?.toUpperCase() === "DRAFTS" ? "DRAFT" : "";
  const [status, setStatus] = useState(requestedStatus);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    publicationService.listMyPublications({ kind: "SEEN", status: status || undefined })
      .then((response) => setItems(response.data.data.items || []))
      .catch((requestError) => setError(publicationError(requestError)))
      .finally(() => setLoading(false));
  }, [status]);

  return <div>
    <Link className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-atseen-muted transition hover:text-atseen-blue" to="/profile"><FiArrowLeft /> Back to Profile</Link>
    <div className="flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-atseen-blue">Creator Studio</p><h1 className="mt-2 text-3xl font-black">{requestedStatus ? "Drafts" : "Seens"}</h1></div><Link className="rounded-full bg-atseen-blue px-4 py-2 text-sm font-black text-atseen-bg" to="/create/seen">Create Seen</Link></div>
    <div className="mt-5 flex gap-2 overflow-x-auto pb-2">{statuses.map((value) => <button className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold ${status === value ? "bg-atseen-blue text-atseen-bg" : "border border-atseen-line"}`} key={value || "ALL"} onClick={() => setStatus(value)} type="button">{value ? value.replaceAll("_", " ") : "ALL"}</button>)}</div>
    {error ? <p className="mt-4 text-red-300">{error}</p> : null}
    {loading ? <p className="mt-8 text-atseen-muted">Loading Seens…</p> : items.length ? <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">{items.map((item) => <div key={item.id}><SeenCard item={item} to={`/studio/seens/${item.id}`} /><div className="mt-2 flex items-center justify-between text-xs"><strong>{item.status.replaceAll("_", " ")}</strong><span className="text-atseen-muted">{new Date(item.updatedAt).toLocaleDateString()}</span></div></div>)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-atseen-line p-10 text-center">No structured Seens in this view.</div>}
  </div>;
}
