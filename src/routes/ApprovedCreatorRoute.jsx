import { useLanguage as __useUiLanguage } from "../hooks/useLanguage.js";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function ApprovedCreatorRoute() {
  __useUiLanguage();
  const { user } = useAuth();
  if (!user) return <Navigate replace to="/login" />;
  if (!["fan", "creator"].includes(user.role)) return <Navigate replace to={user.role === "admin" ? "/admin/dashboard" : "/seen"} />;
  if (user.creatorApprovalStatus !== "approved" && !["creator", "business"].includes(user.profileType)) {
    return <Navigate replace state={{ approvalRequired: true }} to="/creator/verification" />;
  }
  return <Outlet />;
}

export default ApprovedCreatorRoute;
