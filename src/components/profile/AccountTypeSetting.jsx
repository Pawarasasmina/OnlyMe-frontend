import { optionLabel as __optionLabel } from "../../i18n/runtime.js";
import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiBarChart2, FiCheck, FiChevronRight, FiLink, FiMapPin, FiMessageCircle, FiMinus, FiPhone, FiStar, FiTag, FiUser } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import { useAuth } from "../../hooks/useAuth";
import { profileService } from "../../services/profileService";
import "./AccountTypeSetting.css";

function BusinessIcon() {
  __useUiLanguage();
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1.5-5h15L21 9M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0zM5 13v8h14v-8M10 21v-5h4v5" /></svg>;
}

const types = [
  { key: "personal", get title() { return __msg("profile.personal"); }, Icon: FiUser, get description() { return __msg("profile.shareYourLifeAndFollowPeopleGiftsDreamAnd"); } },
  { key: "creator", get title() { return __msg("discover.creator"); }, Icon: FiStar, get description() { return __msg("profile.forPeopleBuildingAnAudienceAddsWorldDirectAccess"); } },
  { key: "business", get title() { return __msg("profile.business"); }, Icon: BusinessIcon, get description() { return __msg("profile.forBrandsShopsAndPlacesEverythingCreatorsGetPlus"); } },
];
const categories = {
  creator: ["Digital creator", "Coach", "Traveler", "Artist", "Musician", "Athlete", "Chef", "Educator"],
  business: ["Shop", "Café & restaurant", "Studio & salon", "Fitness club", "Hotel & travel", "Media & news", "Services", "Brand"],
};

