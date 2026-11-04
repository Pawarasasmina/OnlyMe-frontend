import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import OwnerLibrary from "../../src/components/profile/OwnerLibrary";
import "../../src/index.css";
import "../../src/components/profile/OwnerThingsSheet.css";

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Fixture() {
  const [full, setFull] = useState(false);
  const [closed, setClosed] = useState(false);
  return closed ? <p>Library closed</p> : <section className={`owner-things-sheet ${full ? "library-full-screen" : ""}`} style={{ "--owner-things-width": "min(100%, 550px)" }}><OwnerLibrary userId="fixture" wallet={{ balance: 20 }} onClose={() => setClosed(true)} onFullScreen={setFull} /></section>;
}
createRoot(document.getElementById("root")).render(<QueryClientProvider client={client}><BrowserRouter><Fixture /></BrowserRouter></QueryClientProvider>);
