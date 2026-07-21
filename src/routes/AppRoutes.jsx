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
import FanHomePage from "../pages/fan/FanHomePage";
import MessagesPage from "../pages/fan/MessagesPage";
import ActivityPage from "../pages/fan/ActivityPage";
import WorldsPage from "../pages/fan/WorldsPage";
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
import AdminProfilePage from "../pages/admin/AdminProfilePage";
import CreatorVerificationQueue from "../pages/admin/CreatorVerificationQueue";
import CreatorVerificationDetail from "../pages/admin/CreatorVerificationDetail";
import { ROLES } from "../utils/constants";
import ProfileSettingsPage from "../pages/settings/ProfileSettingsPage";
import CreatorSettingsPage from "../pages/creator/CreatorSettingsPage";
import CreatorSecurityPage from "../pages/creator/CreatorSecurityPage";
import AccountSecurityPage from "../pages/settings/AccountSecurityPage";
import FanBackedSocialPage from "../pages/social/FanBackedSocialPage";
import UnifiedProfilePage from "../pages/social/UnifiedProfilePage";
import { useAuth } from "../hooks/useAuth";
import CreateHubPage from "../pages/create/CreateHubPage";
import SeenComposerPage from "../pages/creator/SeenComposerPage";
import SeenManagerPage from "../pages/creator/SeenManagerPage";
import SeenOwnerDetailPage from "../pages/creator/SeenOwnerDetailPage";
import SeenFeedPage from "../pages/social/SeenFeedPage";
import SeenReaderPage from "../pages/social/SeenReaderPage";
import PublicationModeration from "../pages/admin/PublicationModeration";
import PublicationModerationDetail from "../pages/admin/PublicationModerationDetail";
import WorldComposerPage from "../pages/creator/WorldComposerPage";
import WorldManagerPage from "../pages/creator/WorldManagerPage";
import WorldOwnerDetailPage from "../pages/creator/WorldOwnerDetailPage";
import WorldReaderPage from "../pages/social/WorldReaderPage";
import OrbitPage from "../pages/social/OrbitPage";
import WalletPage from "../pages/social/WalletPage";
import WalletLedgerPage from "../pages/social/WalletLedgerPage";
import PurchasesPage from "../pages/social/PurchasesPage";
import MembershipsPage from "../pages/social/MembershipsPage";
import FinancialAdminPage from "../pages/admin/FinancialAdminPage";
import SavedPage from "../pages/social/SavedPage";

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

function ProfileRoute() {
  const { loading, user } = useAuth();
  if (loading) return null;
  if (user && [ROLES.FAN, ROLES.CREATOR].includes(user.role)) return <SocialAppShell><UnifiedProfilePage embedded /></SocialAppShell>;
  return <UnifiedProfilePage />;
}

