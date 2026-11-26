import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MonitoringPage from "../../src/pages/admin/MonitoringPage";
import "../../src/index.css";
createRoot(document.getElementById("root")).render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MonitoringPage /></QueryClientProvider>);
