import { Link, useLocation } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { useLanguage } from "../../hooks/useLanguage";

const settingsTabs = [
  { label: "Profile", slug: "profile" },
  { label: "Privacy", slug: "privacy" },
  { label: "Notifications", slug: "notifications" },
  { label: "Account", slug: "account" },
];

function SettingsNav({ showTabs = true }) {
  const location = useLocation();
  const { t } = useLanguage();
  const basePath = location.pathname.startsWith("/creator/settings")
    ? "/creator/settings"
    : location.pathname.startsWith("/admin/settings") || location.pathname.startsWith("/admin/profile")
      ? "/admin/settings"
      : "/settings";

  return (
    <div className="space-y-4">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-atseen-muted transition hover:text-atseen-blue" to="/settings">
        <FiArrowLeft aria-hidden="true" /> Back to settings
      </Link>
      {showTabs ? <nav aria-label="Settings" className="flex flex-wrap gap-2">
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
            {t(tab.label)}
          </Link>
          );
        })}
      </nav> : null}
    </div>
  );
}

export default SettingsNav;
