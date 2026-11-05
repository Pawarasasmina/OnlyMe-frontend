import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { Navigate, useNavigate } from "react-router-dom";
import WelcomeCarousel from "../../components/onboarding/WelcomeCarousel";
import { useAuth } from "../../hooks/useAuth";
import { destinationForUser, isOnboardingComplete, onboardingPathFor } from "../../utils/socialAccess";
import { onboardingService } from "../../services/onboardingService";
import { useState } from "react";

function WelcomePage() {
  __useUiLanguage();
  const { loading, resumeTrustedSession, user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!loading && user && isOnboardingComplete(user)) {
    return <Navigate replace to={destinationForUser(user)} />;
  }

  const start = async () => {
    if (!user) return navigate("/start/interests");
    if (user.onboarding?.currentStep !== "welcome") return navigate(onboardingPathFor(user));
    setSaving(true); setError("");
    try { await onboardingService.saveWelcomeStep(); navigate("/onboarding/interests"); }
    catch (requestError) { setError(requestError.response?.data?.message || "Unable to start onboarding."); }
    finally { setSaving(false); }
  };
  const continueLastAccount = async () => {
    setSaving(true); setError("");
    try {
      const resumedUser = await resumeTrustedSession();
      navigate(destinationForUser(resumedUser), { replace: true });
    } catch {
      navigate("/login");
    } finally { setSaving(false); }
  };
  return (
      <WelcomeCarousel
        error={error}
        onAlreadyHaveAccount={() => navigate("/login")}
        onContinueLastAccount={continueLastAccount}
        onGetStarted={start}
        saving={saving}
      />
  );
}

export default WelcomePage;
