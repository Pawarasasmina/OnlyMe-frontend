import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  FiLogOut,
} from "react-icons/fi";
import AtseenLogo from "../branding/AtseenLogo";
import FanAvatar from "./shared/FanAvatar";
import { useAuth } from "../../hooks/useAuth";
import { getUserDisplay } from "./shared/userDisplay";
import { socialPrimaryNavItems, socialSecondaryNavItems } from "../social/socialNavItems";

function FanWebSidebar({ capabilities, status, unreadMessageCount = 0 }) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const display = getUserDisplay(user, status);
  const createAction = capabilities.canCreate
    ? { label: "Create ✦", to: "/create" }
    : capabilities.canAccessVerification && !capabilities.isApprovedCreator
      ? { label: "Verify ✦", to: "/creator/verification" }
      : null;

  const logoutAndNavigate = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="social-fixed-rail social-left-rail hidden h-screen w-[76px] shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-white/[0.05] px-[10px] pb-6 pt-[42px] md:flex min-[1020px]:w-[240px] min-[1020px]:px-[28px]">
      <NavLink aria-label="Atseen home" className="mb-[30px] flex items-center justify-center py-1.5 [&_span]:hidden min-[1020px]:justify-start min-[1020px]:px-3 min-[1020px]:[&_span]:inline" to="/wall">
        <AtseenLogo />
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
              <span className="truncate">{item.label}</span>
              {item.to === "/messages" && unreadMessageCount > 0 ? <span aria-label={`${unreadMessageCount} unread chats`} className="grid min-h-5 min-w-5 shrink-0 place-items-center rounded-full bg-atseen-blue px-1.5 text-[10px] font-black text-atseen-bg">{unreadMessageCount > 99 ? "99+" : unreadMessageCount}</span> : null}
            </span>
          </NavLink>
        ))}
      </nav>
      {createAction ? (
        <Link
          className="mt-9 flex min-h-[60px] w-full items-center justify-center rounded-[28px] bg-[#8ab8ff] px-5 text-base font-black text-[#07090d] transition hover:brightness-110 max-[1019px]:hidden"
          to={createAction.to}
        >
          {createAction.label}
        </Link>
      ) : null}
      <nav aria-label="Account actions" className="mt-5 space-y-0.5 border-t border-white/[0.05] pt-5">
        {socialSecondaryNavItems(capabilities).map((item) => (
          <NavLink
            className={({ isActive }) => `flex min-h-11 items-center gap-3.5 rounded-xl px-3 py-3 text-sm font-semibold transition ${isActive ? "text-white" : item.emphasis ? "text-atseen-blue hover:bg-atseen-blue/10" : "text-atseen-muted hover:bg-atseen-surface-2 hover:text-white"}`}
            key={item.to}
            to={item.to}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="truncate max-[1019px]:sr-only">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-3">
        <NavLink
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-atseen-muted transition hover:bg-atseen-surface-2 hover:text-white"
          to="/profile"
        >
          <FanAvatar name={display.name} size="h-8 w-8" src={display.avatar} />
          <span className="min-w-0 truncate max-[1019px]:sr-only">{display.name}</span>
        </NavLink>
        <button
          className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-atseen-line px-3 py-2 text-xs font-semibold text-atseen-muted transition hover:border-atseen-blue/50 hover:text-white max-[1019px]:hidden"
          onClick={logoutAndNavigate}
          type="button"
        >
          <FiLogOut aria-hidden="true" /> Logout
        </button>
        <p className="text-center text-[10px] text-atseen-dim max-[760px]:hidden">Atseen OU · web v1.6</p>
      </div>
    </aside>
  );
}

export default FanWebSidebar;
