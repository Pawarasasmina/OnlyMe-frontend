import { Link, NavLink, useLocation } from "react-router-dom";
import AtseenLogo from "../branding/AtseenLogo";
import FanAvatar from "./shared/FanAvatar";
import { useAuth } from "../../hooks/useAuth";
import { getUserDisplay } from "./shared/userDisplay";
import { socialPrimaryNavItems } from "../social/socialNavItems";
import { useLanguage } from "../../hooks/useLanguage";

function FanWebSidebar({ capabilities, onCreate, status, unreadActivityCount = 0, unreadMessageCount = 0 }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const display = getUserDisplay(user, status);
  const createAction = capabilities.canCreate ? { label: "Create ✦", onClick: onCreate } : null;

  return (
    <aside className="social-fixed-rail social-left-rail fan-web-sidebar sticky top-0 hidden h-screen w-[76px] shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-white/[0.05] px-[10px] pb-[22px] pt-[30px] md:flex min-[1020px]:w-[262px] min-[1020px]:px-[18px]">
      <Link aria-label="Atseen home" className="fan-sidebar-brand mb-6 flex items-center justify-center py-1.5 min-[1020px]:justify-start min-[1020px]:px-3" to="/wall">
        <AtseenLogo className="fan-sidebar-wordmark [&>span:not(.sr-only)]:hidden min-[1020px]:[&>span:not(.sr-only)]:inline" wordmarkOnly />
      </Link>

      <nav aria-label="Fan navigation" className="fan-sidebar-nav grid gap-0.5">
        {socialPrimaryNavItems.map((item) => (
          <NavLink
            aria-current={item.to === "/profile" && location.pathname.startsWith("/saved") ? "page" : undefined}
            className={({ isActive }) => {
              const isProfileSection = item.to === "/profile" && location.pathname.startsWith("/saved");
              const active = isActive || isProfileSection;
              return `fan-sidebar-nav-link flex min-h-[46px] items-center justify-center gap-4 rounded-full px-3.5 py-3 text-[15px] font-semibold text-white/60 transition duration-150 hover:translate-x-0.5 hover:bg-white/[0.05] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-atseen-blue min-[1020px]:justify-start ${
                active ? "is-active text-white !font-extrabold" : ""
              }`;
            }}
            key={item.to}
            to={item.to}
          >
            <span className="fan-sidebar-icon relative shrink-0">
              <item.icon aria-hidden="true" className="h-[23px] w-[23px]" />
              {item.to === "/messages" && unreadMessageCount > 0 ? (
                <span aria-hidden="true" className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-atseen-blue px-1 text-[9px] font-black leading-none text-atseen-bg min-[1020px]:hidden">
                  {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                </span>
              ) : null}
              {item.to === "/activity" && unreadActivityCount > 0 ? <span aria-hidden="true" className="fan-sidebar-activity-dot absolute left-[14px] top-0 h-[7px] w-[7px] rounded-full bg-[#9CCBFF]" /> : null}
            </span>

            <span className="flex min-w-0 items-center gap-2 max-[1019px]:sr-only">
              <span className="truncate">{t(item.label)}</span>
              {item.to === "/messages" && unreadMessageCount > 0 ? (
                <span aria-label={`${unreadMessageCount} unread chats`} className="grid min-h-5 min-w-5 shrink-0 place-items-center rounded-full bg-atseen-blue px-1.5 text-[10px] font-black text-atseen-bg">
                  {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                </span>
              ) : null}
            </span>
          </NavLink>
        ))}
      </nav>

      {createAction ? (
        <button
          className="sidebar-create-action mt-4 flex min-h-[52px] w-full items-center justify-center rounded-full bg-gradient-to-br from-[#9CCBFF] to-[#6FA9E8] px-5 py-3.5 text-center text-sm font-extrabold text-[#0A0C0F] shadow-[0_8px_26px_rgba(111,169,232,.25)] transition duration-150 hover:-translate-y-px hover:shadow-[0_12px_32px_rgba(111,169,232,.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-atseen-blue max-[1019px]:hidden"
          onClick={createAction.onClick}
          type="button"
        >
          {t(createAction.label)}
        </button>
      ) : null}

      <div className="mt-auto pb-2">
        <NavLink
          className="sidebar-identity flex items-center justify-center gap-[11px] rounded-2xl px-3 py-2.5 text-sm text-white/60 transition duration-150 hover:bg-white/[0.05] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-atseen-blue min-[1020px]:justify-start"
          to="/profile"
        >
          <FanAvatar name={display.name} size="h-10 w-10" src={display.avatar} />
          <span className="fan-sidebar-user-copy min-w-0 max-[1019px]:sr-only">
            <strong className="block truncate">{display.name}</strong>
            <small className="mt-0.5 block truncate">{t("Your space")}</small>
          </span>
        </NavLink>
      </div>
    </aside>
  );
}

export default FanWebSidebar;
