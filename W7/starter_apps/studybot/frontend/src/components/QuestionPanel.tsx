import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  MessageSquareText,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Citation, QueryResponse, StudyDoc } from "../api";
import type { Dictionary } from "../i18n";

/* ── Types ──────────────────────────────────────────────────── */
type MessageRole = "user" | "assistant" | "error" | "loading";

type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  citations?: Citation[];
  timestamp: Date;
  question?: string; // stored so we can retry
};

/* ── Props ──────────────────────────────────────────────────── */
type Props = {
  t: Dictionary;
  busy: boolean;
  docs: StudyDoc[];
  onAsk: (question: string) => Promise<QueryResponse>;
};

/* ── Component ──────────────────────────────────────────────── */
export function QuestionPanel({ t, busy, docs, onAsk }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [localBusy, setLocalBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isBusy = busy || localBusy;

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    const loadingId = crypto.randomUUID();
    const loadingMsg: ChatMessage = {
      id: loadingId,
      role: "loading",
      content: "",
      timestamp: new Date(),
      question: trimmed,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setQuestion("");
    setLocalBusy(true);

    try {
      const response = await onAsk(trimmed);
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.answer,
        citations: response.citations,
        timestamp: new Date(),
        question: trimmed,
      };
      setMessages((prev) => prev.map((m) => (m.id === loadingId ? aiMsg : m)));
    } catch (err) {
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "error",
        content: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        timestamp: new Date(),
        question: trimmed,
      };
      setMessages((prev) => prev.map((m) => (m.id === loadingId ? errMsg : m)));
    } finally {
      setLocalBusy(false);
    }
  }, [isBusy, onAsk]);

  function submit() {
    void sendMessage(question);
  }

  function retry(msg: ChatMessage) {
    if (!msg.question) return;
    void sendMessage(msg.question);
  }

  function clearHistory() {
    setMessages([]);
  }

  return (
    <div className="flex flex-col gap-0 animate-fade-scale" style={{ minHeight: "calc(100vh - 10rem)" }}>
      {/* Workspace header */}
      <div className="workspace-header">
        <div
          className="workspace-icon"
          style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
        >
          <MessageSquareText className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="workspace-title">{t.askTitle}</h2>
          <p className="workspace-subtitle">Grounded answers from your uploaded documents</p>
        </div>
        {messages.length > 0 && (
          <button
            className="btn-quiet text-xs"
            onClick={clearHistory}
            title="Clear conversation"
          >
            Clear
          </button>
        )}
      </div>

      {/* Chat window */}
      <div
        className="flex flex-col flex-1 rounded-2xl overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          boxShadow: "var(--card-shadow)",
          minHeight: "420px",
        }}
      >
        {/* Message list */}
        <div className="chat-messages flex-1" style={{ minHeight: "320px", maxHeight: "60vh" }}>
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            messages.map((msg) => (
              <MessageRow
                key={msg.id}
                msg={msg}
                docs={docs}
                onRetry={retry}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="chat-input-bar">
            <textarea
              ref={inputRef}
              className="flex-1 resize-none rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                background: "transparent",
                color: "var(--text-primary)",
                minHeight: "2.5rem",
                maxHeight: "7rem",
                lineHeight: "1.6",
              }}
              value={question}
              placeholder={t.askPlaceholder}
              rows={1}
              onChange={(e) => {
                setQuestion(e.target.value);
                // Auto-resize
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 112)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              id="ask-question-input"
            />
            <button
              className="btn-primary shrink-0 self-end"
              disabled={isBusy || !question.trim()}
              onClick={submit}
              id="ask-submit-btn"
              style={{ minWidth: "5.5rem", height: "2.5rem" }}
            >
              {isBusy ? (
                <>
                  <TypingDots />
                  <span className="hidden sm:inline">{t.askBusy}</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.askButton}</span>
                </>
              )}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px]" style={{ color: "var(--text-muted)" }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────── */
