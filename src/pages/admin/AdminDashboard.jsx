import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FiArrowRight, FiCheckCircle, FiFileText, FiShield, FiUserCheck, FiUsers } from "react-icons/fi";
import Loader from "../../components/common/Loader";
import { adminService } from "../../services/adminService";

function AdminDashboard() {
  const query = useQuery({ queryKey: ["admin", "dashboard"], queryFn: () => adminService.getDashboard().then((response) => response.data.data.stats) });
  if (query.isLoading) return <div className="text-slate-600"><Loader label="Loading admin dashboard..." /></div>;
  if (query.isError) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Unable to load dashboard. <button className="font-bold underline" onClick={() => query.refetch()} type="button">Retry</button></div>;

  const stats = query.data;
  const cards = [
    { label: "Total users", value: stats.totalUsers, detail: `${stats.activeUsers} active`, icon: FiUsers, color: "bg-blue-50 text-blue-600" },
    { label: "Creators", value: stats.creators, detail: `${stats.pendingCreators} awaiting approval`, icon: FiUserCheck, color: "bg-orange-50 text-orange-600" },
    { label: "Published", value: stats.publishedContent, detail: `${stats.draftContent} drafts`, icon: FiFileText, color: "bg-violet-50 text-violet-600" },
    { label: "Subscriptions", value: stats.activeSubscriptions, detail: `${stats.admins} administrators`, icon: FiShield, color: "bg-emerald-50 text-emerald-600" },
  ];

  return <div className="mx-auto max-w-[1600px]">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">Overview</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Platform dashboard</h1><p className="mt-1 text-sm text-slate-500">Live operational summary and priority actions.</p></div><div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"><FiCheckCircle /> All systems operational</div></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={card.label}><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{card.label}</p><p className="mt-2 text-3xl font-black tracking-tight">{card.value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${card.color}`}><card.icon /></span></div><p className="mt-4 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">{card.detail}</p></article>)}</div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold">Quick management</h2><p className="mt-1 text-xs text-slate-500">Jump directly to common administration tasks.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Link className="group flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:border-orange-300 hover:bg-orange-50/50" to="/admin/users"><span><strong className="block text-sm">Review creator requests</strong><small className="text-slate-500">{stats.pendingCreators} currently waiting</small></span><FiArrowRight className="text-slate-400 group-hover:text-orange-500" /></Link><Link className="group flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:border-violet-300 hover:bg-violet-50/50" to="/admin/moderation"><span><strong className="block text-sm">Moderate content</strong><small className="text-slate-500">{stats.draftContent} unpublished items</small></span><FiArrowRight className="text-slate-400 group-hover:text-violet-500" /></Link></div></section>
      <section className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Account mix</p><div className="mt-5 space-y-4">{[["Fans", stats.fans], ["Creators", stats.creators], ["Admins", stats.admins]].map(([label, value]) => <div className="flex items-center justify-between" key={label}><span className="text-sm text-slate-300">{label}</span><strong>{value}</strong></div>)}</div></section>
    </div>
  </div>;
}

export default AdminDashboard;
