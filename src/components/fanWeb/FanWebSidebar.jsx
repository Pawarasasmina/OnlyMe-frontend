import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FiCompass,
  FiEye,
  FiHeart,
  FiHome,
  FiLogOut,
  FiMessageCircle,
  FiUser,
} from "react-icons/fi";
import AtseenLogo from "../branding/AtseenLogo";
import FanAvatar from "./shared/FanAvatar";
import { useAuth } from "../../hooks/useAuth";
import { getUserDisplay } from "./shared/userDisplay";
import { socialPrimaryNavItems, socialSecondaryNavItems } from "../social/socialNavItems";

const searchPrototypeNav = [
  { label: "Home", to: "/wall", icon: FiHome },
  { label: "Seen", to: "/seen", icon: FiEye },
  { label: "Discover", to: "/search", icon: FiCompass },
  { label: "Messages", to: "/messages", icon: FiMessageCircle },
  { label: "Activity", to: "/activity", icon: FiHeart, badge: true },
  { label: "Profile", to: "/profile", icon: FiUser },
];

function FanWebSidebar({ capabilities, onCreate, onGetApp, status }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const display = getUserDisplay(user, status);

  const logoutAndNavigate = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (location.pathname === "/search") {
    return (
      <aside className="sticky top-0 hidden h-screen w-[76px] shrink-0 flex-col border-r border-white/[0.055] bg-[#050608] px-[10px] pb-[44px] pt-[48px] md:flex min-[1020px]:w-[300px] min-[1020px]:px-[22px] min-[1180px]:w-[330px]">
        <NavLink aria-label="@seen home" className="mx-auto mb-[42px] flex items-center py-1.5 text-[28px] font-black tracking-[-0.045em] text-white min-[1020px]:w-[138px]" to="/wall">
          <span className="text-atseen-blue">@</span>seen
        </NavLink>
        <nav aria-label="Fan navigation" className="mx-auto w-full max-w-[142px] space-y-4">
          {searchPrototypeNav.map((item) => (
            <NavLink
              className={({ isActive }) =>
                `relative flex min-h-11 items-center gap-[22px] rounded-full px-3 py-2.5 text-[18px] font-bold transition duration-150 ${
                  isActive ? "text-white" : "text-white/62 hover:bg-white/[0.045] hover:text-white"
                }`
              }
              key={item.to}
              to={item.to}
            >
              <span className="relative grid h-7 w-7 shrink-0 place-items-center">
                <item.icon className="h-[24px] w-[24px]" strokeWidth={2.1} />
                {item.badge ? <span className="absolute right-0 top-0 h-[7px] w-[7px] rounded-full bg-atseen-blue" /> : null}
              </span>
              <span className="truncate max-[1019px]:sr-only">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button
          className="mx-auto mt-[30px] hidden min-h-[60px] w-full max-w-[284px] rounded-full bg-gradient-to-br from-[#9ccbff] to-[#6fa9e8] px-6 text-[16px] font-black text-[#050608] shadow-[0_18px_40px_rgba(111,169,232,0.2)] transition hover:brightness-110 min-[1020px]:block"
          onClick={onCreate || (() => navigate("/create"))}
          type="button"
        >
          Create ✦
        </button>
        <NavLink className="mx-auto mt-auto flex w-full max-w-[142px] items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.05] min-[1020px]:max-w-[284px]" to="/profile">
          <FanAvatar name={display.name} size="h-12 w-12" src={display.avatar} />
          <span className="min-w-0 max-[1019px]:sr-only">
            <span className="block truncate text-[16px] font-extrabold text-white">{display.name}</span>
            <span className="mt-1 block text-[13px] font-medium text-white/40">Your space</span>
          </span>
        </NavLink>
      </aside>
    );
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-[76px] shrink-0 flex-col border-r border-white/[0.05] px-[10px] pb-6 pt-[34px] md:flex min-[1020px]:w-[240px] min-[1020px]:px-[18px]">
      <NavLink aria-label="Atseen home" className="mb-[30px] flex items-center justify-center py-1.5 [&_span]:hidden min-[1020px]:justify-start min-[1020px]:px-3 min-[1020px]:[&_span]:inline" to="/wall">
        <AtseenLogo />
      </NavLink>
      <nav aria-label="Fan navigation" className="space-y-0.5">
        {socialPrimaryNavItems.map((item) => (
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
            <span className="truncate max-[1019px]:sr-only">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <nav aria-label="Account actions" className="mt-5 space-y-0.5 border-t border-white/[0.05] pt-5">
        {socialSecondaryNavItems(capabilities).map((item) => (
          item.to === "/create" && onCreate ? (
            <button
              className="flex min-h-11 w-full items-center gap-3.5 rounded-xl px-3 py-3 text-left text-sm font-semibold text-atseen-blue transition hover:bg-atseen-blue/10"
              key={item.to}
              onClick={onCreate}
              type="button"
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="truncate max-[1019px]:sr-only">{item.label}</span>
            </button>
          ) : (
            <NavLink
              className={({ isActive }) => `flex min-h-11 items-center gap-3.5 rounded-xl px-3 py-3 text-sm font-semibold transition ${isActive ? "text-white" : item.emphasis ? "text-atseen-blue hover:bg-atseen-blue/10" : "text-atseen-muted hover:bg-atseen-surface-2 hover:text-white"}`}
              key={item.to}
              to={item.to}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="truncate max-[1019px]:sr-only">{item.label}</span>
            </NavLink>
          )
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
          className="flex min-h-10 w-full items-center justify-center gap-2 rounded-[13px] bg-gradient-to-br from-atseen-blue to-atseen-blue-strong px-3 py-2.5 text-sm font-bold text-atseen-bg transition hover:brightness-110 max-[1019px]:hidden"
          onClick={onGetApp}
          type="button"
        >
          Get the app
        </button>
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
