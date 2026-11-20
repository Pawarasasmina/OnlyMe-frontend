import { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "../../src/context/AuthContext";
import PresencePrivacyControls from "../../src/components/profile/PresencePrivacyControls";
import PresenceNotice from "../../src/components/profile/PresenceNotice";
import "../../src/index.css";
import "../../src/pages/settings/SettingsPage.css";

function Fixture() {
  const [user, setUser] = useState({ id: "507f1f77bcf86cd799439011", role: "fan" });
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <AuthContext.Provider value={{ user, setUser }}><QueryClientProvider client={client}><div className="social-center-scroll settings-prototype-index" style={{ width: "min(440px,100%)", margin: "auto", minHeight: "100dvh" }}><PresencePrivacyControls /><PresenceNotice /></div></QueryClientProvider></AuthContext.Provider>;
}
createRoot(document.getElementById("root")).render(<Fixture />);
