/* i18n-source-migrated */
import { msg as __msg } from "../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../hooks/useLanguage.js";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useParams, useSearchParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AuthLayout from "../layouts/AuthLayout";
import CreatorAppShell from "../layouts/CreatorAppShell";
import AdminLayout from "../layouts/AdminLayout";
import SocialAppShell from "../layouts/SocialAppShell";
import ProtectedRoute from "./ProtectedRoute";
import RoleProtectedRoute from "./RoleProtectedRoute";
import ApprovedCreatorRoute from "./ApprovedCreatorRoute";
import { ROLES } from "../utils/constants";
import { useAuth } from "../hooks/useAuth";
import { defaultDestinationFor } from "../utils/socialAccess";
import Loader from "../components/common/Loader";

const pageModules = import.meta.glob("../pages/**/*.jsx");
const lazyPage = (path) => lazy(pageModules[`${path}.jsx`]);
const ExplorePage = lazyPage("../pages/public/ExplorePage");
const LoginPage = lazyPage("../pages/auth/LoginPage");
const RegisterPage = lazyPage("../pages/auth/RegisterPage");
const ForgotPasswordPage = lazyPage("../pages/auth/ForgotPasswordPage");
const ResetPasswordPage = lazyPage("../pages/auth/ResetPasswordPage");
const FanHomePage = lazyPage("../pages/fan/FanHomePage");
const MessagesPage = lazyPage("../pages/fan/MessagesPage");
const ActivityPage = lazyPage("../pages/fan/ActivityPage");
const WorldsPage = lazyPage("../pages/fan/WorldsPage");
const CreatorStudio = lazyPage("../pages/creator/CreatorStudio");
const WaysToEarnPage = lazyPage("../pages/creator/WaysToEarnPage");
const GrowPage = lazyPage("../pages/creator/GrowPage");
const GrowFanPreviewPage = lazyPage("../pages/creator/GrowFanPreviewPage");
const ReferralLandingPage = lazyPage("../pages/public/ReferralLandingPage");
const InvitationWorldPage = lazyPage("../pages/social/InvitationWorldPage");
const CreatorApplicationPage = lazyPage("../pages/creator/CreatorApplicationPage");
const CreatorVerificationPage = lazyPage("../pages/creator/CreatorVerificationPage");
const SellerVerificationPage = lazyPage("../pages/creator/SellerVerificationPage");
const IdentityVerificationManagement = lazyPage("../pages/admin/IdentityVerificationManagement");
const ContentManager = lazyPage("../pages/creator/ContentManager");
const ContentComposerPage = lazyPage("../pages/creator/ContentComposerPage");
const ContentDetailPage = lazyPage("../pages/creator/ContentDetailPage");
const EarningsPage = lazyPage("../pages/creator/EarningsPage");
const AdminDashboard = lazyPage("../pages/admin/AdminDashboard");
const AdminStaffPage = lazyPage("../pages/admin/AdminStaffPage");
const SafetyCenterPage = lazyPage("../pages/admin/SafetyCenterPage");
const GovernancePage = lazyPage("../pages/admin/GovernancePage");
const AdminUserDetailPage = lazyPage("../pages/admin/AdminUserDetailPage");
const FinanceUserPage = lazyPage("../pages/admin/FinanceUserPage");
const AdminSecuritySetupPage = lazyPage("../pages/admin/AdminSecuritySetupPage");
const ModerationAppealPage = lazyPage("../pages/social/ModerationAppealPage");
const ContentExportPage = lazyPage("../pages/admin/ContentExportPage");
const AdminAnalyticsPage = lazyPage("../pages/admin/AdminAnalyticsPage");
const RecommendationSettingsPage = lazyPage("../pages/admin/RecommendationSettingsPage");
const UserManagement = lazyPage("../pages/admin/UserManagement");
const AdminProfilePage = lazyPage("../pages/admin/AdminProfilePage");
const CreatorVerificationQueue = lazyPage("../pages/admin/CreatorVerificationQueue");
const CreatorVerificationDetail = lazyPage("../pages/admin/CreatorVerificationDetail");
const ProfileSettingsPage = lazyPage("../pages/settings/ProfileSettingsPage");
const DirectAccessSettingsPage = lazyPage("../pages/settings/DirectAccessSettingsPage");
const MonetizationPage = lazyPage("../pages/settings/MonetizationPage");
const SettingsPage = lazyPage("../pages/settings/SettingsPage");
const CreatorSettingsPage = lazyPage("../pages/creator/CreatorSettingsPage");
const CreatorSecurityPage = lazyPage("../pages/creator/CreatorSecurityPage");
const AccountSecurityPage = lazyPage("../pages/settings/AccountSecurityPage");
const UnifiedProfilePage = lazyPage("../pages/social/UnifiedProfilePage");
const ProfileStatusPage = lazyPage("../pages/social/ProfileStatusPage");
const DreamEditorPage = lazyPage("../pages/social/DreamEditorPage");
const CreateHubPage = lazyPage("../pages/create/CreateHubPage");
const SeenComposerPage = lazyPage("../pages/creator/SeenComposerPage");
const SeenFeedPage = lazyPage("../pages/social/SeenFeedPage");
const SeenPermalinkPage = lazyPage("../pages/social/SeenPermalinkPage");
const ShareSeenAsStoryPage = lazyPage("../pages/social/ShareSeenAsStoryPage");
const StoryPermalinkPage = lazyPage("../pages/social/StoryPermalinkPage");
const PublicationModeration = lazyPage("../pages/admin/PublicationModeration");
const PublicationModerationDetail = lazyPage("../pages/admin/PublicationModerationDetail");
const WelcomeEmailSettingsPage = lazyPage("../pages/admin/WelcomeEmailSettingsPage");
const WorldComposerPage = lazyPage("../pages/creator/WorldComposerPage");
const WorldReaderPage = lazyPage("../pages/social/WorldReaderPage");
const OrbitPage = lazyPage("../pages/social/OrbitPage");
const WalletPage = lazyPage("../pages/social/WalletPage");
const WalletLedgerPage = lazyPage("../pages/social/WalletLedgerPage");
const WithdrawPage = lazyPage("../pages/social/WithdrawPage");
const IncomeToCoinsPage = lazyPage("../pages/social/IncomeToCoinsPage");
const MyExperiencesPage = lazyPage("../pages/social/MyExperiencesPage");
const PurchasesPage = lazyPage("../pages/social/PurchasesPage");
const MembershipsPage = lazyPage("../pages/social/MembershipsPage");
const MembershipCancellationPage = lazyPage("../pages/social/MembershipCancellationPage");
const BankReviewPage = lazyPage("../pages/admin/BankReviewPage");
const FinancialAdminPage = lazyPage("../pages/admin/FinancialAdminPage");
const SavedPage = lazyPage("../pages/social/SavedPage");
const JoinedInvitationsPage = lazyPage("../pages/social/JoinedInvitationsPage");
const ArchivePage = lazyPage("../pages/social/ArchivePage");
const AdminReportListPage = lazyPage("../pages/admin/AdminReportListPage");
const AdminReportDetailPage = lazyPage("../pages/admin/AdminReportDetailPage");
const EntityDetailPage = lazyPage("../pages/social/EntityDetailPage");
const WallExplorePage = lazyPage("../pages/social/WallExplorePage");
const WallSearchPage = lazyPage("../pages/social/WallSearchPage");
const OfficialSeenPage = lazyPage("../pages/social/OfficialSeenPage");
const SearchPage = lazyPage("../pages/social/SearchPage");
const DiscoverPage = lazyPage("../pages/social/DiscoverPage");
const PostDetailPage = lazyPage("../pages/social/PostDetailPage");
const OnboardingPage = lazyPage("../pages/onboarding/OnboardingPage");
const WelcomePage = lazyPage("../pages/onboarding/WelcomePage");
const PublicStoryInterestsPage = lazyPage("../pages/onboarding/PublicStoryInterestsPage");
const AccountSettingsPage = lazyPage("../pages/settings/AccountSettingsPage");
const PrivacySettingsPage = lazyPage("../pages/settings/PrivacySettingsPage");
const NotificationSettingsPage = lazyPage("../pages/settings/NotificationSettingsPage");
const ContentPreferencesPage = lazyPage("../pages/settings/ContentPreferencesPage");
const SupportPage = lazyPage("../pages/settings/SupportPage");
const GiftManagementPage = lazyPage("../pages/admin/GiftManagementPage");
const VerifiedCreatorPage = lazyPage("../pages/creator/VerifiedCreatorPage");

