import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PublicationComposerShell from "../../components/publication/PublicationComposerShell";
import { publicationService as api } from "../../services/publicationService";
import { publicationError } from "../../utils/publicationValidation";
import { WORLD_CONFIG } from "../../utils/worldValidation";

export default function WorldComposerPage({ premium = false }) {
  const { id } = useParams();
  const [state, setState] = useState(() => ({ kind: premium ? "PREMIUM_WORLD" : id ? null : "WORLD", loading: Boolean(id), error: "" }));
  const load = useCallback(async () => {
    if (!id) return;
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const response = await api.getMyPublication(id);
      const kind = response?.data?.data?.publication?.kind;
      if (!WORLD_CONFIG[kind]) throw new Error("This publication is not a World or Premium World.");
      setState({ kind, loading: false, error: "" });
    } catch (error) {
      setState({ kind: null, loading: false, error: error.message?.includes("not a World") ? error.message : publicationError(error) });
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (state.loading) return <div className="grid min-h-[55vh] place-items-center"><div className="text-center"><span className="mx-auto block h-10 w-10 animate-spin rounded-full border-2 border-atseen-line border-t-atseen-blue" /><h1 className="mt-5 text-xl font-black">Opening your planet</h1><p className="mt-2 text-sm text-atseen-muted">Loading its chapters and latest saved version…</p></div></div>;
  if (state.error) return <div className="mx-auto max-w-lg rounded-3xl border border-red-300/20 bg-atseen-surface p-7 text-center"><span className="text-4xl">🪐</span><h1 className="mt-4 text-2xl font-black">Planet editor unavailable</h1><p className="mt-3 text-sm leading-6 text-atseen-muted">{state.error}</p><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><button className="rounded-full bg-atseen-blue px-5 py-3 font-bold text-atseen-bg" onClick={load} type="button">Try again</button><Link className="rounded-full border border-atseen-line px-5 py-3 font-bold" to="/studio/worlds">Back to Worlds</Link></div></div>;
  if (!state.kind) return null;
  return <PublicationComposerShell key={`${id || "new"}-${state.kind}`} kind={state.kind} />;
}
