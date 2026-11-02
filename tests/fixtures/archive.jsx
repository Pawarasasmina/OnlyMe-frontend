import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FanToastProvider } from "../../src/components/fanWeb/shared/FanToast";
import ArchivePage from "../../src/pages/social/ArchivePage";
import "../../src/index.css";
const client = new QueryClient();
createRoot(document.getElementById("root")).render(<QueryClientProvider client={client}><BrowserRouter><FanToastProvider><div className="social-center-scroll" style={{ width: "min(100%, 550px)", margin: "auto" }}><ArchivePage /></div></FanToastProvider></BrowserRouter></QueryClientProvider>);
