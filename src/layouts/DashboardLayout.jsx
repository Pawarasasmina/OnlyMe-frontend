import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";

function DashboardLayout({ title, links }) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-160px)] max-w-7xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[260px_1fr] md:py-8">
      <Sidebar links={links} />
      <section className="min-w-0 rounded-[2rem] border border-white/10 bg-white/5 p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
        </div>
        <Outlet />
      </section>
    </div>
  );
}

export default DashboardLayout;
