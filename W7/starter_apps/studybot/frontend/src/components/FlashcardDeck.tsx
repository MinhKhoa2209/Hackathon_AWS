import {
  ArrowLeft,
  BookOpen,
  Brain,
  Heart,
  Keyboard,
  Layers,
  RotateCcw,
  Search,
  Shuffle,
  Star,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Flashcard, StudyDoc } from "../api";
import { resolveCollectionName } from "../collectionLabels";
import type { Dictionary } from "../i18n";

/* ── Types ───────────────────────────────────────────────────── */
type StudyMode = "flip" | "typing" | "srs";
type View = "browser" | "study";

type Collection = {
  docId: string;
  docName: string;
  cards: Flashcard[];
};

type SRSRecord = {
  cardId: string;
  nextReview: number; // timestamp
  interval: number;   // days
  difficulty: "easy" | "medium" | "hard";
};

const SRS_STORAGE_KEY = "studybot.srs.v1";
const FAVORITES_KEY   = "studybot.favorites.v1";

/* ── SRS helpers ─────────────────────────────────────────────── */
function loadSRS(): Map<string, SRSRecord> {
  try {
    const raw = localStorage.getItem(SRS_STORAGE_KEY);
    if (!raw) return new Map();
    return new Map(JSON.parse(raw) as [string, SRSRecord][]);
  } catch { return new Map(); }
}

function saveSRS(map: Map<string, SRSRecord>) {
  localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(Array.from(map.entries())));
}

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function saveFavorites(set: Set<string>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(set)));
}

/* ── Props ───────────────────────────────────────────────────── */
type Props = {
  t: Dictionary;
  doc: StudyDoc | null;
  docs: StudyDoc[];
  cards: Flashcard[];
  onDelete: (id: string) => void;
};

/* ════════════════════════════════════════════════════════════════
   Main component
   ════════════════════════════════════════════════════════════════ */
