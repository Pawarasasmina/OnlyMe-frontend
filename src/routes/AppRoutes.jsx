import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "./ProtectedRoute";
import RoleProtectedRoute from "./RoleProtectedRoute";
import HomePage from "../pages/public/HomePage";
import ExplorePage from "../pages/public/ExplorePage";
import CreatorProfilePage from "../pages/public/CreatorProfilePage";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import FanDashboard from "../pages/fan/FanDashboard";
import WalletPage from "../pages/fan/WalletPage";
import SubscriptionsPage from "../pages/fan/SubscriptionsPage";
import CreatorDashboard from "../pages/creator/CreatorDashboard";
import CreatorStudio from "../pages/creator/CreatorStudio";
import ContentManager from "../pages/creator/ContentManager";
import EarningsPage from "../pages/creator/EarningsPage";
import AdminDashboard from "../pages/admin/AdminDashboard";
import UserManagement from "../pages/admin/UserManagement";
import ContentModeration from "../pages/admin/ContentModeration";
import { ROLES } from "../utils/constants";

const fanLinks = [
  { label: "Overview", to: "/fan/dashboard" },
  { label: "Wallet", to: "/fan/wallet" },
  { label: "Subscriptions", to: "/fan/subscriptions" },
];

const creatorLinks = [
  { label: "Overview", to: "/creator/dashboard" },
  { label: "Studio", to: "/creator/studio" },
  { label: "Content", to: "/creator/content" },
  { label: "Earnings", to: "/creator/earnings" },
];

const adminLinks = [
  { label: "Overview", to: "/admin/dashboard" },
  { label: "Users", to: "/admin/users" },
  { label: "Moderation", to: "/admin/moderation" },
];

function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/creators/:username" element={<CreatorProfilePage />} />
        </Route>
        <Route
          element={<RoleProtectedRoute allowedRoles={[ROLES.FAN]} />}
        >
          <Route element={<MainLayout />}>
            <Route element={<DashboardLayout links={fanLinks} title="Fan Dashboard" />}>
              <Route path="/fan/dashboard" element={<FanDashboard />} />
              <Route path="/fan/wallet" element={<WalletPage />} />
              <Route path="/fan/subscriptions" element={<SubscriptionsPage />} />
            </Route>
          </Route>
        </Route>

        <Route
          element={<RoleProtectedRoute allowedRoles={[ROLES.CREATOR]} />}
        >
          <Route element={<MainLayout />}>
            <Route element={<DashboardLayout links={creatorLinks} title="Creator Dashboard" />}>
              <Route path="/creator/dashboard" element={<CreatorDashboard />} />
              <Route path="/creator/studio" element={<CreatorStudio />} />
              <Route path="/creator/content" element={<ContentManager />} />
              <Route path="/creator/earnings" element={<EarningsPage />} />
            </Route>
          </Route>
        </Route>

        <Route
          element={<RoleProtectedRoute allowedRoles={[ROLES.ADMIN]} />}
        >
          <Route element={<MainLayout />}>
            <Route element={<DashboardLayout links={adminLinks} title="Admin Dashboard" />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/moderation" element={<ContentModeration />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}

export default AppRoutes;
