import { ChevronDown, ChevronUp, MessageSquareText, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import type { QueryResponse } from "../api";
import type { Dictionary } from "../i18n";

type Props = {
  t: Dictionary;
  busy: boolean;
  answer: QueryResponse | null;
  onAsk: (question: string) => void;
};

export function QuestionPanel({ t, busy, answer, onAsk }: Props) {
  const [question, setQuestion] = useState("");
  const [expandedCitation, setExpandedCitation] = useState<number | null>(null);

  function submit() {
    const value = question.trim();
    if (value) { onAsk(value); setQuestion(""); }
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-scale">
      {/* Workspace header */}
      <div className="workspace-header">
        <div
          className="workspace-icon"
          style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
        >
          <MessageSquareText className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="workspace-title">{t.askTitle}</h2>
          <p className="workspace-subtitle">Grounded answers from your uploaded documents</p>
        </div>
      </div>

      {/* Input bar */}
      <div
        className="flex gap-3 rounded-2xl p-2"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <input
          className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
          style={{
            background: "transparent",
            color: "var(--text-primary)",
            minHeight: "3rem",
          }}
          value={question}
          placeholder={t.askPlaceholder}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); }
          }}
          id="ask-question-input"
        />
        <button
          className="btn-primary shrink-0 gap-2 self-end"
          disabled={busy || !question.trim()}
          onClick={submit}
          id="ask-submit-btn"
          style={{ minWidth: "7rem", height: "3rem" }}
        >
          {busy ? (
            <>
              <TypingDots />
              {t.askBusy}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {t.askButton}
            </>
          )}
        </button>
      </div>

      {/* Answer area */}
      {answer ? (
        <div className="grid gap-4 animate-slide-up">
          {/* AI response */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "var(--surface)",
              border: "1px solid rgba(124,58,237,0.18)",
              boxShadow: "0 0 30px rgba(124,58,237,0.05)",
            }}
          >
            {/* Label */}
            <div className="mb-4 flex items-center gap-2.5">
              <span
                className="grid h-7 w-7 place-items-center rounded-lg"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
              >
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </span>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                AI Response
              </span>
              <span
                className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: "rgba(16,185,129,0.10)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}
              >
                Grounded
              </span>
            </div>

            <p
              className="whitespace-pre-wrap text-sm leading-8"
              style={{ color: "var(--text-primary)" }}
            >
              {answer.answer}
            </p>
          </div>

          {/* Citations */}
          {answer.citations.length > 0 && (
            <div>
              <h3
                className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--text-muted)" }}
              >
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded text-[10px]"
                  style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}
                >
                  {answer.citations.length}
                </span>
                {t.citations}
              </h3>

              <div className="grid gap-2">
                {answer.citations.map((citation, index) => {
                  const isExpanded = expandedCitation === index;
                  const score = (citation.score ?? 0).toFixed(2);
                  const scoreNum = Number(score);

                  return (
                    <div
                      key={`${citation.doc_id}-${index}`}
                      className="cursor-pointer rounded-xl border p-3 transition-all duration-200"
                      style={{
                        background: "var(--surface-2)",
                        borderColor: isExpanded ? "rgba(124,58,237,0.35)" : "var(--border)",
                        boxShadow: isExpanded ? "0 0 16px rgba(124,58,237,0.08)" : "none",
                      }}
                      onClick={() => setExpandedCitation(isExpanded ? null : index)}
                      id={`citation-${index}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="badge-violet text-[10px]">
                            chunk {citation.chunk ?? index + 1}
                          </span>
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                            style={{
                              background: scoreNum >= 0.8
                                ? "rgba(16,185,129,0.10)"
                                : scoreNum >= 0.5
                                ? "rgba(245,158,11,0.10)"
                                : "var(--surface-3)",
                              color: scoreNum >= 0.8
                                ? "#10b981"
                                : scoreNum >= 0.5
                                ? "#f59e0b"
                                : "var(--text-muted)",
                            }}
                          >
                            ↑ {score}
                          </span>
                        </div>
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {isExpanded
                            ? <ChevronUp className="h-3.5 w-3.5" />
                            : <ChevronDown className="h-3.5 w-3.5" />
                          }
                        </span>
                      </div>
                      {isExpanded && (
                        <p
                          className="mt-3 text-xs leading-6 animate-slide-up"
                          style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}
                        >
                          {citation.text}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {answer.citations.length === 0 && (
            <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>
              {t.noCitations}
            </p>
          )}
        </div>
      ) : (
        /* Empty placeholder */
        <div className="empty-state animate-fade-in">
          <div
            className="mb-4 grid h-14 w-14 place-items-center rounded-2xl"
            style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}
          >
            <MessageSquareText className="h-7 w-7" style={{ color: "#8b5cf6", opacity: 0.6 }} />
          </div>
          <p className="text-base font-semibold" style={{ color: "var(--text-secondary)" }}>
            Ask anything
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Type a question above to get grounded answers from your documents
          </p>
        </div>
      )}
    </div>
  );
}

/** Typing indicator — 3 bouncing dots */
function TypingDots() {
  return (
    <span className="inline-flex items-end gap-0.5 pb-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1 w-1 rounded-full bg-white"
          style={{
            animation: "dot-bounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 160}ms`,
          }}
        />
      ))}
    </span>
  );
}
