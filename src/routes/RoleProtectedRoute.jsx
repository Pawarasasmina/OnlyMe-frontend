import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const dashboardFor = (user) => {
  if (user.role === "admin") return "/admin/dashboard";
  if (user.role === "creator") {
    return "/creator/dashboard";
  }
  return "/fan/dashboard";
};

function RoleProtectedRoute({ allowedRoles = [], requireCreatorApproval = true }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate replace to={dashboardFor(user)} />;
  }

  if (requireCreatorApproval && user.role === "creator" && user.creatorApprovalStatus !== "approved") {
    return <Navigate replace to="/creator/dashboard" />;
  }

  return <Outlet />;
}

export default RoleProtectedRoute;


