import { useLanguage as __useUiLanguage } from "../hooks/useLanguage.js";
import { Outlet } from "react-router-dom";

function AuthLayout() {
  __useUiLanguage();
  return (
    <div className="user-app-shell min-h-[100dvh] bg-[#050608] text-white">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[470px] overflow-hidden border-x border-white/[.06] bg-[radial-gradient(120%_70%_at_50%_0%,#101923_0%,#080B0F_48%,#06080B_100%)]">
        <Outlet />
      </div>
    </div>
  );
}

export default AuthLayout;
