import { NavLink } from "react-router-dom";
import AtseenLogo from "../branding/AtseenLogo";
import FanAvatar from "./shared/FanAvatar";
import { useAuth } from "../../hooks/useAuth";
import { getUserDisplay } from "./shared/userDisplay";
import { socialPrimaryNavItems } from "../social/socialNavItems";
import { useLanguage } from "../../hooks/useLanguage";

function FanWebSidebar({ capabilities, onCreate, status, unreadMessageCount = 0 }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const display = getUserDisplay(user, status);
  const createAction = capabilities.canCreate ? { label: "Create ✦", onClick: onCreate } : null;

  return (
    <aside className="social-fixed-rail social-left-rail hidden h-screen w-[76px] shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-white/[0.05] px-[10px] pb-6 pt-[42px] md:flex min-[1020px]:w-[240px] min-[1020px]:px-[28px]">
      <NavLink aria-label="Atseen home" className="mb-[30px] flex items-center justify-center py-1.5 [&_span]:hidden min-[1020px]:justify-start min-[1020px]:px-3 min-[1020px]:[&_span]:inline" to="/wall">
        <AtseenLogo wordmarkOnly />
      </NavLink>
      <nav aria-label="Fan navigation" className="space-y-2">
        {socialPrimaryNavItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-4 rounded-xl px-3 py-3 text-[18px] font-bold transition duration-150 min-[1020px]:text-[18px] ${
                isActive ? "text-white" : "text-atseen-muted hover:bg-atseen-surface-2 hover:text-white"
              }`
            }
            key={item.to}
            to={item.to}
          >
            <span className="relative shrink-0">
              <item.icon className="h-[22px] w-[22px]" />
              {item.to === "/messages" && unreadMessageCount > 0 ? <span aria-hidden="true" className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-atseen-blue px-1 text-[9px] font-black leading-none text-atseen-bg min-[1020px]:hidden">{unreadMessageCount > 99 ? "99+" : unreadMessageCount}</span> : null}
            </span>
            <span className="flex min-w-0 items-center gap-2 max-[1019px]:sr-only">
            <span className="truncate">{t(item.label)}</span>
              {item.to === "/messages" && unreadMessageCount > 0 ? <span aria-label={`${unreadMessageCount} unread chats`} className="grid min-h-5 min-w-5 shrink-0 place-items-center rounded-full bg-atseen-blue px-1.5 text-[10px] font-black text-atseen-bg">{unreadMessageCount > 99 ? "99+" : unreadMessageCount}</span> : null}
            </span>
          </NavLink>
        ))}
      </nav>
      {createAction ? <button
          className="sidebar-create-action mt-9 flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#8ab8ff] px-5 text-[15px] font-bold text-[#07090d] transition hover:brightness-110 max-[1019px]:hidden"
          onClick={createAction.onClick}
          type="button"
        >
          {t(createAction.label)}
        </button> : null}
      <div className="mt-auto pb-2">
        <NavLink
          className="sidebar-identity flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-atseen-muted transition hover:bg-atseen-surface-2 hover:text-white"
          to="/profile"
        >
          <FanAvatar name={display.name} size="h-8 w-8" src={display.avatar} />
          <span className="min-w-0 max-[1019px]:sr-only"><strong className="block truncate">{display.name}</strong><small className="mt-0.5 block truncate">{t("Your space")}</small></span>
        </NavLink>
      </div>
    </aside>
  );
}

export default FanWebSidebar;
