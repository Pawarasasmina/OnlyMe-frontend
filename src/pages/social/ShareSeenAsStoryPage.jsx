import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiEdit3, FiGlobe, FiHelpCircle, FiImage, FiRefreshCw, FiUsers, FiX } from "react-icons/fi";
import SharedSeenStoryCard from "../../components/stories/SharedSeenStoryCard";
import { useFanToast } from "../../components/fanWeb/shared/FanToastContext";
import { useShareSeenAsStory } from "../../hooks/useStories";
import { publicationService } from "../../services/publicationService";
import { sharedSeenCardData } from "../../utils/sharedSeenStoryCard";

const AUDIENCES = [
  { icon: FiGlobe, key: "everyone", label: "Everyone", value: "everyone" },
  { icon: FiUsers, key: "friends", label: "Friends", value: "followers" },
  { icon: FiGlobe, key: "world", label: "My World", value: "close_circle" },
];

const EDIT_COLORS = ["#FFFFFF", "#D6EAFF", "#9CCBFF", "#0A0C0F", "#6ECF97", "#F17878"];
const TEXT_STYLES = [
  { label: "Classic", value: 0 },
  { label: "Strong", value: 1 },
  { label: "Plate", value: 2 },
  { label: "Serif", value: 3 },
  { label: "Mono", value: 4 },
];

function normalizeSeenResponse(response) {
  return response.data?.data?.publication || response.data?.publication || response.data?.data || response.data;
}

function contrastColor(hex) {
  const value = String(hex || "").replace("#", "");
  const red = parseInt(value.slice(0, 2), 16) || 0;
  const green = parseInt(value.slice(2, 4), 16) || 0;
  const blue = parseInt(value.slice(4, 6), 16) || 0;
  return (red * 299 + green * 587 + blue * 114) / 1000 > 160 ? "#0A0C0F" : "#FFFFFF";
}

function ShareSeenAsStoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useFanToast();
  const shareMutation = useShareSeenAsStory();
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const mediaInputRef = useRef(null);
  const questionInputRef = useRef(null);
  const [audience, setAudience] = useState("everyone");
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [backgroundPreview, setBackgroundPreview] = useState("");
  const [cardPosition, setCardPosition] = useState({ x: 50, y: 50 });
  const [cardVariant, setCardVariant] = useState("long");
  const [cardColorIndex, setCardColorIndex] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawing, setDrawing] = useState([]);
  const [notice, setNotice] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [questionSticker, setQuestionSticker] = useState(null);
  const [selectedTextColorIndex, setSelectedTextColorIndex] = useState(0);
  const [selectedStyle, setSelectedStyle] = useState(0);
  const [selectedTextId, setSelectedTextId] = useState("");
  const [textOverlays, setTextOverlays] = useState([]);

  const seenQuery = useQuery({
    enabled: Boolean(id),
    queryKey: ["share-seen-story", id],
    queryFn: () => publicationService.getPublicPublication(id).then(normalizeSeenResponse),
    retry: false,
  });

  const seen = seenQuery.data;
  const selectedCardColor = EDIT_COLORS[cardColorIndex] || EDIT_COLORS[1];
  const selectedTextColor = EDIT_COLORS[selectedTextColorIndex] || EDIT_COLORS[0];
  const activeEditorColorIndex = drawingMode || selectedTextId ? selectedTextColorIndex : cardColorIndex;
  const activeEditorColor = selectedTextId ? selectedTextColor : selectedCardColor;
  const sharedCard = useMemo(() => {
    if (!seen) return null;
    return {
      ...sharedSeenCardData(seen),
      cardBackgroundColor: selectedCardColor,
      cardTextColor: contrastColor(selectedCardColor),
      variant: cardVariant,
    };
  }, [cardVariant, seen, selectedCardColor]);
  const selectedAudience = AUDIENCES.find((item) => item.value === audience) || AUDIENCES[0];
  const AudienceIcon = selectedAudience.icon;
  const canShare = Boolean(seen && sharedCard && !shareMutation.isPending);

  useEffect(() => () => {
    if (backgroundPreview) URL.revokeObjectURL(backgroundPreview);
  }, [backgroundPreview]);

  const close = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/seen");
  };

  const reset = () => {
    setAudience("everyone");
    setBackgroundFile(null);
    if (backgroundPreview) URL.revokeObjectURL(backgroundPreview);
    setBackgroundPreview("");
    setCardPosition({ x: 50, y: 50 });
    setCardVariant("long");
    setCardColorIndex(1);
    setEditMode(false);
    setDrawingMode(false);
    setDrawing([]);
    setPaletteOpen(false);
    setQuestionSticker(null);
    setSelectedTextColorIndex(0);
    setSelectedStyle(0);
    setSelectedTextId("");
    setTextOverlays([]);
    setNotice("Reset");
    window.setTimeout(() => setNotice(""), 1200);
  };

  const cycleAudience = () => {
    setAudience((current) => {
      const index = AUDIENCES.findIndex((item) => item.value === current);
      return AUDIENCES[(index + 1) % AUDIENCES.length].value;
    });
  };

  const chooseMedia = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Choose an image file.");
      return;
    }
    if (backgroundPreview) URL.revokeObjectURL(backgroundPreview);
    setBackgroundFile(file);
    setBackgroundPreview(URL.createObjectURL(file));
    setNotice("Background added");
    window.setTimeout(() => setNotice(""), 1200);
  };

  const selectEditorColor = (index) => {
    if (drawingMode || selectedTextId) {
      const color = EDIT_COLORS[index] || EDIT_COLORS[0];
      setSelectedTextColorIndex(index);
      setTextOverlays((current) => current.map((item) => item.id === selectedTextId ? { ...item, color } : item));
    } else {
      setCardColorIndex(index);
    }
    setPaletteOpen(false);
    setNotice("Color changed");
    window.setTimeout(() => setNotice(""), 900);
  };

  const toggleEditMode = () => {
    setDrawingMode((current) => !current);
    setEditMode(false);
    setSelectedTextId("");
    setPaletteOpen(false);
    setNotice(drawingMode ? "Drawing off" : "Draw with your finger or pointer");
    window.setTimeout(() => setNotice(""), 1400);
  };

  const toggleQuestionSticker = (event) => {
    event.stopPropagation();
    setQuestionSticker((current) => current || {
      id: `question-${Date.now()}`,
      prompt: "Ask me anything",
      x: 50,
      y: 63,
    });
    setPaletteOpen(false);
    setSelectedTextId("");
    window.setTimeout(() => {
      questionInputRef.current?.focus();
      questionInputRef.current?.select();
    }, 0);
  };

  const toggleCardVariant = (event) => {
    event?.stopPropagation();
    if (dragRef.current?.moved) return;
    setCardVariant((current) => current === "compact" ? "long" : "compact");
  };

  const boundedCanvasPoint = useCallback((event) => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return {
      x: Math.max(6, Math.min(94, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.max(8, Math.min(88, ((event.clientY - bounds.top) / bounds.height) * 100)),
    };
  }, []);

  const moveDrag = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.moved && distance < 5) return;
    const point = boundedCanvasPoint(event);
    if (!point) return;
    drag.moved = true;
    event.preventDefault();
    if (drag.type === "drawing") {
      const drawingPoint = { x: point.x, y: point.y * 1.77777 };
      setDrawing((current) => current.map((stroke) => stroke.id === drag.id ? { ...stroke, points: [...stroke.points, drawingPoint] } : stroke));
      return;
    }
    if (drag.type === "card") {
      setCardPosition(point);
      return;
    }
    if (drag.type === "question") {
      setQuestionSticker((current) => current ? { ...current, ...point } : current);
      return;
    }
    setTextOverlays((current) => current.map((item) => item.id === drag.id ? { ...item, ...point } : item));
  }, [boundedCanvasPoint]);

  const endDrag = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag) return;
    event?.preventDefault?.();
    const doc = drag.ownerDocument || document;
    doc.removeEventListener("pointermove", moveDrag);
    doc.removeEventListener("pointerup", endDrag);
    doc.removeEventListener("pointercancel", endDrag);
    if (drag.type === "text" && !drag.moved && drag.input) {
      drag.input.focus();
      drag.input.select();
    }
    if (drag.type === "question" && !drag.moved && drag.input) {
      drag.input.focus();
      drag.input.select();
    }
    window.setTimeout(() => {
      dragRef.current = null;
    }, 0);
  }, [moveDrag]);

  const startDragTracking = useCallback((ownerDocument = document) => {
    ownerDocument.addEventListener("pointermove", moveDrag, { passive: false });
    ownerDocument.addEventListener("pointerup", endDrag, { passive: false });
    ownerDocument.addEventListener("pointercancel", endDrag, { passive: false });
  }, [endDrag, moveDrag]);

  useEffect(() => () => {
    document.removeEventListener("pointermove", moveDrag);
    document.removeEventListener("pointerup", endDrag);
    document.removeEventListener("pointercancel", endDrag);
  }, [endDrag, moveDrag]);

  const beginCardDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedTextId("");
    dragRef.current = {
      id: "card",
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      type: "card",
      ownerDocument: event.currentTarget.ownerDocument,
    };
    startDragTracking(event.currentTarget.ownerDocument);
  };

  const beginTextDrag = (event, overlayId) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const overlay = textOverlays.find((item) => item.id === overlayId);
    setSelectedTextId(overlayId);
    if (overlay) {
      setSelectedTextColorIndex(Math.max(0, EDIT_COLORS.indexOf(overlay.color)));
      setSelectedStyle(overlay.style || 0);
    }
    dragRef.current = {
      id: overlayId,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      type: "text",
      input: event.currentTarget,
      ownerDocument: event.currentTarget.ownerDocument,
    };
    startDragTracking(event.currentTarget.ownerDocument);
  };

  const beginQuestionDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedTextId("");
    dragRef.current = {
      id: "question",
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      type: "question",
      input: event.currentTarget.querySelector("input"),
      ownerDocument: event.currentTarget.ownerDocument,
    };
    startDragTracking(event.currentTarget.ownerDocument);
  };

  const beginDrawing = (event) => {
    if (!drawingMode) return;
    event.preventDefault();
    event.stopPropagation();
    const point = boundedCanvasPoint(event);
    if (!point) return;
    const id = `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setDrawing((current) => [...current, { color: selectedTextColor, id, points: [{ x: point.x, y: point.y * 1.77777 }], size: 1.5 }]);
    dragRef.current = { id, moved: false, ownerDocument: event.currentTarget.ownerDocument, startX: event.clientX, startY: event.clientY, type: "drawing" };
    startDragTracking(event.currentTarget.ownerDocument);
  };

  const addTextOverlay = (event) => {
    if (!editMode) return;
    if (event.target.closest("button,a,input,.shared-seen-story-card,.share-seen-story-text,.share-seen-story-question")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    const overlay = {
        background: "none",
        color: selectedTextColor,
        fontSize: 28,
        id: `share-text-${Date.now()}`,
        style: selectedStyle,
        text: "",
        x: Math.max(6, Math.min(94, x)),
        y: Math.max(8, Math.min(88, y)),
    };
    setTextOverlays((current) => [...current, overlay]);
    setSelectedTextId(overlay.id);
    setSelectedTextColorIndex(Math.max(0, EDIT_COLORS.indexOf(overlay.color)));
  };

  const selectTextStyle = (style) => {
    setSelectedStyle(style);
    if (selectedTextId) {
      setTextOverlays((current) => current.map((item) => item.id === selectedTextId ? { ...item, style } : item));
    }
  };

  const overlayStyle = (overlay) => {
    const plate = overlay.style === 2;
    const darkPlate = plate && overlay.color === "#0A0C0F";
    return {
      backgroundColor: plate ? overlay.color : undefined,
      color: plate ? (darkPlate ? "#FFFFFF" : "#0A0C0F") : overlay.color,
      fontFamily: overlay.style === 3 ? "Georgia, 'Times New Roman', serif" : overlay.style === 4 ? "Menlo, Consolas, monospace" : undefined,
      fontSize: `${overlay.fontSize}px`,
      fontStyle: overlay.style === 3 ? "italic" : undefined,
      fontWeight: overlay.style === 1 || plate ? 800 : 650,
      left: `${overlay.x}%`,
      letterSpacing: overlay.style === 4 ? ".5px" : undefined,
      textShadow: plate ? "none" : "0 2px 14px rgba(0,0,0,.55)",
      top: `${overlay.y}%`,
    };
  };

  const publish = () => {
    if (!canShare) return;
    shareMutation.mutate({
      seenId: id,
      payload: {
        audience,
        allowReactions: true,
        allowReplies: true,
        allowSharing: true,
        backgroundFile,
      editorMetadata: {
          sharedCard: { ...sharedCard, x: cardPosition.x, y: cardPosition.y },
          ...(questionSticker ? { questionSticker } : {}),
          ...(drawing.length ? { drawing } : {}),
          textOverlays: textOverlays
            .filter((overlay) => overlay.text.trim())
            .map((overlay) => ({ ...overlay, styleName: TEXT_STYLES.find((style) => style.value === overlay.style)?.label || "Classic" })),
        },
      },
    }, {
      onSuccess: () => {
        showToast("Your story is live - 24h");
        navigate("/wall");
      },
      onError: (error) => {
        showToast(error?.response?.data?.message || "Could not share this Seen to Story.");
      },
    });
  };

  return (
    <section className="share-seen-story-page" aria-label="Share Seen as Story">
      <header className="share-seen-story-topbar">
        <div>
          <button aria-label="Close Share as Story" onClick={close} type="button"><FiX aria-hidden="true" /></button>
          <span className="share-seen-story-lifetime">24h</span>
        </div>
        <div>
          <button aria-label={drawingMode ? "Stop drawing" : "Draw on story"} className={drawingMode ? "is-active" : ""} onClick={toggleEditMode} type="button"><FiEdit3 aria-hidden="true" /></button>
          <button aria-label="Add question sticker" className={questionSticker ? "is-active" : ""} onClick={toggleQuestionSticker} type="button"><FiHelpCircle aria-hidden="true" /></button>
          <button aria-label="Reset Story customizations" onClick={reset} type="button"><FiRefreshCw aria-hidden="true" /></button>
        </div>
      </header>

      <div
        className={`share-seen-story-canvas ${editMode ? "is-editing" : ""}`}
        onClick={addTextOverlay}
        onPointerCancel={endDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        ref={canvasRef}
      >
        {backgroundPreview ? <img alt="" className="share-seen-story-background-preview" src={backgroundPreview} /> : null}
        {drawing.length || drawingMode ? <svg aria-label="Story drawing canvas" className={`story-composer-drawing ${drawingMode ? "is-active" : ""}`} onPointerDown={beginDrawing} viewBox="0 0 100 177.777">
          {drawing.map((stroke) => <polyline fill="none" key={stroke.id} points={stroke.points.map((point) => `${point.x},${point.y}`).join(" ")} stroke={stroke.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={stroke.size || 1.5} />)}
        </svg> : null}
        {seenQuery.isLoading ? <div className="share-seen-story-state">Loading Seen...</div> : null}
        {seenQuery.isError ? <div className="share-seen-story-state is-error">This Seen could not be loaded.</div> : null}
        {seen ? (
          <div
            className="share-seen-story-card-positioner"
            onClick={toggleCardVariant}
            onPointerDown={beginCardDrag}
            style={{ left: `${cardPosition.x}%`, top: `${cardPosition.y}%` }}
          >
            <SharedSeenStoryCard className="is-editor-preview" disabled seen={seen} sharedCard={sharedCard} variant={cardVariant} />
          </div>
        ) : null}
        {textOverlays.map((overlay) => (
          <input
            aria-label="Story text"
            className="share-seen-story-text"
            key={overlay.id}
            maxLength={80}
            onBlur={() => setTextOverlays((current) => current.filter((item) => item.id !== overlay.id || item.text.trim()))}
            onFocus={() => {
              setSelectedTextId(overlay.id);
              setSelectedTextColorIndex(Math.max(0, EDIT_COLORS.indexOf(overlay.color)));
              setSelectedStyle(overlay.style || 0);
            }}
            onChange={(event) => {
              const value = event.target.value;
              setTextOverlays((current) => current.map((item) => item.id === overlay.id ? { ...item, text: value } : item));
            }}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => beginTextDrag(event, overlay.id)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setTextOverlays((current) => current.filter((item) => item.id !== overlay.id));
              }
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            placeholder="Say it..."
            style={overlayStyle(overlay)}
            type="text"
            value={overlay.text}
            autoFocus={!overlay.text}
          />
        ))}
        {questionSticker ? (
          <div
            className="share-seen-story-question"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={beginQuestionDrag}
            style={{ left: `${questionSticker.x}%`, top: `${questionSticker.y}%` }}
          >
            <input
              aria-label="Question sticker prompt"
              maxLength={60}
              onChange={(event) => setQuestionSticker((current) => current ? { ...current, prompt: event.target.value } : current)}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              placeholder="Ask me anything"
              ref={questionInputRef}
              type="text"
              value={questionSticker.prompt}
            />
            <span>answers go to your inbox · tap to edit</span>
          </div>
        ) : null}
      </div>

      {notice ? <p className="share-seen-story-notice" role="status">{notice}</p> : null}

      <div className="share-seen-story-media">
        <button aria-label="Add media to Story" onClick={() => mediaInputRef.current?.click()} type="button"><FiImage aria-hidden="true" /></button>
        <input accept="image/*" className="sr-only" onChange={chooseMedia} ref={mediaInputRef} type="file" />
      </div>

      {editMode || drawingMode ? (
        <div className="share-seen-story-color-control">
          {paletteOpen ? (
            <div aria-label="Story color options" className="share-seen-story-color-palette" role="group">
              {EDIT_COLORS.map((color, index) => (
                <button
                  aria-label={`Use ${color}`}
                  aria-pressed={index === activeEditorColorIndex}
                  className={index === activeEditorColorIndex ? "is-selected" : ""}
                  key={color}
                  onClick={() => selectEditorColor(index)}
                  style={{ "--share-story-swatch-color": color }}
                  type="button"
                />
              ))}
            </div>
          ) : null}
          <button
            aria-expanded={paletteOpen}
            aria-label="Show story color options"
            className="share-seen-story-color-wheel"
            onClick={() => setPaletteOpen((current) => !current)}
            style={{ "--share-story-active-color": activeEditorColor }}
            type="button"
          />
          <div aria-label="Text styles" className="share-seen-story-style-scroll" role="group">
            {TEXT_STYLES.map((style) => (
              <button
                className={`${selectedStyle === style.value ? "is-selected" : ""} is-style-${style.value}`}
                key={style.value}
                onClick={() => selectTextStyle(style.value)}
                type="button"
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <footer className="share-seen-story-footer">
        <div className="share-seen-story-audience">
          <button aria-label={`Story audience: ${selectedAudience.label}`} className={`is-${selectedAudience.key}`} onClick={cycleAudience} type="button">
            <AudienceIcon aria-hidden="true" />
            {selectedAudience.label}
          </button>
        </div>
        <button className="share-seen-story-submit" disabled={!canShare} onClick={publish} type="button">
          {shareMutation.isPending ? "Sharing..." : "Share"}
        </button>
      </footer>
    </section>
  );
}

export default ShareSeenAsStoryPage;
