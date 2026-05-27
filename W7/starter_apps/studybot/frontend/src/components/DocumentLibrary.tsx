import { FileText, Layers, Library, ListChecks, RefreshCw, ScrollText, Sparkles } from "lucide-react";
import type { StudyDoc } from "../api";
import type { Dictionary } from "../i18n";

type Props = {
  t: Dictionary;
  docs: StudyDoc[];
  selectedDocId: string | null;
  loading: boolean;
  busyDocId: string | null;
  onRefresh: () => void;
  onSelect: (doc: StudyDoc) => void;
  onGenerateCards: (doc: StudyDoc) => void;
  onReviewCards: (doc: StudyDoc) => void;
  onGenerateQuiz: (doc: StudyDoc) => void;
  onTakeQuiz: (doc: StudyDoc) => void;
  onGenerateSummary: (doc: StudyDoc) => void;
};

export function DocumentLibrary({
  t,
  docs,
  selectedDocId,
  loading,
  busyDocId,
  onRefresh,
  onSelect,
  onGenerateCards,
  onReviewCards,
  onGenerateQuiz,
  onTakeQuiz,
  onGenerateSummary,
}: Props) {
  return (
    <div className="animate-fade-scale">
      {/* Workspace header */}
      <div className="workspace-header">
        <div
          className="workspace-icon"
          style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)" }}
        >
          <Library className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="workspace-title">{t.libraryTitle}</h2>
          <p className="workspace-subtitle">
            {loading ? t.loadingDocs : t.apiBaseHelp}
          </p>
        </div>

        <button
          className="btn-secondary flex items-center gap-1.5 shrink-0"
          onClick={onRefresh}
          disabled={loading}
          id="refresh-docs-btn"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{t.refresh}</span>
        </button>
      </div>

      {/* Document list */}
      {docs.length === 0 ? (
        <div className="empty-state animate-fade-in">
          <div
            className="mb-4 grid h-14 w-14 place-items-center rounded-2xl"
            style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)" }}
          >
            <FileText className="h-7 w-7" style={{ color: "#06b6d4", opacity: 0.6 }} />
          </div>
          <p className="text-base font-semibold" style={{ color: "var(--text-secondary)" }}>{t.noDocs}</p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Upload a file to get started
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {docs.map((doc, index) => {
            const name = doc.filename || doc.doc_id;
            const isSelected = doc.doc_id === selectedDocId;
            const isBusy = doc.doc_id === busyDocId;

            return (
              <article
                key={doc.doc_id}
                className={`doc-card animate-slide-up ${isSelected ? "is-selected" : ""}`}
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: "both",
                }}
              >
                {/* Top row: icon + name + selected badge */}
                <button
                  className="flex w-full min-w-0 items-center gap-3 text-left"
                  onClick={() => onSelect(doc)}
                  id={`select-doc-${doc.doc_id.slice(0, 8)}`}
                >
                  {/* File icon */}
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-all duration-200"
                    style={
                      isSelected
                        ? { background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 4px 12px rgba(124,58,237,0.32)" }
                        : { background: "var(--surface-3)", border: "1px solid var(--border)" }
                    }
                  >
                    <FileText
                      className="h-5 w-5"
                      style={{ color: isSelected ? "#fff" : "#7c3aed" }}
                    />
                  </span>

                  {/* Info */}
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {name}
                    </span>
                    <span className="mt-0.5 block text-xs" style={{ color: "var(--text-muted)" }}>
                      {(doc.chars || 0).toLocaleString()} chars · {doc.doc_id.slice(0, 8)}
                    </span>
                  </span>

                  {isSelected && (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: "rgba(124,58,237,0.15)", color: "#8b5cf6" }}
                    >
                      {t.selected}
                    </span>
                  )}
                </button>

                {/* Action row */}
                <div className="action-row">
                  {/* Review / Load */}
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => onGenerateSummary(doc)}
                    disabled={isBusy}
                    id={`gen-summary-${doc.doc_id.slice(0, 8)}`}
                    title={t.generateSummary}
                  >
                    {isBusy ? <SpinnerMini /> : <ScrollText className="h-3.5 w-3.5" />}
                    {t.summaryTitle}
                  </button>

                  <button
                    className="btn-secondary text-xs"
                    onClick={() => onReviewCards(doc)}
                    disabled={isBusy}
                    id={`review-cards-${doc.doc_id.slice(0, 8)}`}
                    title={t.reviewCards}
                  >
                    {isBusy ? <SpinnerMini /> : <Layers className="h-3.5 w-3.5" />}
                    {t.reviewCards}
                  </button>

                  <button
                    className="btn-secondary text-xs"
                    onClick={() => onTakeQuiz(doc)}
                    disabled={isBusy}
                    id={`take-quiz-${doc.doc_id.slice(0, 8)}`}
                    title={t.takeQuiz}
                  >
                    {isBusy ? <SpinnerMini /> : <ListChecks className="h-3.5 w-3.5" />}
                    {t.takeQuiz}
                  </button>

                  {/* Generate (AI) */}
                  <button
                    className="btn-ai text-xs"
                    onClick={() => onGenerateCards(doc)}
                    disabled={isBusy}
                    id={`gen-cards-${doc.doc_id.slice(0, 8)}`}
                  >
                    {isBusy ? <SpinnerMini color="#fff" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {t.generateCards}
                  </button>

                  <button
                    className="btn-primary text-xs"
                    onClick={() => onGenerateQuiz(doc)}
                    disabled={isBusy}
                    id={`gen-quiz-${doc.doc_id.slice(0, 8)}`}
                  >
                    {isBusy ? <SpinnerMini color="#fff" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {t.generateQuiz}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SpinnerMini({ color = "#7c3aed" }: { color?: string }) {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color }}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 01-8 8z" />
    </svg>
  );
}
