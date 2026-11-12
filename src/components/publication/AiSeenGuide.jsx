import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiEdit3, FiImage, FiMic, FiPlus, FiX } from "react-icons/fi";
import { publicationService as api } from "../../services/publicationService";

const countdown = (target) => {
  const milliseconds = Math.max(0, new Date(target).getTime() - Date.now());
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor(milliseconds % 3_600_000 / 60_000);
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
};
const fallbackQuestion = (file) => {
  const hour = new Date(file.lastModified || Date.now()).getHours();
  if (hour < 11) return __msg("publication.whatWasHappeningInThisMorningMoment");
  if (hour >= 18) return __msg("publication.whatMadeThisEveningMomentWorthRemembering");
  return __msg("publication.whatHappenedInThisMoment");
};

export default function AiSeenGuide({ onClose, onComplete, open }) {
  __useUiLanguage();
  const inputRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [files, setFiles] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [chapters, setChapters] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [lastTry, setLastTry] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [saidAgain, setSaidAgain] = useState(false);
  const urls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => () => urls.forEach((url) => URL.revokeObjectURL(url)), [urls]);
  useEffect(() => {
    if (!open) return;
    api.getAiSeenStatus().then((response) => setStatus(response.data?.data || null)).catch((requestError) => setError(requestError?.response?.data?.message || __msg("publication.couldNotLoadAiSeenAvailability")));
  }, [open]);
  useEffect(() => {
    if (!status?.resetAt || status.remaining) return undefined;
    const timer = window.setInterval(() => setStatus((current) => current ? { ...current } : current), 30_000);
    return () => window.clearInterval(timer);
  }, [status?.remaining, status?.resetAt]);

  if (!open) return null;
  const close = () => {
    if ((sessionId && (answer.trim() || chapters.length)) && !window.confirm(__msg("system.AiSeenGuide.e44142eb2e"))) return;
    onClose();
  };
  const chooseFiles = (event) => {
    setFiles([...event.target.files].filter((file) => file.type.startsWith("image/")).slice(0, 5));
    setIndex(0); setChapters([]); setAnswer(""); setError("");
  };
  const begin = async () => {
    if (!files.length) return inputRef.current?.click();
    setBusy(true); setError("");
    try {
      const response = await api.startAiSeen();
      setSessionId(response.data.data.sessionId);
      setStatus(response.data.data);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || __msg("publication.couldNotStartAiSeen"));
      if (requestError?.response?.status === 429) setStatus((current) => ({ ...current, remaining: 0 }));
    } finally { setBusy(false); }
  };
  const dictate = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setError(__msg("system.AiSeenGuide.a5a40c432a")); return; }
    const recognition = new Recognition();
    recognition.lang = document.documentElement.lang || navigator.language || "en";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); setError(__msg("system.AiSeenGuide.a8113a9bfa")); };
    recognition.onresult = (event) => setAnswer((current) => `${current}${current ? " " : ""}${event.results[0][0].transcript}`);
    recognition.start();
  };
  const finish = (nextChapters) => {
    const first = nextChapters[0];
    const title = nextChapters.map((chapter) => chapter.heading).filter(Boolean).slice(0, 2).join(" — ").slice(0, 120) || __msg("publication.mySeen");
    const description = nextChapters.map((chapter) => chapter.text).join(" ").slice(0, 300);
    onComplete({ sessionId, title, description: description || first?.caption || title, chapters: nextChapters });
  };
  const generate = async (sayAgain = false) => {
    if (!answer.trim()) { setError(__msg("system.AiSeenGuide.3684db51e3")); return; }
    setBusy(true); setError("");
    try {
      const response = await api.generateAiSeenChapter(sessionId, answer, sayAgain);
      const prepared = { ...response.data.data, file: files[index], aiGenerated: true };
      setGenerated(prepared);
      setLastTry(Boolean(prepared.lastTry));
      if (sayAgain) setSaidAgain(true);
    } catch (requestError) { setError(requestError?.response?.data?.message || __msg("publication.couldNotPrepareThisChapter")); }
    finally { setBusy(false); }
  };
  const acceptGenerated = () => {
    if (!generated) return;
    const next = [...chapters, generated];
    if (index >= files.length - 1) finish(next);
    else { setChapters(next); setIndex((value) => value + 1); setAnswer(""); setGenerated(null); setSaidAgain(false); setLastTry(false); }
  };
  const skip = () => {
    if (index >= files.length - 1) finish(chapters);
    else { setIndex((value) => value + 1); setAnswer(""); setError(""); }
  };

  if (status && status.remaining === 0 && !sessionId) return <section aria-labelledby="ai-seen-limit-title" aria-modal="true" className="ai-seen-guide is-limit" role="dialog"><header><button aria-label={__msg("discover.back")} onClick={onClose} type="button"><FiArrowLeft /></button></header><main><span className="ai-seen-guide-icon"><FiImage /></span><h1 id="ai-seen-limit-title">{__msg("system.AiSeenGuide.dda1824763")}</h1><p>{__msg("system.AiSeenGuide.8d9e0d0d01")} <b>{countdown(status.resetAt)}</b>.</p><button className="ai-seen-primary" onClick={onClose} type="button">{__msg("system.AiSeenGuide.294202730d")}</button><button className="ai-seen-secondary" onClick={onClose} type="button">{__msg("system.AiSeenGuide.ab328b0135")}</button></main></section>;

  return <section aria-labelledby="ai-seen-title" aria-modal="true" className="ai-seen-guide" role="dialog">
    <header><button aria-label={__msg("discover.back")} onClick={close} type="button"><FiArrowLeft /></button><strong id="ai-seen-title">{__msg("system.AiSeenGuide.6569a7cef0")}</strong><button aria-label={__msg("activity.close")} onClick={close} type="button"><FiX /></button></header>
    {!sessionId ? <main className="ai-seen-photo-start"><h1>{__msg("system.AiSeenGuide.2725d5fa98")}</h1><p>{__msg("system.AiSeenGuide.6913ffc700")}</p><input accept="image/*" hidden multiple onChange={chooseFiles} ref={inputRef} type="file" />
      <button className="ai-seen-photo-picker" onClick={() => inputRef.current?.click()} type="button">{files.length ? <span className="ai-seen-photo-grid">{urls.map((url) => <img alt={__msg("system.AiSeenGuide.0c3b38dfca")} key={url} src={url} />)}</span> : <><FiPlus /><b>{__msg("system.AiSeenGuide.a59893579b")}</b></>}</button>
      {error ? <p className="ai-seen-error" role="alert">{__systemMessage(error)}</p> : null}<button className="ai-seen-primary" disabled={busy || !files.length} onClick={begin} type="button">{busy ? __msg("social.opening") : __msg("system.AiSeenGuide.1cf214c3a8")}</button></main>
      : <main className="ai-seen-question"><div className="ai-seen-question-photo"><img alt={__msg("system.AiSeenGuide.aa7db84aad")} src={urls[index]} /><span>{index + 1} / {files.length}</span></div><h1>{fallbackQuestion(files[index])}</h1><p>{__msg("system.AiSeenGuide.07a3def59e")}</p>
        {generated ? <section className="ai-seen-generated-preview"><small>{__msg("system.AiSeenGuide.041d5ea6a5")}</small><h2>{generated.heading} <FiEdit3 aria-label={__msg("system.AiSeenGuide.1b9fe48388")} /></h2><p>{generated.text}</p>{lastTry ? <p className="ai-seen-last-try">{__msg("system.AiSeenGuide.967215a589")}</p> : null}<div><button className="ai-seen-secondary" disabled={busy || saidAgain} onClick={() => generate(true)} type="button">{saidAgain ? __msg("system.AiSeenGuide.1e9a03f3b9") : __msg("system.AiSeenGuide.0102daff5b")}</button><button className="ai-seen-primary" onClick={acceptGenerated} type="button">{__msg("system.AiSeenGuide.0bc75fe93e")}</button></div></section> : <>
        <textarea autoFocus maxLength={4000} onChange={(event) => setAnswer(event.target.value)} placeholder={__msg("system.AiSeenGuide.cf31ce4cbc")} value={answer} />
        <button aria-pressed={listening} className={`ai-seen-mic ${listening ? "is-listening" : ""}`} onClick={dictate} type="button"><FiMic /><span>{listening ? __msg("system.AiSeenGuide.4fc2512aa9") : __msg("system.AiSeenGuide.716d490ecd")}</span></button>
        {lastTry ? <p className="ai-seen-last-try">{__msg("system.AiSeenGuide.967215a589")}</p> : null}{error ? <p className="ai-seen-error" role="alert">{__systemMessage(error)}</p> : null}
        <div className="ai-seen-question-actions"><button className="ai-seen-secondary" disabled={busy} onClick={skip} type="button">{__msg("layouts.skip")}</button><button className="ai-seen-primary" disabled={busy || !answer.trim()} onClick={() => generate(false)} type="button">{busy ? __msg("system.AiSeenGuide.c5a97c73eb") : <><FiEdit3 /> {__msg("system.AiSeenGuide.a921df5615")}</>}</button></div>
        </>}
      </main>}
  </section>;
}
