import { optionLabel as __optionLabel } from "../../i18n/runtime.js";
import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiChevronRight, FiShoppingBag, FiStar, FiUser } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { profileService } from "../../services/profileService";
import "./AccountTypeSetting.css";

const types = [
  { key: "personal", get title() { return __msg("profile.personal"); }, Icon: FiUser, get description() { return __msg("profile.shareYourLifeAndFollowPeopleGiftsDreamAnd"); } },
  { key: "creator", get title() { return __msg("discover.creator"); }, Icon: FiStar, get description() { return __msg("profile.forPeopleBuildingAnAudienceAddsWorldDirectAccess"); } },
  { key: "business", get title() { return __msg("profile.business"); }, Icon: FiShoppingBag, get description() { return __msg("profile.forBrandsShopsAndPlacesEverythingCreatorsGetPlus"); } },
];
const categories = {
  creator: ["Digital creator", "Coach", "Traveler", "Artist", "Musician", "Athlete", "Chef", "Educator"],
  business: ["Shop", "Café & restaurant", "Studio & salon", "Fitness club", "Hotel & travel", "Media & news", "Services", "Brand"],
};

export default function AccountTypeSetting({ renderTrigger } = {}) {
  __useUiLanguage();
  const { user, setUser } = useAuth();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["settings", "account"], queryFn: () => profileService.getAccountSettings().then(response => response.data.data) });
  const account = query.data?.account || {};
  const current = account.profileAccountType || user?.profileAccountType || (user?.creatorApprovalStatus === "approved" ? "creator" : "personal");
  const category = account.profileCategory || user?.profileCategory || (current === "creator" ? __msg("profile.digitalCreator") : current === "business" ? __msg("profile.shop") : "");
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
      client.invalidateQueries({ queryKey: ["monetization"] });
      setError(""); setStep("");
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
  const chooseCategory = type => { setDraftType(type); setDraftCategory(type === current ? category : ""); setError(""); setStep("category"); };
  const cancel = () => { setError(""); setStep("types"); };
  return <>
    {renderTrigger ? renderTrigger(() => { setStep("types"); setError(""); }) : <button className="settings-index-row" disabled={query.isLoading} onClick={() => { setStep("types"); setError(""); }} type="button"><span className="settings-index-row-copy"><b>{__msg("profile.accountType")}</b><small dir="auto">{types.find(type => type.key === current)?.title}{category ? ` · ${__optionLabel(category)}` : ""}</small></span><FiChevronRight data-ui-directional="true" /></button>}
    {step ? createPortal(<div className="account-type-layer" style={position}>
      <button aria-label={__msg("profile.closeAccountType")} className="account-type-dim" disabled={mutation.isPending} onClick={() => setStep("")} type="button" />
      <section aria-label={step === "category" ? __msg("profile.chooseACategory") : __msg("profile.accountType")} aria-modal="true" className="account-type-sheet" data-step={step} role="dialog">
        <span className="account-type-handle" />
        {step === "types" ? <>
          <h2>{__msg("profile.accountType")}</h2><p>{__msg("profile.everyoneCanEarnYourTypeOnlyChangesWhichTools")}</p>
          <div className="account-type-cards">{types.map(({ key, title, Icon, description }) => <button aria-pressed={current === key} className={current === key ? "is-current" : ""} key={key} onClick={() => {
            if (current === key) { if (key === "personal") setStep(""); else chooseCategory(key); }
            else { setDraftType(key); setError(""); setStep("confirm"); }
          }} type="button"><span className="account-type-icon"><Icon /></span><span><b>{title}{current === key ? <em>{__msg("profile.current")}</em> : null}</b><small>{description}</small></span><i /></button>)}</div>
          {current !== "personal" ? <button className="account-type-category-row" onClick={() => chooseCategory(current)} type="button"><span><b>{__msg("content.category")}</b><small>{category}</small></span><FiChevronRight data-ui-directional="true" /></button> : null}
          <footer>{__msg("profile.switchAnytimeNothingIsDeleted")}</footer>
        </> : step === "confirm" ? <>
          <h2 dir="auto">{__msg("profile.switchTo")} {types.find(type => type.key === draftType)?.title} {__msg("profile.account")}</h2>
          <p>{draftType === "personal" ? __msg("profile.worldDirectAccessGrowCategoryAndBusinessContactTools") : types.find(type => type.key === draftType)?.description}</p>
          <p>{__msg("profile.yourContentAndAccountStayWithYou")}</p>
          <button className="account-type-primary" disabled={mutation.isPending} onClick={() => draftType === "personal" ? mutation.mutate({ type: "personal", category: "" }) : chooseCategory(draftType)} type="button">{mutation.isPending ? __msg("financial.saving") : draftType === "personal" ? __msg("profile.switchToPersonal") : __msg("profile.continue")}</button>
          <button className="account-type-cancel" disabled={mutation.isPending} onClick={cancel} type="button">{__msg("admin.cancel")}</button>
        </> : <>
          <h2>{__msg("profile.chooseACategory")}</h2><p>{__msg("profile.shownUnderYourNameYouCanChangeItAnytime")}</p>
          <div aria-label={__msg("profile.categories")} className="account-type-chips">{categories[draftType].map(value => <button aria-pressed={draftCategory === value} className={draftCategory === value ? "is-selected" : ""} disabled={mutation.isPending} key={value} onClick={() => setDraftCategory(value)} type="button">{__optionLabel(value)}</button>)}</div>
          <button className="account-type-primary" disabled={!draftCategory || mutation.isPending} onClick={() => mutation.mutate({ type: draftType, category: draftCategory })} type="button">{mutation.isPending ? __msg("financial.saving") : draftType === current ? __msg("contentEntities.save_efc007") : __msg("profile.switchTo_578891", { value0: types.find(type => type.key === draftType)?.title })}</button>
          <button className="account-type-cancel" disabled={mutation.isPending} onClick={cancel} type="button">{__msg("admin.cancel")}</button>
        </>}
        {error ? <p className="account-type-error" role="alert">{__systemMessage(error)}</p> : null}
      </section>
    </div>, document.body) : null}
  </>;
}
