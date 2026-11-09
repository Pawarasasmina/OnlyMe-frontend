import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FiArrowRight, FiBarChart2, FiCheckCircle, FiCreditCard, FiFileText, FiShield, FiUserCheck, FiUsers } from "react-icons/fi";
import Loader from "../../components/common/Loader";
import { adminService } from "../../services/adminService";
import { adminOperationsService } from "../../services/adminOperationsService";

function AdminDashboard() {
  __useUiLanguage();
  const query = useQuery({ queryKey: ["admin", "dashboard"], queryFn: () => adminService.getDashboard().then((response) => response.data.data.stats) });
  const operationsQuery = useQuery({ queryKey: ["admin", "operations-dashboard"], queryFn: () => adminOperationsService.dashboard().then((response) => response.data.data) });
  if (query.isLoading || operationsQuery.isLoading) return <div className="text-slate-600"><Loader label={__msg("admin.loadingAdminDashboard")} /></div>;
  if (query.isError) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{__msg("admin.unableToLoadDashboard")} <button className="font-bold underline" onClick={() => query.refetch()} type="button">{__msg("activity.retry")}</button></div>;

  const stats = query.data;
  const operations = operationsQuery.data || { reports: {}, appeals: {} };
  const types = stats.accountTypes || {};
  const cards = [
    { label: __msg("admin.totalUsers"), value: stats.totalUsers, detail: __msg("fanWeb.active", { value0: stats.activeUsers }), icon: FiUsers, color: "bg-blue-50 text-blue-600" },
    { label: __msg("admin.creators"), value: stats.creators, detail: __msg("admin.value0AwaitingApproval", { value0: stats.pendingCreators }), icon: FiUserCheck, color: "bg-orange-50 text-orange-600" },
    { label: __msg("admin.published"), value: stats.publishedContent, detail: __msg("admin.value0Drafts", { value0: stats.draftContent }), icon: FiFileText, color: "bg-violet-50 text-violet-600" },
    { label: __msg("admin.subscriptions"), value: stats.activeSubscriptions, detail: __msg("admin.activePlatformSubscriptions"), icon: FiShield, color: "bg-emerald-50 text-emerald-600" },
    { label: __msg("system.AdminDashboard.3b1bb4d541"), value: operations.reports.open || 0, detail: __msg("admin.value0UrgentValue1Overdue", { value0: operations.reports.urgent || 0, value1: operations.reports.overdue || 0 }), icon: FiShield, color: "bg-red-50 text-red-600" },
    { label: __msg("system.AdminDashboard.57c083c4f1"), value: `${operations.reports.medianActionMinutes || 0}m`, detail: __msg("admin.value0HandledWithin24h", { value0: operations.reports.within24Percent ?? 100 }), icon: FiCheckCircle, color: "bg-amber-50 text-amber-600" },
    { label: __msg("system.AdminDashboard.76e9f63035"), value: operations.appeals.open || 0, detail: __msg("admin.value0ReversedDecisions", { value0: operations.appeals.reversed || 0 }), icon: FiFileText, color: "bg-violet-50 text-violet-600" },
  ];

  return <div className="mx-auto max-w-[1600px]">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">{__msg("stories.overview")}</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{__msg("admin.platformDashboard")}</h1><p className="mt-1 text-sm text-slate-500">{__msg("admin.operationalSummaryAndPriorityReviewQueues")}</p></div><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"><FiCheckCircle className="text-emerald-600" /> {__msg("admin.liveData")}</div></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={card.label}><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{card.label}</p><p className="mt-2 text-3xl font-black tracking-tight">{card.value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${card.color}`}><card.icon /></span></div><p className="mt-4 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">{card.detail}</p></article>)}</div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-orange-400">{__msg("admin.internalAccountClassification")}</p><h2 className="mt-2 text-2xl font-black">{__msg("admin.knowExactlyWhoIsCreatingActivity")}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">{__msg("admin.realAndSeedContributeToNormalPlatformTotalsTest")}</p></div><Link className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-orange-50" to="/admin/users">{__msg("admin.manageUsers")} <FiArrowRight data-ui-directional="true" /></Link></div><div className="mt-6 grid gap-3 sm:grid-cols-3">{[[__msg("system.copy.3b330731a188"), types.REAL || 0, __msg("system.copy.c273a229f3f1"), "border-blue-400/20 bg-blue-400/10 text-blue-300"], [__msg("admin.seed_92149c"), types.SEED || 0, __msg("system.copy.78ac2c2c6d5b"), "border-amber-400/20 bg-amber-400/10 text-amber-300"], [__msg("admin.test_984816"), types.TEST || 0, __msg("system.copy.2991409d625a"), "border-violet-400/20 bg-violet-400/10 text-violet-300"]].map(([label, value, detail, color]) => <div className={`rounded-2xl border p-4 ${color}`} key={label}><p className="text-xs font-black tracking-[.18em]">{label}</p><p className="mt-2 text-3xl font-black text-white">{value.toLocaleString(__uiLocale())}</p><p className="mt-1 text-xs opacity-80">{detail}</p></div>)}</div></section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-black uppercase tracking-[.16em] text-slate-400">{__msg("admin.accountRoles")}</p><div className="mt-5 space-y-4">{[[__msg("admin.fans"), stats.fans], [__msg("admin.creators"), stats.creators], [__msg("states.admins"), stats.admins]].map(([label, value]) => <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0" key={label}><span className="text-sm font-semibold text-slate-600">{label}</span><strong className="text-xl text-slate-950">{value.toLocaleString(__uiLocale())}</strong></div>)}</div></section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-red-500">{__msg("system.AdminDashboard.15bcf86d81")}</p><h2 className="mt-1 text-xl font-black">{__msg("system.AdminDashboard.24bbdced4b")}</h2></div><Link className="text-sm font-black text-orange-600" to="/admin/safety">{__msg("system.AdminDashboard.97a3dbf38f")} <FiArrowRight className="inline" /></Link></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{(operations.topReportedUsers || []).map((entry) => <Link className="rounded-2xl border border-slate-200 p-4 transition hover:border-orange-300 hover:shadow-sm" key={entry.userId} to={`/admin/users/${entry.userId}`}><p className="truncate text-sm font-black">{entry.user?.name || __msg("admin.unknownUser")}</p><p className="truncate text-xs text-slate-500">@{entry.user?.username || entry.userId}</p><p className="mt-3 text-2xl font-black text-red-600">{entry.count}</p><p className="text-[11px] font-bold uppercase text-slate-400">{__msg("system.AdminDashboard.0ebe4a7d10")}</p></Link>)}{!(operations.topReportedUsers || []).length && <p className="text-sm text-slate-500">{__msg("system.AdminDashboard.ec44e4242e")}</p>}</div></section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2"><div><h2 className="font-black">{__msg("admin.quickAccess")}</h2><p className="mt-1 text-sm text-slate-500">{__msg("admin.theMainOperationalAreasInOnePlace")}</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        [__msg("system.AdminUserDetailPage.ce832d9b31"), __msg("admin.value0Accounts", { value0: stats.totalUsers }), "/admin/users", FiUsers, "bg-blue-50 text-blue-600"],
        [__msg("system.copy.928eb4e151fd"), __msg("admin.value0Waiting", { value0: stats.pendingCreators }), "/admin/creator-verifications", FiUserCheck, "bg-orange-50 text-orange-600"],
        [__msg("system.copy.8e675e2ceb2e"), __msg("system.copy.34a45beddb81"), "/admin/analytics", FiBarChart2, "bg-violet-50 text-violet-600"],
        [__msg("system.copy.add145392099"), __msg("system.copy.0166697e64a9"), "/admin/financial", FiCreditCard, "bg-emerald-50 text-emerald-600"],
      ].map(([label, detail, to, Icon, color]) => <Link className="group flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md" key={label} to={to}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${color}`}><Icon /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{label}</strong><small className="text-slate-500">{detail}</small></span><FiArrowRight data-ui-directional="true" className="text-slate-300 group-hover:text-slate-700" /></Link>)}</div></section>
    </div>
  </div>;
}

export default AdminDashboard;

