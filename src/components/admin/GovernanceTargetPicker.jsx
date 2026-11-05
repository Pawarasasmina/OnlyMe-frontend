import { useEffect, useState } from "react";
import { FiCheck, FiSearch, FiX } from "react-icons/fi";
import { adminOperationsService } from "../../services/adminOperationsService";

export default function GovernanceTargetPicker({ type, value, onChange, contentType = "ALL" }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelected(null); setQuery(""); setItems([]); onChange("");
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selected) return undefined;
    const timer = setTimeout(async () => {
      setLoading(true);
      try { const response = await adminOperationsService.governanceTargets({ type, search: query.trim(), contentType }); setItems(response.data.data.items || []); }
      catch { setItems([]); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [contentType, query, selected, type]);

  if (selected && value) return <div className="mt-2 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-white"><FiCheck /></span><span className="min-w-0 flex-1"><strong className="block truncate">{selected.title}</strong><small className="block truncate text-emerald-700">{selected.subtitle}</small></span><button aria-label="Change selection" className="rounded-lg p-2 text-emerald-800 hover:bg-emerald-100" onClick={() => { setSelected(null); onChange(""); }} type="button"><FiX /></button></div>;

  return <div className="mt-2"><div className="flex items-center gap-2 rounded-xl border bg-white px-3"><FiSearch className="text-slate-400" /><input className="w-full bg-transparent py-3 outline-none" onChange={(event) => setQuery(event.target.value)} placeholder={type === "USER" ? "Search name, @handle, email or phone" : type === "REPORT" ? "Search reason or report details" : "Search content title or caption"} value={query} /></div><div className="mt-2 max-h-64 overflow-y-auto rounded-xl border bg-white shadow-sm">{loading ? <p className="p-4 text-sm text-slate-400">Searching…</p> : items.map((item) => <button className="flex w-full items-center justify-between gap-3 border-b p-3 text-left last:border-0 hover:bg-orange-50" key={item.id} onClick={() => { setSelected(item); onChange(String(item.id)); }} type="button"><span className="min-w-0"><strong className="block truncate text-sm">{item.title}</strong><small className="block truncate text-slate-500">{item.subtitle}</small></span><span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">{item.badge}</span></button>)}{!loading && !items.length && <p className="p-4 text-sm text-slate-400">No matching {type.toLowerCase()} found.</p>}</div></div>;
}
