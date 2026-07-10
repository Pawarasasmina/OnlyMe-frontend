import { Outlet } from "react-router-dom";

function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4 py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-brand-slate/90 p-8 shadow-glow backdrop-blur">
        <Outlet />
      </div>
    </div>
  );
}

export default AuthLayout;
