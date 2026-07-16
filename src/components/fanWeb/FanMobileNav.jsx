import { NavLink } from "react-router-dom";
import { socialPrimaryNavItems } from "../social/socialNavItems";

function FanMobileNav() {
  return (
    <nav
      aria-label="Mobile fan navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-atseen-line bg-atseen-bg/95 px-2 py-2 backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {socialPrimaryNavItems.map((item) => {
          const Icon = item.icon;

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
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default FanMobileNav;