function RootRedirect() {
  __useUiLanguage();
  const { loading, user } = useAuth();
  if (loading) return null;
  if (user?.role === ROLES.ADMIN) return <Navigate replace to={!user.adminTwoFactorEnabled ? "/admin/security" : user.adminRole === "FINANCE" ? "/admin/financial" : "/admin/dashboard"} />;
  return <Navigate replace to={user ? defaultDestinationFor(user.role) : "/welcome"} />;
}

function LegacyCreatorProfileRedirect() {
  __useUiLanguage();
  const { username } = useParams();
  return <Navigate replace to={`/profile/${encodeURIComponent(username)}`} />;
}

function ProfileRoute() {
  __useUiLanguage();
  const { loading, user } = useAuth();
  if (loading) return null;
  if (user && user.role !== ROLES.ADMIN) return <SocialAppShell><UnifiedProfilePage embedded /></SocialAppShell>;
  return <UnifiedProfilePage />;
}

function WorldRoute() {
  __useUiLanguage();
  const { id } = useParams();
  const { loading, user } = useAuth();
  if (loading) return null;
  if (user && user.role !== ROLES.ADMIN) return <SocialAppShell><WorldReaderPage key={id} /></SocialAppShell>;
  return <WorldReaderPage key={id} />;
}

function WallRoute() {
  __useUiLanguage();
  const [params] = useSearchParams();
  const post = params.get("post");
  return post ? <Navigate replace to={`/posts/${encodeURIComponent(post)}`} /> : <FanHomePage />;
}

