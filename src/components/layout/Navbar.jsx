import { Link, NavLink } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import Button from "../common/Button";
import { NAV_LINKS } from "../../utils/constants";
import { useAuth } from "../../hooks/useAuth";

function Navbar() {
  const { user, logout } = useAuth();
  const dashboardPath = user?.role === "creator" ? "/creator/studio" : user?.role === "admin" ? "/admin/dashboard" : "/fan/dashboard";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-dark/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link className="text-xl font-black uppercase tracking-[0.28em]" to="/">
          OnlyMe
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              className={({ isActive }) => (isActive ? "text-brand-secondary" : "text-brand-mist/80")}
              to={link.to}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link className="text-sm font-semibold capitalize text-brand-secondary" to={dashboardPath}>{user.role} dashboard</Link>
              <Button onClick={logout} variant="ghost">
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button>Join Now</Button>
              </Link>
            </>
          )}
        </div>
        <button className="rounded-full border border-white/10 p-2 md:hidden" type="button">
          <FiMenu />
        </button>
      </div>
    </header>
  );
}

export default Navbar;