export function FlashcardDeck({ t, doc, docs, cards, onDelete }: Props) {
  const [view, setView] = useState<View>("browser");
  const [activeCollection, setActiveCollection] = useState<Collection | null>(null);
  const [studyMode, setStudyMode] = useState<StudyMode>("flip");
  const [search, setSearch] = useState("");
  const [filterDocId, setFilterDocId] = useState<string>("all");
  const [shuffle, setShuffle] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
  const [srsMap, setSrsMap] = useState<Map<string, SRSRecord>>(() => loadSRS());

  // Study state
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [typingRevealed, setTypingRevealed] = useState(false);
  const [showList, setShowList] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Collections (group by doc_id) ───────────────────────── */
  const collections = useMemo<Collection[]>(() => {
    const map = new Map<string, Flashcard[]>();
    for (const card of cards) {
      const arr = map.get(card.doc_id) ?? [];
      arr.push(card);
      map.set(card.doc_id, arr);
    }
    return Array.from(map.entries()).map(([docId, c]) => {
      const docName = resolveCollectionName(docId, docs, doc);
      return { docId, docName, cards: c };
    });
  }, [cards, docs, doc]);

  const uniqueDocs = useMemo(() => collections.map((c) => ({ id: c.docId, name: c.docName })), [collections]);

  /* ── Filtered collections for browser ─────────────────────── */
  const visibleCollections = useMemo(() => {
    return collections.filter((col) => {
      if (filterDocId !== "all" && col.docId !== filterDocId) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return col.docName.toLowerCase().includes(q) ||
          col.cards.some((c) => c.question.toLowerCase().includes(q));
      }
      return true;
    });
  }, [collections, filterDocId, search]);

  /* ── Study cards (potentially shuffled / SRS ordered) ─────── */
  const studyCards = useMemo<Flashcard[]>(() => {
    if (!activeCollection) return [];
    let result = [...activeCollection.cards];
    if (studyMode === "srs") {
      const now = Date.now();
      result = result
        .filter((c) => {
          const rec = srsMap.get(c.id);
          return !rec || rec.nextReview <= now;
        })
        .sort((a, b) => {
          const ra = srsMap.get(a.id);
          const rb = srsMap.get(b.id);
          return (ra?.nextReview ?? 0) - (rb?.nextReview ?? 0);
        });
    } else if (shuffle) {
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
    }
    return result;
  }, [activeCollection, shuffle, studyMode, srsMap]);

  const currentCard = studyCards[cardIndex];

  function startStudy(col: Collection) {
    setActiveCollection(col);
    setCardIndex(0);
    setFlipped(false);
    setTypedAnswer("");
    setTypingRevealed(false);
    setView("study");
  }

  function exitStudy() {
    setView("browser");
    setActiveCollection(null);
    setCardIndex(0);
    setFlipped(false);
  }

  function prevCard() {
    setCardIndex((i) => (i - 1 + studyCards.length) % studyCards.length);
    setFlipped(false);
    setTypedAnswer("");
    setTypingRevealed(false);
  }

  function nextCard() {
    setCardIndex((i) => (i + 1) % studyCards.length);
    setFlipped(false);
    setTypedAnswer("");
    setTypingRevealed(false);
  }

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavorites(next);
      return next;
    });
  }

  const rateSRS = useCallback((cardId: string, rating: "easy" | "medium" | "hard") => {
    const intervalDays = rating === "easy" ? 7 : rating === "medium" ? 3 : 1;
    const record: SRSRecord = {
      cardId,
      nextReview: Date.now() + intervalDays * 86_400_000,
      interval: intervalDays,
      difficulty: rating,
    };
    setSrsMap((prev) => {
      const next = new Map(prev);
      next.set(cardId, record);
      saveSRS(next);
      return next;
    });
    nextCard();
  }, [nextCard]);

  /* ── Keyboard shortcuts ───────────────────────────────────── */
  useEffect(() => {
    if (view !== "study" || studyCards.length === 0) return;
    function handleKey(e: KeyboardEvent) {
      const active = document.activeElement?.tagName;
      if (active === "INPUT" || active === "TEXTAREA") return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped((v) => !v); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); prevCard(); }
      if (e.key === "ArrowRight") { e.preventDefault(); nextCard(); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [view, studyCards.length, cardIndex]);

  /* ══════════════════════════════════════════════════════════════
     BROWSER VIEW
     ══════════════════════════════════════════════════════════════ */
  if (view === "browser") {
    return (
      <div className="flex flex-col gap-6 animate-fade-scale">
        {/* Header */}
        <div className="workspace-header">
          <div className="workspace-icon" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="workspace-title">{t.cardsTitle}</h2>
            <p className="workspace-subtitle">
              {cards.length > 0 ? `${cards.length} card${cards.length !== 1 ? "s" : ""} across ${collections.length} collection${collections.length !== 1 ? "s" : ""}` : t.workspaceHint}
            </p>
          </div>
          <button
            className={`btn-secondary text-xs gap-1.5 ${shuffle ? "border-violet-500/50 text-violet-400" : ""}`}
            style={shuffle ? { background: "rgba(124,58,237,0.10)", borderColor: "rgba(124,58,237,0.40)" } : {}}
            onClick={() => setShuffle((v) => !v)}
            title="Shuffle mode"
          >
            <Shuffle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Shuffle</span>
          </button>
        </div>

        {cards.length === 0 ? (
          <div className="empty-state animate-fade-in">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}>
              <Layers className="h-7 w-7" style={{ color: "#7c3aed", opacity: 0.5 }} />
            </div>
            <p className="text-base font-semibold" style={{ color: "var(--text-secondary)" }}>{t.noCards}</p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>Generate cards from the Library tab</p>
          </div>
        ) : (
          <>
            {/* Search + filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border px-3" style={{ background: "var(--surface)", borderColor: "var(--border-strong)" }}>
                <Search className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                <input
                  className="flex-1 bg-transparent py-2.5 text-sm outline-none"
                  style={{ color: "var(--text-primary)" }}
                  placeholder="Search cards…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  id="cards-search-input"
                />
              </div>
              <select
                className="field text-sm"
                style={{ width: "auto", minHeight: "2.5rem" }}
                value={filterDocId}
                onChange={(e) => setFilterDocId(e.target.value)}
              >
                <option value="all">All documents</option>
                {uniqueDocs.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Collections */}
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleCollections.length === 0 ? (
                <p className="text-sm text-center col-span-2 py-8" style={{ color: "var(--text-muted)" }}>No collections match your search.</p>
              ) : (
                visibleCollections.map((col, idx) => {
                  const favCount = col.cards.filter((c) => favorites.has(c.id)).length;
                  const dueCount = col.cards.filter((c) => {
                    const rec = srsMap.get(c.id);
                    return !rec || rec.nextReview <= Date.now();
                  }).length;

                  return (
                    <div
                      key={col.docId}
                      className="collection-card animate-slide-up"
                      style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "both" }}
                      onClick={() => startStudy(col)}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
                          <BookOpen className="h-5 w-5 text-white" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{col.docName}</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {col.cards.length} card{col.cards.length !== 1 ? "s" : ""}
                            {col.cards[0]?.created_at && ` · ${new Date(col.cards[0].created_at).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="badge-violet">{col.cards.length} cards</span>
                        {favCount > 0 && <span className="badge-amber">⭐ {favCount} fav</span>}
                        {dueCount < col.cards.length && <span className="badge-cyan">{dueCount} due</span>}
                      </div>
                      <button
                        className="btn-primary w-full mt-3 text-sm"
                        onClick={(e) => { e.stopPropagation(); startStudy(col); }}
                        id={`study-collection-${col.docId.slice(0, 8)}`}
                      >
                        Study Now
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     STUDY VIEW
     ══════════════════════════════════════════════════════════════ */
  if (view === "study" && activeCollection) {
    return (
      <div className="flex flex-col gap-5 animate-fade-scale">
        {/* Header */}
        <div className="workspace-header">
          <button className="btn-icon" onClick={exitStudy} id="cards-exit-btn">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="workspace-title truncate">{activeCollection.docName}</h2>
            <p className="workspace-subtitle">
              {studyCards.length === 0 ? "All cards reviewed 🎉" : `${cardIndex + 1} / ${studyCards.length}`}
            </p>
          </div>
          <span className="badge-violet shrink-0 tabular-nums">
            {cardIndex + 1}/{studyCards.length || activeCollection.cards.length}
          </span>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2">
          <button
            className={`study-mode-tab ${studyMode === "flip" ? "is-active" : ""}`}
            onClick={() => { setStudyMode("flip"); setCardIndex(0); setFlipped(false); }}
          >
            <RotateCcw className="h-4 w-4" />
            Flip
          </button>
          <button
            className={`study-mode-tab ${studyMode === "typing" ? "is-active" : ""}`}
            onClick={() => { setStudyMode("typing"); setCardIndex(0); setTypedAnswer(""); setTypingRevealed(false); }}
          >
            <Keyboard className="h-4 w-4" />
            Typing
          </button>
          <button
            className={`study-mode-tab ${studyMode === "srs" ? "is-active" : ""}`}
            onClick={() => { setStudyMode("srs"); setCardIndex(0); setFlipped(false); }}
          >
            <Brain className="h-4 w-4" />
            SRS
          </button>
        </div>

        {/* Progress bar */}
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${studyCards.length > 0 ? ((cardIndex) / studyCards.length) * 100 : 100}%` }}
          />
        </div>

        {studyCards.length === 0 && studyMode === "srs" ? (
          <div className="empty-state">
            <Brain className="h-10 w-10 mb-3" style={{ color: "#7c3aed", opacity: 0.5 }} />
            <p className="font-semibold" style={{ color: "var(--text-secondary)" }}>All caught up!</p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>No cards due for review. Check back later.</p>
            <button className="btn-secondary mt-4" onClick={exitStudy}>Back to Collections</button>
          </div>
        ) : currentCard ? (
          <>
            {/* ── FLIP MODE ─────────────────────────────────────── */}
            {studyMode === "flip" && (
              <>
                <div className="card-3d-scene" style={{ minHeight: "260px" }}>
                  <div
                    className={`card-3d-body ${flipped ? "is-flipped" : ""}`}
                    style={{ minHeight: "260px", cursor: "pointer" }}
                    onClick={() => setFlipped((v) => !v)}
                    role="button"
                    aria-label={flipped ? "Show question" : "Show answer"}
                    id="flashcard-face"
                  >
                    <div className="card-3d-face card-face-front">
                      <p className="text-xs font-bold uppercase tracking-widest mb-4 opacity-60" style={{ color: "var(--flashcard-front-label)" }}>Question</p>
                      <p className="text-xl font-semibold leading-8" style={{ color: "var(--flashcard-front-text)" }}>{currentCard.question}</p>
                      <span className="absolute bottom-4 right-4 flex items-center gap-1.5 text-xs opacity-40" style={{ color: "var(--flashcard-front-label)" }}>
                        <RotateCcw className="h-3 w-3" />
                        {t.cardFrontHint}
                      </span>
                    </div>
                    <div className="card-3d-face card-face-back">
                      <p className="text-xs font-bold uppercase tracking-widest mb-4 opacity-60" style={{ color: "var(--flashcard-back-label)" }}>Answer</p>
                      <p className="text-xl font-semibold leading-8" style={{ color: "var(--flashcard-back-text)" }}>{currentCard.answer}</p>
                    </div>
                  </div>
                </div>

                {/* Card actions */}
                <div className="flex items-center justify-between gap-3">
                  <button className="btn-secondary" onClick={prevCard} id="flashcard-prev">← {t.previous}</button>
                  <button
                    className={`btn-icon ${favorites.has(currentCard.id) ? "text-amber-400" : ""}`}
                    style={favorites.has(currentCard.id) ? { color: "#f59e0b", borderColor: "rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)" } : {}}
                    onClick={() => toggleFavorite(currentCard.id)}
                    title="Favorite"
                  >
                    {favorites.has(currentCard.id) ? <Star className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => { onDelete(currentCard.id); if (cardIndex >= studyCards.length - 1) setCardIndex(Math.max(0, cardIndex - 1)); }}
                    title="Delete card"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button className="btn-secondary" onClick={nextCard} id="flashcard-next">{t.next} →</button>
                </div>
                <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>Space/Enter to flip · ← → to navigate</p>
              </>
            )}

            {/* ── TYPING MODE ──────────────────────────────────── */}
            {studyMode === "typing" && (
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--card-shadow)" }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-4 opacity-60" style={{ color: "var(--text-muted)" }}>Question</p>
                  <p className="text-xl font-semibold leading-8" style={{ color: "var(--text-primary)" }}>{currentCard.question}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={inputRef}
                    className="field text-base"
                    placeholder="Type your answer…"
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") setTypingRevealed(true); }}
                    disabled={typingRevealed}
                    id="typing-answer-input"
                  />
                  {!typingRevealed ? (
                    <button className="btn-primary" onClick={() => setTypingRevealed(true)}>
                      Reveal Answer
                    </button>
                  ) : (
                    <div className="rounded-xl border p-4 animate-slide-up" style={{ background: "var(--surface-2)", borderColor: "rgba(16,185,129,0.25)" }}>
                      <p className="text-xs font-bold mb-1" style={{ color: "#10b981" }}>Correct answer</p>
                      <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{currentCard.answer}</p>
                      <div className="flex gap-2 mt-3">
                        <button className="btn-secondary text-xs flex-1" onClick={nextCard}>Next →</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SRS MODE ─────────────────────────────────────── */}
            {studyMode === "srs" && (
              <>
                <div className="card-3d-scene" style={{ minHeight: "240px" }}>
                  <div
                    className={`card-3d-body ${flipped ? "is-flipped" : ""}`}
                    style={{ minHeight: "240px", cursor: "pointer" }}
                    onClick={() => setFlipped((v) => !v)}
                    role="button"
                    id="srs-flashcard-face"
                  >
                    <div className="card-3d-face card-face-front">
                      <p className="text-xs font-bold uppercase tracking-widest mb-4 opacity-60" style={{ color: "var(--flashcard-front-label)" }}>Question</p>
                      <p className="text-lg font-semibold leading-8" style={{ color: "var(--flashcard-front-text)" }}>{currentCard.question}</p>
                    </div>
                    <div className="card-3d-face card-face-back">
                      <p className="text-xs font-bold uppercase tracking-widest mb-4 opacity-60" style={{ color: "var(--flashcard-back-label)" }}>Answer</p>
                      <p className="text-lg font-semibold leading-8" style={{ color: "var(--flashcard-back-text)" }}>{currentCard.answer}</p>
                    </div>
                  </div>
                </div>
                {flipped ? (
                  <div className="animate-slide-up">
                    <p className="text-xs font-semibold text-center mb-2" style={{ color: "var(--text-muted)" }}>How well did you know this?</p>
                    <div className="flex gap-2">
                      <button className="btn-danger flex-1 text-sm" onClick={() => rateSRS(currentCard.id, "hard")}>😓 Hard<span className="ml-1 text-xs opacity-60">(1d)</span></button>
                      <button className="btn-secondary flex-1 text-sm" onClick={() => rateSRS(currentCard.id, "medium")} style={{ borderColor: "rgba(245,158,11,0.4)", color: "#f59e0b" }}>🤔 Medium<span className="ml-1 text-xs opacity-60">(3d)</span></button>
                      <button className="btn-primary flex-1 text-sm" onClick={() => rateSRS(currentCard.id, "easy")} style={{ background: "linear-gradient(135deg, #10b981, #0e7490)" }}>😊 Easy<span className="ml-1 text-xs opacity-60">(7d)</span></button>
                    </div>
                  </div>
                ) : (
                  <button className="btn-secondary w-full" onClick={() => setFlipped(true)}>
                    Flip to reveal answer
                  </button>
                )}
              </>
            )}

            {/* Card list toggle */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
              <button
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold transition-all duration-150"
                style={{ color: "var(--text-secondary)" }}
                onClick={() => setShowList((v) => !v)}
              >
                <span>All cards ({activeCollection.cards.length})</span>
                <span className="text-xs" style={{ color: "var(--text-muted)", transform: showList ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 200ms" }}>▼</span>
              </button>
              {showList && (
                <div className="scroll-region grid max-h-72 gap-1.5 overflow-auto px-3 pb-3 animate-slide-up">
                  {activeCollection.cards.map((item, i) => (
                    <div
                      key={item.id}
                      className="group flex items-start justify-between gap-3 rounded-xl border p-3 transition-all duration-150"
                      style={{
                        background: studyCards[cardIndex]?.id === item.id ? "rgba(124,58,237,0.06)" : "var(--surface-2)",
                        borderColor: studyCards[cardIndex]?.id === item.id ? "rgba(124,58,237,0.30)" : "var(--border)",
                        cursor: "pointer",
                      }}
                      onClick={() => { setCardIndex(studyCards.findIndex((c) => c.id === item.id)); setFlipped(false); }}
                    >
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{item.question}</p>
                        <p className="mt-0.5 text-xs leading-5" style={{ color: "var(--text-muted)" }}>{item.answer}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                          style={{ color: favorites.has(item.id) ? "#f59e0b" : "var(--text-muted)" }}
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="btn-danger shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                          id={`delete-card-${item.id.slice(0, 8)}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return null;
}
