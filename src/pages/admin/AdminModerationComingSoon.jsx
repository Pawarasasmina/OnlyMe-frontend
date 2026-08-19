import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiClock, FiX } from "react-icons/fi";

export default function AdminModerationComingSoon() {
  const navigate = useNavigate();
  const location = useLocation();
  const publication = location.pathname.includes("publication-moderation");
  const title = publication ? "Publication moderation" : "Content moderation";
  const close = () => navigate("/admin/dashboard", { replace: true });

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape") navigate("/admin/dashboard", { replace: true }); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  return (
    <div aria-modal="true" className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }} role="dialog">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-xl text-orange-600"><FiClock /></span>
          <button aria-label="Close coming soon message" className="grid h-9 w-9 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-900" onClick={close} type="button"><FiX /></button>
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-orange-500">Coming soon</p>
        <h1 className="mt-2 text-2xl font-black">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">This moderation workspace is being prepared and is unavailable during the beta version.</p>
        <button className="mt-7 w-full rounded-xl bg-slate-900 py-3 text-sm font-black text-white transition hover:bg-slate-800" onClick={close} type="button">Back to dashboard</button>
      </section>
    </div>
  );
}
