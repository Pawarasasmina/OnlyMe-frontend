import { Component } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../src/context/AuthContext";
import { LanguageProvider } from "../../src/context/LanguageContext.jsx";
import { useLanguage } from "../../src/hooks/useLanguage";
import { missingTranslations, msg, formatNumber, formatDate } from "../../src/i18n/runtime.js";
import App from "../../src/App";
import WelcomeCarousel from "../../src/components/onboarding/WelcomeCarousel";
import ModerationFeedbackPanel from "../../src/components/content/ModerationFeedbackPanel";
import ContentDecisionModal from "../../src/components/admin/ContentDecisionModal";
import "../../src/index.css";
import "../../src/styles/localization.css";

const params = new URLSearchParams(location.search);
const role = params.get("role") || "creator";
const user = role === "guest" ? null : { id: "test-owner", _id: "test-owner", name: "English User اسم", username: "original-user", role, status: "active", isVerified: true, profileAccountType: "creator", creatorApprovalStatus: "approved", onboardingCompleted: true, onboardingStatus: "completed", onboardingStep: "completed", memberNumber: 50 };
class Boundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() { return this.state.error ? <pre data-testid="route-crash">{this.state.error.message}</pre> : this.props.children; }
}
function Controls() {
  const { setLanguage, language } = useLanguage();
  window.i18nTest = { setLanguage, missingTranslations, msg, formatNumber, formatDate };
  return <output data-testid="active-language" hidden>{language}</output>;
}
function FixtureView() {
  switch (params.get("view")) {
    case "welcome": return <WelcomeCarousel onGetStarted={() => {}} onAlreadyHaveAccount={() => {}} />;
    case "feedback": return <ModerationFeedbackPanel status="REJECTED" feedback="Save" />;
    case "decision": return <ContentDecisionModal mode="changes" isOpen checklistComplete onClose={() => {}} onSubmit={payload => { window.i18nSubmission = payload; }} />;
    default: return <App />;
  }
}
const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } } });
createRoot(document.getElementById("root")).render(<QueryClientProvider client={client}><AuthContext.Provider value={{ user, loading: false, setUser: () => {}, logout: async () => {}, login: async () => {}, register: async () => {}, refreshUser: async () => user }}><LanguageProvider><Controls /><Boundary><MemoryRouter initialEntries={[params.get("route") || "/settings"]}><FixtureView /></MemoryRouter></Boundary></LanguageProvider></AuthContext.Provider></QueryClientProvider>);
