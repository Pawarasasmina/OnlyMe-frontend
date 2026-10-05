import { NavLink } from "react-router-dom";
import { socialPrimaryNavItems } from "../social/socialNavItems";
import { useLanguage } from "../../hooks/useLanguage";
import { useAuth } from "../../hooks/useAuth";
import FanAvatar from "./shared/FanAvatar";
import { getUserDisplay } from "./shared/userDisplay";

function FanMobileNav({ unreadMessageCount = 0 }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const display = getUserDisplay(user);
  const mobileItems = socialPrimaryNavItems.filter((item) => ["Seen", "Discover", "Wall", "Messages", "Profile"].includes(item.label));

  return (
    <nav
      aria-label="Mobile fan navigation"
      className="fan-mobile-nav fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.05] bg-[#090c0f]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur min-[881px]:hidden"
    >
      <div className="mx-auto grid h-[54px] max-w-md grid-cols-5 items-center gap-1">
        {mobileItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              className={({ isActive }) =>
                `flex h-[54px] items-center justify-center text-[10px] font-semibold transition ${
                  isActive ? "text-atseen-blue" : "text-white/35 hover:text-white/70"
                }`
              }
              key={item.to}
              to={item.to}
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    {item.to === "/profile" ? (
                      <FanAvatar
                        alt="Your profile"
                        className={`border ${isActive ? "border-atseen-blue" : "border-white/35"}`}
                        name={display.name}
                        size="h-5 w-5"
                        src={display.avatar}
                      />
                    ) : (
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    )}
                    {item.to === "/messages" && unreadMessageCount > 0 ? <span aria-label={`${unreadMessageCount} unread chats`} className="absolute -right-3 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-atseen-blue px-1 text-[9px] font-black leading-none text-atseen-bg">{unreadMessageCount > 99 ? "99+" : unreadMessageCount}</span> : null}
                  </span>
                  <span className="sr-only">{t(item.label)}</span>
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
