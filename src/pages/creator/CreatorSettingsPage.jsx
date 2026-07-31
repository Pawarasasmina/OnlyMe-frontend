import { Link } from "react-router-dom";
import { FiBell, FiChevronRight, FiLock, FiShield, FiUser } from "react-icons/fi";

export default function CreatorSettingsPage() {
  const rows = [
    { to: "/creator/settings/profile", icon: FiUser, title: "Profile settings", text: "Public identity, images, pricing, and creator details." },
    { to: "/creator/settings/privacy", icon: FiShield, title: "Privacy", text: "Control visibility, discovery, messages, mentions, and tags." },
    { to: "/creator/settings/notifications", icon: FiBell, title: "Notifications", text: "Choose notification channels for creator updates." },
    { to: "/creator/settings/account", icon: FiLock, title: "Account", text: "Language, time zone, account details, and password." },
  ];
  return <div className="mx-auto max-w-4xl"><p className="creator-eyebrow">Account</p><h1 className="creator-page-title">Settings</h1><p className="creator-muted mt-2">Manage the parts of your creator account that are available today.</p><div className="mt-7 grid gap-3">{rows.map(({ to, icon: Icon, title, text }) => <Link className="creator-card flex items-center gap-4 p-5 transition hover:border-sky-300/20 hover:bg-sky-300/[0.04]" key={to} to={to}><span className="rounded-xl bg-sky-300/10 p-3 text-xl text-sky-300"><Icon /></span><span className="min-w-0 flex-1"><span className="block font-bold">{title}</span><span className="mt-1 block text-sm text-slate-400">{text}</span></span><FiChevronRight className="text-slate-500" /></Link>)}</div></div>;
}
