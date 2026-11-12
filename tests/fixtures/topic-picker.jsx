import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AuthContext } from "../../src/context/AuthContext";
import PrototypeInterestPicker from "../../src/components/onboarding/PrototypeInterestPicker";
import "../../src/index.css";
function Fixture() {
  const [selected, setSelected] = useState(() => JSON.parse(localStorage.getItem("test-topic-selection") || (location.search.includes("ready") ? '["Fitness","Lifestyle","Business"]' : "[]")));
  useEffect(() => { localStorage.setItem("test-topic-selection", JSON.stringify(selected)); }, [selected]);
  return <AuthContext.Provider value={{ user: { id: "topic-person" } }}><PrototypeInterestPicker categories={["Travel", "Fitness", "Lifestyle", "Business"].map(id => ({ id }))} selected={selected} onToggle={id => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])} onBack={() => {}} onContinue={() => {}} /><output hidden data-testid="selected-topics">{JSON.stringify(selected)}</output></AuthContext.Provider>;
}
createRoot(document.getElementById("root")).render(<Fixture />);