function AppRoutes() {
  __useUiLanguage();
  return <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Loader label={__msg("routes.loadingPage")} /></div>}><Routes>
    <Route element={<MainLayout />}>
      <Route index element={<RootRedirect />} />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/creators/:username" element={<LegacyCreatorProfileRedirect />} />
      <Route path="/invite/:code" element={<ReferralLandingPage />} />
    </Route>

    <Route element={<AuthLayout />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
    </Route>

    <Route path="/welcome" element={<WelcomePage />} />
    <Route path="/start/interests" element={<PublicStoryInterestsPage />} />

    <Route element={<ProtectedRoute />}>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/onboarding/:step" element={<OnboardingPage />} />
      <Route element={<RoleProtectedRoute allowedRoles={[ROLES.FAN, ROLES.CREATOR]} requireCreatorApproval={false} />}>
        <Route element={<SocialAppShell />}>
          <Route path="/wall" element={<WallRoute />} />
          <Route path="/wall/notes/:id" element={<PostDetailPage legacy />} />
          <Route path="/home" element={<Navigate replace to="/wall" />} />
          <Route path="/posts/:id" element={<PostDetailPage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/profile/seen" element={<OfficialSeenPage />} />
          <Route path="/wall/search" element={<WallSearchPage />} />
          <Route path="/wall/explore" element={<WallExplorePage />} />
          <Route path="/seen" element={<SeenFeedPage />} />
          <Route path="/seen/:id/share/story" element={<ShareSeenAsStoryPage />} />
          <Route path="/seen/:id" element={<SeenPermalinkPage />} />
          <Route path="/orbit" element={<OrbitPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/appeals/:model/:reportId" element={<ModerationAppealPage />} />
          <Route path="/stories/:id" element={<StoryPermalinkPage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/saved/:category" element={<SavedPage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/invitations" element={<JoinedInvitationsPage />} />
          <Route path="/invitations/:code" element={<InvitationWorldPage />} />
          <Route path="/places/:id" element={<EntityDetailPage />} />
          <Route path="/books/:id" element={<EntityDetailPage />} />
          <Route path="/profile" element={<UnifiedProfilePage owner />} />
          <Route path="/profile/status" element={<ProfileStatusPage />} />
          <Route path="/profile/dream" element={<DreamEditorPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/monetization" element={<MonetizationPage />} />
          <Route path="/settings/profile" element={<ProfileSettingsPage />} />
          <Route element={<ApprovedCreatorRoute />}>
            <Route path="/settings/direct-access" element={<DirectAccessSettingsPage />} />
          </Route>
          <Route path="/settings/account" element={<AccountSettingsPage />} />
          <Route path="/settings/privacy" element={<PrivacySettingsPage />} />
          <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
          <Route path="/settings/content" element={<ContentPreferencesPage />} />
          <Route path="/settings/support/:section" element={<SupportPage />} />
          <Route path="/creator/verified" element={<VerifiedCreatorPage />} />
          <Route path="/settings/security" element={<AccountSecurityPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/wallet/withdraw" element={<WithdrawPage />} />
          <Route path="/wallet/to-coins" element={<IncomeToCoinsPage />} />
          <Route path="/wallet/ledger" element={<WalletLedgerPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/memberships" element={<MembershipsPage />} />
          <Route path="/memberships/:id/cancel" element={<MembershipCancellationPage />} />
          <Route path="/experiences" element={<MyExperiencesPage />} />
          <Route path="/profile/:username/experiences" element={<MyExperiencesPage />} />
          <Route element={<RoleProtectedRoute allowedRoles={[ROLES.FAN, ROLES.CREATOR]} requireCreatorApproval={false} />}>
            <Route path="/creator/verification" element={<CreatorVerificationPage />} />
            <Route path="/creator/seller-verification" element={<SellerVerificationPage />} />
          </Route>
          <Route path="/create" element={<CreateHubPage />} />
          <Route path="/create/seen" element={<SeenComposerPage />} />
          <Route path="/ways-to-earn" element={<WaysToEarnPage />} />
          <Route path="/studio/seens" element={<Navigate replace to="/profile" />} />
          <Route path="/studio/seens/:id" element={<Navigate replace to="/profile" />} />
          <Route path="/studio/seens/:id/edit" element={<SeenComposerPage />} />
          <Route element={<ApprovedCreatorRoute />}>
            <Route path="/studio" element={<CreatorStudio />} />
            <Route path="/grow" element={<GrowPage />} />
            <Route path="/grow/fan-preview" element={<GrowFanPreviewPage />} />
            <Route path="/create/world" element={<WorldComposerPage premium />} />
            <Route path="/create/premium-world" element={<WorldComposerPage premium />} />
            <Route path="/create/experience" element={<WorldComposerPage experience />} />
            <Route path="/studio/experiences/:id/edit" element={<WorldComposerPage experience />} />
            <Route path="/studio/worlds" element={<Navigate replace to="/profile" />} />
            <Route path="/studio/worlds/:id" element={<Navigate replace to="/profile" />} />
            <Route path="/studio/worlds/:id/edit" element={<WorldComposerPage />} />
          </Route>
          <Route path="/fan/dashboard" element={<Navigate replace to="/seen" />} />
          <Route path="/fan/home" element={<Navigate replace to="/seen" />} />
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

      <Route element={<RoleProtectedRoute allowedRoles={[ROLES.FAN, ROLES.CREATOR]} requireCreatorApproval={false} />}>
        <Route element={<CreatorAppShell />}>
            <Route path="/creator/dashboard" element={<Navigate replace to="/seen" />} />
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
          <Route path="/admin/security" element={<AdminSecuritySetupPage />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/admin/recommendations" element={<RecommendationSettingsPage />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
          <Route path="/admin/safety" element={<SafetyCenterPage />} />
          <Route path="/admin/governance" element={<GovernancePage />} />
          <Route path="/admin/content-export" element={<ContentExportPage />} />
          <Route element={<RoleProtectedRoute allowedRoles={[ROLES.ADMIN]} allowedAdminRoles={["MAIN_ADMIN"]} />}>
            <Route path="/admin/staff" element={<AdminStaffPage />} />
          </Route>
          <Route path="/admin/identity-verifications" element={<IdentityVerificationManagement />} />
          <Route path="/admin/fans" element={<Navigate replace to="/admin/users" />} />
          <Route path="/admin/creators" element={<Navigate replace to="/admin/users" />} />
          <Route path="/admin/creator-verifications" element={<CreatorVerificationQueue />} />
          <Route path="/admin/creator-verifications/:id" element={<CreatorVerificationDetail />} />
          <Route path="/admin/verified-creators" element={<Navigate replace to="/admin/identity-verifications" />} />
          <Route path="/admin/content-moderation" element={<Navigate replace to="/admin/publication-moderation" />} />
          <Route path="/admin/content-moderation/:id" element={<Navigate replace to="/admin/publication-moderation" />} />
          <Route path="/admin/publication-moderation" element={<PublicationModeration />} />
          <Route path="/admin/publication-moderation/:id" element={<PublicationModerationDetail />} />
          <Route path="/admin/moderation" element={<Navigate replace to="/admin/publication-moderation" />} />
          <Route path="/admin/welcome-email" element={<WelcomeEmailSettingsPage />} />
          <Route path="/admin/profile" element={<AdminProfilePage />} />
          <Route element={<RoleProtectedRoute allowedRoles={[ROLES.ADMIN]} allowedAdminRoles={["MAIN_ADMIN", "FINANCE"]} />}>
            <Route path="/admin/financial" element={<FinancialAdminPage />} />
            <Route path="/admin/bank-reviews" element={<BankReviewPage />} />
            <Route path="/admin/finance/users" element={<FinanceUserPage />} />
          </Route>
          <Route path="/admin/message-reports" element={<AdminReportListPage type="message" />} />
          <Route path="/admin/message-reports/:reportId" element={<AdminReportDetailPage type="message" />} />
          <Route path="/admin/user-reports" element={<AdminReportListPage type="user" />} />
          <Route path="/admin/user-reports/:reportId" element={<AdminReportDetailPage type="user" />} />
          <Route path="/admin/post-reports" element={<AdminReportListPage type="post" />} />
          <Route path="/admin/post-reports/:reportId" element={<AdminReportDetailPage type="post" />} />
          <Route path="/admin/gifts" element={<GiftManagementPage />} />
        </Route>
      </Route>
    </Route>

    <Route path="/profile/:username" element={<ProfileRoute />} />
    <Route path="/world/:id/inside" element={<WorldRoute />} />
    <Route path="/world/:id" element={<WorldRoute />} />
    <Route path="/experience/:id" element={<WorldRoute />} />
    <Route path="/planet/:id" element={<WorldRoute />} />

    <Route path="*" element={<Navigate replace to="/" />} />
  </Routes></Suspense>;
}

export default AppRoutes;


