import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";

function DashboardLayout({ title, links }) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-160px)] max-w-7xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-[260px_1fr]">
      <Sidebar links={links} />
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-brand-mist/70">This area is scaffolded and ready for feature work.</p>
        </div>
        <Outlet />
      </section>
    </div>
  );
}

export default DashboardLayout;
