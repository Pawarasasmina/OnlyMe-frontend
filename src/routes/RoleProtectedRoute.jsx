import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const dashboardFor = (user) => {
  if (user.role === "admin") return "/admin/dashboard";
  if (user.role === "creator" || user.role === "fan") return "/wall";
  return "/login";
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
    return <Navigate replace to="/creator/verification" />;
  }

  return <Outlet />;
}

export default RoleProtectedRoute;


