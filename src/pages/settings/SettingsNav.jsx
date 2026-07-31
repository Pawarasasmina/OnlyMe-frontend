import { Link, useLocation } from "react-router-dom";

const settingsTabs = [
  { label: "Profile", slug: "profile" },
  { label: "Privacy", slug: "privacy" },
  { label: "Notifications", slug: "notifications" },
  { label: "Account", slug: "account" },
];

function SettingsNav() {
  const location = useLocation();
  const basePath = location.pathname.startsWith("/creator/settings")
    ? "/creator/settings"
    : location.pathname.startsWith("/admin/settings") || location.pathname.startsWith("/admin/profile")
      ? "/admin/settings"
      : "/settings";

  return (
    <nav aria-label="Settings" className="flex flex-wrap gap-2">
      {settingsTabs.map((tab) => {
        const to = `${basePath}/${tab.slug}`;

        return (
        <Link
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            location.pathname === to || (location.pathname === "/admin/profile" && tab.slug === "profile")
              ? "bg-brand-primary text-white"
              : "bg-white/10 text-brand-mist/75 hover:bg-white/15"
          }`}
          key={to}
          to={to}
        >
          {tab.label}
        </Link>
        );
      })}
    </nav>
  );
}

export default SettingsNav;
