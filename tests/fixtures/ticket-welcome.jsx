import { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../src/context/AuthContext";
import OnboardingTicket from "../../src/components/onboarding/OnboardingTicket";
import MemberTicket from "../../src/components/profile/MemberTicket";
import WelcomeMoment from "../../src/components/onboarding/WelcomeMoment";
import WelcomePage from "../../src/pages/onboarding/WelcomePage";
import { CenterRefreshOverlay } from "../../src/components/common/CenterRouteLoading";
import "../../src/index.css";

const params = new URLSearchParams(window.location.search);
const user = { id: "member", name: "Nethmi", username: "nethmi", memberNumber: 1292, createdAt: "2026-10-20T00:00:00Z", city: "Colombo" };
export default function Fixture() {
  const [done, setDone] = useState(false);
  if (done) return <p>Continued</p>;
  const mode = params.get("mode");
  if (mode === "welcome-page") return <WelcomePage />;
  if (mode === "welcome-full") return <WelcomeMoment onContinue={() => setDone(true)} />;
  if (mode === "welcome-return") return <><p>Existing content</p><CenterRefreshOverlay /></>;
  if (mode === "profile") return <h1><MemberTicket profile={user} /></h1>;
  return <OnboardingTicket city={params.has("missing") ? undefined : user.city} memberNumber={params.has("missing") ? undefined : user.memberNumber} joinedAt={params.has("missing") ? undefined : user.createdAt} name={user.name} overlay={params.has("overlay")} onContinue={() => setDone(true)} />;
}
createRoot(document.getElementById("root")).render(<AuthContext.Provider value={{ user: params.get("mode") === "welcome-page" ? null : user, loading: false }}><QueryClientProvider client={new QueryClient()}><MemoryRouter><main className="social-center-scroll profile-copy" style={{ position: "relative", width: "min(100%,440px)", height: "100dvh", margin: "auto" }}><Fixture /></main></MemoryRouter></QueryClientProvider></AuthContext.Provider>);
