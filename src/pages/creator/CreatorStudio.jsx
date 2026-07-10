import { FiBarChart2, FiCalendar, FiEdit3, FiPlus, FiUsers } from "react-icons/fi";
import Button from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";

function CreatorStudio() {
  const { user } = useAuth();
  const metrics = [
    { label: "Total members", value: "0", icon: FiUsers },
    { label: "Monthly revenue", value: "$0.00", icon: FiBarChart2 },
    { label: "Published posts", value: "0", icon: FiEdit3 },
  ];

  return <div>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-sm text-brand-secondary">Welcome, {user?.name}</p><h2 className="mt-1 text-3xl font-black">Your creator studio</h2><p className="mt-2 text-sm text-brand-mist/60">Create, publish, and grow your membership from one place.</p></div>
      <Button className="gap-2"><FiPlus /> Create new post</Button>
    </div>
    <div className="mt-8 grid gap-4 md:grid-cols-3">{metrics.map((metric) => <div className="rounded-3xl border border-white/10 bg-brand-dark/60 p-5" key={metric.label}><metric.icon className="text-xl text-brand-secondary" /><p className="mt-5 text-3xl font-black">{metric.value}</p><p className="mt-1 text-sm text-brand-mist/55">{metric.label}</p></div>)}</div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-3xl border border-white/10 bg-brand-dark/60 p-6"><h3 className="text-xl font-bold">Start sharing</h3><p className="mt-2 text-sm text-brand-mist/60">Your published content will appear here. Share a welcome post to introduce fans to your new space.</p><button className="mt-8 flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 text-brand-mist/60" type="button"><FiPlus className="mb-3 text-3xl text-brand-primary" /><span className="font-semibold text-white">Create your first post</span><span className="mt-1 text-xs">Photo, video, audio, or text</span></button></div>
      <div className="rounded-3xl border border-white/10 bg-brand-dark/60 p-6"><FiCalendar className="text-2xl text-brand-secondary" /><h3 className="mt-4 text-xl font-bold">Publishing schedule</h3><p className="mt-2 text-sm text-brand-mist/60">No posts scheduled yet.</p><div className="mt-6 rounded-2xl bg-white/5 p-4 text-sm text-brand-mist/60">Consistency helps your community grow. Plan your next member update here.</div></div>
    </div>
  </div>;
}

export default CreatorStudio;
