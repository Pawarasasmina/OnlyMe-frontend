/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { NavLink } from "react-router-dom";
import { socialMobileNavItems } from "../social/socialNavItems";
import { useAuth } from "../../hooks/useAuth";
import FanAvatar from "./shared/FanAvatar";
import { getUserDisplay } from "./shared/userDisplay";

function FanMobileNav({ unreadMessageCount = 0 }) {
  __useUiLanguage();
  const { user } = useAuth();
  const display = getUserDisplay(user);
  return (
    <nav
      aria-label={__msg("fanWeb.mobileFanNavigation")}
      className="fan-mobile-nav fixed z-40 min-[881px]:hidden"
    >
      <div className="fan-mobile-nav-cells">
        {socialMobileNavItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              className={({ isActive }) =>
                `fan-mobile-nav-cell${isActive ? " is-active" : ""}`
              }
              key={item.to}
              to={item.to}
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    {item.to === "/profile" ? (
                      <FanAvatar
                        alt={__msg("fanWeb.yourProfile")}
                        className={`border ${isActive ? "border-atseen-blue" : "border-white/35"}`}
                        name={display.name}
                        size="h-7 w-7"
                        src={display.avatar}
                      />
                    ) : (
                      <Icon aria-hidden="true" className="h-[26px] w-[26px]" />
                    )}
                    {item.to === "/messages" && unreadMessageCount > 0 ? <span aria-label={__msg("fanWeb.unreadChats", { value0: unreadMessageCount })} className="absolute -right-3 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-atseen-blue px-1 text-[9px] font-black leading-none text-atseen-bg">{unreadMessageCount > 99 ? "99+" : unreadMessageCount}</span> : null}
                  </span>
                  <span className="sr-only">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default FanMobileNav;
