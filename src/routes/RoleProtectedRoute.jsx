import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function RoleProtectedRoute({ allowedRoles = [] }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate replace to="/" />;
  }

  if (user.role === "creator" && user.creatorApprovalStatus !== "approved") {
    return <Navigate replace to="/creator/application" />;
  }

  return <Outlet />;
}

export default RoleProtectedRoute;
