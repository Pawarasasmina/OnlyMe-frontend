import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import AtseenLogo from "../components/branding/AtseenLogo";
import FanCreateSheet from "../components/fanWeb/FanCreateSheet";
import FanMobileNav from "../components/fanWeb/FanMobileNav";
import FanWebRightRail from "../components/fanWeb/FanWebRightRail";
import FanWebSidebar from "../components/fanWeb/FanWebSidebar";
import FanModal from "../components/fanWeb/shared/FanModal";
import { FanToastProvider } from "../components/fanWeb/shared/FanToast";
import StoryCreator from "../components/stories/StoryCreator";
import { useAuth } from "../hooks/useAuth";
import { useUnreadMessageCount } from "../hooks/useUnreadMessageCount";
import { useSocialCapabilities } from "../hooks/useSocialCapabilities";
import { CallProvider } from "../context/CallContext";
import { canCreateFeedPost } from "../utils/postPermissions";
import { canCreateStory } from "../utils/storyPermissions";
import CreatorVerificationPage from "../pages/creator/CreatorVerificationPage";

const STATUS_KEY = "atseen_social_status";

function SocialAppShell({ children = null }) {
  const { user } = useAuth();
  const capabilities = useSocialCapabilities();
  const location = useLocation();
  const navigate = useNavigate();
  const isMessagesPage = location.pathname === "/messages";
  const isDiscoverPage = location.pathname === "/discover";
  const isHomePage = location.pathname === "/wall";
  const isSeenPage = location.pathname === "/seen"
    || location.pathname.startsWith("/seen/")
    || location.pathname === "/create/seen"
    || (location.pathname.startsWith("/studio/seens/") && location.pathname.endsWith("/edit"));
  const isWorldComposePage = location.pathname === "/create/premium-world";
  const unreadMessageCount = useUnreadMessageCount(Boolean(user), { poll: !isMessagesPage });
  const contentScrollRef = useRef(null);
  const [status, setStatus] = useState(() => localStorage.getItem(STATUS_KEY) || "");
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);

  useEffect(() => {
    if (status) localStorage.setItem(STATUS_KEY, status);
    else localStorage.removeItem(STATUS_KEY);
  }, [status]);

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches)
      contentScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  const outletContext = useMemo(() => ({ status, setStatus }), [status]);
  const mobileAction = capabilities.canCreate
    ? { label: "Create", to: "/create" }
    : capabilities.canAccessVerification && !capabilities.isApprovedCreator
      ? { label: "Verify", to: "/creator/verification" }
      : null;
  const canCreateStoryNow = capabilities.canCreate && canCreateStory(user);
  const canPostNote = capabilities.canCreate && canCreateFeedPost(user);

  const openNoteComposer = () => {
    const params = location.pathname === "/wall" ? new URLSearchParams(location.search) : new URLSearchParams();
    params.set("compose", "note");
    setCreateOpen(false);
    navigate({ pathname: "/wall", search: `?${params.toString()}` });
  };

  return (
    <FanToastProvider>
      <CallProvider user={user}>
      <div className="social-app-shell min-h-screen overflow-x-hidden bg-atseen-bg text-atseen-text md:h-screen md:overflow-hidden">
        <div className="social-app-frame mx-auto flex min-h-screen w-full max-w-[1240px] md:h-screen md:min-h-0">
          <FanWebSidebar capabilities={capabilities} onCreate={() => setCreateOpen(true)} onGetApp={() => setAppModalOpen(true)} onVerify={() => setVerificationOpen(true)} status={status} unreadMessageCount={unreadMessageCount} />
          <div className="social-center-scroll min-w-0 flex-1 md:h-screen md:overflow-y-auto md:overscroll-contain" ref={contentScrollRef}>
            {!isDiscoverPage && !isHomePage && !isSeenPage && !isWorldComposePage ? <header className="sticky top-0 z-30 flex items-center justify-between border-b border-atseen-line bg-atseen-bg/92 px-4 py-3 backdrop-blur md:hidden">
              <AtseenLogo size={28} />
              {mobileAction ? (
                capabilities.canCreate ? (
                  <button className="rounded-full bg-atseen-blue px-3 py-2 text-xs font-bold text-atseen-bg" onClick={() => setCreateOpen(true)} type="button">{mobileAction.label}</button>
                ) : (
                  <Link className="rounded-full bg-atseen-blue px-3 py-2 text-xs font-bold text-atseen-bg" to={mobileAction.to}>{mobileAction.label}</Link>
                )
              ) : (
                <button className="rounded-full border border-atseen-line px-3 py-2 text-xs font-bold text-atseen-muted" onClick={() => setAppModalOpen(true)} type="button">Get app</button>
              )}
            </header> : null}
            <main className={isSeenPage || isWorldComposePage
              ? "seen-shell-main mx-auto min-h-screen w-full min-w-0 px-0 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-0 md:h-screen md:pb-0"
              : isDiscoverPage || isHomePage
              ? "social-prototype-main mx-auto min-h-screen w-full min-w-0 max-w-[980px] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 md:h-screen md:px-0 md:pb-12 md:pt-9"
              : isMessagesPage
                ? "mx-auto h-[calc(100dvh-8.25rem)] min-h-0 w-full min-w-0 max-w-none px-0 py-0 md:h-screen"
                : "mx-auto w-full min-w-0 max-w-none px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 md:px-5 md:pb-20 md:pt-[30px]"}>
              {children || <Outlet context={outletContext} />}
            </main>
          </div>
          <FanWebRightRail capabilities={capabilities} status={status} user={user} />
        </div>
        <FanMobileNav capabilities={capabilities} unreadMessageCount={unreadMessageCount} />
      </div>
      <FanModal isOpen={appModalOpen} onClose={() => setAppModalOpen(false)} title="Get the app">
        <p className="text-center text-sm leading-6 text-atseen-muted">Mobile app availability will be announced when it is ready.</p>
      </FanModal>
      <FanCreateSheet
        canCreateStoryNow={canCreateStoryNow}
        canPostNote={canPostNote}
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onNote={openNoteComposer}
        onStory={() => {
          setCreateOpen(false);
          setStoryCreatorOpen(true);
        }}
      />
      <StoryCreator isOpen={storyCreatorOpen} onClose={() => setStoryCreatorOpen(false)} />
      {verificationOpen ? <><button aria-label="Close creator application" className="fixed inset-0 z-[189] cursor-default bg-black/65 backdrop-blur-[2px]" onClick={() => setVerificationOpen(false)} type="button" /><CreatorVerificationPage /></> : null}
      </CallProvider>
    </FanToastProvider>
  );
}

export default SocialAppShell;
