import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../src/context/AuthContext";
import AdminDialogProvider from "../../src/components/admin/AdminDialogProvider";
import RecommendationSettingsPage from "../../src/pages/admin/RecommendationSettingsPage";
import "../../src/index.css";
createRoot(document.getElementById("root")).render(<AuthContext.Provider value={{ user: { id: "admin", role: "admin", adminRole: "MAIN_ADMIN" } }}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AdminDialogProvider><main className="p-4 text-slate-900"><RecommendationSettingsPage /></main></AdminDialogProvider></MemoryRouter></QueryClientProvider></AuthContext.Provider>);
