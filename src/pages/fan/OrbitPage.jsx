/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useMemo, useState } from "react";
import OrbitCanvas from "../../components/orbit/OrbitCanvas";
import OrbitEmptyState from "../../components/orbit/OrbitEmptyState";
import OrbitHeader from "../../components/orbit/OrbitHeader";
import OrbitIntroOverlay from "../../components/orbit/OrbitIntroOverlay";
import OrbitSkeleton from "../../components/orbit/OrbitSkeleton";
import OrbitTunePanel from "../../components/orbit/OrbitTunePanel";
import TodayEncounterCard from "../../components/orbit/TodayEncounterCard";
import FanCard from "../../components/fanWeb/shared/FanCard";
import { useFanToast } from "../../components/fanWeb/shared/FanToastContext";
import { formatOrbitLocation } from "../../components/orbit/orbitFormat";
import { useAuth } from "../../hooks/useAuth";
import { useOrbit } from "../../hooks/useOrbit";

function OrbitError({ onRetry }) {
  __useUiLanguage();
  return (
    <FanCard className="border-atseen-danger/25 bg-atseen-danger/10 text-center">
      <h1 className="text-lg font-bold text-atseen-text">{__msg("fan.weCouldNotLoadYourOrbit")}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-atseen-muted">{__msg("fan.pleaseTryAgainWhenTheConnectionIsSteady")}</p>
      <button className="mt-4 rounded-xl bg-atseen-blue px-4 py-2.5 text-xs font-bold text-atseen-bg" onClick={onRetry} type="button">{__msg("discover.tryAgain")}</button>
    </FanCard>
  );
}

function OrbitPage() {
  __useUiLanguage();
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const [cursor, setCursor] = useState("");
  const [tuneOpen, setTuneOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const userId = user?.id || user?._id;
  const introKey = useMemo(() => userId ? `atseen_orbit_intro_${userId}` : "", [userId]);
  const orbitQuery = useOrbit({ limit: 12, cursor });

  useEffect(() => {
    if (!introKey) return;
    setIntroOpen(localStorage.getItem(introKey) !== "done");
  }, [introKey]);

  if (orbitQuery.isLoading) return <OrbitSkeleton />;
  if (orbitQuery.isError) return <OrbitError onRetry={() => orbitQuery.refetch()} />;

  const orbit = orbitQuery.data;
  const recommendations = orbit?.recommendations || [];
  const hasOrbitContent = recommendations.length > 0 || Boolean(orbit?.todayEncounter);
  const location = orbit?.currentUser?.city || formatOrbitLocation(orbit?.currentUser?.location) || orbit?.currentUser?.location;

  const dismissIntro = () => {
    if (introKey) localStorage.setItem(introKey, "done");
    setIntroOpen(false);
  };

  const refreshLights = () => {
    if (!orbit?.nextCursor) {
      showToast(__msg("fan.noMoreNewLightsRightNow"));
      orbitQuery.refetch();
      return;
    }

    setCursor(orbit.nextCursor);
    showToast(__msg("fan.lookingForNewLightsInYourOrbit"));
  };

  return (
    <div>
      <OrbitHeader
        disabled={!recommendations.length}
        location={location}
        onRefresh={refreshLights}
        onTune={() => setTuneOpen(true)}
        refreshing={orbitQuery.isFetching && !orbitQuery.isLoading}
      />
      {hasOrbitContent ? (
        <>
          <OrbitCanvas currentUser={orbit.currentUser} recommendations={recommendations} todayEncounter={orbit.todayEncounter} />
          <TodayEncounterCard encounter={orbit.todayEncounter} />
        </>
      ) : (
        <div className="mt-[18px]">
          <OrbitEmptyState />
        </div>
      )}
      <OrbitIntroOverlay isOpen={introOpen} onComplete={dismissIntro} />
      <OrbitTunePanel currentUser={orbit?.currentUser} isOpen={tuneOpen} onClose={() => setTuneOpen(false)} />
    </div>
  );
}

export default OrbitPage;
