import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import AtseenLogo from "../components/branding/AtseenLogo";
import FanMobileNav from "../components/fanWeb/FanMobileNav";
import FanWebRightRail from "../components/fanWeb/FanWebRightRail";
import FanWebSidebar from "../components/fanWeb/FanWebSidebar";
import FanModal from "../components/fanWeb/shared/FanModal";
import { FanToastProvider } from "../components/fanWeb/shared/FanToast";
import { useAuth } from "../hooks/useAuth";
import { useSocialCapabilities } from "../hooks/useSocialCapabilities";

const STATUS_KEY = "atseen_social_status";

function SocialAppShell({ children = null }) {
  const { user } = useAuth();
  const capabilities = useSocialCapabilities();
  const location = useLocation();
  const isMessagesPage = location.pathname === "/messages";
  const contentScrollRef = useRef(null);
  const [status, setStatus] = useState(() => localStorage.getItem(STATUS_KEY) || "");
  const [appModalOpen, setAppModalOpen] = useState(false);

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

  return (
    <FanToastProvider>
      <div className="min-h-screen overflow-x-hidden bg-atseen-bg text-atseen-text md:h-screen md:overflow-hidden">
        <div className="mx-auto flex min-h-screen w-full max-w-[1240px] md:h-screen md:min-h-0">
          <FanWebSidebar capabilities={capabilities} onGetApp={() => setAppModalOpen(true)} status={status} />
          <div className="social-center-scroll min-w-0 flex-1 md:h-screen md:overflow-y-auto md:overscroll-contain" ref={contentScrollRef}>
            <header className="sticky top-0 z-30 flex items-center justify-between border-b border-atseen-line bg-atseen-bg/92 px-4 py-3 backdrop-blur md:hidden">
              <AtseenLogo size={28} />
              {mobileAction ? (
                <Link className="rounded-full bg-atseen-blue px-3 py-2 text-xs font-bold text-atseen-bg" to={mobileAction.to}>{mobileAction.label}</Link>
              ) : (
                <button className="rounded-full border border-atseen-line px-3 py-2 text-xs font-bold text-atseen-muted" onClick={() => setAppModalOpen(true)} type="button">Get app</button>
              )}
            </header>
            <main className={isMessagesPage
              ? "mx-auto h-[calc(100dvh-8.25rem)] min-h-0 w-full min-w-0 max-w-[660px] px-2 py-2 sm:px-3 md:h-screen md:px-4 md:py-0"
              : "mx-auto min-w-0 max-w-[660px] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 md:px-[34px] md:pb-20 md:pt-[30px]"}>
              {children || <Outlet context={outletContext} />}
            </main>
          </div>
          <FanWebRightRail capabilities={capabilities} status={status} user={user} />
        </div>
        <FanMobileNav capabilities={capabilities} />
      </div>
      <FanModal isOpen={appModalOpen} onClose={() => setAppModalOpen(false)} title="Get the app">
        <p className="text-center text-sm leading-6 text-atseen-muted">Mobile app availability will be announced when it is ready.</p>
      </FanModal>
    </FanToastProvider>
  );
}

export default SocialAppShell;
