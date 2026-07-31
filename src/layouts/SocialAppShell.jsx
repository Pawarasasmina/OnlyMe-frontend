import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { FiEdit3, FiEye, FiImage, FiLayers } from "react-icons/fi";
import AtseenLogo from "../components/branding/AtseenLogo";
import FeedPostComposer from "../components/posts/FeedPostComposer";
import FanMobileNav from "../components/fanWeb/FanMobileNav";
import FanWebRightRail from "../components/fanWeb/FanWebRightRail";
import FanWebSidebar from "../components/fanWeb/FanWebSidebar";
import FanModal from "../components/fanWeb/shared/FanModal";
import { FanToastProvider } from "../components/fanWeb/shared/FanToast";
import StoryCreator from "../components/stories/StoryCreator";
import { useAuth } from "../hooks/useAuth";
import { useSocialCapabilities } from "../hooks/useSocialCapabilities";
import { getUserDisplay } from "../components/fanWeb/shared/userDisplay";
import { canCreateStory } from "../utils/storyPermissions";

const STATUS_KEY = "atseen_social_status";

function SocialAppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const capabilities = useSocialCapabilities();
  const [status, setStatus] = useState(() => localStorage.getItem(STATUS_KEY) || "");
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [homePostOpen, setHomePostOpen] = useState(false);
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);
  const display = getUserDisplay(user, status);

  useEffect(() => {
    if (status) localStorage.setItem(STATUS_KEY, status);
    else localStorage.removeItem(STATUS_KEY);
  }, [status]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      const wantsSearch = event.key === "/" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k");
      if (!wantsSearch || isTyping) return;
      event.preventDefault();
      navigate("/search");
      window.setTimeout(() => document.querySelector("[role='combobox']")?.focus(), 80);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  const outletContext = useMemo(() => ({ status, setStatus }), [status]);
  const isSearch = location.pathname === "/search";
  const mobileAction = capabilities.canCreate
    ? { label: "Create", to: "/create" }
    : capabilities.canAccessVerification && !capabilities.isApprovedCreator
      ? { label: "Verify", to: "/creator/verification" }
      : null;

  return (
    <FanToastProvider>
      <div className="min-h-screen overflow-x-hidden bg-atseen-bg text-atseen-text">
        <div className="mx-auto flex min-h-screen w-full max-w-[1240px]">
          <FanWebSidebar capabilities={capabilities} onCreate={() => setCreateModalOpen(true)} onGetApp={() => setAppModalOpen(true)} status={status} />
          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-30 flex items-center justify-between border-b border-atseen-line bg-atseen-bg/92 px-4 py-3 backdrop-blur md:hidden">
              <AtseenLogo size={28} />
              {mobileAction ? (
                <Link className="rounded-full bg-atseen-blue px-3 py-2 text-xs font-bold text-atseen-bg" to={mobileAction.to}>{mobileAction.label}</Link>
              ) : (
                <button className="rounded-full border border-atseen-line px-3 py-2 text-xs font-bold text-atseen-muted" onClick={() => setAppModalOpen(true)} type="button">Get app</button>
              )}
            </header>
            <main className={`mx-auto min-w-0 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 md:px-[34px] md:pb-20 md:pt-[30px] ${isSearch ? "max-w-[900px]" : "max-w-[660px]"}`}>
              <Outlet context={outletContext} />
            </main>
          </div>
          <FanWebRightRail capabilities={capabilities} status={status} user={user} />
        </div>
        <FanMobileNav capabilities={capabilities} />
      </div>
      <FanModal isOpen={appModalOpen} onClose={() => setAppModalOpen(false)} title="Get the app">
        <p className="text-center text-sm leading-6 text-atseen-muted">Mobile app availability will be announced when it is ready.</p>
      </FanModal>
      <FanModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create">
        <p className="text-sm leading-6 text-atseen-muted">Choose what you want to make.</p>
        <div className="mt-4 grid gap-2">
          {[
            { label: "Seen", description: "Free, public, 1-3 chapters", icon: FiEye, to: "/create/seen" },
            { label: "Story", description: "A temporary moment for your orbit.", icon: FiImage, story: true, hidden: !canCreateStory(user) },
            { label: "Home", description: "A longer note, ask, or useful sighting.", icon: FiEdit3, home: true },
            { label: "World", description: "A chaptered experience people can step into.", icon: FiLayers },
          ].filter((item) => !item.hidden).map(({ description, home, icon: Icon, label, story, to }) => (
            <Link
              className="flex items-center gap-3 rounded-2xl border border-atseen-line bg-atseen-surface-2 px-4 py-3 text-left transition hover:border-atseen-blue/45 hover:bg-atseen-blue/10"
              key={label}
              onClick={(event) => {
                if (home || story || !to) event.preventDefault();
                setCreateModalOpen(false);
                if (home) setHomePostOpen(true);
                else if (story) setStoryCreatorOpen(true);
              }}
              to={to || "/create"}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-atseen-blue/25 bg-atseen-blue/10 text-atseen-blue">
                <Icon aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-atseen-text">{label}</span>
                <span className="mt-0.5 block text-[11px] leading-5 text-atseen-muted">{description}</span>
              </span>
            </Link>
          ))}
        </div>
      </FanModal>
      <FeedPostComposer currentUser={display} isOpen={homePostOpen} onClose={() => setHomePostOpen(false)} />
      <StoryCreator isOpen={storyCreatorOpen} onClose={() => setStoryCreatorOpen(false)} />
    </FanToastProvider>
  );
}

export default SocialAppShell;
