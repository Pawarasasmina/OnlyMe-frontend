import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useNavigate } from "react-router-dom";
import { AuthContext } from "../../src/context/AuthContext";
import FirstTimeHints from "../../src/components/common/FirstTimeHints";
import WallPostTypeBadge from "../../src/components/fanWeb/home/WallPostTypeBadge";
import "../../src/index.css";
function Fixture() {
  const params = new URLSearchParams(location.search);
  const [account, setAccount] = useState("person-a");
  const [onboarding, setOnboarding] = useState(params.has("onboarding"));
  const [blocked, setBlocked] = useState(params.has("blocked"));
  const [target, setTarget] = useState(!params.has("missing"));
  const navigate = useNavigate();
  const kind = params.get("kind") || "wall";
  return <AuthContext.Provider value={{ user: { id: account, onboarding: { status: onboarding ? "in_progress" : "completed" } } }}>
    <main className="social-center-scroll" style={{ width: "min(100%,550px)", margin: "auto", height: "100dvh", color: "white", padding: "140px 20px 20px" }}>
      {kind === "multiple" ? <><button data-first-hint="react">Message</button><button data-first-hint="gift">Gift</button></> : null}
      {target ? kind === "wall" ? <WallPostTypeBadge postType="Question" /> : <button data-first-hint={kind} style={{ float: "right" }}>Hint target</button> : null}
      <nav style={{ marginTop: 140, display: "grid", gap: 10 }}><button onClick={() => setBlocked(!blocked)}>Toggle sheet</button><button onClick={() => setTarget(!target)}>Toggle target</button><button onClick={() => setAccount(account === "person-a" ? "person-b" : "person-a")}>Switch account</button><button onClick={() => setOnboarding(!onboarding)}>Toggle onboarding</button><button onClick={() => navigate("/next")}>Navigate</button></nav>
      {blocked ? <section role="dialog" aria-modal="true">Open sheet</section> : null}
    </main><FirstTimeHints />
  </AuthContext.Provider>;
}
createRoot(document.getElementById("root")).render(<BrowserRouter><Fixture /></BrowserRouter>);