function EmptyState() {
  const prompts = [
    "What is the main topic of the document?",
    "Summarize the key concepts for me.",
    "What are the most important points to remember?",
    "Explain the relationship between the main ideas.",
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
      <div
        className="mb-4 grid h-14 w-14 place-items-center rounded-2xl"
        style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}
      >
        <MessageSquareText className="h-7 w-7" style={{ color: "#8b5cf6", opacity: 0.6 }} />
      </div>
      <p className="text-base font-semibold" style={{ color: "var(--text-secondary)" }}>
        Ask anything about your documents
      </p>
      <p className="mt-1 text-sm max-w-xs" style={{ color: "var(--text-muted)" }}>
        Type a question below to get AI-powered answers grounded in your uploaded content.
      </p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
        {prompts.map((p) => (
          <button
            key={p}
            className="text-left rounded-xl border px-3 py-2.5 text-xs font-medium transition-all duration-150"
            style={{
              background: "var(--surface-2)",
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,58,237,0.4)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Message row ─────────────────────────────────────────────── */
function MessageRow({
  msg,
  docs,
  onRetry,
}: {
  msg: ChatMessage;
  docs: StudyDoc[];
  onRetry: (msg: ChatMessage) => void;
}) {
  const [citationsOpen, setCitationsOpen] = useState(false);
  const timeStr = msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (msg.role === "loading") {
    return (
      <div className="chat-row ai animate-fade-in">
        <div className="flex items-end gap-2">
          <span className="chat-avatar ai">
            <Sparkles className="h-3 w-3" />
          </span>
          <div className="chat-loading-bubble">
            <TypingDots />
            <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>Thinking…</span>
          </div>
        </div>
      </div>
    );
  }

  if (msg.role === "user") {
    return (
      <div className="chat-row user animate-slide-up">
        <div className="flex items-end gap-2 justify-end">
          <div className="chat-bubble user">{msg.content}</div>
          <span className="chat-avatar user shrink-0">You</span>
        </div>
        <div className="chat-meta justify-end">
          <span>{timeStr}</span>
        </div>
      </div>
    );
  }

  if (msg.role === "error") {
    return (
      <div className="chat-row ai animate-slide-up">
        <div className="flex items-end gap-2">
          <span className="chat-avatar ai shrink-0">
            <Sparkles className="h-3 w-3" />
          </span>
          <div className="chat-bubble error">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-semibold text-xs">Error</span>
            </div>
            <p className="text-sm">{msg.content}</p>
            <button
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
              onClick={() => onRetry(msg)}
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        </div>
        <div className="chat-meta">
          <span>{timeStr}</span>
        </div>
      </div>
    );
  }

  // assistant
  // Only count citations that have a real source (filename, doc match, or parseable source URI)
  const validCitations = (msg.citations ?? []).filter((c) => {
    if (c.filename) return true;
    if (c.doc_id && c.doc_id !== "Uploaded document") return true;
    if (getFilenameFromSource(c.source)) return true;
    return false;
  });
  const hasCitations = validCitations.length > 0;
  return (
    <div className="chat-row ai animate-slide-up">
      <div className="flex items-end gap-2">
        <span className="chat-avatar ai shrink-0">
          <Sparkles className="h-3 w-3" />
        </span>
        <div className="chat-bubble ai" style={{ maxWidth: "88%" }}>
          {/* AI header */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: "rgba(16,185,129,0.10)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              Grounded
            </span>
            <div className="flex-1" />
            <CopyButton text={msg.content} />
          </div>

          {/* Answer */}
          <MarkdownAnswer text={msg.content} />

          {/* Citations toggle */}
          {hasCitations && (
            <div className="mt-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                className="chat-citations-toggle"
                onClick={() => setCitationsOpen((v) => !v)}
              >
                <FileText className="h-3 w-3" />
                {validCitations.length} citation{validCitations.length > 1 ? "s" : ""}
                {citationsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {citationsOpen && (
                <div className="mt-2 grid gap-2 animate-slide-up">
                  {validCitations.map((c, i) => (
                    <CitationChip key={i} citation={c} index={i} docs={docs} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="chat-meta pl-8">
        <span>{timeStr}</span>
        {hasCitations && !citationsOpen && (
          <span style={{ color: "#06b6d4" }}>
            · {validCitations.length} source{validCitations.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Citation chip ───────────────────────────────────────────── */
function CitationChip({ citation, index, docs }: { citation: Citation; index: number; docs: StudyDoc[] }) {
  const [expanded, setExpanded] = useState(false);
  const sourceName = getCitationSourceName(citation, docs);

  return (
    <div
      className="rounded-lg border p-2.5 text-xs cursor-pointer transition-all duration-150"
      style={{
        background: "var(--surface-2)",
        borderColor: "rgba(6,182,212,0.20)",
      }}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-center gap-2">
        <span
          className="grid h-5 w-5 shrink-0 place-items-center rounded text-[10px] font-bold"
          style={{ background: "rgba(6,182,212,0.15)", color: "#06b6d4" }}
        >
          {index + 1}
        </span>
        <span className="flex-1 truncate font-medium" style={{ color: "var(--text-primary)" }}>{sourceName}</span>
        {typeof citation.chunk === "number" && (
          <span className="rounded px-1.5 py-0.5" style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed" }}>
            §{citation.chunk}
          </span>
        )}
        {typeof citation.score === "number" && (
          <span style={{ color: "var(--text-muted)" }}>{citation.score.toFixed(2)}</span>
        )}
        {citation.text && (
          expanded ? <ChevronUp className="h-3 w-3 shrink-0" style={{ color: "var(--text-muted)" }} />
                   : <ChevronDown className="h-3 w-3 shrink-0" style={{ color: "var(--text-muted)" }} />
        )}
      </div>
      {expanded && citation.text && (
        <p
          className="mt-2 border-l-2 pl-2.5 leading-5 animate-slide-up"
          style={{ borderColor: "#06b6d4", color: "var(--text-secondary)" }}
        >
          {citation.text}
        </p>
      )}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */
function getCitationSourceName(citation: Citation, docs: StudyDoc[]) {
  if (citation.filename) return citation.filename;
  const docName = docs.find((d) => d.doc_id === citation.doc_id)?.filename;
  if (docName) return docName;
  const sourceName = getFilenameFromSource(citation.source);
  return sourceName || citation.doc_id || "Uploaded document";
}

function getFilenameFromSource(source: unknown): string | null {
  if (!source || typeof source !== "object") return null;
  const values = Object.values(source as Record<string, unknown>);
  for (const value of values) {
    if (typeof value === "string") {
      const parts = decodeURIComponent(value).split(/[/\\]/).filter(Boolean);
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

/* ── Typing indicator ─────────────────────────────────────────── */
function TypingDots() {
  return (
    <span className="inline-flex items-end gap-0.5 pb-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{
            background: "currentColor",
            animation: "dot-bounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 160}ms`,
          }}
        />
      ))}
    </span>
  );
}

/* ── Copy button ─────────────────────────────────────────────── */
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
      className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium transition-all duration-150"
      style={{
        background: copied ? "rgba(16,185,129,0.10)" : "var(--surface-2)",
        color: copied ? "#10b981" : "var(--text-muted)",
        border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
      }}
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

/* ── Zero-dependency markdown renderer ────────────────────────── */
function MarkdownAnswer({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuf: { type: "ul" | "ol"; items: string[] } | null = null;

  function flushList(key: number) {
    if (!listBuf) return;
    const { type, items } = listBuf;
    nodes.push(
      type === "ul" ? (
        <ul key={`ul-${key}`} style={{ margin: "0.5rem 0 0.5rem 1.25rem", listStyleType: "disc", fontSize: "0.875rem", lineHeight: 1.8 }}>
          {items.map((item, i) => <li key={i}><Inline text={item} /></li>)}
        </ul>
      ) : (
        <ol key={`ol-${key}`} style={{ margin: "0.5rem 0 0.5rem 1.25rem", listStyleType: "decimal", fontSize: "0.875rem", lineHeight: 1.8 }}>
          {items.map((item, i) => <li key={i}><Inline text={item} /></li>)}
        </ol>
      )
    );
    listBuf = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^---+$/.test(line.trim())) {
      flushList(i);
      nodes.push(<hr key={i} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0.75rem 0" }} />);
      continue;
    }
    const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headingMatch) {
      flushList(i);
      const level = headingMatch[1].length;
      const sizes = ["1.05rem", "0.95rem", "0.875rem"];
      nodes.push(
        <p key={i} style={{ fontWeight: 700, fontSize: sizes[level - 1] ?? "0.875rem", margin: "0.85rem 0 0.2rem", letterSpacing: "-0.01em" }}>
          <Inline text={headingMatch[2]} />
        </p>
      );
      continue;
    }
    const ulMatch = line.match(/^[-*]\s+(.*)/);
    if (ulMatch) {
      if (listBuf && listBuf.type !== "ul") flushList(i);
      if (!listBuf) listBuf = { type: "ul", items: [] };
      listBuf.items.push(ulMatch[1]);
      continue;
    }
    const olMatch = line.match(/^\d+\.\s+(.*)/);
    if (olMatch) {
      if (listBuf && listBuf.type !== "ol") flushList(i);
      if (!listBuf) listBuf = { type: "ol", items: [] };
      listBuf.items.push(olMatch[1]);
      continue;
    }
    flushList(i);
    if (line.trim() === "") {
      nodes.push(<div key={i} style={{ height: "0.4rem" }} />);
      continue;
    }
    nodes.push(
      <p key={i} style={{ fontSize: "0.875rem", lineHeight: 1.85, margin: 0 }}>
        <Inline text={line} />
      </p>
    );
  }
  flushList(lines.length);
  return <div style={{ display: "flex", flexDirection: "column", gap: "0.05rem" }}>{nodes}</div>;
}

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
            <code key={i} style={{
              fontFamily: "var(--font-mono)", fontSize: "0.8em",
              background: "var(--surface-3)", borderRadius: "0.25rem",
              padding: "0.1em 0.35em", color: "#8b5cf6",
            }}>{part.slice(1, -1)}</code>
          );
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
