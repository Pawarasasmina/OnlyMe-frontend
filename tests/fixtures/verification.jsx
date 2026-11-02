import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "../../src/context/AuthContext";
import IdentityVerificationFlow from "../../src/components/verification/IdentityVerificationFlow";
import "../../src/index.css";
createRoot(document.getElementById("root")).render(<AuthContext.Provider value={{ user: { id: "user", name: "Elena Petrova" }, setUser: () => {} }}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><div className="social-center-scroll" style={{ width: "min(100%,440px)", height: "100dvh", margin: "auto" }}><IdentityVerificationFlow initialView={new URLSearchParams(location.search).get("view") || "verify"} onClose={() => { document.getElementById("root").textContent = "Closed"; }} /></div></QueryClientProvider></AuthContext.Provider>);
