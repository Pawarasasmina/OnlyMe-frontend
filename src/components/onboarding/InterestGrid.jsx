import { useState } from "react";
import { FiCheck } from "react-icons/fi";

const fallbackBackgrounds = [
  "linear-gradient(135deg, #24364f 0%, #0A0E14 72%)",
  "linear-gradient(135deg, #263752 0%, #11151c 72%)",
  "linear-gradient(135deg, #1f3b46 0%, #0A0E14 72%)",
  "linear-gradient(135deg, #3a3349 0%, #0A0E14 72%)",
  "linear-gradient(135deg, #31422f 0%, #0A0E14 72%)",
];

const categoryImageFallbacks = {
  Fitness: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=700&q=75",
  Lifestyle: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=700&q=75",
  Business: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=700&q=75",
  Psychology: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=700&q=75",
  Fashion: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=75",
  Travel: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=75",
  Beauty: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=700&q=75",
  Models: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=700&q=75",
  Wellness: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=700&q=75",
  Books: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=700&q=75",
  Family: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=700&q=75",
  Technology: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=700&q=75",
  Food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=700&q=75",
  Photography: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=700&q=75",
  Music: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=700&q=75",
  Sports: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=700&q=75",
  Entrepreneurship: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=700&q=75",
  Culture: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&w=700&q=75",
};

function InterestGrid({ categories = [], max = 8, onToggle, selected = [] }) {
  const selectedSet = new Set(selected);
  const [failedImages, setFailedImages] = useState(() => new Set());
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((category, index) => {
        const active = selectedSet.has(category.id);
        const disabled = !active && selected.length >= max;
        const fallbackImage = categoryImageFallbacks[category.name] || categoryImageFallbacks[category.id] || "";
        const primaryImage = category.image || "";
        const primaryFailed = primaryImage && failedImages.has(`${category.id}:${primaryImage}`);
        const fallbackFailed = fallbackImage && failedImages.has(`${category.id}:${fallbackImage}`);
        const imageSource = primaryImage && !primaryFailed ? primaryImage : fallbackImage && !fallbackFailed ? fallbackImage : "";
        return (
          <button
            aria-pressed={active}
            className={`group relative aspect-[1.05] overflow-hidden rounded-[18px] border text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9CCBFF] ${
              active ? "border-[#9CCBFF] shadow-[0_0_28px_rgba(156,203,255,.22)]" : "border-white/10 hover:border-white/25"
            } ${disabled ? "opacity-45" : ""}`}
            disabled={disabled}
            key={category.id}
            onClick={() => onToggle(category.id)}
            style={{ background: fallbackBackgrounds[index % fallbackBackgrounds.length] }}
            type="button"
          >
            {imageSource ? (
              <img
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-55 transition group-hover:scale-105"
                onError={() => setFailedImages((current) => new Set(current).add(`${category.id}:${imageSource}`))}
                src={imageSource}
              />
            ) : null}
            <span className="absolute inset-0 bg-gradient-to-t from-[#050608] via-[#050608]/28 to-transparent" />
            <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/35 px-2 py-1 text-[10px] font-black tracking-[0.16em] text-white/70">{category.badge}</span>
            <span className="absolute bottom-3 left-3 right-10 text-base font-black text-white">{category.name}</span>
            <span className={`absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border ${active ? "border-[#9CCBFF] bg-[#9CCBFF] text-[#0A0C0F]" : "border-white/20 bg-black/30 text-transparent"}`}>
              <FiCheck aria-hidden="true" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default InterestGrid;