function WorldRoute() {
  const { loading, user } = useAuth();
  if (loading) return null;
  if (user && [ROLES.FAN, ROLES.CREATOR].includes(user.role)) return <SocialAppShell><WorldReaderPage /></SocialAppShell>;
  return <WorldReaderPage />;
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
    </Route>

    <Route element={<ProtectedRoute />}>
      <Route element={<MainLayout />}>
        <Route path="/settings/profile" element={<ProfileSettingsPage />} />
        <Route path="/settings/account" element={<ProfileSettingsPage />} />
        <Route path="/settings/privacy" element={<ProfileSettingsPage />} />
        <Route path="/settings/notifications" element={<ProfileSettingsPage />} />
      </Route>

      <Route element={<RoleProtectedRoute allowedRoles={[ROLES.FAN, ROLES.CREATOR]} requireCreatorApproval={false} />}>
        <Route element={<SocialAppShell />}>
          <Route path="/wall" element={<FanHomePage />} />
          <Route path="/seen" element={<SeenFeedPage />} />
          <Route path="/orbit" element={<OrbitPage />} />
          <Route path="/messages" element={<FanBackedSocialPage description="Creator messaging is not connected to the shared social shell yet." title="Messages"><MessagesPage /></FanBackedSocialPage>} />
          <Route path="/activity" element={<FanBackedSocialPage description="Creator activity is not connected to the shared social shell yet." title="Activity"><ActivityPage /></FanBackedSocialPage>} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/profile" element={<UnifiedProfilePage owner />} />
          <Route path="/settings" element={<ProfileSettingsPage />} />
          <Route path="/settings/security" element={<AccountSecurityPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/wallet/ledger" element={<WalletLedgerPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/memberships" element={<MembershipsPage />} />
          <Route element={<RoleProtectedRoute allowedRoles={[ROLES.CREATOR]} requireCreatorApproval={false} />}>
            <Route path="/creator/verification" element={<CreatorVerificationPage />} />
          </Route>
          <Route element={<ApprovedCreatorRoute />}>
            <Route path="/studio" element={<CreatorStudio />} />
            <Route path="/create" element={<CreateHubPage />} />
            <Route path="/create/seen" element={<SeenComposerPage />} />
            <Route path="/create/world" element={<WorldComposerPage />} />
            <Route path="/create/premium-world" element={<WorldComposerPage premium />} />
            <Route path="/studio/seens" element={<SeenManagerPage />} />
            <Route path="/studio/seens/:id" element={<SeenOwnerDetailPage />} />
            <Route path="/studio/seens/:id/edit" element={<SeenComposerPage />} />
            <Route path="/studio/worlds" element={<WorldManagerPage />} />
            <Route path="/studio/worlds/:id" element={<WorldOwnerDetailPage />} />
            <Route path="/studio/worlds/:id/edit" element={<WorldComposerPage />} />
          </Route>
          <Route path="/fan/dashboard" element={<Navigate replace to="/wall" />} />
          <Route path="/fan/home" element={<Navigate replace to="/wall" />} />
          <Route path="/fan/orbit" element={<Navigate replace to="/orbit" />} />
          <Route path="/fan/messages" element={<Navigate replace to="/messages" />} />
          <Route path="/fan/activity" element={<Navigate replace to="/activity" />} />
          <Route path="/fan/profile" element={<Navigate replace to="/profile" />} />
          <Route element={<RoleProtectedRoute allowedRoles={[ROLES.FAN]} />}>
            <Route path="/fan/worlds" element={<WorldsPage />} />
            <Route path="/fan/wallet" element={<Navigate replace to="/wallet" />} />
            <Route path="/fan/subscriptions" element={<Navigate replace to="/memberships" />} />
            <Route path="/fan/purchases" element={<Navigate replace to="/purchases" />} />
          </Route>
        </Route>
      </Route>

      <Route element={<RoleProtectedRoute allowedRoles={[ROLES.CREATOR]} requireCreatorApproval={false} />}>
        <Route element={<CreatorAppShell />}>
            <Route path="/creator/dashboard" element={<Navigate replace to="/wall" />} />
            <Route path="/creator/application" element={<CreatorApplicationPage />} />
            <Route path="/creator/profile" element={<Navigate replace to="/profile" />} />
            <Route path="/creator/settings" element={<CreatorSettingsPage />} />
            <Route path="/creator/settings/security" element={<CreatorSecurityPage />} />
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
          <Route path="/admin/profile" element={<AdminProfilePage />} />
          <Route path="/admin/financial" element={<FinancialAdminPage />} />
        </Route>
      </Route>
    </Route>

    <Route path="/profile/:username" element={<ProfileRoute />} />
    <Route path="/seen/:id" element={<SeenReaderPage />} />
    <Route path="/world/:id" element={<WorldRoute />} />
    <Route path="/planet/:id" element={<WorldRoute />} />

    <Route path="*" element={<Navigate replace to="/" />} />
  </Routes>;
}

export default AppRoutes;


