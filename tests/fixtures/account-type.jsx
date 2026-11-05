import { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../../src/context/AuthContext";
import { FanToastProvider } from "../../src/components/fanWeb/shared/FanToast";
import AccountTypeSetting from "../../src/components/profile/AccountTypeSetting";
import CreatorStudio from "../../src/pages/creator/CreatorStudio";
import ApprovedCreatorRoute from "../../src/routes/ApprovedCreatorRoute";
import "../../src/index.css";

export function Fixture() {
  const [user, setUser] = useState({ id: "account-owner", role: "fan", profileAccountType: "personal", creatorApprovalStatus: "not_started" });
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={client}><AuthContext.Provider value={{ user, setUser }}><MemoryRouter initialEntries={["/settings"]}><FanToastProvider><main className="social-center-scroll" style={{ width: "min(100%,440px)", height: "100dvh", overflow: "auto", margin: "auto" }}><Routes>
    <Route path="/settings" element={<AccountTypeSetting />} />
    <Route element={<ApprovedCreatorRoute />}><Route path="/studio" element={<CreatorStudio />} /></Route>
    <Route path="*" element={<p>Unexpected navigation</p>} />
  </Routes></main></FanToastProvider></MemoryRouter></AuthContext.Provider></QueryClientProvider>;
}
createRoot(document.getElementById("root")).render(<Fixture />);
