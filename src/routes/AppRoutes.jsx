import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import FanWebLayout from "../layouts/FanWebLayout";
import ProtectedRoute from "./ProtectedRoute";
import RoleProtectedRoute from "./RoleProtectedRoute";
import ExplorePage from "../pages/public/ExplorePage";
import CreatorProfilePage from "../pages/public/CreatorProfilePage";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import FanHomePage from "../pages/fan/FanHomePage";
import WalletPage from "../pages/fan/WalletPage";
import SubscriptionsPage from "../pages/fan/SubscriptionsPage";
import PurchasesPage from "../pages/fan/PurchasesPage";
import MessagesPage from "../pages/fan/MessagesPage";
import ActivityPage from "../pages/fan/ActivityPage";
import OrbitPage from "../pages/fan/OrbitPage";
import WorldsPage from "../pages/fan/WorldsPage";
import FanProfilePage from "../pages/fan/FanProfilePage";
import CreatorDashboard from "../pages/creator/CreatorDashboard";
import CreatorStudio from "../pages/creator/CreatorStudio";
import ContentManager from "../pages/creator/ContentManager";
import EarningsPage from "../pages/creator/EarningsPage";
import AdminDashboard from "../pages/admin/AdminDashboard";
import UserManagement from "../pages/admin/UserManagement";
import ContentModeration from "../pages/admin/ContentModeration";
import { ROLES } from "../utils/constants";
import ProfileSettingsPage from "../pages/settings/ProfileSettingsPage";
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
        <Route index element={<Navigate replace to="/fan/dashboard" />} />
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
          <Route path="/settings/profile" element={<ProfileSettingsPage />} />
          <Route path="/settings/account" element={<ProfileSettingsPage />} />
          <Route path="/settings/privacy" element={<ProfileSettingsPage />} />
          <Route path="/settings/notifications" element={<ProfileSettingsPage />} />
        </Route>
        <Route
          element={<RoleProtectedRoute allowedRoles={[ROLES.FAN]} />}
        >
          <Route element={<FanWebLayout />}>
            <Route path="/fan/home" element={<Navigate replace to="/fan/dashboard" />} />
            <Route path="/fan/stories/new" element={<Navigate replace to="/fan/dashboard" />} />
            <Route path="/fan/stories/create" element={<Navigate replace to="/fan/dashboard" />} />
            <Route path="/fan/story/create" element={<Navigate replace to="/fan/dashboard" />} />
            <Route path="/fan/dashboard" element={<FanHomePage />} />
            <Route path="/fan/orbit" element={<OrbitPage />} />
            <Route path="/fan/worlds" element={<WorldsPage />} />
            <Route path="/fan/messages" element={<MessagesPage />} />
            <Route path="/fan/activity" element={<ActivityPage />} />
            <Route path="/fan/profile" element={<FanProfilePage />} />
            <Route path="/fan/wallet" element={<WalletPage />} />
            <Route path="/fan/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/fan/purchases" element={<PurchasesPage />} />
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
