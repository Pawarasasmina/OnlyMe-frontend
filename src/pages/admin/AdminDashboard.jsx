import { useQuery } from "@tanstack/react-query";
import { FiFileText, FiShield, FiUserCheck, FiUsers } from "react-icons/fi";
import Loader from "../../components/common/Loader";
import Button from "../../components/common/Button";
import { adminService } from "../../services/adminService";

function AdminDashboard() {
  const query = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => adminService.getDashboard().then((response) => response.data.data.stats),
  });

  if (query.isLoading) return <Loader label="Loading admin dashboard..." />;
  if (query.isError) return <div className="rounded-3xl bg-red-500/10 p-5 text-red-200">Unable to load dashboard.<Button className="ml-3" onClick={() => query.refetch()}>Retry</Button></div>;

  const stats = query.data;
  const cards = [
    { label: "Total users", value: stats.totalUsers, detail: `${stats.activeUsers} active`, icon: FiUsers },
    { label: "Creators", value: stats.creators, detail: `${stats.fans} fans`, icon: FiUserCheck },
    { label: "Published content", value: stats.publishedContent, detail: `${stats.draftContent} drafts`, icon: FiFileText },
    { label: "Administrators", value: stats.admins, detail: `${stats.activeSubscriptions} active subscriptions`, icon: FiShield },
  ];

  return <div><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-secondary">Administration</p><h2 className="mt-2 text-3xl font-black">Platform overview</h2><p className="mt-2 text-brand-mist/60">Live account, publishing, and subscription metrics.</p></div><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <article className="rounded-3xl border border-white/10 bg-brand-dark/60 p-5" key={card.label}><card.icon className="text-2xl text-brand-secondary" /><p className="mt-6 text-4xl font-black">{card.value}</p><h3 className="mt-1 font-semibold">{card.label}</h3><p className="mt-2 text-xs text-brand-mist/45">{card.detail}</p></article>)}</div></div>;
}

export default AdminDashboard;
