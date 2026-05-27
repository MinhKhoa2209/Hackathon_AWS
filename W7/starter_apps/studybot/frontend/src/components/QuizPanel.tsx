import { CheckCircle2, HelpCircle, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { QuizQuestion, StudyDoc } from "../api";
import type { Dictionary } from "../i18n";

type Props = {
  t: Dictionary;
  doc: StudyDoc | null;
  questions: QuizQuestion[];
};

export function QuizPanel({ t, doc, questions }: Props) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [complete, setComplete] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    restart();
  }, [doc?.doc_id, questions.length]);

  function restart() {
    setIndex(0);
    setSelected(null);
    setScore(0);
    setComplete(false);
    setShowExplanation(false);
  }

  function selectOption(optionIndex: number) {
    if (selected !== null) return;
    setSelected(optionIndex);
    if (optionIndex === questions[index].correct_option) {
      setScore((v) => v + 1);
    }
    setTimeout(() => setShowExplanation(true), 350);
  }

  function next() {
    if (index === questions.length - 1) {
      setComplete(true);
      return;
    }
    setIndex((v) => v + 1);
    setSelected(null);
    setShowExplanation(false);
  }

  const question = questions[index];
  const pct = questions.length ? score / questions.length : 0;
  const scoreMessage =
    pct >= 0.8 ? t.scoreMessageHigh : pct >= 0.5 ? t.scoreMessageMid : t.scoreMessageLow;
  const scorePct = Math.round(pct * 100);
  const progressPct = questions.length ? ((index + (selected !== null ? 1 : 0)) / questions.length) * 100 : 0;

  return (
    <div className="flex flex-col gap-6 animate-fade-scale">
      {/* Workspace header */}
      <div className="workspace-header">
        <div
          className="workspace-icon"
          style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)" }}
        >
          <HelpCircle className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="workspace-title">{t.quizTitle}</h2>
          <p className="workspace-subtitle truncate">
            {doc?.filename || t.workspaceHint}
          </p>
        </div>
        {questions.length > 0 && !complete && (
          <span className="badge-cyan shrink-0 tabular-nums text-xs">
            {index + 1} / {questions.length}
          </span>
        )}
      </div>

      {/* Empty state */}
      {!doc || questions.length === 0 ? (
        <div className="empty-state animate-fade-in">
          <div
            className="mb-4 grid h-14 w-14 place-items-center rounded-2xl"
            style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)" }}
          >
            <HelpCircle className="h-7 w-7" style={{ color: "#06b6d4", opacity: 0.5 }} />
          </div>
          <p className="text-base font-semibold" style={{ color: "var(--text-secondary)" }}>{t.noQuiz}</p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Generate a quiz from the Library tab
          </p>
        </div>

      ) : complete ? (
        /* ── Score screen ─────────────────────────────────────── */
        <div
          className="flex flex-col items-center rounded-2xl py-12 text-center animate-fade-scale"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <h3 className="mb-8 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {t.quizComplete}
          </h3>

          {/* Animated score circle */}
          <div className="relative mb-8">
            <svg width="140" height="140" viewBox="0 0 140 140" className="rotate-[-90deg]">
              {/* Track */}
              <circle
                cx="70" cy="70" r="58"
                fill="none"
                stroke="var(--surface-3)"
                strokeWidth="8"
              />
              {/* Fill */}
              <circle
                cx="70" cy="70" r="58"
                fill="none"
                stroke="url(#scoreGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 58}`}
                strokeDashoffset={`${2 * Math.PI * 58 * (1 - pct)}`}
                style={{ transition: "stroke-dashoffset 1.2s var(--ease-spring)" }}
              />
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tabular-nums text-gradient" style={{ lineHeight: 1 }}>
                {scorePct}%
              </span>
              <span className="text-sm mt-1.5 font-semibold" style={{ color: "var(--text-muted)" }}>
                {score}/{questions.length}
              </span>
            </div>
          </div>

          <p className="mb-8 max-w-xs text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
            {scoreMessage}
          </p>

          <button
            className="btn-primary"
            onClick={restart}
            id="retake-quiz-btn"
          >
            <RotateCcw className="h-4 w-4" />
            {t.retakeQuiz}
          </button>
        </div>

      ) : (
        /* ── Active quiz ──────────────────────────────────────── */
        <div
          className="rounded-2xl p-6"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          {/* Progress bar */}
          <div className="progress-track mb-6">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>

          {/* Question */}
          <h3
            className="mb-6 text-lg font-bold leading-8"
            style={{ color: "var(--text-primary)" }}
          >
            {question.question}
          </h3>

          {/* Options grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {question.options.map((option, optionIndex) => {
              const isAnswered = selected !== null;
              const isCorrect = optionIndex === question.correct_option;
              const isChosen = selected === optionIndex;
              const isWrong = isChosen && !isCorrect;

              let className = "quiz-option";
              if (isAnswered) {
                if (isCorrect) className += " is-correct";
                else if (isWrong) className += " is-wrong";
                else className += " is-revealed";
              }

              return (
                <button
                  key={`${question.id}-${optionIndex}`}
                  className={className}
                  disabled={isAnswered}
                  onClick={() => selectOption(optionIndex)}
                  id={`quiz-option-${optionIndex}`}
                >
                  {/* Letter chip */}
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-all duration-200"
                    style={
                      isAnswered && isCorrect
                        ? { background: "#10b981", color: "#fff" }
                        : isWrong
                        ? { background: "#ef4444", color: "#fff" }
                        : { background: "var(--surface-3)", color: "var(--text-secondary)" }
                    }
                  >
                    {isAnswered && isCorrect ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isWrong ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      String.fromCharCode(65 + optionIndex)
                    )}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {selected !== null && showExplanation && (
            <div
              className="mt-5 rounded-xl border p-5 animate-slide-up"
              style={{
                background: "var(--surface-2)",
                borderColor: selected === question.correct_option
                  ? "rgba(16,185,129,0.30)"
                  : "rgba(239,68,68,0.28)",
              }}
            >
              <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                {selected === question.correct_option ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span style={{ color: "#10b981" }}>{t.correct}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-400" />
                    <span style={{ color: "#ef4444" }}>{t.incorrect}</span>
                  </>
                )}
              </div>
              <p className="text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
                <strong style={{ color: "var(--text-primary)" }}>{t.explanation}: </strong>
                {question.explanation}
              </p>
              <button
                className="btn-primary mt-5"
                onClick={next}
                id="quiz-next-btn"
              >
                {index === questions.length - 1 ? t.finishQuiz : t.nextQuestion} →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
