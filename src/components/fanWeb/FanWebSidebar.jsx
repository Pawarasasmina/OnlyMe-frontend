import { NavLink, useNavigate } from "react-router-dom";
import {
  FiLogOut,
} from "react-icons/fi";
import AtseenLogo from "../branding/AtseenLogo";
import FanAvatar from "./shared/FanAvatar";
import { useAuth } from "../../hooks/useAuth";
import { getUserDisplay } from "./shared/userDisplay";
import { fanWebNavItems } from "./fanWebNavItems";

function FanWebSidebar({ onGetApp, status }) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const display = getUserDisplay(user, status);

  const logoutAndNavigate = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-white/[0.05] px-[18px] pb-6 pt-[34px] md:flex">
      <NavLink aria-label="Atseen home" className="mb-[30px] flex items-center px-3 py-1.5" to="/fan/dashboard">
        <AtseenLogo />
      </NavLink>
      <nav aria-label="Fan navigation" className="space-y-0.5">
        {fanWebNavItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3.5 rounded-xl px-3 py-3 text-sm font-semibold transition duration-150 ${
                isActive ? "text-white" : "text-atseen-muted hover:bg-atseen-surface-2 hover:text-white"
              }`
            }
            key={item.to}
            to={item.to}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="truncate max-[760px]:sr-only">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-3">
        <NavLink
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-atseen-muted transition hover:bg-atseen-surface-2 hover:text-white"
          to="/fan/profile"
        >
          <FanAvatar name={display.name} size="h-8 w-8" src={display.avatar} />
          <span className="min-w-0 truncate max-[760px]:sr-only">{display.name}</span>
        </NavLink>
        <button
          className="flex min-h-10 w-full items-center justify-center gap-2 rounded-[13px] bg-gradient-to-br from-atseen-blue to-atseen-blue-strong px-3 py-2.5 text-sm font-bold text-atseen-bg transition hover:brightness-110 max-[760px]:hidden"
          onClick={onGetApp}
          type="button"
        >
          Get the app
        </button>
        <button
          className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-atseen-line px-3 py-2 text-xs font-semibold text-atseen-muted transition hover:border-atseen-blue/50 hover:text-white max-[760px]:hidden"
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
