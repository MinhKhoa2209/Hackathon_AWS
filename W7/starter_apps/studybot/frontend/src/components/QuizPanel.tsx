import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  HelpCircle,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { QuizQuestion, StudyDoc } from "../api";
import { resolveCollectionName } from "../collectionLabels";
import type { Dictionary } from "../i18n";

/* ── Types ───────────────────────────────────────────────────── */
type View = "list" | "player" | "review";

type QuizSession = {
  docId: string;
  docName: string;
  questions: QuizQuestion[];
  answers: (number | null)[];
  startedAt: Date;
  finishedAt?: Date;
  score?: number;
};

/* ── Props ───────────────────────────────────────────────────── */
type Props = {
  t: Dictionary;
  doc: StudyDoc | null;
  docs: StudyDoc[];
  questions: QuizQuestion[];
};

/* ── Helpers ─────────────────────────────────────────────────── */
function groupByDoc(questions: QuizQuestion[]): Map<string, QuizQuestion[]> {
  const map = new Map<string, QuizQuestion[]>();
  for (const q of questions) {
    const arr = map.get(q.doc_id) ?? [];
    arr.push(q);
    map.set(q.doc_id, arr);
  }
  return map;
}

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ════════════════════════════════════════════════════════════════
   Main component
   ════════════════════════════════════════════════════════════════ */
