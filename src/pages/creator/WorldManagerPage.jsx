import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import WorldCard from "../../components/publication/WorldCard";
import { publicationService as api } from "../../services/publicationService";

export default function WorldManagerPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState("");

  useEffect(() => {
    api.listMyPublications({ kind: "PREMIUM_WORLD", status: status || undefined, limit: 50 })
      .then((response) => setItems(response.data.data.items || []))
      .catch((requestError) => setError(requestError.response?.data?.message || "Unable to load Premium Planet"));
  }, [status]);

  const remove = async (planet) => {
    if (!confirm(`Delete “${planet.title}”? It will no longer be visible to fans.`)) return;
    setDeleting(planet.id);
    setError("");
    try {
      await api.deletePlanet(planet.id, planet.statusVersion);
      setItems((current) => current.filter((item) => item.id !== planet.id));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete planet");
    } finally {
      setDeleting("");
    }
  };

  const visible = useMemo(
    () => items.filter((item) => item.title.toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );
  const active = items.filter((item) => ["DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", "PUBLISHED"].includes(item.status));

  return <div><div className="flex justify-between"><div><h1 className="text-3xl font-black">Premium Planet</h1><p className="text-atseen-muted">Premium Planet {active.length}/1</p></div><Link to="/create/premium-world">Create Premium Planet</Link></div><div className="mt-5 grid gap-2 sm:grid-cols-2"><input className="border p-3" onChange={(event) => setSearch(event.target.value)} placeholder="Search" value={search} /><select onChange={(event) => setStatus(event.target.value)} value={status}><option value="">All statuses</option>{["DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", "PUBLISHED", "REJECTED", "ARCHIVED"].map((value) => <option key={value}>{value}</option>)}</select></div>{error ? <p>{error}</p> : null}<div className="mt-6 grid gap-4 sm:grid-cols-2">{visible.map((planet) => <div key={planet.id}><WorldCard item={planet} to={`/studio/worlds/${planet.id}`} /><div className="mt-2 flex items-center justify-between gap-3"><p className="text-xs">{planet.status.replaceAll("_", " ")} · {planet.chapterCount} chapters · {planet.previewCount} preview</p><button className="text-xs font-bold text-red-400 disabled:opacity-50" disabled={deleting === planet.id} onClick={() => remove(planet)} type="button">{deleting === planet.id ? "Deleting…" : "Delete planet"}</button></div></div>)}</div></div>;
}
