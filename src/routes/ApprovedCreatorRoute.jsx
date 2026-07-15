import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function ApprovedCreatorRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate replace to="/login" />;
  if (user.role !== "creator") return <Navigate replace to={user.role === "admin" ? "/admin/dashboard" : "/fan/dashboard"} />;
  if (user.creatorApprovalStatus !== "approved") {
    return <Navigate replace state={{ approvalRequired: true }} to="/creator/dashboard" />;
  }
  return <Outlet />;
}

export default ApprovedCreatorRoute;
