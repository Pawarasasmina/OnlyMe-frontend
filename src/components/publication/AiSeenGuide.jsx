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
  if (hour < 11) return "What was happening in this morning moment?";
  if (hour >= 18) return "What made this evening moment worth remembering?";
  return "What happened in this moment?";
};

export default function AiSeenGuide({ onClose, onComplete, open }) {
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
    api.getAiSeenStatus().then((response) => setStatus(response.data?.data || null)).catch((requestError) => setError(requestError?.response?.data?.message || "Could not load AI Seen availability"));
  }, [open]);
  useEffect(() => {
    if (!status?.resetAt || status.remaining) return undefined;
    const timer = window.setInterval(() => setStatus((current) => current ? { ...current } : current), 30_000);
    return () => window.clearInterval(timer);
  }, [status?.remaining, status?.resetAt]);

  if (!open) return null;
  const close = () => {
    if ((sessionId && (answer.trim() || chapters.length)) && !window.confirm("Leave this AI Seen? Your current chapter answer will be lost.")) return;
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
      setError(requestError?.response?.data?.message || "Could not start AI Seen");
      if (requestError?.response?.status === 429) setStatus((current) => ({ ...current, remaining: 0 }));
    } finally { setBusy(false); }
  };
  const dictate = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setError("Voice typing is unavailable in this browser. You can type your answer."); return; }
    const recognition = new Recognition();
    recognition.lang = document.documentElement.lang || navigator.language || "en";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); setError("Could not hear that. Type your answer or try again."); };
    recognition.onresult = (event) => setAnswer((current) => `${current}${current ? " " : ""}${event.results[0][0].transcript}`);
    recognition.start();
  };
  const finish = (nextChapters) => {
    const first = nextChapters[0];
    const title = nextChapters.map((chapter) => chapter.heading).filter(Boolean).slice(0, 2).join(" — ").slice(0, 120) || "My Seen";
    const description = nextChapters.map((chapter) => chapter.text).join(" ").slice(0, 300);
    onComplete({ sessionId, title, description: description || first?.caption || title, chapters: nextChapters });
  };
  const generate = async (sayAgain = false) => {
    if (!answer.trim()) { setError("Tell us what happened first"); return; }
    setBusy(true); setError("");
    try {
      const response = await api.generateAiSeenChapter(sessionId, answer, sayAgain);
      const prepared = { ...response.data.data, file: files[index], aiGenerated: true };
      setGenerated(prepared);
      setLastTry(Boolean(prepared.lastTry));
      if (sayAgain) setSaidAgain(true);
    } catch (requestError) { setError(requestError?.response?.data?.message || "Could not prepare this chapter"); }
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

  if (status && status.remaining === 0 && !sessionId) return <section aria-labelledby="ai-seen-limit-title" aria-modal="true" className="ai-seen-guide is-limit" role="dialog"><header><button aria-label="Back" onClick={onClose} type="button"><FiArrowLeft /></button></header><main><span className="ai-seen-guide-icon"><FiImage /></span><h1 id="ai-seen-limit-title">Saved for you</h1><p>Your next AI Seen is ready in <b>{countdown(status.resetAt)}</b>.</p><button className="ai-seen-primary" onClick={onClose} type="button">Create it yourself</button><button className="ai-seen-secondary" onClick={onClose} type="button">Remind me tomorrow</button></main></section>;

  return <section aria-labelledby="ai-seen-title" aria-modal="true" className="ai-seen-guide" role="dialog">
    <header><button aria-label="Back" onClick={close} type="button"><FiArrowLeft /></button><strong id="ai-seen-title">Create from photos</strong><button aria-label="Close" onClick={close} type="button"><FiX /></button></header>
    {!sessionId ? <main className="ai-seen-photo-start"><h1>Choose the moments</h1><p>Add up to five photos. The guide asks you about them; it never inspects or invents what happened.</p><input accept="image/*" hidden multiple onChange={chooseFiles} ref={inputRef} type="file" />
      <button className="ai-seen-photo-picker" onClick={() => inputRef.current?.click()} type="button">{files.length ? <span className="ai-seen-photo-grid">{urls.map((url) => <img alt="Selected moment" key={url} src={url} />)}</span> : <><FiPlus /><b>Add photos</b></>}</button>
      {error ? <p className="ai-seen-error" role="alert">{error}</p> : null}<button className="ai-seen-primary" disabled={busy || !files.length} onClick={begin} type="button">{busy ? "Opening..." : "Tell the story"}</button></main>
      : <main className="ai-seen-question"><div className="ai-seen-question-photo"><img alt="Your selected moment" src={urls[index]} /><span>{index + 1} / {files.length}</span></div><h1>{fallbackQuestion(files[index])}</h1><p>Use your own words. Nothing is published without you.</p>
        {generated ? <section className="ai-seen-generated-preview"><small>YOUR CHAPTER</small><h2>{generated.heading} <FiEdit3 aria-label="Editable suggestion" /></h2><p>{generated.text}</p>{lastTry ? <p className="ai-seen-last-try">Last try</p> : null}<div><button className="ai-seen-secondary" disabled={busy || saidAgain} onClick={() => generate(true)} type="button">{saidAgain ? "Say it again used" : "Say it again"}</button><button className="ai-seen-primary" onClick={acceptGenerated} type="button">Use chapter</button></div></section> : <>
        <textarea autoFocus maxLength={4000} onChange={(event) => setAnswer(event.target.value)} placeholder="Type what happened..." value={answer} />
        <button aria-pressed={listening} className={`ai-seen-mic ${listening ? "is-listening" : ""}`} onClick={dictate} type="button"><FiMic /><span>{listening ? "Listening..." : "Tell it out loud"}</span></button>
        {lastTry ? <p className="ai-seen-last-try">Last try</p> : null}{error ? <p className="ai-seen-error" role="alert">{error}</p> : null}
        <div className="ai-seen-question-actions"><button className="ai-seen-secondary" disabled={busy} onClick={skip} type="button">Skip</button><button className="ai-seen-primary" disabled={busy || !answer.trim()} onClick={() => generate(false)} type="button">{busy ? "Writing..." : <><FiEdit3 /> Create chapter</>}</button></div>
        </>}
      </main>}
  </section>;
}
