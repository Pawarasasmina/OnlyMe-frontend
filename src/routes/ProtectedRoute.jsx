import { Navigate, Outlet, useLocation } from "react-router-dom";
import Loader from "../components/common/Loader";
import { useAuth } from "../hooks/useAuth";
import { canAccessAppDuringOnboarding, isConsumerRole, isOnboardingComplete, onboardingPathFor } from "../utils/socialAccess";

function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-7xl items-center px-4 sm:px-6">
        <Loader label="Checking session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (
    isConsumerRole(user.role)
    && !isOnboardingComplete(user)
    && !canAccessAppDuringOnboarding(user)
    && !location.pathname.startsWith("/onboarding")
  ) {
    return <Navigate replace state={{ from: location }} to={onboardingPathFor(user)} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
