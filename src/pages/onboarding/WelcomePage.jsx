import { Navigate, useNavigate } from "react-router-dom";
import OnboardingLayout from "../../layouts/OnboardingLayout";
import WelcomeCarousel from "../../components/onboarding/WelcomeCarousel";
import { useAuth } from "../../hooks/useAuth";
import { destinationForUser, isOnboardingComplete, onboardingPathFor } from "../../utils/socialAccess";

function WelcomePage() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();

  if (!loading && user && isOnboardingComplete(user)) {
    return <Navigate replace to={destinationForUser(user)} />;
  }

  return (
    <OnboardingLayout backDisabled currentStep={0} steps={["welcome", "interests", "instincts", "people", "light-your-world"]}>
      <WelcomeCarousel
        onAlreadyHaveAccount={() => navigate("/login")}
        onGetStarted={() => navigate(user ? onboardingPathFor(user) : "/register")}
        saving={false}
      />
    </OnboardingLayout>
  );
}

export default WelcomePage;
