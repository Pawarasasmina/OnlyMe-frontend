import { useEffect, useRef, useState } from "react";
import { FiCamera } from "react-icons/fi";
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import ProfileImageCropper from "../profile/ProfileImageCropper";
import { resolveMediaUrl } from "../../utils/media";
import { PROFILE_STATUS_SUGGESTIONS } from "../../constants/statusPresets";

export default function ShowYourFace({ avatar, busy, error, name, onContinue, onSavePhoto, onSaveStatus }) {
  __useUiLanguage();
  const inputRef = useRef(null);
  const objectUrlRef = useRef("");
  const [cropSource, setCropSource] = useState("");
  const [preview, setPreview] = useState(resolveMediaUrl(avatar) || "");
  const [status, setStatus] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [landed, setLanded] = useState(false);
  const presets = PROFILE_STATUS_SUGGESTIONS;

  useEffect(() => () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); }, []);

  const choosePhoto = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);
    setCropSource(objectUrlRef.current);
  };

  const savePhoto = async (file) => {
    setPhotoSaving(true);
    try {
      await onSavePhoto(file);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = URL.createObjectURL(file);
      setPreview(objectUrlRef.current);
      setCropSource("");
      setLanded(false);
      requestAnimationFrame(() => setLanded(true));
    } finally { setPhotoSaving(false); }
  };

  const proceed = async () => {
    if (!preview) return inputRef.current?.click();
    await onSaveStatus(status.trim());
    await onContinue();
  };

  return <main className="min-h-[100dvh] bg-[#0A0C0F] text-white">
    <section className="mx-auto flex min-h-[100dvh] w-full max-w-[445px] flex-col border-x border-white/[.07] px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(42px,env(safe-area-inset-top))]">
      <h1 className="text-[29px] font-black tracking-[-.04em]">{__msg("onboarding.showYourFace")}</h1>
      <p className="mt-2 text-[14px] leading-6 text-white/55">{__msg("onboarding.showYourFaceCopy")}</p>
      <div className="mt-8 flex flex-col items-center">
        <button aria-label={__msg("onboarding.addPhoto")} className={`relative grid h-[118px] w-[118px] place-items-center overflow-visible rounded-full border border-dashed border-[#9CCBFF]/60 bg-[#9CCBFF]/[.06] ${landed ? "ob-face-in" : ""}`} onClick={() => inputRef.current?.click()} type="button">
          {preview ? <img alt="" className="h-full w-full rounded-full object-cover" src={preview} /> : <span className="flex flex-col items-center gap-2 text-[#BBDDFF]"><FiCamera className="text-2xl" strokeWidth={1.3} /><b className="text-xs">{__msg("onboarding.addPhoto")}</b></span>}
          {landed ? <i aria-hidden="true" className="ob-face-ring" /> : null}
        </button>
        <input accept="image/*" className="sr-only" onChange={choosePhoto} ref={inputRef} type="file" />
        <b className="mt-4 text-[16px]">{name}</b>
        <span className={`mt-2 min-h-7 rounded-full border px-3 py-1 text-xs font-bold ${status ? "border-[#9CCBFF]/55 bg-[#9CCBFF]/10 text-white" : "border-white/10 text-white/35"}`}>{status || __msg("onboarding.peopleSeeYouLikeThis")}</span>
      </div>
      <p className="mt-8 text-[10px] font-black tracking-[.2em] text-white/40">{__msg("onboarding.rightNow")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map((item) => <button aria-pressed={status === item} className={`rounded-full border px-3 py-2 text-[12px] font-bold transition active:scale-95 ${status === item ? "ob-status-pop border-[#9CCBFF]/70 bg-[#9CCBFF]/15" : "border-white/10 bg-white/[.035] text-white/65"}`} key={item} onClick={() => { setCustomOpen(false); setStatus((current) => current === item ? "" : item); }} type="button">{item}</button>)}
        <button className={`rounded-full border px-3 py-2 text-[12px] font-bold ${customOpen ? "border-[#9CCBFF]/70 bg-[#9CCBFF]/15" : "border-white/10 bg-white/[.035] text-white/65"}`} onClick={() => setCustomOpen((value) => !value)} type="button">{__msg("onboarding.yourOwn")}</button>
      </div>
      {customOpen ? <input autoFocus className="mt-3 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm outline-none focus:border-[#9CCBFF]/60" maxLength={24} onChange={(event) => setStatus(event.target.value)} placeholder={__msg("onboarding.whatAreYouUpTo")} value={presets.includes(status) ? "" : status} /> : null}
      {error ? <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-200" role="alert">{error}</p> : null}
      <div className="mt-auto pt-10">
        <button className="w-full rounded-[16px] bg-[#9CCBFF] py-[15px] font-black text-[#0A0C0F] active:scale-[.97] disabled:opacity-45" disabled={busy || photoSaving} onClick={proceed} type="button">{busy || photoSaving ? __msg("financial.saving") : preview ? __msg("profile.continue") : __msg("onboarding.addAPhoto")}</button>
        {!preview ? <button className="mt-3 w-full py-2 text-[13px] text-white/40" disabled={busy} onClick={async () => { await onSaveStatus(status.trim()); await onContinue(); }} type="button">{__msg("onboarding.later")}</button> : null}
      </div>
    </section>
    {cropSource ? <ProfileImageCropper actionLabel={__msg("comments.done")} constrainToCenter kind="avatar" onCancel={() => setCropSource("")} onSave={savePhoto} saving={photoSaving} source={cropSource} /> : null}
  </main>;
}
