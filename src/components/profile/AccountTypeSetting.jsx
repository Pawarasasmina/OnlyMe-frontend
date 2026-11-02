import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiChevronRight, FiShoppingBag, FiStar, FiUser } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { profileService } from "../../services/profileService";
import "./AccountTypeSetting.css";

const types = [
  { key: "personal", title: "Personal", Icon: FiUser, description: "Share your life and follow people. Gifts, Dream and paid Seens included." },
  { key: "creator", title: "Creator", Icon: FiStar, description: "For people building an audience. Adds World, Direct Access, Grow and insights." },
  { key: "business", title: "Business", Icon: FiShoppingBag, description: "For brands, shops and places. Everything creators get, plus contact buttons and offers." },
];
const categories = {
  creator: ["Digital creator", "Coach", "Traveler", "Artist", "Musician", "Athlete", "Chef", "Educator"],
  business: ["Shop", "Café & restaurant", "Studio & salon", "Fitness club", "Hotel & travel", "Media & news", "Services", "Brand"],
};

export default function AccountTypeSetting() {
  const { user, setUser } = useAuth();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["settings", "account"], queryFn: () => profileService.getAccountSettings().then(response => response.data.data) });
  const account = query.data?.account || {};
  const current = account.profileAccountType || user?.profileAccountType || (user?.creatorApprovalStatus === "approved" ? "creator" : "personal");
  const category = account.profileCategory || user?.profileCategory || (current === "creator" ? "Digital creator" : current === "business" ? "Shop" : "");
  const [step, setStep] = useState("");
  const [draftType, setDraftType] = useState(current);
  const [draftCategory, setDraftCategory] = useState(category);
  const [position, setPosition] = useState({});
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: ({ type, category: selected }) => profileService.updateAccountSettings({ profileAccountType: type, profileCategory: selected, confirmSwitch: type !== current }),
    onSuccess: response => {
      const next = response.data.data.account;
      client.setQueryData(["settings", "account"], previous => ({ ...previous, account: next }));
      setUser(previous => ({ ...previous, profileAccountType: next.profileAccountType, profileCategory: next.profileCategory }));
      client.invalidateQueries({ queryKey: ["unified-profile"] });
      client.invalidateQueries({ queryKey: ["profile", "me"] });
      setError(""); setStep("");
    },
    onError: failure => setError(failure.response?.data?.message || "Unable to save. Please try again."),
  });
  useEffect(() => {
    if (!step) return undefined;
    const center = document.querySelector(".social-center-scroll");
    const update = () => { if (center) { const bounds = center.getBoundingClientRect(); setPosition({ "--account-type-left": `${bounds.left}px`, "--account-type-width": `${bounds.width}px` }); } };
    const keydown = event => { if (event.key === "Escape" && !mutation.isPending) setStep(""); };
    update(); window.addEventListener("resize", update); window.addEventListener("keydown", keydown);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (center) observer?.observe(center);
    return () => { observer?.disconnect(); window.removeEventListener("resize", update); window.removeEventListener("keydown", keydown); };
  }, [step, mutation.isPending]);
  const chooseCategory = type => { setDraftType(type); setDraftCategory(type === current ? category : ""); setError(""); setStep("category"); };
  const cancel = () => { setError(""); setStep("types"); };
  return <>
    <button className="settings-index-row" disabled={query.isLoading} onClick={() => { setStep("types"); setError(""); }} type="button"><span className="settings-index-row-copy"><b>Account type</b><small>{types.find(type => type.key === current)?.title}{category ? ` · ${category}` : ""}</small></span><FiChevronRight /></button>
    {step ? createPortal(<div className="account-type-layer" style={position}>
      <button aria-label="Close account type" className="account-type-dim" disabled={mutation.isPending} onClick={() => setStep("")} type="button" />
      <section aria-label={step === "category" ? "Choose a category" : "Account type"} aria-modal="true" className="account-type-sheet" role="dialog">
        <span className="account-type-handle" />
        {step === "types" ? <>
          <h2>Account type</h2><p>Everyone can earn. Your type only changes which tools you see.</p>
          <div className="account-type-cards">{types.map(({ key, title, Icon, description }) => <button aria-pressed={current === key} className={current === key ? "is-current" : ""} key={key} onClick={() => {
            if (current === key) { if (key === "personal") setStep(""); else chooseCategory(key); }
            else { setDraftType(key); setError(""); setStep("confirm"); }
          }} type="button"><span className="account-type-icon"><Icon /></span><span><b>{title}{current === key ? <em>Current</em> : null}</b><small>{description}</small></span><i /></button>)}</div>
          {current !== "personal" ? <button className="account-type-category-row" onClick={() => chooseCategory(current)} type="button"><span><b>Category</b><small>{category}</small></span><FiChevronRight /></button> : null}
          <footer>Switch anytime — nothing is deleted.</footer>
        </> : step === "confirm" ? <>
          <h2>Switch to {types.find(type => type.key === draftType)?.title} account?</h2>
          <p>{draftType === "personal" ? "World, Direct Access, Grow, category and business contact tools will be hidden. Existing content and purchases are kept." : types.find(type => type.key === draftType)?.description}</p>
          <p>Your content and account stay with you.</p>
          <button className="account-type-primary" disabled={mutation.isPending} onClick={() => draftType === "personal" ? mutation.mutate({ type: "personal", category: "" }) : chooseCategory(draftType)} type="button">{mutation.isPending ? "Saving…" : draftType === "personal" ? "Switch to Personal" : "Continue"}</button>
          <button className="account-type-cancel" disabled={mutation.isPending} onClick={cancel} type="button">Cancel</button>
        </> : <>
          <h2>Choose a category</h2><p>Shown under your name. You can change it anytime.</p>
          <div aria-label="Categories" className="account-type-chips">{categories[draftType].map(value => <button aria-pressed={draftCategory === value} className={draftCategory === value ? "is-selected" : ""} disabled={mutation.isPending} key={value} onClick={() => setDraftCategory(value)} type="button">{value}</button>)}</div>
          <button className="account-type-primary" disabled={!draftCategory || mutation.isPending} onClick={() => mutation.mutate({ type: draftType, category: draftCategory })} type="button">{mutation.isPending ? "Saving…" : draftType === current ? "Save" : `Switch to ${types.find(type => type.key === draftType)?.title}`}</button>
          <button className="account-type-cancel" disabled={mutation.isPending} onClick={cancel} type="button">Cancel</button>
        </>}
        {error ? <p className="account-type-error" role="alert">{error}</p> : null}
      </section>
    </div>, document.body) : null}
  </>;
}