export default function AccountTypeSetting({ renderTrigger } = {}) {
  __useUiLanguage();
  const { user, setUser } = useAuth();
  const { showToast } = useFanToast();
  const navigate = useNavigate();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["settings", "account"], queryFn: () => profileService.getAccountSettings().then(response => response.data.data) });
  const account = query.data?.account || {};
  const current = account.profileAccountType || user?.profileAccountType || (user?.creatorApprovalStatus === "approved" ? "creator" : "personal");
  const category = account.profileCategory || user?.profileCategory || (current === "creator" ? __msg("profile.digitalCreator") : current === "business" ? __msg("profile.shop") : "");
  const [step, setStep] = useState("");
  const [draftType, setDraftType] = useState(current);
  const [draftCategory, setDraftCategory] = useState(category);
  const [draftButtons, setDraftButtons] = useState(["call", "directions"]);
  const contactButtons = account.businessContactButtonsConfigured ? account.businessContactButtons || [] : ["call", "directions"];
  const successTitle = __msg(draftType === "business" ? "profile.businessSwitchSuccess" : "profile.creatorSwitchSuccess");
  const dashboardLabel = __msg(draftType === "business" ? "profile.openBusinessDashboard" : "profile.openCreatorDashboard");
  const [position, setPosition] = useState({});
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: ({ type, category: selected, buttons }) => profileService.updateAccountSettings({ profileAccountType: type, profileCategory: selected, confirmSwitch: type !== current, ...(buttons ? { businessContactButtons: buttons } : {}) }),
    onSuccess: (response, variables) => {
      const next = response.data.data.account;
      client.setQueryData(["settings", "account"], previous => ({ ...previous, account: next }));
      setUser(previous => ({ ...previous, profileAccountType: next.profileAccountType, profileCategory: next.profileCategory, businessContactButtons: next.businessContactButtons, businessContactButtonsConfigured: next.businessContactButtonsConfigured }));
      client.invalidateQueries({ queryKey: ["unified-profile"] });
      client.invalidateQueries({ queryKey: ["profile", "me"] });
      client.invalidateQueries({ queryKey: ["monetization"] });
      client.invalidateQueries({ queryKey: ["creator-dashboard"] });
      client.invalidateQueries({ queryKey: ["creator-grow"] });
      setError(""); setStep(["creator", "business"].includes(next.profileAccountType) && variables.type !== current ? "success" : "");
      if (next.profileAccountType === "personal") showToast(__msg("profile.personalSwitchToast"));
      if (next.profileAccountType === "business" && variables.type !== current) showToast(__msg("profile.businessSwitchToast"), { variant: "account-switch" });
    },
    onError: failure => setError(failure.response?.data?.message || __msg("profile.unableToSavePleaseTryAgain")),
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
  const chooseCategory = type => { setDraftType(type); if (step !== "confirm") setDraftCategory(type === current ? category : ""); setError(""); setStep("category"); };
  const cancel = () => { setError(""); setStep("types"); };
  return <>
    {renderTrigger ? renderTrigger(() => { setStep("types"); setError(""); }) : <button className="settings-index-row" disabled={query.isLoading} onClick={() => { setStep("types"); setError(""); }} type="button"><span className="settings-index-row-copy"><b>{__msg("profile.accountType")}</b><small dir="auto">{types.find(type => type.key === current)?.title}{category ? ` · ${__optionLabel(category)}` : ""}</small></span><FiChevronRight data-ui-directional="true" /></button>}
    {step ? createPortal(<div className="account-type-layer" style={position}>
      <button aria-label={__msg("profile.closeAccountType")} className="account-type-dim" disabled={mutation.isPending} onClick={() => setStep("")} type="button" />
      <section aria-label={step === "success" ? successTitle : step === "contacts" ? __msg("profile.businessContactTitle") : step === "confirm" && draftType === "business" ? __msg("profile.businessSwitchTitle") : step === "confirm" && draftType === "creator" ? __msg("profile.creatorSwitchTitle") : step === "confirm" && draftType === "personal" ? __msg("profile.personalSwitchTitle") : step === "category" ? __msg("profile.chooseACategory") : __msg("profile.accountType")} aria-modal="true" className="account-type-sheet" data-step={step} role="dialog">
        <span className="account-type-handle" />
        {step === "types" ? <>
          <h2>{__msg("profile.accountType")}</h2><p>{__msg("profile.everyoneCanEarnYourTypeOnlyChangesWhichTools")}</p>
          <div className="account-type-cards">{types.map(({ key, title, Icon, description }) => <button aria-pressed={current === key} className={current === key ? "is-current" : ""} key={key} onClick={() => {
            if (current === key) { if (key === "personal") setStep(""); else chooseCategory(key); }
            else { setDraftType(key); setDraftCategory(""); setDraftButtons(["call", "directions"]); setError(""); setStep("confirm"); }
          }} type="button"><span className="account-type-icon"><Icon /></span><span><b>{title}{current === key ? <em>{__msg("profile.current")}</em> : null}</b><small>{description}</small></span><i /></button>)}</div>
          {current !== "personal" ? <button className="account-type-category-row" onClick={() => chooseCategory(current)} type="button"><span><b>{__msg("content.category")}</b><small>{category}</small></span><FiChevronRight data-ui-directional="true" /></button> : null}
          {current === "business" ? <button className="account-type-category-row" onClick={() => { setDraftType("business"); setDraftCategory(category); setDraftButtons([...contactButtons]); setError(""); setStep("contacts"); }} type="button"><span><b>{__msg("profile.businessContactTitle")}</b><small>{__msg("profile.businessContactCount", { count: contactButtons.length })}</small></span><FiChevronRight /></button> : null}
          <footer>{__msg("profile.switchAnytimeNothingIsDeleted")}</footer>
        </> : step === "confirm" ? <>
          {draftType === "personal" ? <>
            <span className="account-type-confirm-icon" aria-hidden="true"><FiUser /></span>
            <h2>{__msg("profile.personalSwitchTitle")}</h2>
            <div className="account-type-effects">
              {[
                ["world", __msg("system.copy.6225fcf09f54"), __msg("system.copy.64fbecb6ec2c")],
                ["grow", __msg("system.copy.4f44ef075450")],
                ["category", __msg("system.copy.f59104285d83")],
                ["earnings", __msg("system.copy.ca88cc983d9d")],
              ].map(([key, title, description]) => <div className="account-type-effect" key={key}>
                <span className={`account-type-effect-icon${key === "earnings" ? " is-kept" : ""}`} aria-hidden="true">{key === "earnings" ? <FiCheck /> : <FiMinus />}</span>
                <div><b>{__msg(title)}</b>{description ? <p>{__msg(description)}</p> : null}</div>
              </div>)}
            </div>
            <p className="account-type-preserved">{__msg("profile.personalSwitchPreserved")}</p>
          </> : draftType === "creator" ? <>
            <span className="account-type-confirm-icon" aria-hidden="true"><FiStar /></span>
            <h2>{__msg("profile.creatorSwitchTitle")}</h2>
            <div className="account-type-effects">
              {current === "personal" ? <>
                <div className="account-type-effect"><span className="account-type-effect-icon is-kept" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="6" /><ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(-25 12 12)" /></svg></span><div><b>{__msg("profile.creatorSwitchWorld")}</b><p>{__msg("profile.creatorSwitchWorldDescription")}</p></div></div>
                <div className="account-type-effect"><span className="account-type-effect-icon is-kept" aria-hidden="true"><FiMessageCircle /></span><div><b>Direct Access</b><p>{__msg("settings.paidQuestionsAndCalls")}</p></div></div>
                <div className="account-type-effect"><span className="account-type-effect-icon is-kept" aria-hidden="true"><FiBarChart2 /></span><div><b>{__msg("profile.creatorSwitchGrow")}</b><p>{__msg("profile.creatorSwitchGrowDescription")}</p></div></div>
              </> : <>
                <div className="account-type-effect"><span className="account-type-effect-icon" aria-hidden="true"><FiMinus /></span><div><b>{__msg("profile.creatorSwitchBusinessRemoved")}</b></div></div>
                <div className="account-type-effect"><span className="account-type-effect-icon is-kept" aria-hidden="true"><FiCheck /></span><div><b>{__msg("profile.creatorSwitchToolsKept")}</b></div></div>
              </>}
            </div>
            <p className="account-type-preserved">{__msg("profile.personalSwitchPreserved")}</p>
          </> : <>
            <span className="account-type-confirm-icon" aria-hidden="true"><BusinessIcon /></span>
            <h2>{__msg("profile.businessSwitchTitle")}</h2>
            <div className="account-type-effects">
              {current === "personal" ? <>
                <div className="account-type-effect"><span className="account-type-effect-icon is-kept" aria-hidden="true"><FiStar /></span><div><b>{__msg("profile.creatorSwitchWorld")}</b><p>{__msg("profile.creatorSwitchWorldDescription")}</p></div></div>
                <div className="account-type-effect"><span className="account-type-effect-icon is-kept" aria-hidden="true"><FiMessageCircle /></span><div><b>Direct Access</b><p>{__msg("settings.paidQuestionsAndCalls")}</p></div></div>
                <div className="account-type-effect"><span className="account-type-effect-icon is-kept" aria-hidden="true"><FiBarChart2 /></span><div><b>{__msg("profile.creatorSwitchGrow")}</b><p>{__msg("profile.creatorSwitchGrowDescription")}</p></div></div>
              </> : null}
              <div className="account-type-effect"><span className="account-type-effect-icon is-kept" aria-hidden="true"><FiTag /></span><div><b>{__msg("profile.businessSwitchContacts")}</b><p>{__msg("profile.businessSwitchContactsDescription")}</p></div></div>
              {current !== "personal" ? <div className="account-type-effect"><span className="account-type-effect-icon is-kept" aria-hidden="true"><FiCheck /></span><div><b>{__msg("profile.creatorSwitchToolsKept")}</b></div></div> : null}
            </div>
            <p className="account-type-preserved">{__msg("profile.personalSwitchPreserved")}</p>
          </>}
          <button className="account-type-primary" disabled={mutation.isPending} onClick={() => draftType === "personal" ? mutation.mutate({ type: "personal", category: "" }) : chooseCategory(draftType)} type="button">{mutation.isPending ? __msg("financial.saving") : draftType === "personal" ? __msg("profile.switchToPersonal") : __msg("profile.continue")}</button>
          <button className="account-type-cancel" disabled={mutation.isPending} onClick={cancel} type="button">{__msg("admin.cancel")}</button>
        </> : step === "success" ? <div className="account-type-success">
          <span className="account-type-success-icon" aria-hidden="true"><FiCheck /></span>
          <h2>{successTitle}</h2>
          <p>{__msg("profile.creatorSwitchSuccessDescription")}</p>
          <button className="account-type-primary" onClick={() => { setStep(""); navigate("/studio"); }} type="button">{dashboardLabel}</button>
          <button className="account-type-cancel" onClick={() => setStep("")} type="button">{__msg("comments.done")}</button>
        </div> : step === "contacts" ? <>
          <h2>{__msg("profile.businessContactTitle")}</h2><p>{__msg("profile.businessContactDescription")}</p>
          <div className="account-type-contact-list">{[["call", FiPhone, __msg("system.copy.e33c837a3d57")], ["directions", FiMapPin, __msg("system.copy.362a5ddf1433")], ["website", FiLink, __msg("system.copy.3f22c9da02f4")]].map(([key, Icon, label]) => <button className="account-type-contact-row" key={key} role="switch" aria-checked={draftButtons.includes(key)} disabled={mutation.isPending} onClick={() => setDraftButtons(previous => previous.includes(key) ? previous.filter(button => button !== key) : [...previous, key])} type="button"><Icon aria-hidden="true" /><b>{__msg(label)}</b><span className={`account-type-toggle${draftButtons.includes(key) ? " is-on" : ""}`} aria-hidden="true"><i /></span></button>)}</div>
          <button className="account-type-primary" disabled={mutation.isPending} onClick={() => mutation.mutate({ type: "business", category: draftCategory, buttons: draftButtons })} type="button">{mutation.isPending ? __msg("financial.saving") : current === "business" ? __msg("contentEntities.save_efc007") : __msg("profile.businessSwitchAction")}</button>
          <button className="account-type-cancel" disabled={mutation.isPending} onClick={() => { setError(""); setStep(current === "business" ? "types" : "category"); }} type="button">{__msg(current === "business" ? "admin.cancel" : "discover.back")}</button>
        </> : <>
          <h2>{__msg("profile.chooseACategory")}</h2><p>{__msg("profile.shownUnderYourNameYouCanChangeItAnytime")}</p>
          <div aria-label={__msg("profile.categories")} className="account-type-chips">{categories[draftType].map(value => <button aria-pressed={draftCategory === value} className={draftCategory === value ? "is-selected" : ""} disabled={mutation.isPending} key={value} onClick={() => setDraftCategory(value)} type="button">{__optionLabel(value)}</button>)}</div>
          <button className="account-type-primary" disabled={!draftCategory || mutation.isPending} onClick={() => draftType === "business" && current !== "business" ? setStep("contacts") : mutation.mutate({ type: draftType, category: draftCategory })} type="button">{mutation.isPending ? __msg("financial.saving") : draftType === current ? __msg("contentEntities.save_efc007") : draftType === "business" ? __msg("profile.businessNext") : __msg("profile.switchTo_578891", { value0: types.find(type => type.key === draftType)?.title })}</button>
          <button className="account-type-cancel" disabled={mutation.isPending} onClick={() => { setError(""); setStep(draftType === current ? "types" : "confirm"); }} type="button">{draftType === current ? __msg("admin.cancel") : __msg("discover.back")}</button>
        </>}
        {error ? <p className="account-type-error" role="alert">{__systemMessage(error)}</p> : null}
      </section>
    </div>, document.body) : null}
  </>;
}
