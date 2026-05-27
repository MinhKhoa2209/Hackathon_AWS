import { Layers, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Flashcard, StudyDoc } from "../api";
import type { Dictionary } from "../i18n";

type Props = {
  t: Dictionary;
  doc: StudyDoc | null;
  cards: Flashcard[];
  onDelete: (id: string) => void;
};

export function FlashcardDeck({ t, doc, cards, onDelete }: Props) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [doc?.doc_id, cards.length]);

  const card = cards[index];
  const total = cards.length;

  function prevCard() {
    setIndex((i) => (i - 1 + total) % total);
    setFlipped(false);
  }
  function nextCard() {
    setIndex((i) => (i + 1) % total);
    setFlipped(false);
  }

  // Keyboard navigation
  useEffect(() => {
    if (total === 0) return;
    function handleKey(e: KeyboardEvent) {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped((v) => !v); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prevCard(); }
      if (e.key === "ArrowRight") { e.preventDefault(); nextCard(); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [total, index]);

  return (
    <div className="flex flex-col gap-6 animate-fade-scale">
      {/* Workspace header */}
      <div className="workspace-header">
        <div
          className="workspace-icon"
          style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
        >
          <Layers className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="workspace-title">{t.cardsTitle}</h2>
          <p className="workspace-subtitle truncate">
            {doc?.filename || t.workspaceHint}
          </p>
        </div>
        {total > 0 && (
          <span className="badge-violet shrink-0 tabular-nums">
            {index + 1} / {total}
          </span>
        )}
      </div>

      {/* Empty state */}
      {!doc || total === 0 ? (
        <div className="empty-state animate-fade-in">
          <div
            className="mb-4 grid h-14 w-14 place-items-center rounded-2xl"
            style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}
          >
            <Layers className="h-7 w-7" style={{ color: "#7c3aed", opacity: 0.5 }} />
          </div>
          <p className="text-base font-semibold" style={{ color: "var(--text-secondary)" }}>{t.noCards}</p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Generate cards from the Library tab
          </p>
        </div>
      ) : (
        <>
          {/* 3D Flashcard */}
          <div className="card-3d-scene" style={{ minHeight: "280px" }}>
            <div
              className={`card-3d-body ${flipped ? "is-flipped" : ""}`}
              style={{ minHeight: "280px", cursor: "pointer" }}
              onClick={() => setFlipped((v) => !v)}
              role="button"
              aria-label={flipped ? "Show question" : "Show answer"}
              id="flashcard-face"
            >
              {/* Front — Question */}
              <div className="card-3d-face card-face-front">
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-5 opacity-60"
                  style={{ color: "var(--flashcard-front-label)" }}
                >
                  Question
                </p>
                <p className="text-xl font-semibold leading-8" style={{ color: "var(--flashcard-front-text)" }}>
                  {card.question}
                </p>
                <span
                  className="absolute bottom-5 right-5 flex items-center gap-1.5 text-xs opacity-40"
                  style={{ color: "var(--flashcard-front-label)" }}
                >
                  <RotateCcw className="h-3 w-3" />
                  {t.cardFrontHint}
                </span>
              </div>

              {/* Back — Answer */}
              <div className="card-3d-face card-face-back">
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-5 opacity-60"
                  style={{ color: "var(--flashcard-back-label)" }}
                >
                  Answer
                </p>
                <p className="text-xl font-semibold leading-8" style={{ color: "var(--flashcard-back-text)" }}>
                  {card.answer}
                </p>
                <span
                  className="absolute bottom-5 right-5 flex items-center gap-1.5 text-xs opacity-40"
                  style={{ color: "var(--flashcard-back-label)" }}
                >
                  <RotateCcw className="h-3 w-3" />
                  {t.cardFrontHint}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            <button
              className="btn-secondary"
              onClick={prevCard}
              id="flashcard-prev"
              aria-label={t.previous}
            >
              ← {t.previous}
            </button>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {cards.slice(0, 12).map((_, i) => (
                <button
                  key={i}
                  className="rounded-full transition-all duration-200"
                  style={{
                    width: i === index ? "22px" : "6px",
                    height: "6px",
                    background: i === index
                      ? "linear-gradient(90deg, #7c3aed, #06b6d4)"
                      : "var(--surface-3)",
                    cursor: "pointer",
                  }}
                  onClick={() => { setIndex(i); setFlipped(false); }}
                  aria-label={`Card ${i + 1}`}
                />
              ))}
              {cards.length > 12 && (
                <span className="text-[11px] ml-1" style={{ color: "var(--text-muted)" }}>
                  +{cards.length - 12}
                </span>
              )}
            </div>

            <button
              className="btn-secondary"
              onClick={nextCard}
              id="flashcard-next"
              aria-label={t.next}
            >
              {t.next} →
            </button>
          </div>

          {/* Keyboard hint */}
          <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Space/Enter to flip · ← → to navigate
          </p>

          {/* Card list toggle */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
          >
            <button
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold transition-all duration-150"
              style={{ color: "var(--text-secondary)" }}
              onClick={() => setShowList((v) => !v)}
            >
              <span>All cards ({total})</span>
              <span
                className="text-xs font-normal transition-transform duration-200"
                style={{
                  color: "var(--text-muted)",
                  transform: showList ? "rotate(180deg)" : "rotate(0deg)",
                }}
              >
                ▼
              </span>
            </button>

            {showList && (
              <div
                className="scroll-region grid max-h-80 gap-1.5 overflow-auto px-3 pb-3 animate-slide-up"
              >
                {cards.map((item, i) => (
                  <div
                    key={item.id}
                    className="group flex items-start justify-between gap-3 rounded-xl border p-3 transition-all duration-150"
                    style={{
                      background: i === index ? "rgba(124,58,237,0.06)" : "var(--surface-2)",
                      borderColor: i === index ? "rgba(124,58,237,0.30)" : "var(--border)",
                      cursor: "pointer",
                    }}
                    onClick={() => { setIndex(i); setFlipped(false); }}
                  >
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {item.question}
                      </p>
                      <p className="mt-0.5 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
                        {item.answer}
                      </p>
                    </div>
                    <button
                      className="btn-danger shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                      id={`delete-card-${item.id.slice(0, 8)}`}
                      aria-label={t.delete}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
