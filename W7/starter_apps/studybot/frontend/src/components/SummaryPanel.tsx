import {
  Check,
  Copy,
  Download,
  FileText,
  ListChecks,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { StudyDoc, StudySummary } from "../api";
import type { Dictionary } from "../i18n";

/* ── Types ───────────────────────────────────────────────────── */
type SummaryLength = "short" | "medium" | "detailed";

type HistoryEntry = {
  id: string;
  docId: string;
  docName: string;
  summary: StudySummary;
  generatedAt: Date;
};

/* ── Props ───────────────────────────────────────────────────── */
type Props = {
  t: Dictionary;
  doc: StudyDoc | null;
  docs: StudyDoc[];
  summary: StudySummary | null;
  busy: boolean;
  onGenerate: (doc: StudyDoc) => void;
};

/* ════════════════════════════════════════════════════════════════
   Summary Panel
   ════════════════════════════════════════════════════════════════ */
export function SummaryPanel({ t, doc, docs, summary, busy, onGenerate }: Props) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(doc?.doc_id ?? null);
  const [summaryLength, setSummaryLength] = useState<SummaryLength>("medium");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [viewingEntry, setViewingEntry] = useState<HistoryEntry | null>(null);

  // When a new summary comes in from parent, add to history
  const prevSummaryId = useMemo(() => summary?.id, [summary]);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  if (summary && summary.status === "completed" && summary.id !== lastAddedId) {
    setLastAddedId(summary.id ?? null);
    const docObj = docs.find((d) => d.doc_id === summary.doc_id);
    if (docObj) {
      setHistory((prev) => {
        const exists = prev.find((e) => e.id === summary.id);
        if (exists) return prev;
        return [
          {
            id: summary.id ?? `summary_${Date.now()}`,
            docId: summary.doc_id,
            docName: docObj.filename ?? docObj.doc_id,
            summary,
            generatedAt: new Date(),
          },
          ...prev,
        ];
      });
    }
  }

  const selectedDoc = docs.find((d) => d.doc_id === selectedDocId) ?? null;
  const displaySummary = viewingEntry?.summary ?? (summary && summary.doc_id === selectedDocId ? summary : null);
  const displayDocName = viewingEntry?.docName ?? selectedDoc?.filename ?? selectedDoc?.doc_id ?? "";

  function handleGenerate() {
    if (!selectedDoc || busy) return;
    setViewingEntry(null);
    onGenerate(selectedDoc);
  }

  function handleViewHistory(entry: HistoryEntry) {
    setViewingEntry(entry);
    setSelectedDocId(entry.docId);
  }

  /* ── TOC extraction ──────────────────────────────────────── */
  const tocItems = useMemo(() => {
    if (!displaySummary?.summary) return [];
    const lines = displaySummary.summary.split("\n");
    return lines
      .filter((l) => /^#{1,3}\s/.test(l))
      .map((l) => {
        const match = l.match(/^(#{1,3})\s+(.*)/);
        if (!match) return null;
        const level = match[1].length;
        const text = match[2].trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return { level, text, id };
      })
      .filter(Boolean) as { level: number; text: string; id: string }[];
  }, [displaySummary]);

  return (
    <div className="animate-fade-scale">
      {/* Workspace header */}
      <div className="workspace-header mb-5">
        <div className="workspace-icon" style={{ background: "linear-gradient(135deg, #10b981, #0e7490)" }}>
          <FileText className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="workspace-title">{t.summaryTitle}</h2>
          <p className="workspace-subtitle">{displayDocName || t.workspaceHint}</p>
        </div>
        {displaySummary?.status && (
          <span className={displaySummary.status === "completed" ? "badge-green" : displaySummary.status === "failed" ? "badge-red" : "badge-amber"}>
            {displaySummary.status}
          </span>
        )}
      </div>

      <div className="summary-layout">
        {/* ── LEFT: Document picker ─────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Doc picker */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", boxShadow: "var(--card-shadow)" }}
          >
            <p className="form-label">Select document</p>
            <div className="grid gap-1 max-h-56 overflow-y-auto scroll-region">
              {docs.length === 0 ? (
                <p className="text-sm py-3" style={{ color: "var(--text-muted)" }}>No documents uploaded yet.</p>
              ) : (
                docs.map((d) => {
                  const isSelected = d.doc_id === selectedDocId;
                  return (
                    <div
                      key={d.doc_id}
                      className={`doc-picker-item ${isSelected ? "is-selected" : ""}`}
                      onClick={() => { setSelectedDocId(d.doc_id); setViewingEntry(null); }}
                    >
                      <FileText
                        className="h-4 w-4 shrink-0"
                        style={{ color: isSelected ? "#10b981" : "var(--text-muted)" }}
                      />
                      <span className="flex-1 truncate text-sm font-medium" style={{ color: isSelected ? "var(--text-primary)" : "var(--text-secondary)" }}>
                        {d.filename || d.doc_id}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "#10b981" }} />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Summary length */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", boxShadow: "var(--card-shadow)" }}
          >
            <p className="form-label">Summary length</p>
            <div className="flex flex-col gap-1.5">
              {([
                { value: "short" as const,    label: "Short",    icon: "⚡", desc: "Key points only" },
                { value: "medium" as const,   label: "Medium",   icon: "📝", desc: "Balanced overview" },
                { value: "detailed" as const, label: "Detailed", icon: "📚", desc: "In-depth coverage" },
              ]).map(({ value, label, icon, desc }) => {
                const isSelected = summaryLength === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSummaryLength(value)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all duration-150"
                    style={{
                      background: isSelected ? "rgba(16,185,129,0.08)" : "var(--surface-2)",
                      border: `1px solid ${isSelected ? "rgba(16,185,129,0.40)" : "var(--border)"}`,
                    }}
                  >
                    <span className="text-base">{icon}</span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold" style={{ color: isSelected ? "#10b981" : "var(--text-primary)" }}>{label}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{desc}</p>
                    </div>
                    {isSelected && <span className="h-2 w-2 rounded-full" style={{ background: "#10b981" }} />}
                  </button>
                );
              })}
            </div>

            <button
              className="btn-primary w-full mt-3"
              onClick={handleGenerate}
              disabled={!selectedDoc || busy}
              style={{ background: "linear-gradient(135deg, #10b981, #0e7490)" }}
              id="generate-summary-btn"
            >
              {busy ? (
                <><Sparkles className="h-4 w-4 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles className="h-4 w-4" /> {t.generateSummary}</>
              )}
            </button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div
              className="rounded-2xl p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", boxShadow: "var(--card-shadow)" }}
            >
              <p className="form-label">History</p>
              <div className="grid gap-1.5 max-h-44 overflow-y-auto scroll-region">
                {history.map((entry) => (
                  <button
                    key={entry.id}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all duration-150"
                    style={{
                      background: viewingEntry?.id === entry.id ? "rgba(16,185,129,0.06)" : "var(--surface-2)",
                      border: `1px solid ${viewingEntry?.id === entry.id ? "rgba(16,185,129,0.30)" : "var(--border)"}`,
                    }}
                    onClick={() => handleViewHistory(entry)}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: "#10b981" }} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{entry.docName}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {entry.generatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Summary content ───────────────────────── */}
        <div className="flex flex-col gap-4">
          {!selectedDoc && !displaySummary ? (
            <div className="empty-state">
              <FileText className="mb-3 h-8 w-8 opacity-50" />
              <p className="text-sm font-semibold">{t.noSummary}</p>
            </div>
          ) : busy && !displaySummary ? (
            /* Skeleton loading */
            <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="skeleton mb-4 h-5 w-2/3 rounded-lg" />
              <div className="skeleton mb-2 h-3.5 w-full rounded" />
              <div className="skeleton mb-2 h-3.5 w-11/12 rounded" />
              <div className="skeleton mb-2 h-3.5 w-4/5 rounded" />
              <div className="skeleton mb-2 h-3.5 w-full rounded" />
              <div className="skeleton mt-4 mb-4 h-5 w-1/2 rounded-lg" />
              <div className="skeleton mb-2 h-3.5 w-3/4 rounded" />
              <div className="skeleton h-3.5 w-full rounded" />
            </div>
          ) : displaySummary ? (
            <>
              {/* TOC */}
              {tocItems.length > 0 && (
                <div className="summary-toc">
                  <p className="form-label">Contents</p>
                  <nav className="flex flex-col gap-0.5">
                    {tocItems.map(({ level, text, id }) => (
                      <a
                        key={id}
                        href={`#${id}`}
                        className="toc-link"
                        style={{ paddingLeft: `${(level - 1) * 0.75 + 0.5}rem` }}
                      >
                        {text}
                      </a>
                    ))}
                  </nav>
                </div>
              )}

              {/* Summary content */}
              <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--card-shadow)" }}>
                {/* Action bar */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="text-sm font-bold flex-1" style={{ color: "var(--text-primary)" }}>
                    {displayDocName}
                  </span>
                  <CopyButton text={displaySummary.summary} />
                  <button
                    className="btn-secondary text-xs gap-1.5"
                    onClick={() => {
                      const blob = new Blob([displaySummary.summary], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${displayDocName}-summary.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </button>
                  <button
                    className="btn-secondary text-xs gap-1.5"
                    onClick={handleGenerate}
                    disabled={busy || !selectedDoc}
                    title="Regenerate"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
                    Regenerate
                  </button>
                </div>

                <div
                  className="mb-4 rounded-xl p-4"
                  style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.06))", border: "1px solid rgba(16,185,129,0.15)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 shrink-0" style={{ color: "#10b981" }} />
                    <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{t.onePageSummary}</h3>
                  </div>
                  <MarkdownSummary text={displaySummary.summary} />
                </div>

                {/* Testable concepts */}
                {displaySummary.testable_concepts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ListChecks className="h-4 w-4" style={{ color: "#06b6d4" }} />
                      <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{t.testableConcepts}</h3>
                    </div>
                    <div className="grid gap-2">
                      {displaySummary.testable_concepts.map((item, i) => (
                        <article
                          key={`${item.concept}-${i}`}
                          className="rounded-xl border p-3 animate-slide-up"
                          style={{
                            background: "var(--surface-2)",
                            borderColor: "var(--border)",
                            animationDelay: `${i * 50}ms`,
                            animationFillMode: "both",
                          }}
                        >
                          <div className="flex gap-3">
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold" style={{ background: "rgba(6,182,212,0.12)", color: "#06b6d4" }}>
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{item.concept}</p>
                              <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-muted)" }}>{item.why_testable}</p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="panel panel-pad text-sm" style={{ color: "var(--text-muted)" }}>
              {t.noSummary}
            </div>
          )}
        </div>
      </div>
    </div>
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
      className="btn-secondary text-xs gap-1.5"
    >
      {copied ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
    </button>
  );
}

/* ── Markdown summary renderer ────────────────────────────────── */
function MarkdownSummary({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuf: { type: "ul" | "ol"; items: string[] } | null = null;

  function flushList(key: number) {
    if (!listBuf) return;
    const { type, items } = listBuf;
    nodes.push(
      type === "ul" ? (
        <ul key={`ul-${key}`} style={{ margin: "0.4rem 0 0.4rem 1.25rem", listStyleType: "disc", fontSize: "0.875rem", lineHeight: 1.8 }}>
          {items.map((item, i) => <li key={i}><InlineMd text={item} /></li>)}
        </ul>
      ) : (
        <ol key={`ol-${key}`} style={{ margin: "0.4rem 0 0.4rem 1.25rem", listStyleType: "decimal", fontSize: "0.875rem", lineHeight: 1.8 }}>
          {items.map((item, i) => <li key={i}><InlineMd text={item} /></li>)}
        </ol>
      )
    );
    listBuf = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headingMatch) {
      flushList(i);
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const sizes = ["1.05rem", "0.95rem", "0.875rem"];
      nodes.push(
        <p key={i} id={id} style={{ fontWeight: 700, fontSize: sizes[level - 1] ?? "0.875rem", margin: "0.85rem 0 0.2rem", color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
          <InlineMd text={text} />
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
    if (line.trim() === "") { nodes.push(<div key={i} style={{ height: "0.4rem" }} />); continue; }
    nodes.push(<p key={i} style={{ fontSize: "0.875rem", lineHeight: 1.85, margin: 0, color: "var(--text-secondary)" }}><InlineMd text={line} /></p>);
  }
  flushList(lines.length);
  return <div style={{ display: "flex", flexDirection: "column", gap: "0.05rem" }}>{nodes}</div>;
}

function InlineMd({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
        if (part.startsWith("`") && part.endsWith("`")) return <code key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "0.8em", background: "var(--surface-3)", borderRadius: "0.25rem", padding: "0.1em 0.35em", color: "#8b5cf6" }}>{part.slice(1, -1)}</code>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
