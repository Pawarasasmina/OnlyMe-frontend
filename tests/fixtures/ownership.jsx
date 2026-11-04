import React from "react";
import { LanguageProvider } from "../../src/context/LanguageContext.jsx";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext } from "../../src/context/AuthContext";
import SettingsPage from "../../src/pages/settings/SettingsPage";
import "../../src/index.css";
createRoot(document.getElementById("root")).render(<React.StrictMode><AuthContext.Provider value={{ user: { id: "owner", name: "Owner", role: "fan", memberNumber: 1292 }, setUser: () => {}, logout: async () => { window.ownershipLoggedOut = true; } }}><LanguageProvider><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={["/settings"]}><div className="social-center-scroll" style={{ width: "min(100%,550px)", height: "100dvh", overflow: "auto", margin: "auto" }}><Routes><Route path="/settings" element={<SettingsPage />} /><Route path="/login" element={<p>Logged out</p>} /></Routes></div></MemoryRouter></QueryClientProvider></LanguageProvider></AuthContext.Provider></React.StrictMode>);
