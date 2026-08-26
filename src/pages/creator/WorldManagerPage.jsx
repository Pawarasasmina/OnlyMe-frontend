import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import WorldCard from "../../components/publication/WorldCard";
import { publicationService as api } from "../../services/publicationService";

export default function WorldManagerPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState("");

  useEffect(() => {
    api.listMyPublications({ kind: "WORLD,PREMIUM_WORLD", status: status || undefined, limit: 50 })
      .then((response) => setItems(response.data.data.items || []))
      .catch((requestError) => setError(requestError.response?.data?.message || "Unable to load Planets"));
  }, [status]);

  const remove = async (planet) => {
    if (!confirm(`Remove “${planet.title}”? It will no longer be visible to fans.`)) return;
    setRemoving(planet.id);
    setError("");
    try {
      await api.deletePlanet(planet.id, planet.statusVersion);
      setItems((current) => current.filter((item) => item.id !== planet.id));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to remove Planet");
    } finally {
      setRemoving("");
    }
  };

  const visible = useMemo(() => items.filter((item) => (status === "ARCHIVED" || item.status !== "ARCHIVED") && item.title.toLowerCase().includes(search.toLowerCase())), [items, search, status]);
  const active = items.filter((item) => ["DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", "PUBLISHED"].includes(item.status));

  return <div><div className="flex justify-between gap-4"><div><h1 className="text-3xl font-black">My Planets</h1><p className="text-atseen-muted">{active.length} active · World and Premium World</p></div><div className="flex flex-wrap gap-3"><Link to="/create/world">Create World</Link><Link to="/create/premium-world">Create Premium World</Link></div></div><div className="mt-5 grid gap-2 sm:grid-cols-2"><input className="border p-3" onChange={(event) => setSearch(event.target.value)} placeholder="Search" value={search} /><select onChange={(event) => setStatus(event.target.value)} value={status}><option value="">Active statuses</option>{["DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", "PUBLISHED", "REJECTED", "ARCHIVED"].map((value) => <option key={value}>{value}</option>)}</select></div>{error ? <p>{error}</p> : null}<div className="mt-6 grid gap-4 sm:grid-cols-2">{visible.map((planet) => <div key={planet.id}><WorldCard item={planet} to={`/studio/worlds/${planet.id}`} /><div className="mt-2 flex items-center justify-between gap-3"><p className="text-xs">{planet.status.replaceAll("_", " ")} · {planet.chapterCount} chapters · {planet.previewCount} preview</p>{planet.status !== "ARCHIVED" ? <button className="text-xs font-bold text-red-400 disabled:opacity-50" disabled={removing === planet.id} onClick={() => remove(planet)} type="button">{removing === planet.id ? "Removing…" : "Remove Planet"}</button> : null}</div></div>)}</div></div>;
}
