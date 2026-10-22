import { useId, useState } from "react";
import { FiChevronDown, FiChevronUp, FiGlobe } from "react-icons/fi";
import VoiceMessageBubble from "../../messaging/VoiceMessageBubble";
import { useWallTranslation } from "../../../hooks/useWallTranslation";
import { transcriptAlreadyShown } from "../../../utils/wallVoiceDisplay";

export function TranslationLink({ translation, onClick, alwaysVisible = false }) {
  if (!alwaysVisible && !translation.metadata?.canTranslate) return null;
  return <div className="wall-content-translation">
    <FiGlobe aria-hidden="true" />
    <span>{translation.showing ? `Translated from ${translation.metadata?.sourceLanguageName || "original language"}` : "Original"}</span>
    <span aria-hidden="true">&middot;</span>
    <button disabled={translation.loading} onClick={onClick || translation.toggle} type="button">{translation.loading ? "Translating..." : translation.error ? "Try translation again" : translation.showing ? "Show original" : "Show translation"}</button>
    {translation.sameLanguage ? <span className="wall-translation-notice" role="status">Already in {translation.metadata?.targetLanguageName || "your preferred language"}</span> : null}
    {translation.error ? <span className="wall-translation-notice" role="status">Translation unavailable. Please try again.</span> : null}
  </div>;
}

export function WallTextContent({ postId, text }) {
  const translation = useWallTranslation({ postId, text });
  const [expanded, setExpanded] = useState(false);
  if (!text?.trim()) return null;
  const display = translation.text || text;
  const long = display.length > 260;
  return <div className="wall-post-text-content" ref={translation.ref}>
    <p className="home-feed-text" dir="auto">{long && !expanded ? `${display.slice(0, 260).trim()}...` : display}</p>
    {long ? <button className="home-feed-show-more" onClick={() => setExpanded(!expanded)} type="button">{expanded ? "Show less" : "Show more"}</button> : null}
    <TranslationLink translation={translation} />
  </div>;
}

export function WallVoiceNote({ item, postId, postText }) {
  const [open, setOpen] = useState(false);
  const transcriptId = useId();
  const duplicate = transcriptAlreadyShown(postText, item.transcript);
  const transcript = duplicate ? "" : item.transcript || "";
  const translation = useWallTranslation({ postId, mediaId: item.id || item.assetId, text: transcript });
  return <div className="wall-voice-note" ref={translation.ref}>
    <VoiceMessageBubble audio={{ duration: item.duration, url: item.url, waveform: item.waveform }} compact label="Voice note" />
    {transcript ? <>
      <button aria-controls={transcriptId} aria-expanded={open} className="wall-transcript-toggle" onClick={() => setOpen(!open)} type="button">{open ? "Hide text" : "Show text"}{open ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}</button>
      {open ? <p className="wall-transcript-text" dir="auto" id={transcriptId}>{translation.text}</p> : null}
      {open ? <TranslationLink alwaysVisible onClick={() => { setOpen(true); translation.toggle(); }} translation={translation} /> : null}
    </> : null}
  </div>;
}
