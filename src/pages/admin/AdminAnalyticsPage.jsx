import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { FiActivity, FiBarChart2, FiCalendar, FiDownload, FiEye, FiFileText, FiPieChart, FiRefreshCw, FiSearch, FiTrendingUp, FiUsers } from "react-icons/fi";
import Loader from "../../components/common/Loader";
import { adminAnalyticsService } from "../../services/adminAnalyticsService";

const DAY = 24 * 60 * 60 * 1000;
const colors = ["#f97316", "#2563eb", "#10b981", "#8b5cf6", "#f59e0b", "#64748b"];
const tabs = ["overview", "users", "profiles", "search", "content", "funnel", "engagement", "creators", "moderation"];
const presets = [
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
  { label: "This year", value: "this_year" },
  { label: "Custom range", value: "custom" },
];

function localDate(value) {
  return value.toISOString().slice(0, 10);
}

function rangeForPreset(preset, customStart, customEnd) {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  if (preset === "today") start.setHours(0, 0, 0, 0);
  else if (preset === "7d") start.setDate(start.getDate() - 6);
  else if (preset === "90d") start.setDate(start.getDate() - 89);
  else if (preset === "this_month") start.setDate(1);
  else if (preset === "last_month") {
    start.setMonth(start.getMonth() - 1, 1);
    end.setDate(0);
  } else if (preset === "this_year") {
    start.setMonth(0, 1);
  } else if (preset === "custom") {
    const customStartDate = customStart ? new Date(`${customStart}T00:00:00`) : start;
    const customEndDate = customEnd ? new Date(`${customEnd}T23:59:59.999`) : end;
    return { startDate: customStartDate.toISOString(), endDate: customEndDate.toISOString() };
  } else start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

const formatNumber = (value) => Number(value || 0).toLocaleString();
const formatPct = (value) => value == null ? "No baseline" : `${value > 0 ? "+" : ""}${value}%`;
const rate = (value) => value == null ? "N/A" : `${value}%`;
const labelize = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
const funnelRateCards = [
  { label: "View rate", key: "viewRate", unavailable: "No impressions" },
  { label: "Engagement rate", key: "engagementRate" },
  { label: "Save rate", key: "saveRate" },
  { label: "Follow conversion", key: "followConversion" },
  { label: "Subscription conversion", key: "subscriptionConversion" },
];

function Card({ children, className = "" }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}

function SkeletonCard() {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="h-4 w-28 rounded bg-slate-100" />
    <div className="mt-4 h-8 w-20 rounded bg-slate-100" />
    <div className="mt-5 h-3 w-36 rounded bg-slate-100" />
  </article>;
}

function KpiCard({ label, value, icon: Icon, change, detail }) {
  const positive = change == null || change >= 0;
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p></div>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600"><Icon /></span>
    </div>
    <p className={`mt-4 border-t border-slate-100 pt-3 text-xs font-bold ${positive ? "text-emerald-600" : "text-red-600"}`}>{formatPct(change)} <span className="font-medium text-slate-400">vs previous period</span></p>
    {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
  </article>;
}

function EmptyState({ label = "No analytics data available for this period." }) {
  return <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm font-semibold text-slate-500">{label}</div>;
}

function LineChart({ data, series }) {
  const max = Math.max(1, ...data.flatMap((item) => series.map((entry) => Number(item[entry.key] || 0))));
  if (!data.some((item) => series.some((entry) => Number(item[entry.key] || 0) > 0))) return <EmptyState />;
  const width = 720;
  const height = 260;
  const pad = 28;
  const x = (index) => pad + (index / Math.max(1, data.length - 1)) * (width - pad * 2);
  const y = (value) => height - pad - (Number(value || 0) / max) * (height - pad * 2);
  return <div className="overflow-hidden">
    <svg className="h-64 w-full" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
      <line stroke="#e2e8f0" x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} />
      {[0.25, 0.5, 0.75].map((tick) => <line key={tick} stroke="#f1f5f9" x1={pad} x2={width - pad} y1={pad + tick * (height - pad * 2)} y2={pad + tick * (height - pad * 2)} />)}
      {series.map((entry, seriesIndex) => {
        const color = colors[seriesIndex % colors.length];
        const points = data.map((item, index) => ({ cx: x(index), cy: y(item[entry.key]), value: Number(item[entry.key] || 0) }));
        return (
          <g key={entry.key}>
            <polyline fill="none" points={points.map((point) => `${point.cx},${point.cy}`).join(" ")} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" vectorEffect="non-scaling-stroke" />
            {points.filter((point) => point.value > 0).map((point, index) => <circle cx={point.cx} cy={point.cy} fill={color} key={`${entry.key}-${index}`} r="4" />)}
          </g>
        );
      })}
    </svg>
    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">{series.map((entry, index) => <span className="inline-flex items-center gap-1" key={entry.key}><span className="h-2 w-2 rounded-full" style={{ background: colors[index % colors.length] }} />{entry.label}</span>)}</div>
  </div>;
}

function BarChart({ data, keys }) {
  const max = Math.max(1, ...data.flatMap((item) => keys.map((key) => Number(item[key] || item.value || 0))));
  if (!data.some((item) => keys.some((key) => Number(item[key] || item.value || 0) > 0))) return <EmptyState />;
  return <div className="space-y-3">
    {data.map((item) => <div className="grid grid-cols-[120px_1fr_56px] items-center gap-3 text-sm" key={item.label || item.key}>
      <span className="truncate font-semibold text-slate-600">{item.label || item.key}</span>
      <div className="flex h-8 overflow-hidden rounded-lg bg-slate-100">
        {keys.map((key, index) => {
          const value = Number(item[key] ?? item.value ?? 0);
          return <span key={key} style={{ width: `${Math.max(value ? 4 : 0, (value / max) * 100)}%`, background: colors[index % colors.length] }} title={`${key}: ${value}`} />;
        })}
      </div>
      <strong className="text-right text-slate-900">{formatNumber(keys.reduce((sum, key) => sum + Number(item[key] ?? item.value ?? 0), 0))}</strong>
    </div>)}
  </div>;
}

function DonutChart({ data }) {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!total) return <EmptyState />;
  let offset = 25;
  return <div className="grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center">
    <svg className="mx-auto h-44 w-44 -rotate-90" viewBox="0 0 42 42">
      <circle cx="21" cy="21" fill="transparent" r="15.9" stroke="#f1f5f9" strokeWidth="7" />
      {data.map((item, index) => {
        const value = (Number(item.value || 0) / total) * 100;
        const dash = `${value} ${100 - value}`;
        const circle = <circle cx="21" cy="21" fill="transparent" key={item.label} r="15.9" stroke={colors[index % colors.length]} strokeDasharray={dash} strokeDashoffset={offset} strokeWidth="7" />;
        offset -= value;
        return circle;
      })}
    </svg>
    <div className="space-y-3">{data.map((item, index) => <div className="flex items-center justify-between gap-3 text-sm" key={item.label}><span className="inline-flex items-center gap-2 font-semibold text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[index % colors.length] }} />{labelize(item.label)}</span><strong>{formatNumber(item.value)} <span className="text-xs text-slate-400">{Math.round((item.value / total) * 100)}%</span></strong></div>)}</div>
  </div>;
}

function SectionHeader({ eyebrow, title, icon: Icon = FiBarChart2 }) {
  return <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase text-slate-400">{eyebrow}</p><h2 className="mt-1 font-black text-slate-900">{title}</h2></div><Icon className="text-lg text-orange-500" /></div>;
}

function CompactTable({ columns, rows, empty }) {
  if (!rows?.length) return <EmptyState label={empty} />;
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr>{columns.map((column) => <th className="px-4 py-3" key={column.key}>{column.label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr className="hover:bg-slate-50/70" key={row.id || row.creator?.id || row.user?.username || index}>{columns.map((column) => <td className="px-4 py-3 text-slate-600" key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}</tr>)}</tbody></table></div>;
}

export default function AdminAnalyticsPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const preset = params.get("period") || "30d";
  const tab = tabs.includes(params.get("tab")) ? params.get("tab") : "overview";
  const page = Math.max(Number(params.get("page")) || 1, 1);
  const sort = params.get("sort") || "engagement";
  const customStart = params.get("start") || localDate(new Date(Date.now() - 29 * DAY));
  const customEnd = params.get("end") || localDate(new Date());
  const range = useMemo(() => rangeForPreset(preset, customStart, customEnd), [preset, customEnd, customStart]);
  const queryParams = { ...range, page, limit: 10, sort };
  const reportQuery = useQuery({ queryKey: ["adminAnalytics", queryParams], queryFn: () => adminAnalyticsService.getReport(queryParams).then((response) => response.data.data), staleTime: 60_000 });

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setParams(next);
  };

  const exportReport = async (format) => {
    const response = await adminAnalyticsService.exportReport({ ...queryParams, format });
    const blob = ["csv", "pdf"].includes(format) ? response.data : new Blob([JSON.stringify(response.data.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `onlyme-analytics-report.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const data = reportQuery.data;
  const summary = data?.summary || {};
  const activePeakUsageRows = (data?.platformActivity?.hours || []).filter((item) => Number(item.count || 0) > 0);
  const visiblePeakUsageRows = activePeakUsageRows.length ? activePeakUsageRows : (data?.platformActivity?.hours || []).slice(0, 8);
  const funnelRateText = (value, fallback = "N/A") => value == null ? fallback : rate(value);
  const kpis = [
    { label: "Total users", value: formatNumber(summary.totalUsers), icon: FiUsers, detail: `${formatNumber(summary.totalFans)} fans` },
    { label: "New users", value: formatNumber(summary.newUsers), icon: FiTrendingUp, change: data?.changes?.newUsers },
    { label: "Active users", value: formatNumber(summary.activeUsers), icon: FiActivity, change: data?.changes?.activeUsers, detail: "From last seen and stored interactions" },
    { label: "Sessions", value: formatNumber(summary.sessions), icon: FiActivity, detail: `${formatNumber(summary.returningUsers)} returning users` },
    { label: "DAU / WAU / MAU", value: `${formatNumber(summary.dau)} / ${formatNumber(summary.wau)} / ${formatNumber(summary.mau)}`, icon: FiUsers, detail: "Daily / Weekly / Monthly Active Users" },
    { label: "Total creators", value: formatNumber(summary.totalCreators), icon: FiUsers, detail: `${formatNumber(summary.verifiedCreators)} verified` },
    { label: "Published content", value: formatNumber(summary.totalPublishedContent), icon: FiFileText },
    { label: "Posts created", value: formatNumber(summary.postsCreated), icon: FiFileText },
    { label: "Total engagements", value: formatNumber(summary.totalEngagements), icon: FiBarChart2, change: data?.changes?.totalEngagements },
    { label: "Engagement rate", value: summary.engagementRate == null ? "N/A" : `${summary.engagementRate}%`, icon: FiPieChart, detail: "Interactions divided by available views" },
    { label: "Profile views", value: formatNumber(summary.profileViews), icon: FiEye, detail: "Tracked from profile opens" },
    { label: "Searches", value: formatNumber(summary.totalSearches), icon: FiSearch, detail: `${rate(data?.search?.zeroResultRate)} zero-result rate` },
    { label: "Impressions", value: formatNumber(summary.contentImpressions), icon: FiBarChart2, detail: summary.contentImpressions ? `${rate(summary.impressionViewRate)} view rate` : "No visible feed impressions tracked yet" },
  ];
  const filteredTopContent = (data?.topContent?.items || []).filter((item) => !search.trim() || [item.title, item.creator?.name, item.creator?.username, item.type].join(" ").toLowerCase().includes(search.toLowerCase()));

  return <div className="mx-auto max-w-[1600px]">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">Reports & Analytics</p><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Reports & Analytics</h1><p className="mt-1 text-sm text-slate-500">Understand user activity, content performance, engagement and platform growth.</p></div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="text-xs font-bold uppercase text-slate-500">Reporting period<select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold normal-case text-slate-700 outline-none focus:border-orange-400" onChange={(event) => setParam("period", event.target.value)} value={preset}>{presets.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        {preset === "custom" ? <><label className="text-xs font-bold uppercase text-slate-500">Start<input className="mt-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400" onChange={(event) => setParam("start", event.target.value)} type="date" value={customStart} /></label><label className="text-xs font-bold uppercase text-slate-500">End<input className="mt-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400" onChange={(event) => setParam("end", event.target.value)} type="date" value={customEnd} /></label></> : null}
        <div className="flex gap-2"><button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={() => reportQuery.refetch()} type="button"><FiRefreshCw />Refresh</button><button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-bold text-white hover:bg-slate-800" onClick={() => exportReport("csv")} type="button"><FiDownload />CSV</button><button className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={() => exportReport("pdf")} type="button">PDF</button><button className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={() => exportReport("json")} type="button">JSON</button></div>
      </div>
    </div>

    <div className="mt-5 flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">{tabs.map((item) => <button className={`rounded-xl px-4 py-2 text-sm font-bold capitalize ${tab === item ? "bg-orange-50 text-orange-600" : "text-slate-500 hover:bg-white hover:text-slate-900"}`} key={item} onClick={() => setParam("tab", item)} type="button">{item}</button>)}</div>

    {reportQuery.isLoading ? <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <SkeletonCard key={index} />)}</div> : null}
    {reportQuery.isError ? <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Unable to load analytics. <button className="font-bold underline" onClick={() => reportQuery.refetch()} type="button">Retry</button></div> : null}

    {data ? <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpis.map((card) => <KpiCard key={card.label} {...card} />)}</div>

      {["overview", "users"].includes(tab) ? <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card><SectionHeader eyebrow="User Growth" title="Registrations over time" icon={FiTrendingUp} /><LineChart data={data.userGrowth} series={[{ key: "total", label: "Total" }, { key: "fans", label: "Fans" }, { key: "creators", label: "Creators" }]} /></Card>
        <Card><SectionHeader eyebrow="Account Distribution" title="Account mix" icon={FiPieChart} /><DonutChart data={data.accountDistribution} /></Card>
        <Card><SectionHeader eyebrow="User Activity" title="Activity trend" icon={FiActivity} /><LineChart data={data.userActivity} series={[{ key: "activeUsers", label: "Activity signals" }, { key: "messages", label: "Messages" }]} /></Card>
        <Card><SectionHeader eyebrow="User Behavior" title="Action distribution" icon={FiBarChart2} /><BarChart data={data.userBehavior} keys={["value"]} /></Card>
        <Card><SectionHeader eyebrow="Retention" title="Cohort retention" icon={FiUsers} /><div className="grid gap-3 sm:grid-cols-3">{[["D1", data.retention?.day1], ["D7", data.retention?.day7], ["D30", data.retention?.day30]].map(([label, value]) => <div className="rounded-xl bg-slate-50 p-4" key={label}><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-1 text-2xl font-black">{rate(value)}</p></div>)}</div><p className="mt-3 text-xs text-slate-500">Retention tracking available from {new Date(data.retention.trackingStartDate).toLocaleDateString()}.</p><div className="mt-4"><CompactTable empty="No retention cohorts available yet." rows={data.retention?.cohorts || []} columns={[{ key: "cohort", label: "Cohort" }, { key: "newUsers", label: "New users", render: (row) => formatNumber(row.newUsers) }, { key: "day1", label: "Day 1", render: (row) => rate(row.day1) }, { key: "day7", label: "Day 7", render: (row) => rate(row.day7) }, { key: "day30", label: "Day 30", render: (row) => rate(row.day30) }]} /></div></Card>
      </div> : null}

      {["overview", "profiles"].includes(tab) ? <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card><SectionHeader eyebrow="Profiles" title="Profile views over time" icon={FiEye} /><LineChart data={data.profiles?.trend || []} series={[{ key: "views", label: "Views" }, { key: "uniqueVisitors", label: "Unique visitors" }]} /></Card>
        <Card><SectionHeader eyebrow="Profiles" title="Most viewed profiles" icon={FiUsers} /><CompactTable empty="No profile view tracking data for this period." rows={data.profiles?.mostViewedProfiles || []} columns={[{ key: "profile", label: "Profile", render: (row) => row.profile?.username ? <Link className="font-bold text-slate-900 hover:text-orange-600" to={`/profile/${row.profile.username}`}>{row.profile.name}<small className="block text-slate-400">@{row.profile.username}</small></Link> : "Unknown" }, { key: "accountType", label: "Account type", render: (row) => labelize(row.accountType) }, { key: "views", label: "Views", render: (row) => formatNumber(row.views) }, { key: "uniqueVisitors", label: "Unique visitors", render: (row) => formatNumber(row.uniqueVisitors) }, { key: "followers", label: "Followers", render: (row) => formatNumber(row.followers) }, { key: "engagement", label: "Engagement", render: (row) => rate(row.engagement) }]} /></Card>
      </div> : null}

      {["overview", "search"].includes(tab) ? <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card><SectionHeader eyebrow="Search" title="Search volume over time" icon={FiSearch} /><LineChart data={data.search?.trend || []} series={[{ key: "searches", label: "Searches" }, { key: "zeroResults", label: "Zero results" }]} /></Card>
        <Card><SectionHeader eyebrow="Search" title="Search category distribution" icon={FiPieChart} /><DonutChart data={data.search?.categoryDistribution || []} /></Card>
        <Card><SectionHeader eyebrow="Search" title="Top searches" icon={FiTrendingUp} /><CompactTable empty="No search tracking data for this period." rows={data.search?.topSearches || []} columns={[{ key: "searchTerm", label: "Search term" }, { key: "searches", label: "Searches", render: (row) => formatNumber(row.searches) }, { key: "zeroResults", label: "Zero results", render: (row) => formatNumber(row.zeroResults) }]} /></Card>
        <Card><SectionHeader eyebrow="Search" title="Trending searches" icon={FiTrendingUp} /><CompactTable empty="No trend data available yet." rows={data.search?.trendingSearches || []} columns={[{ key: "searchTerm", label: "Search term" }, { key: "currentSearches", label: "Current", render: (row) => formatNumber(row.currentSearches) }, { key: "previousSearches", label: "Previous", render: (row) => formatNumber(row.previousSearches) }, { key: "growth", label: "Growth", render: (row) => row.growth == null ? "New/no baseline" : `${row.growth}%` }, { key: "resultClickRate", label: "CTR", render: (row) => rate(row.resultClickRate) }]} /></Card>
      </div> : null}

      {["overview", "content"].includes(tab) ? <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card><SectionHeader eyebrow="Content Creation" title="Created over time" icon={FiFileText} /><LineChart data={data.contentCreation} series={[{ key: "feedPosts", label: "Posts" }, { key: "seens", label: "Seens" }, { key: "worlds", label: "Worlds" }, { key: "stories", label: "Stories" }]} /></Card>
        <Card><SectionHeader eyebrow="Content Distribution" title="Types and statuses" icon={FiPieChart} /><DonutChart data={data.contentDistribution} /><div className="mt-6"><BarChart data={data.contentStatus} keys={["value"]} /></div></Card>
      </div> : null}

      {tab === "overview" ? <div className="mt-6 grid items-start gap-5 xl:grid-cols-2">
        <Card><SectionHeader eyebrow="Engagement Overview" title="Engagement trend" icon={FiBarChart2} /><LineChart data={data.engagement.trend} series={[{ key: "engagements", label: "Engagements" }, { key: "messages", label: "Messages" }, { key: "reports", label: "Reports" }]} /></Card>
        <Card><SectionHeader eyebrow="Funnel" title="Impression funnel" icon={FiBarChart2} /><BarChart data={[{ label: "Impressions", value: data.funnel?.impressions }, { label: "Views / opens", value: data.funnel?.views }, { label: "Engagements", value: data.funnel?.engagements }, { label: "Follows", value: data.funnel?.follows }, { label: "Subscriptions / support", value: Number(data.funnel?.subscriptions || 0) + Number(data.funnel?.support || 0) }]} keys={["value"]} /></Card>
        <Card><SectionHeader eyebrow="Activity by Time" title="Peak usage" icon={FiCalendar} /><BarChart data={visiblePeakUsageRows} keys={["count"]} /></Card>
        <Card><SectionHeader eyebrow="Funnel" title="Rates" icon={FiPieChart} /><div className="grid gap-3 sm:grid-cols-2">{funnelRateCards.map(({ label, key, unavailable }) => <div className="rounded-xl bg-slate-50 p-4" key={label}><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-1 text-xl font-black">{funnelRateText(data.funnel?.[key], unavailable)}</p></div>)}</div></Card>
      </div> : null}

      {tab === "engagement" ? <div className="mt-6 grid items-start gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card><SectionHeader eyebrow="Engagement Overview" title="Engagement trend" icon={FiBarChart2} /><LineChart data={data.engagement.trend} series={[{ key: "engagements", label: "Engagements" }, { key: "messages", label: "Messages" }, { key: "reports", label: "Reports" }]} /></Card>
        <Card><SectionHeader eyebrow="Activity by Time" title="Peak usage" icon={FiCalendar} /><BarChart data={visiblePeakUsageRows} keys={["count"]} /></Card>
      </div> : null}

      {tab === "funnel" ? <div className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card><SectionHeader eyebrow="Funnel" title="Impression funnel" icon={FiBarChart2} /><BarChart data={[{ label: "Impressions", value: data.funnel?.impressions }, { label: "Views / opens", value: data.funnel?.views }, { label: "Engagements", value: data.funnel?.engagements }, { label: "Follows", value: data.funnel?.follows }, { label: "Subscriptions / support", value: Number(data.funnel?.subscriptions || 0) + Number(data.funnel?.support || 0) }]} keys={["value"]} /></Card>
        <Card><SectionHeader eyebrow="Funnel" title="Rates" icon={FiPieChart} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{funnelRateCards.map(({ label, key, unavailable }) => <div className="rounded-xl bg-slate-50 p-4" key={label}><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-1 text-xl font-black">{funnelRateText(data.funnel?.[key], unavailable)}</p></div>)}</div></Card>
      </div> : null}

      {["overview", "content"].includes(tab) ? <Card className="mt-6"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><SectionHeader eyebrow="Top Performing Content" title="Highest engagement" icon={FiSearch} /><div className="flex gap-2"><input className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" onChange={(event) => setSearch(event.target.value)} placeholder="Search content or creator" value={search} /><select className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" onChange={(event) => setParam("sort", event.target.value)} value={sort}><option value="engagement">Engagement</option><option value="impressions">Impressions</option><option value="views">Views</option><option value="viewRate">View rate</option><option value="reactions">Reactions</option><option value="comments">Comments</option><option value="saves">Saves</option><option value="shares">Shares</option><option value="engagementRate">Engagement rate</option><option value="createdAt">Created</option></select></div></div><CompactTable empty="No top content for this period." rows={filteredTopContent} columns={[{ key: "title", label: "Content", render: (row) => <Link className="font-bold text-slate-900 hover:text-orange-600" to={row.route}>{row.title}</Link> }, { key: "creator", label: "Creator", render: (row) => <span>{row.creator?.name || "Unknown"}<small className="block text-slate-400">@{row.creator?.username || "unknown"}</small></span> }, { key: "type", label: "Type" }, { key: "impressions", label: "Impressions", render: (row) => formatNumber(row.impressions) }, { key: "views", label: "Views", render: (row) => formatNumber(row.views) }, { key: "viewRate", label: "View rate", render: (row) => rate(row.viewRate) }, { key: "reactions", label: "Reactions", render: (row) => formatNumber(row.reactions) }, { key: "comments", label: "Comments", render: (row) => formatNumber(row.comments) }, { key: "saves", label: "Saves", render: (row) => formatNumber(row.saves) }, { key: "shares", label: "Shares", render: (row) => formatNumber(row.shares) }, { key: "engagementRate", label: "Engagement rate", render: (row) => rate(row.engagementRate) }, { key: "createdAt", label: "Created", render: (row) => new Date(row.createdAt).toLocaleDateString() }]} />{data.topContent.pagination ? <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500"><span>Page {data.topContent.pagination.page} of {data.topContent.pagination.pages}</span><div className="flex gap-2"><button className="rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-700 disabled:opacity-40" disabled={page <= 1} onClick={() => setParam("page", String(page - 1))} type="button">Previous</button><button className="rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-700 disabled:opacity-40" disabled={page >= data.topContent.pagination.pages} onClick={() => setParam("page", String(page + 1))} type="button">Next</button></div></div> : null}</Card> : null}

      {["overview", "creators"].includes(tab) ? <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card><SectionHeader eyebrow="Creator Performance" title="Top creators" icon={FiUsers} /><CompactTable empty="No creator analytics available." rows={data.creatorPerformance} columns={[{ key: "creator", label: "Creator", render: (row) => <Link className="font-bold text-slate-900 hover:text-orange-600" to={`/profile/${row.creator.username}`}>{row.creator.name}<small className="block text-slate-400">@{row.creator.username}</small></Link> }, { key: "content", label: "Content", render: (row) => formatNumber(row.content) }, { key: "views", label: "Views", render: (row) => formatNumber(row.views) }, { key: "followers", label: "Followers", render: (row) => formatNumber(row.followers) }, { key: "engagement", label: "Engagement", render: (row) => formatNumber(row.engagement) }]} /></Card>
        <Card><SectionHeader eyebrow="Most Active Users" title="Interaction leaders" icon={FiActivity} /><CompactTable empty="No user actions available." rows={data.mostActiveUsers} columns={[{ key: "user", label: "User", render: (row) => <span className="font-bold text-slate-900">{row.user.name}<small className="block text-slate-400">@{row.user.username} · {row.user.role}</small></span> }, { key: "actions", label: "Actions", render: (row) => formatNumber(row.actions) }, { key: "comments", label: "Comments", render: (row) => formatNumber(row.comments) }, { key: "reactions", label: "Reactions", render: (row) => formatNumber(row.reactions) }, { key: "messages", label: "Messages", render: (row) => formatNumber(row.messages) }]} /></Card>
      </div> : null}

      {["overview", "moderation"].includes(tab) ? <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card><SectionHeader eyebrow="Safety & Moderation" title="Reports by scope" icon={FiActivity} /><BarChart data={Object.entries(data.moderation.totals.byScope).map(([label, value]) => ({ label: labelize(label), value }))} keys={["value"]} /><div className="mt-5 flex flex-wrap gap-2"><Link className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700" to="/admin/message-reports">Message reports</Link><Link className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700" to="/admin/user-reports">User reports</Link></div></Card>
        <Card><SectionHeader eyebrow="Subscriptions & Support" title="Financial summary" icon={FiBarChart2} /><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Active subscriptions</p><p className="mt-1 text-2xl font-black">{formatNumber(summary.activeSubscriptions)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Premium memberships</p><p className="mt-1 text-2xl font-black">{formatNumber(summary.activePremiumMemberships)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Transactions</p><p className="mt-1 text-2xl font-black">{formatNumber(summary.supportTransactions)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Transaction amount</p><p className="mt-1 text-2xl font-black">{formatNumber(summary.supportAmount)}</p></div></div><Link className="mt-5 inline-flex rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white" to="/admin/financial">Open financial operations</Link></Card>
      </div> : null}

      <p className="mt-6 text-xs text-slate-400">{data.dataAvailability?.message || data.supportedMetrics?.notice}</p>
    </> : reportQuery.isFetching ? <div className="mt-8"><Loader label="Loading analytics..." /></div> : null}
  </div>;
}
