import { useLanguage as __useUiLanguage } from "../hooks/useLanguage.js";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function ApprovedCreatorRoute() {
  __useUiLanguage();
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user) return <Navigate replace to="/login" />;
  if (!["fan", "creator"].includes(user.role)) return <Navigate replace to={user.role === "admin" ? "/admin/dashboard" : "/seen"} />;
  if (["/studio", "/grow"].includes(pathname) && ["creator", "business"].includes(user.profileAccountType)) return <Outlet />;
  if (user.creatorApprovalStatus !== "approved" && !["creator", "business"].includes(user.profileType)) {
    return <Navigate replace state={{ approvalRequired: true }} to="/creator/verification" />;
  }
  return <Outlet />;
}

export default ApprovedCreatorRoute;
