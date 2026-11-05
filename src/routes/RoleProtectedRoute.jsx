import { useLanguage as __useUiLanguage } from "../hooks/useLanguage.js";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const dashboardFor = (user) => {
  if (user.role === "admin") return "/admin/dashboard";
  if (user.role === "creator" || user.role === "fan") return "/seen";
  return "/login";
};

function RoleProtectedRoute({ allowedRoles = [], allowedAdminRoles = null, requireCreatorApproval = true }) {
  __useUiLanguage();
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate replace to={dashboardFor(user)} />;
  }

  // The security enrollment route must remain reachable, but every other
  // administrator screen depends on the backend's mandatory 2FA gate.
  if (user.role === "admin" && !user.adminTwoFactorEnabled && location.pathname !== "/admin/security") {
    return <Navigate replace to="/admin/security" />;
  }

  if (user.role === "admin" && allowedAdminRoles && !allowedAdminRoles.includes(user.adminRole || "MAIN_ADMIN")) {
    return <Navigate replace to={(user.adminRole || "MAIN_ADMIN") === "FINANCE" ? "/admin/financial" : "/admin/dashboard"} />;
  }

  if (requireCreatorApproval && ["fan", "creator"].includes(user.role) && user.creatorApprovalStatus !== "approved") {
    return <Navigate replace to="/creator/verification" />;
  }

  return <Outlet />;
}

export default RoleProtectedRoute;


