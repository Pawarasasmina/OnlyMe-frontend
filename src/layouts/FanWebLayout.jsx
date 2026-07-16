import { Outlet } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import AtseenLogo from "../components/branding/AtseenLogo";
import FanMobileNav from "../components/fanWeb/FanMobileNav";
import FanWebRightRail from "../components/fanWeb/FanWebRightRail";
import FanWebSidebar from "../components/fanWeb/FanWebSidebar";
import FanModal from "../components/fanWeb/shared/FanModal";
import { FanToastProvider } from "../components/fanWeb/shared/FanToast";
import { atseenStatuses } from "../data/atseenMockData";
import { useAuth } from "../hooks/useAuth";

const STATUS_KEY = "atseen_fan_status";

function FanWebLayout() {
  const { user } = useAuth();
  const [status, setStatus] = useState(() => localStorage.getItem(STATUS_KEY) || user?.status || atseenStatuses[0]);
  const [appModalOpen, setAppModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STATUS_KEY, status);
  }, [status]);

  const outletContext = useMemo(() => ({ status, setStatus }), [status]);

  return (
    <FanToastProvider>
      <div className="min-h-screen bg-atseen-bg text-atseen-text">
        <div className="mx-auto flex min-h-screen w-full max-w-[1240px]">
          <FanWebSidebar onGetApp={() => setAppModalOpen(true)} status={status} />
          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-30 flex items-center justify-between border-b border-atseen-line bg-atseen-bg/92 px-4 py-3 backdrop-blur md:hidden">
              <AtseenLogo size={28} />
              <button
                className="rounded-full bg-gradient-to-br from-atseen-blue to-atseen-blue-strong px-3 py-2 text-xs font-bold text-atseen-bg"
                onClick={() => setAppModalOpen(true)}
                type="button"
              >
                Get app
              </button>
            </header>
            <main className="mx-auto min-w-0 max-w-[660px] px-4 pb-28 pt-6 sm:px-6 md:px-[34px] md:pb-20 md:pt-[30px]">
              <Outlet context={outletContext} />
            </main>
          </div>
          <FanWebRightRail status={status} user={user} />
        </div>
        <FanMobileNav />
      </div>
      <FanModal isOpen={appModalOpen} onClose={() => setAppModalOpen(false)} title="Get the Atseen app">
        <div className="text-center">
          <AtseenLogo className="justify-center" size={36} />
          <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-atseen-muted">
            Mobile posting, live chats, and Direct Access calls open in the app. The desktop web experience keeps your orbit, Worlds, and account tools close.
          </p>
          <button
            className="mt-5 rounded-[13px] bg-gradient-to-br from-atseen-blue to-atseen-blue-strong px-5 py-3 text-sm font-bold text-atseen-bg"
            onClick={() => setAppModalOpen(false)}
            type="button"
          >
            Done
          </button>
        </div>
      </FanModal>
    </FanToastProvider>
  );
}

export default FanWebLayout;
