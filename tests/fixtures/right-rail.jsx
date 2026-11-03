import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../../src/context/LanguageContext.jsx";
import FanWebRightRail from "../../src/components/fanWeb/FanWebRightRail";
import "../../src/index.css";
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
createRoot(document.getElementById("root")).render(<QueryClientProvider client={client}><LanguageProvider><MemoryRouter><FanWebRightRail user={{ id: "self" }} /></MemoryRouter></LanguageProvider></QueryClientProvider>);
