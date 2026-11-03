import { Navigate, useNavigate } from "react-router-dom";
import WelcomeCarousel from "../../components/onboarding/WelcomeCarousel";
import { useAuth } from "../../hooks/useAuth";
import { destinationForUser, isOnboardingComplete, onboardingPathFor } from "../../utils/socialAccess";
import { onboardingService } from "../../services/onboardingService";
import { useState } from "react";

function WelcomePage() {
  const { loading, user } = useAuth();
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
  return (
      <WelcomeCarousel
        error={error}
        onAlreadyHaveAccount={() => navigate("/login")}
        onGetStarted={start}
        saving={saving}
      />
  );
}

export default WelcomePage;
