/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FiCheck, FiChevronRight } from "react-icons/fi";
import { useLanguage } from "../../hooks/useLanguage";
import { UI_LANGUAGES, deviceUiLanguage, localizedLanguageName } from "../../utils/uiLanguages";
import "./LanguageSetting.css";

const description = "Choose the language for @seen. Posts stay in the language people wrote them in — tap “See translation” to read them in yours.";

export default function LanguageSetting({ renderTrigger } = {}) {
  __useUiLanguage();
  const { language, setLanguage, syncError } = useLanguage();
  const client = useQueryClient();
  const trigger = useRef(null), panel = useRef(null);
  const [open, setOpen] = useState(false), [bounds, setBounds] = useState({}), [saved, setSaved] = useState(false);
  const label = __msg;
  const current = UI_LANGUAGES.find(item => item.code === language) || UI_LANGUAGES[0];
  const suggested = deviceUiLanguage();
  useEffect(() => {
    if (!saved) return undefined;
    const timer = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [saved]);
  const mutation = useMutation({
    mutationFn: code => Promise.resolve(setLanguage(code)),
    onSuccess: result => {
      if (result?.response) {
        const next = result.response.data.data;
        client.setQueryData(["settings", "account"], previous => ({ ...previous, ...next, account: { ...previous?.account, ...next.account } }));
      }
      for (const queryKey of [["profile", "me"], ["unified-profile"], ["wall-language"]]) client.invalidateQueries({ queryKey });
      setSaved(true);
      setOpen(false);
    },
  });
  useLayoutEffect(() => {
    if (!open) return undefined;
    const opener = trigger.current;
    const center = opener?.closest(".social-center-scroll");
    const measure = () => { const rect = center?.getBoundingClientRect(); if (rect) setBounds({ left: rect.left, width: rect.width }); };
    measure();
    const observer = new ResizeObserver(measure);
    if (center) observer.observe(center);
    window.addEventListener("resize", measure);
    const overflow = center?.style.overflow;
    if (center) center.style.overflow = "hidden";
    panel.current?.focus({ preventScroll: true });
    return () => {
      observer.disconnect(); window.removeEventListener("resize", measure);
      if (center) center.style.overflow = overflow;
      opener?.focus({ preventScroll: true });
    };
  }, [open]);
  const choose = code => {
    if (code === language) setOpen(false);
    else { setOpen(false); mutation.mutate(code); }
  };
  const keys = event => {
    if (event.key === "Escape" && !mutation.isPending) { event.preventDefault(); setOpen(false); }
    const buttons = [...panel.current.querySelectorAll("button:not(:disabled)")];
    const index = buttons.indexOf(document.activeElement);
    if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End", "Tab"].includes(event.key) && buttons.length) {
      event.preventDefault();
      const previous = event.shiftKey || ["ArrowUp", "ArrowLeft"].includes(event.key);
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (previous ? -1 : 1) + buttons.length) % buttons.length;
      buttons[next].focus();
    }
  };
  const row = (item, device = false) => <button key={item.code} type="button" role="radio" aria-checked={item.code === language} disabled={mutation.isPending} onClick={() => choose(item.code)} className="language-choice">
    <span className="language-choice-copy"><b dir="auto">{item.name}</b>{(item.code !== language || device) && <small>{item.code !== language ? localizedLanguageName(item.code, language) : ""}{device ? `${item.code !== language ? " · " : ""}${label("Device language")}` : ""}</small>}</span>
    <span className="language-radio" aria-hidden="true">{item.code === language && <FiCheck />}</span>
  </button>;
  return <>
    {renderTrigger ? <span ref={trigger}>{renderTrigger(() => { mutation.reset(); setSaved(false); setOpen(true); }, current)}</span> : <button ref={trigger} className="settings-index-row" type="button" onClick={() => { mutation.reset(); setSaved(false); setOpen(true); }}><span className="settings-index-row-copy"><b>{label("Language")}</b><small dir="auto">{current.name}</small></span><FiChevronRight data-ui-directional="true" /></button>}
    {saved && <p className="language-saved" role="status">{syncError ? __msg(syncError) : `${label("Language")} · ${current.name}`}</p>}
    {open && createPortal(<div className="language-layer" style={bounds}>
      <button className="language-dim" type="button" aria-label={__msg("profile.closeLanguage")} disabled={mutation.isPending} onClick={() => setOpen(false)} />
      <section className="language-sheet" role="dialog" aria-modal="true" aria-labelledby="language-title" aria-describedby="language-description" dir={language === "ar" ? "rtl" : "ltr"} ref={panel} tabIndex={-1} onKeyDown={keys}>
        <span className="language-handle" aria-hidden="true" /><h2 id="language-title">{label("Language")}</h2><p id="language-description">{label(description)}</p>
        <>
          {suggested !== language && <><h3 id="language-suggested">{label("Suggested")}</h3><div role="radiogroup" aria-labelledby="language-suggested">{row(UI_LANGUAGES.find(item => item.code === suggested), true)}</div></>}
          <h3 id="language-all">{label("All languages")}</h3><div role="radiogroup" aria-labelledby="language-all">{UI_LANGUAGES.map(item => row(item))}</div>
        </>
        {mutation.isPending && <p role="status">{__msg("financial.saving")}</p>}{mutation.isError && <p className="language-error" role="alert">{mutation.error.response?.data?.message || __msg("profile.unableToSaveYourLanguagePleaseTryAgain")}</p>}
      </section>
    </div>, document.body)}
  </>;
}
