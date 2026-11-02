import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "../../src/context/AuthContext";
import { FanToastProvider } from "../../src/components/fanWeb/shared/FanToast";
import BringFriendsFlow, { JoinedInvitationsPage } from "../../src/components/profile/BringFriendsFlow";
import ReferralLandingPage from "../../src/pages/public/ReferralLandingPage";
import "../../src/index.css";
import "../../src/components/profile/OwnerThingsSheet.css";
const user = { id: "507f1f77bcf86cd799439011", name: "Max Carter", username: "max" };
const client = new QueryClient();
function Home() {
  const [full, setFull] = useState(false), [closed, setClosed] = useState(false);
  return closed ? <p>Profile</p> : <section className={`owner-things-sheet ${full ? "library-full-screen" : ""}`} style={{ "--owner-things-width": "min(100%,550px)" }}><BringFriendsFlow user={user} onClose={() => setClosed(true)} onFullScreen={setFull} /></section>;
}
function Destination() { const location = useLocation(); return <p>{location.pathname}{location.search}</p>; }
const signedOut = new URLSearchParams(location.search).has("public");
createRoot(document.getElementById("root")).render(<AuthContext.Provider value={{ user: signedOut ? null : user }}><QueryClientProvider client={client}><BrowserRouter><FanToastProvider><div className="social-center-scroll" style={{ width: "min(100%,550px)", margin: "auto" }}><Routes><Route path="/tests/fixtures/friends.html" element={signedOut ? <Navigate to="/invite/f-max-test" replace /> : <Home />} /><Route path="/invite/:code" element={<ReferralLandingPage />} /><Route path="/invitations" element={<JoinedInvitationsPage />} /><Route path="*" element={<Destination />} /></Routes></div></FanToastProvider></BrowserRouter></QueryClientProvider></AuthContext.Provider>);
