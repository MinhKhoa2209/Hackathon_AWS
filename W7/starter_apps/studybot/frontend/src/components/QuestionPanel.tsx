import { Check, Copy, FileText, MessageSquareText, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import type { Citation, QueryResponse, StudyDoc } from "../api";
import type { Dictionary } from "../i18n";

type Props = {
  t: Dictionary;
  busy: boolean;
  answer: QueryResponse | null;
  docs: StudyDoc[];
  onAsk: (question: string) => void;
};

export function QuestionPanel({ t, busy, answer, docs, onAsk }: Props) {
  const [question, setQuestion] = useState("");

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
          {/* AI response card */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "var(--surface)",
              border: "1px solid rgba(124,58,237,0.18)",
              boxShadow: "0 0 30px rgba(124,58,237,0.05)",
            }}
          >
            {/* Header row */}
            <div className="mb-4 flex items-center gap-2.5 flex-wrap">
              <span
                className="grid h-7 w-7 place-items-center rounded-lg shrink-0"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
              >
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </span>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                AI Response
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: "rgba(16,185,129,0.10)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}
              >
                Grounded
              </span>
              {/* Spacer */}
              <div className="flex-1" />
              {/* Copy button */}
              <CopyButton text={answer.answer} />
            </div>

            {/* Rich rendered answer */}
            <MarkdownAnswer text={answer.answer} />

            {/* Blinking cursor while waiting */}
            {busy && (
              <span
                className="mt-2 ml-0.5 inline-block h-[1.1em] w-0.5 align-text-bottom rounded-sm"
                style={{
                  background: "#8b5cf6",
                  animation: "dot-bounce 1s ease-in-out infinite",
                }}
              />
            )}
          </div>

          <CitationList t={t} citations={answer.citations} docs={docs} />
        </div>
      ) : (
        /* Empty state */
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

function CitationList({ t, citations, docs }: { t: Dictionary; citations: Citation[]; docs: StudyDoc[] }) {
  return (
    <section
      className="rounded-2xl p-5"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
          style={{ background: "rgba(6,182,212,0.12)", color: "#06b6d4" }}
        >
          <FileText className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          {t.citations}
        </h3>
      </div>

      {citations.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {t.noCitations}
        </p>
      ) : (
        <div className="grid gap-3">
          {citations.map((citation, index) => {
            const sourceName = getCitationSourceName(citation, docs);

            return (
              <article
                key={`${citation.doc_id || sourceName}-${citation.chunk ?? index}-${index}`}
                className="rounded-xl border p-4"
                style={{
                  background: "linear-gradient(180deg, var(--surface), var(--surface-2))",
                  borderColor: "var(--border)",
                  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
                }}
              >
                <div className="mb-3 flex items-start gap-3">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold"
                    style={{ background: "rgba(6,182,212,0.12)", color: "#0891b2" }}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }} title={sourceName}>
                      {sourceName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {typeof citation.chunk === "number" && (
                        <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed" }}>
                          Chunk {citation.chunk}
                        </span>
                      )}
                      {typeof citation.score === "number" && (
                        <span>Relevance {formatScore(citation.score)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="border-l-2 pl-3 text-sm leading-6" style={{ borderColor: "#06b6d4", color: "var(--text-secondary)" }}>
                  {citation.text || "No citation text returned."}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function getCitationSourceName(citation: Citation, docs: StudyDoc[]) {
  if (citation.filename) return citation.filename;

  const docName = docs.find((doc) => doc.doc_id === citation.doc_id)?.filename;
  if (docName) return docName;

  const sourceName = getFilenameFromSource(citation.source);
  return sourceName || citation.doc_id || "Uploaded document";
}

function getFilenameFromSource(source: unknown): string | null {
  if (!source || typeof source !== "object") return null;
  const values = Object.values(source as Record<string, unknown>);
  for (const value of values) {
    if (typeof value === "string") {
      const parts = decodeURIComponent(value).split(/[\\/]/).filter(Boolean);
      const clean = parts[parts.length - 1];
      if (clean) return clean;
    }
    if (value && typeof value === "object") {
      const nested = getFilenameFromSource(value);
      if (nested) return nested;
    }
  }
  return null;
}

function formatScore(score: number) {
  return score >= 1 ? score.toFixed(0) : score.toFixed(2);
}

/* ── Typing indicator ─────────────────────────────────────── */
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

/* ── Copy button with feedback ────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all duration-150"
      style={{
        background: copied ? "rgba(16,185,129,0.10)" : "var(--surface-2)",
        color: copied ? "#10b981" : "var(--text-muted)",
        border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
      }}
      title="Copy answer to clipboard"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

/* ── Zero-dependency markdown renderer ───────────────────── */
/**
 * Renders a subset of Markdown without any external library:
 *   - # ## ### headings
 *   - **bold** *italic* `inline code`
 *   - - / * unordered lists, 1. ordered lists
 *   - --- horizontal rule
 *   - blank lines → spacing
 */
function MarkdownAnswer({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuf: { type: "ul" | "ol"; items: string[] } | null = null;

  function flushList(key: number) {
    if (!listBuf) return;
    const { type, items } = listBuf;
    nodes.push(
      type === "ul" ? (
        <ul
          key={`ul-${key}`}
          style={{ margin: "0.5rem 0 0.5rem 1.35rem", color: "var(--text-primary)", fontSize: "0.875rem", lineHeight: 1.8, listStyleType: "disc" }}
        >
          {items.map((item, i) => <li key={i}><Inline text={item} /></li>)}
        </ul>
      ) : (
        <ol
          key={`ol-${key}`}
          style={{ margin: "0.5rem 0 0.5rem 1.35rem", color: "var(--text-primary)", fontSize: "0.875rem", lineHeight: 1.8, listStyleType: "decimal" }}
        >
          {items.map((item, i) => <li key={i}><Inline text={item} /></li>)}
        </ol>
      )
    );
    listBuf = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // HR
    if (/^---+$/.test(line.trim())) {
      flushList(i);
      nodes.push(<hr key={i} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0.75rem 0" }} />);
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headingMatch) {
      flushList(i);
      const level = headingMatch[1].length;
      const fontSizes = ["1.1rem", "1rem", "0.9rem"];
      nodes.push(
        <p
          key={i}
          style={{
            fontWeight: 700,
            fontSize: fontSizes[level - 1] ?? "0.875rem",
            color: "var(--text-primary)",
            margin: "0.9rem 0 0.2rem",
            letterSpacing: "-0.01em",
          }}
        >
          <Inline text={headingMatch[2]} />
        </p>
      );
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*]\s+(.*)/);
    if (ulMatch) {
      if (listBuf && listBuf.type !== "ul") flushList(i);
      if (!listBuf) listBuf = { type: "ul", items: [] };
      listBuf.items.push(ulMatch[1]);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s+(.*)/);
    if (olMatch) {
      if (listBuf && listBuf.type !== "ol") flushList(i);
      if (!listBuf) listBuf = { type: "ol", items: [] };
      listBuf.items.push(olMatch[1]);
      continue;
    }

    flushList(i);

    // Blank line
    if (line.trim() === "") {
      nodes.push(<div key={i} style={{ height: "0.45rem" }} />);
      continue;
    }

    // Normal paragraph line
    nodes.push(
      <p
        key={i}
        style={{ color: "var(--text-primary)", fontSize: "0.875rem", lineHeight: 1.85, margin: 0 }}
      >
        <Inline text={line} />
      </p>
    );
  }
  flushList(lines.length);

  return <div style={{ display: "flex", flexDirection: "column", gap: "0.05rem" }}>{nodes}</div>;
}

/** Renders **bold**, *italic*, `code` inline. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={i}>{part.slice(1, -1)}</em>;
        if (part.startsWith("`") && part.endsWith("`"))
          return (
            <code
              key={i}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.8em",
                background: "var(--surface-3)",
                borderRadius: "0.25rem",
                padding: "0.1em 0.35em",
                color: "#8b5cf6",
              }}
            >
              {part.slice(1, -1)}
            </code>
          );
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
