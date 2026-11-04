import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiEdit3 } from "react-icons/fi";
import { publicationService as api } from "../../services/publicationService";

export default function AiSettingsPage() {
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["ai-seen-status"], queryFn: () => api.getAiSeenStatus().then((response) => response.data.data) });
  const status = query.data;
  return <main className="settings-index-page"><header className="settings-index-header"><button aria-label="Back to settings" onClick={() => navigate("/settings")} type="button"><FiArrowLeft /></button><h1>AI</h1></header>
    <section className="settings-index-group"><h2>AI Seen creation</h2><div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><FiEdit3 className="text-2xl text-atseen-blue" /><h3 className="mt-3 text-lg font-black">AI helps shape your real story</h3><p className="mt-2 text-sm leading-6 text-white/60">It writes only from what you tell it. It never publishes, replies, or invents people, places, or events. Photo pixels and video frames are not sent for generation.</p>
      {query.isLoading ? <p className="mt-5 text-sm text-white/50">Loading your allowance...</p> : query.isError ? <p className="mt-5 text-sm text-atseen-danger">Could not load your AI allowance.</p> : <dl className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-black/20 p-3"><dt className="text-white/45">Available today</dt><dd className="mt-1 text-xl font-black">{status.remaining}</dd></div><div className="rounded-xl bg-black/20 p-3"><dt className="text-white/45">Daily allowance</dt><dd className="mt-1 text-xl font-black">{status.dailyLimit}</dd></div><div className="rounded-xl bg-black/20 p-3"><dt className="text-white/45">Tries per Seen</dt><dd className="mt-1 text-xl font-black">{status.maxTriesPerSeen}</dd></div><div className="rounded-xl bg-black/20 p-3"><dt className="text-white/45">Resets</dt><dd className="mt-1 text-xs font-bold">{new Intl.DateTimeFormat(undefined,{hour:"numeric",minute:"2-digit"}).format(new Date(status.resetAt))}</dd></div></dl>}
    </div></section>
    <section className="settings-index-group"><h2>How limits work</h2><div className="rounded-2xl border border-white/10 bg-white/[.025] p-5 text-sm leading-6 text-white/60"><p>Normal accounts receive one AI Seen each day. Sellers and accounts in their first week receive three.</p><p className="mt-3">Publishing an AI Seen can restore one creation that day, up to the daily maximum of three.</p></div></section>
  </main>;
}
