import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useParams, useLocation } from "react-router-dom";
import { AuthContext } from "../../src/context/AuthContext";
import ActivityPage from "../../src/pages/fan/ActivityPage";
import "../../src/index.css";
import "../../src/styles/storyEnhancements.css";
export function NoteTarget() { return <h1>Original note {useParams().id}</h1>; }
function Destination() { const location = useLocation(); return <h1>{location.pathname}{location.search}</h1>; }
createRoot(document.getElementById("root")).render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuthContext.Provider value={{ user: { id: "owner", role: "fan" } }}><MemoryRouter initialEntries={["/activity?filter=saves"]}><main className="social-center-scroll" style={{ width: "min(100%,440px)", margin: "auto" }}><Routes><Route path="/activity" element={<ActivityPage />} /><Route path="/posts/:id" element={<NoteTarget />} /><Route path="*" element={<Destination />} /></Routes></main></MemoryRouter></AuthContext.Provider></QueryClientProvider>);
