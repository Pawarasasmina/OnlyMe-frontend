import { NavLink } from "react-router-dom";
import { FiGlobe, FiHome, FiMessageCircle, FiUser } from "react-icons/fi";
import { fanWebNavItems } from "./fanWebNavItems";

const mobileItems = fanWebNavItems.filter((item) =>
  ["/fan/dashboard", "/fan/orbit", "/fan/worlds", "/fan/messages", "/fan/profile"].includes(item.to)
);

function FanMobileNav() {
  const labels = {
    "/fan/dashboard": "Home",
    "/fan/orbit": "Orbit",
    "/fan/worlds": "Worlds",
    "/fan/messages": "Messages",
    "/fan/profile": "Profile",
  };
  const iconFallbacks = {
    "/fan/dashboard": FiHome,
    "/fan/worlds": FiGlobe,
    "/fan/messages": FiMessageCircle,
    "/fan/profile": FiUser,
  };

  return (
    <nav
      aria-label="Mobile fan navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-atseen-line bg-atseen-bg/95 px-2 py-2 backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {mobileItems.map((item) => {
          const Icon = item.icon || iconFallbacks[item.to];

          return (
            <NavLink
              className={({ isActive }) =>
                `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition ${
                  isActive ? "bg-atseen-surface-2 text-atseen-blue" : "text-atseen-muted hover:text-white"
                }`
              }
              key={item.to}
              to={item.to}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              <span>{labels[item.to]}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default FanMobileNav;
