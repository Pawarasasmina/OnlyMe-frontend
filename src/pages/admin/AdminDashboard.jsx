import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FiArrowRight, FiBarChart2, FiCheckCircle, FiCreditCard, FiFileText, FiShield, FiUserCheck, FiUsers } from "react-icons/fi";
import Loader from "../../components/common/Loader";
import { adminService } from "../../services/adminService";

function AdminDashboard() {
  const query = useQuery({ queryKey: ["admin", "dashboard"], queryFn: () => adminService.getDashboard().then((response) => response.data.data.stats) });
  if (query.isLoading) return <div className="text-slate-600"><Loader label="Loading admin dashboard..." /></div>;
  if (query.isError) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Unable to load dashboard. <button className="font-bold underline" onClick={() => query.refetch()} type="button">Retry</button></div>;

  const stats = query.data;
  const types = stats.accountTypes || {};
  const cards = [
    { label: "Total users", value: stats.totalUsers, detail: `${stats.activeUsers} active`, icon: FiUsers, color: "bg-blue-50 text-blue-600" },
    { label: "Creators", value: stats.creators, detail: `${stats.pendingCreators} awaiting approval`, icon: FiUserCheck, color: "bg-orange-50 text-orange-600" },
    { label: "Published", value: stats.publishedContent, detail: `${stats.draftContent} drafts`, icon: FiFileText, color: "bg-violet-50 text-violet-600" },
    { label: "Subscriptions", value: stats.activeSubscriptions, detail: "Active platform subscriptions", icon: FiShield, color: "bg-emerald-50 text-emerald-600" },
  ];

  return <div className="mx-auto max-w-[1600px]">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">Overview</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Platform dashboard</h1><p className="mt-1 text-sm text-slate-500">Operational summary and priority review queues.</p></div><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"><FiCheckCircle className="text-emerald-600" /> Live data</div></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={card.label}><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{card.label}</p><p className="mt-2 text-3xl font-black tracking-tight">{card.value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${card.color}`}><card.icon /></span></div><p className="mt-4 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">{card.detail}</p></article>)}</div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-orange-400">Internal account classification</p><h2 className="mt-2 text-2xl font-black">Know exactly who is creating activity</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">REAL and SEED contribute to normal platform totals. TEST remains isolated for QA and financial testing.</p></div><Link className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-orange-50" to="/admin/users">Manage users <FiArrowRight /></Link></div><div className="mt-6 grid gap-3 sm:grid-cols-3">{[["REAL", types.REAL || 0, "Organic accounts", "border-blue-400/20 bg-blue-400/10 text-blue-300"], ["SEED", types.SEED || 0, "Controlled launch accounts", "border-amber-400/20 bg-amber-400/10 text-amber-300"], ["TEST", types.TEST || 0, "QA and automation", "border-violet-400/20 bg-violet-400/10 text-violet-300"]].map(([label, value, detail, color]) => <div className={`rounded-2xl border p-4 ${color}`} key={label}><p className="text-xs font-black tracking-[.18em]">{label}</p><p className="mt-2 text-3xl font-black text-white">{value.toLocaleString()}</p><p className="mt-1 text-xs opacity-80">{detail}</p></div>)}</div></section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-black uppercase tracking-[.16em] text-slate-400">Account roles</p><div className="mt-5 space-y-4">{[["Fans", stats.fans], ["Creators", stats.creators], ["Admins", stats.admins]].map(([label, value]) => <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0" key={label}><span className="text-sm font-semibold text-slate-600">{label}</span><strong className="text-xl text-slate-950">{value.toLocaleString()}</strong></div>)}</div></section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2"><div><h2 className="font-black">Quick access</h2><p className="mt-1 text-sm text-slate-500">The main operational areas in one place.</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        ["All users", `${stats.totalUsers} accounts`, "/admin/users", FiUsers, "bg-blue-50 text-blue-600"],
        ["Creator reviews", `${stats.pendingCreators} waiting`, "/admin/creator-verifications", FiUserCheck, "bg-orange-50 text-orange-600"],
        ["Internal analytics", "REAL · SEED · TEST", "/admin/analytics", FiBarChart2, "bg-violet-50 text-violet-600"],
        ["Financial control", "Wallets and revenue", "/admin/financial", FiCreditCard, "bg-emerald-50 text-emerald-600"],
      ].map(([label, detail, to, Icon, color]) => <Link className="group flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md" key={label} to={to}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${color}`}><Icon /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{label}</strong><small className="text-slate-500">{detail}</small></span><FiArrowRight className="text-slate-300 group-hover:text-slate-700" /></Link>)}</div></section>
    </div>
  </div>;
}

export default AdminDashboard;