export function QuizPanel({ t, doc, docs, questions }: Props) {
  const [view, setView] = useState<View>("list");
  const [session, setSession] = useState<QuizSession | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExpl, setShowExpl] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "done" | "pending">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "score">("newest");
  const [completedSessions, setCompletedSessions] = useState<QuizSession[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    if (view === "player") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [view]);

  const grouped = useMemo(() => groupByDoc(questions), [questions]);

  // Build quiz list from grouped questions
  const quizList = useMemo(() => {
    const entries = Array.from(grouped.entries()).map(([docId, qs]) => {
      const docName = resolveCollectionName(docId, docs, doc);
      return {
        docId,
        docName,
        questions: qs,
        completed: completedSessions.find((s) => s.docId === docId),
      };
    });

    let filtered = entries.filter((e) => {
      if (filterStatus === "done") return !!e.completed;
      if (filterStatus === "pending") return !e.completed;
      return true;
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((e) => e.docName.toLowerCase().includes(q));
    }

    if (sortOrder === "newest") filtered.reverse();
    else if (sortOrder === "score") {
      filtered.sort((a, b) => (b.completed?.score ?? -1) - (a.completed?.score ?? -1));
    }

    return filtered;
  }, [grouped, doc, docs, completedSessions, search, filterStatus, sortOrder]);

  function startQuiz(docId: string, qs: QuizQuestion[], docName: string) {
    const ses: QuizSession = {
      docId, docName, questions: qs,
      answers: new Array(qs.length).fill(null),
      startedAt: new Date(),
    };
    setSession(ses);
    setQIndex(0);
    setSelected(null);
    setShowExpl(false);
    setElapsed(0);
    setView("player");
  }

  function selectOption(optIdx: number) {
    if (selected !== null || !session) return;
    const correct = session.questions[qIndex].correct_option;
    if (optIdx === correct) {
      // optimistic score update
    }
    setSelected(optIdx);
    setSession((s) => {
      if (!s) return s;
      const answers = [...s.answers];
      answers[qIndex] = optIdx;
      return { ...s, answers };
    });
    setTimeout(() => setShowExpl(true), 350);
  }

  function next() {
    if (!session) return;
    if (qIndex === session.questions.length - 1) {
      submitQuiz();
      return;
    }
    setQIndex((v) => v + 1);
    setSelected(null);
    setShowExpl(false);
  }

  function submitQuiz() {
    if (!session) return;
    const score = session.answers.reduce<number>((acc, ans, i) => {
      return acc + (ans === session.questions[i].correct_option ? 1 : 0);
    }, 0);
    const finished: QuizSession = { ...session, finishedAt: new Date(), score };
    setSession(finished);
    setCompletedSessions((prev) => {
      const filtered = prev.filter((s) => s.docId !== finished.docId);
      return [...filtered, finished];
    });
    setView("review");
  }

  function exitToList() {
    setView("list");
    setSession(null);
    setSelected(null);
    setShowExpl(false);
  }

  /* ── Render list ─────────────────────────────────────────── */
  if (view === "list") {
    return (
      <div className="flex flex-col gap-6 animate-fade-scale">
        {/* Header */}
        <div className="workspace-header">
          <div className="workspace-icon" style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)" }}>
            <HelpCircle className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="workspace-title">{t.quizTitle}</h2>
            <p className="workspace-subtitle">
              {questions.length > 0 ? `${quizList.length} quiz set${quizList.length !== 1 ? "s" : ""}` : t.workspaceHint}
            </p>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="empty-state animate-fade-in">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)" }}>
              <HelpCircle className="h-7 w-7" style={{ color: "#06b6d4", opacity: 0.5 }} />
            </div>
            <p className="text-base font-semibold" style={{ color: "var(--text-secondary)" }}>{t.noQuiz}</p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>Generate a quiz from the Library tab</p>
          </div>
        ) : (
          <>
            {/* Search + filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border px-3" style={{ background: "var(--surface)", borderColor: "var(--border-strong)" }}>
                <Search className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                <input
                  className="flex-1 bg-transparent py-2.5 text-sm outline-none"
                  style={{ color: "var(--text-primary)" }}
                  placeholder="Search quizzes…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  id="quiz-search-input"
                />
              </div>
              <select
                className="field text-sm"
                style={{ width: "auto", minHeight: "2.5rem" }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              >
                <option value="all">All</option>
                <option value="done">Completed</option>
                <option value="pending">Not started</option>
              </select>
              <select
                className="field text-sm"
                style={{ width: "auto", minHeight: "2.5rem" }}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="score">Best score</option>
              </select>
            </div>

            {/* Quiz cards */}
            <div className="grid gap-3">
              {quizList.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>No quizzes match your filters.</p>
              ) : (
                quizList.map(({ docId, docName, questions: qs, completed }, idx) => {
                  const pct = completed ? Math.round((completed.score ?? 0) / qs.length * 100) : null;
                  return (
                    <div
                      key={docId}
                      className={`quiz-list-card animate-slide-up ${completed ? "is-complete" : ""}`}
                      style={{ animationDelay: `${idx * 40}ms`, animationFillMode: "both" }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <span
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                          style={completed
                            ? { background: "linear-gradient(135deg, #10b981, #0e7490)" }
                            : { background: "linear-gradient(135deg, #06b6d4, #0891b2)" }
                          }
                        >
                          {completed
                            ? <CheckCircle2 className="h-5 w-5 text-white" />
                            : <HelpCircle className="h-5 w-5 text-white" />
                          }
                        </span>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{docName}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="badge-muted">{qs.length} questions</span>
                            {completed && pct !== null && (
                              <span className={pct >= 80 ? "badge-green" : pct >= 50 ? "badge-amber" : "badge-red"}>
                                Score: {pct}%
                              </span>
                            )}
                            {!completed && <span className="badge-muted">Not started</span>}
                            {completed?.finishedAt && (
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                {new Date(completed.finishedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* CTA */}
                        <button
                          className={completed ? "btn-secondary shrink-0" : "btn-primary shrink-0"}
                          onClick={() => startQuiz(docId, qs, docName)}
                          id={`start-quiz-${docId.slice(0, 8)}`}
                        >
                          {completed ? (
                            <><RotateCcw className="h-3.5 w-3.5" /> Retake</>
                          ) : (
                            <>Start Quiz</>
                          )}
                        </button>
                      </div>

                      {/* Score bar if completed */}
                      {completed && pct !== null && (
                        <div className="progress-track mt-3">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${pct}%`,
                              background: pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444",
                            }}
                          />
                        </div>
                      )}
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

  /* ── Render player ───────────────────────────────────────── */
  if (view === "player" && session) {
    const question = session.questions[qIndex];
    const progressPct = ((qIndex + (selected !== null ? 1 : 0)) / session.questions.length) * 100;

    return (
      <div className="flex flex-col gap-5 animate-fade-scale">
        {/* Header */}
        <div className="workspace-header">
          <button className="btn-icon" onClick={exitToList} title="Exit quiz" id="quiz-exit-btn">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="workspace-title truncate">{session.docName}</h2>
            <p className="workspace-subtitle">
              Question {qIndex + 1} of {session.questions.length}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="badge-cyan tabular-nums text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {fmtTime(elapsed)}
            </span>
            <span className="badge-violet tabular-nums text-xs">
              {qIndex + 1}/{session.questions.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        {/* Question card */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--card-shadow)" }}
        >
          <h3 className="mb-6 text-lg font-bold leading-8" style={{ color: "var(--text-primary)" }}>
            {question.question}
          </h3>

          {/* Options */}
          <div className="grid gap-3 sm:grid-cols-2">
            {question.options.map((option, optIdx) => {
              const isAnswered = selected !== null;
              const isCorrect = optIdx === question.correct_option;
              const isChosen = selected === optIdx;
              const isWrong = isChosen && !isCorrect;

              let cls = "quiz-option";
              if (isAnswered) {
                if (isCorrect) cls += " is-correct";
                else if (isWrong) cls += " is-wrong";
                else cls += " is-revealed";
              }

              return (
                <button
                  key={`${question.id}-${optIdx}`}
                  className={cls}
                  disabled={isAnswered}
                  onClick={() => selectOption(optIdx)}
                  id={`quiz-option-${optIdx}`}
                >
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-all duration-200"
                    style={
                      isAnswered && isCorrect ? { background: "#10b981", color: "#fff" }
                        : isWrong ? { background: "#ef4444", color: "#fff" }
                        : { background: "var(--surface-3)", color: "var(--text-secondary)" }
                    }
                  >
                    {isAnswered && isCorrect ? <CheckCircle2 className="h-4 w-4" /> : isWrong ? <XCircle className="h-4 w-4" /> : String.fromCharCode(65 + optIdx)}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {selected !== null && showExpl && (
            <div
              className="mt-5 rounded-xl border p-5 animate-slide-up"
              style={{
                background: "var(--surface-2)",
                borderColor: selected === question.correct_option ? "rgba(16,185,129,0.30)" : "rgba(239,68,68,0.28)",
              }}
            >
              <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                {selected === question.correct_option ? (
                  <><CheckCircle2 className="h-4 w-4 text-emerald-400" /><span style={{ color: "#10b981" }}>{t.correct}</span></>
                ) : (
                  <><XCircle className="h-4 w-4 text-red-400" /><span style={{ color: "#ef4444" }}>{t.incorrect}</span></>
                )}
              </div>
              <p className="text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
                <strong style={{ color: "var(--text-primary)" }}>{t.explanation}: </strong>
                {question.explanation}
              </p>
              <div className="flex gap-2 mt-5">
                <button className="btn-primary" onClick={next} id="quiz-next-btn">
                  {qIndex === session.questions.length - 1 ? t.finishQuiz : t.nextQuestion} →
                </button>
                <button className="btn-secondary" onClick={exitToList}>Save & Exit</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Render review ───────────────────────────────────────── */
  if (view === "review" && session) {
    const score = session.score ?? 0;
    const total = session.questions.length;
    const pct = total ? score / total : 0;
    const scorePct = Math.round(pct * 100);
    const scoreMsg = pct >= 0.8 ? t.scoreMessageHigh : pct >= 0.5 ? t.scoreMessageMid : t.scoreMessageLow;
    const timeTaken = session.finishedAt
      ? Math.round((session.finishedAt.getTime() - session.startedAt.getTime()) / 1000)
      : 0;

    return (
      <div className="flex flex-col gap-6 animate-fade-scale">
        {/* Header */}
        <div className="workspace-header">
          <button className="btn-icon" onClick={exitToList} id="quiz-back-list-btn">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="workspace-title">{t.quizComplete}</h2>
            <p className="workspace-subtitle truncate">{session.docName}</p>
          </div>
        </div>

        {/* Score card */}
        <div
          className="flex flex-col items-center rounded-2xl py-10 text-center animate-fade-scale"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--card-shadow)" }}
        >
          {/* Animated circle */}
          <div className="relative mb-6">
            <svg width="130" height="130" viewBox="0 0 130 130" className="rotate-[-90deg]">
              <circle cx="65" cy="65" r="54" fill="none" stroke="var(--surface-3)" strokeWidth="7" />
              <circle
                cx="65" cy="65" r="54" fill="none"
                stroke={pct >= 0.8 ? "#10b981" : pct >= 0.5 ? "#f59e0b" : "#ef4444"}
                strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - pct)}`}
                style={{ transition: "stroke-dashoffset 1.2s var(--ease-spring)" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tabular-nums text-gradient" style={{ lineHeight: 1 }}>{scorePct}%</span>
              <span className="text-xs mt-1 font-semibold" style={{ color: "var(--text-muted)" }}>{score}/{total}</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums" style={{ color: "#10b981" }}>{score}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Correct</p>
            </div>
            <div className="w-px" style={{ background: "var(--border)" }} />
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums" style={{ color: "#ef4444" }}>{total - score}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Wrong</p>
            </div>
            <div className="w-px" style={{ background: "var(--border)" }} />
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums" style={{ color: "#06b6d4" }}>{fmtTime(timeTaken)}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Time</p>
            </div>
          </div>

          <p className="mb-6 max-w-xs text-sm leading-7" style={{ color: "var(--text-secondary)" }}>{scoreMsg}</p>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => startQuiz(session.docId, session.questions, session.docName)} id="retake-quiz-btn">
              <RotateCcw className="h-4 w-4" />
              {t.retakeQuiz}
            </button>
            <button className="btn-secondary" onClick={exitToList}>Back to List</button>
          </div>
        </div>

        {/* Question review */}
        <div className="grid gap-3">
          <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Review answers</h3>
          {session.questions.map((q, i) => {
            const userAns = session.answers[i];
            const isCorrect = userAns === q.correct_option;
            return (
              <div
                key={q.id}
                className="rounded-2xl border p-4 animate-slide-up"
                style={{
                  background: "var(--surface)",
                  borderColor: isCorrect ? "rgba(16,185,129,0.30)" : "rgba(239,68,68,0.25)",
                  animationDelay: `${i * 40}ms`,
                  animationFillMode: "both",
                }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
                    style={isCorrect ? { background: "rgba(16,185,129,0.15)", color: "#10b981" } : { background: "rgba(239,68,68,0.12)", color: "#ef4444" }}
                  >
                    {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Q{i + 1}: {q.question}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {userAns !== null && userAns !== q.correct_option && (
                        <span className="badge-red text-[10px]">Your answer: {q.options[userAns]}</span>
                      )}
                      <span className="badge-green text-[10px]">Correct: {q.options[q.correct_option]}</span>
                    </div>
                  </div>
                </div>
                {q.explanation && (
                  <p className="text-xs leading-5 pl-10" style={{ color: "var(--text-muted)" }}>
                    💡 {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
