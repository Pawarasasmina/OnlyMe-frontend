import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import PrototypeInterestPicker from "../../components/onboarding/PrototypeInterestPicker";
import { useAuth } from "../../hooks/useAuth";
import { readPreAuthInterests, writePreAuthInterests } from "../../utils/preAuthOnboarding";

const publicCategories = [
  "Travel", "Fitness", "Lifestyle", "Business", "Technology", "Psychology", "Fashion", "Beauty", "Wellness", "Food",
].map((name) => ({ id: name, name }));

export default function PublicStoryInterestsPage() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(readPreAuthInterests);

  useEffect(() => writePreAuthInterests(selected), [selected]);
  if (!loading && user) return <Navigate replace to="/onboarding/interests" />;

  const toggle = (id) => setSelected((current) => current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id]);

  return <PrototypeInterestPicker
    categories={publicCategories}
    onBack={() => navigate("/welcome")}
    onContinue={() => navigate("/register", { state: { fromInterests: true } })}
    onToggle={toggle}
    selected={selected}
  />;
}
