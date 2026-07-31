import { Navigate, Route, Routes, useParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AuthLayout from "../layouts/AuthLayout";
import CreatorAppShell from "../layouts/CreatorAppShell";
import AdminLayout from "../layouts/AdminLayout";
import SocialAppShell from "../layouts/SocialAppShell";
import ProtectedRoute from "./ProtectedRoute";
import RoleProtectedRoute from "./RoleProtectedRoute";
import ApprovedCreatorRoute from "./ApprovedCreatorRoute";
import ExplorePage from "../pages/public/ExplorePage";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage";
import FanHomePage from "../pages/fan/FanHomePage";
import WalletPage from "../pages/fan/WalletPage";
import SubscriptionsPage from "../pages/fan/SubscriptionsPage";
import PurchasesPage from "../pages/fan/PurchasesPage";
import MessagesPage from "../pages/fan/MessagesPage";
import ActivityPage from "../pages/fan/ActivityPage";
import WorldsPage from "../pages/fan/WorldsPage";
import WorldExperiencePage from "../pages/fan/WorldExperiencePage";
import OrbitPage from "../pages/fan/OrbitPage";
import FanProfilePage from "../pages/fan/FanProfilePage";
import CreatorStudio from "../pages/creator/CreatorStudio";
import CreatorApplicationPage from "../pages/creator/CreatorApplicationPage";
import CreatorVerificationPage from "../pages/creator/CreatorVerificationPage";
import ContentManager from "../pages/creator/ContentManager";
import ContentComposerPage from "../pages/creator/ContentComposerPage";
import ContentDetailPage from "../pages/creator/ContentDetailPage";
import EarningsPage from "../pages/creator/EarningsPage";
import AdminDashboard from "../pages/admin/AdminDashboard";
import UserManagement from "../pages/admin/UserManagement";
import ContentModeration from "../pages/admin/ContentModeration";
import ContentModerationDetail from "../pages/admin/ContentModerationDetail";
import CreatorVerificationQueue from "../pages/admin/CreatorVerificationQueue";
import CreatorVerificationDetail from "../pages/admin/CreatorVerificationDetail";
import { ROLES } from "../utils/constants";
import ProfileSettingsPage from "../pages/settings/ProfileSettingsPage";
import PrivacySettingsPage from "../pages/settings/PrivacySettingsPage";
import NotificationSettingsPage from "../pages/settings/NotificationSettingsPage";
import AccountSettingsPage from "../pages/settings/AccountSettingsPage";
import CreatorSettingsPage from "../pages/creator/CreatorSettingsPage";
import UnifiedProfilePage from "../pages/social/UnifiedProfilePage";
import { useAuth } from "../hooks/useAuth";
import CreateHubPage from "../pages/create/CreateHubPage";
import SeenComposerPage from "../pages/creator/SeenComposerPage";
import SeenManagerPage from "../pages/creator/SeenManagerPage";
import SeenOwnerDetailPage from "../pages/creator/SeenOwnerDetailPage";
import SeenFeedPage from "../pages/social/SeenFeedPage";
import SeenReaderPage from "../pages/social/SeenReaderPage";
import SearchPage from "../pages/social/SearchPage";
import PublicationModeration from "../pages/admin/PublicationModeration";
import PublicationModerationDetail from "../pages/admin/PublicationModerationDetail";
import OnboardingPage from "../pages/onboarding/OnboardingPage";
import WelcomePage from "../pages/onboarding/WelcomePage";

function RootRedirect() {
  const { loading, user } = useAuth();
  if (loading) return null;
  if (user?.role === ROLES.ADMIN) return <Navigate replace to="/admin/dashboard" />;
  return <Navigate replace to={user ? "/wall" : "/login"} />;
}

function LegacyCreatorProfileRedirect() {
  const { username } = useParams();
  return <Navigate replace to={`/profile/${encodeURIComponent(username)}`} />;
}

function AppRoutes() {
  return <Routes>
    <Route element={<MainLayout />}>
      <Route index element={<RootRedirect />} />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/creators/:username" element={<LegacyCreatorProfileRedirect />} />
    </Route>

    <Route element={<AuthLayout />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Route>

    <Route path="/welcome" element={<WelcomePage />} />

    <Route element={<ProtectedRoute />}>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/onboarding/:step" element={<OnboardingPage />} />

      <Route element={<MainLayout />}>
        <Route path="/settings" element={<Navigate replace to="/settings/profile" />} />
        <Route path="/settings/profile" element={<ProfileSettingsPage />} />
        <Route path="/settings/account" element={<AccountSettingsPage />} />
        <Route path="/settings/privacy" element={<PrivacySettingsPage />} />
        <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
      </Route>

      <Route element={<RoleProtectedRoute allowedRoles={[ROLES.FAN, ROLES.CREATOR]} requireCreatorApproval={false} />}>
        <Route element={<SocialAppShell />}>
          <Route path="/wall" element={<FanHomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/seen" element={<SeenFeedPage />} />
          <Route path="/orbit" element={<OrbitPage />} />
          <Route path="/worlds/:id" element={<WorldExperiencePage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/profile" element={<FanProfilePage />} />
          <Route path="/settings/security" element={<Navigate replace to="/settings/account" />} />
          <Route element={<ApprovedCreatorRoute />}>
            <Route path="/studio" element={<CreatorStudio />} />
            <Route path="/create" element={<CreateHubPage />} />
            <Route path="/create/seen" element={<SeenComposerPage />} />
            <Route path="/studio/seens" element={<SeenManagerPage />} />
            <Route path="/studio/seens/:id" element={<SeenOwnerDetailPage />} />
            <Route path="/studio/seens/:id/edit" element={<SeenComposerPage />} />
          </Route>
          <Route path="/fan/dashboard" element={<Navigate replace to="/wall" />} />
          <Route path="/fan/home" element={<Navigate replace to="/wall" />} />
          <Route path="/fan/orbit" element={<Navigate replace to="/orbit" />} />
          <Route path="/fan/messages" element={<Navigate replace to="/messages" />} />
          <Route path="/fan/activity" element={<Navigate replace to="/activity" />} />
          <Route path="/fan/profile" element={<Navigate replace to="/profile" />} />
          <Route element={<RoleProtectedRoute allowedRoles={[ROLES.FAN]} />}>
            <Route path="/fan/worlds" element={<WorldsPage />} />
            <Route path="/fan/wallet" element={<WalletPage />} />
            <Route path="/fan/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/fan/purchases" element={<PurchasesPage />} />
          </Route>
        </Route>
      </Route>

      <Route element={<RoleProtectedRoute allowedRoles={[ROLES.CREATOR]} requireCreatorApproval={false} />}>
        <Route element={<CreatorAppShell />}>
            <Route path="/creator/dashboard" element={<Navigate replace to="/wall" />} />
            <Route path="/creator/verification" element={<CreatorVerificationPage />} />
            <Route path="/creator/application" element={<CreatorApplicationPage />} />
            <Route path="/creator/profile" element={<Navigate replace to="/profile" />} />
            <Route path="/creator/settings" element={<CreatorSettingsPage />} />
            <Route path="/creator/settings/profile" element={<ProfileSettingsPage creatorMode />} />
            <Route path="/creator/settings/privacy" element={<PrivacySettingsPage />} />
            <Route path="/creator/settings/notifications" element={<NotificationSettingsPage />} />
            <Route path="/creator/settings/account" element={<AccountSettingsPage />} />
            <Route path="/creator/settings/security" element={<Navigate replace to="/creator/settings/account" />} />
            <Route element={<ApprovedCreatorRoute />}>
              <Route path="/creator/studio" element={<Navigate replace to="/studio" />} />
              <Route path="/creator/content" element={<ContentManager />} />
              <Route path="/creator/content/new" element={<ContentComposerPage />} />
              <Route path="/creator/content/:id/edit" element={<ContentComposerPage />} />
              <Route path="/creator/content/:id" element={<ContentDetailPage />} />
              <Route path="/creator/earnings" element={<EarningsPage />} />
            </Route>
        </Route>
      </Route>

      <Route element={<RoleProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/fans" element={<UserManagement fixedRole="fan" />} />
          <Route path="/admin/creators" element={<UserManagement fixedRole="creator" />} />
          <Route path="/admin/creator-verifications" element={<CreatorVerificationQueue />} />
          <Route path="/admin/creator-verifications/:id" element={<CreatorVerificationDetail />} />
          <Route path="/admin/content-moderation" element={<ContentModeration />} />
          <Route path="/admin/content-moderation/:id" element={<ContentModerationDetail />} />
          <Route path="/admin/publication-moderation" element={<PublicationModeration />} />
          <Route path="/admin/publication-moderation/:id" element={<PublicationModerationDetail />} />
          <Route path="/admin/moderation" element={<Navigate replace to="/admin/content-moderation" />} />
          <Route path="/admin/profile" element={<ProfileSettingsPage />} />
          <Route path="/admin/settings/profile" element={<ProfileSettingsPage />} />
          <Route path="/admin/settings/privacy" element={<PrivacySettingsPage />} />
          <Route path="/admin/settings/notifications" element={<NotificationSettingsPage />} />
          <Route path="/admin/settings/account" element={<AccountSettingsPage />} />
        </Route>
      </Route>
    </Route>

    <Route path="/profile/:username" element={<UnifiedProfilePage />} />
    <Route path="/seen/:id" element={<SeenReaderPage />} />

    <Route path="*" element={<Navigate replace to="/" />} />
  </Routes>;
}

export default AppRoutes;


