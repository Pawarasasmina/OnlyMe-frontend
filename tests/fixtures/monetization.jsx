import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthContext } from "../../src/context/AuthContext";
import MonetizationPage from "../../src/pages/settings/MonetizationPage";
import AdminMonetizationPolicy from "../../src/components/financial/AdminMonetizationPolicy";
import "../../src/index.css";
function Location() { return <p>{useLocation().pathname}</p>; }
createRoot(document.getElementById("root")).render(<AuthContext.Provider value={{ user: { id: "owner", name: "Aisha Rahman", profileAccountType: "creator", creatorApprovalStatus: "approved" }, setUser: () => {} }}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{location.search.includes("admin") ? <AdminMonetizationPolicy /> : <MemoryRouter initialEntries={["/settings/monetization"]}><div className="social-center-scroll" style={{ width: "min(100%,440px)", height: "100dvh", overflow: "auto", margin: "auto" }}><Routes><Route path="/settings/monetization" element={<MonetizationPage />} /><Route path="*" element={<Location />} /></Routes></div></MemoryRouter>}</QueryClientProvider></AuthContext.Provider>);
