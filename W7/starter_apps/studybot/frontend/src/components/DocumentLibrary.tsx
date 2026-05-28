import {
  CheckSquare,
  Download,
  FileText,
  HelpCircle,
  Layers,
  Library,
  RefreshCw,
  ScrollText,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { StudyDoc } from "../api";
import type { Dictionary } from "../i18n";
import { GenerateCardsModal } from "./GenerateCardsModal";
import { GenerateQuizModal } from "./GenerateQuizModal";
import { GenerateSummaryModal } from "./GenerateSummaryModal";

type GenStatus = "queued" | "processing" | "completed" | "failed";
type Difficulty = "easy" | "medium" | "hard";
type QuestionType = "mcq" | "truefalse" | "mixed";
type CardStyle = "basic" | "definition" | "qa" | "mixed";

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
  // Batch handlers
  onBatchGenerateQuiz?: (docIds: string[], count: number, difficulty: Difficulty, qType: QuestionType) => Promise<void>;
  onBatchGenerateCards?: (docIds: string[], count: number, style: CardStyle) => Promise<void>;
  onBatchGenerateSummary?: (docIds: string[]) => Promise<void>;
  onBatchDelete?: (docIds: string[]) => Promise<void>;
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
  onBatchGenerateQuiz,
  onBatchGenerateCards,
  onBatchGenerateSummary,
  onBatchDelete,
}: Props) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [genStatus, setGenStatus] = useState<Map<string, GenStatus>>(new Map());
  const [batchBusy, setBatchBusy] = useState(false);

  // Modals
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [cardsModalOpen, setCardsModalOpen] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [singleDocForModal, setSingleDocForModal] = useState<StudyDoc | null>(null);

  const allChecked = docs.length > 0 && checkedIds.size === docs.length;
  const someChecked = checkedIds.size > 0;
  const selectedDocs = docs.filter((doc) => checkedIds.has(doc.doc_id));

  function toggleAll() {
    if (allChecked) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(docs.map((d) => d.doc_id)));
    }
  }

  function toggleDoc(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setStatusFor(ids: string[], status: GenStatus) {
    setGenStatus((prev) => {
      const next = new Map(prev);
      ids.forEach((id) => next.set(id, status));
      return next;
    });
  }

  async function handleBatchQuiz(docIds: string[], count: number, difficulty: Difficulty, qType: QuestionType) {
    setQuizModalOpen(false);
    if (!onBatchGenerateQuiz) return;
    setBatchBusy(true);
    setStatusFor(docIds, "queued");
    try {
      setStatusFor(docIds, "processing");
      await onBatchGenerateQuiz(docIds, count, difficulty, qType);
      setStatusFor(docIds, "completed");
    } catch {
      setStatusFor(docIds, "failed");
    } finally {
      setBatchBusy(false);
    }
  }

  async function handleBatchCards(docIds: string[], count: number, style: CardStyle) {
    setCardsModalOpen(false);
    if (!onBatchGenerateCards) return;
    setBatchBusy(true);
    setStatusFor(docIds, "queued");
    try {
      setStatusFor(docIds, "processing");
      await onBatchGenerateCards(docIds, count, style);
      setStatusFor(docIds, "completed");
    } catch {
      setStatusFor(docIds, "failed");
    } finally {
      setBatchBusy(false);
    }
  }

  async function handleBatchSummary(docIds: string[]) {
    setSummaryModalOpen(false);
    if (!onBatchGenerateSummary) return;
    setBatchBusy(true);
    setStatusFor(docIds, "queued");
    try {
      for (const id of docIds) {
        setGenStatus((prev) => new Map(prev).set(id, "processing"));
        await onBatchGenerateSummary([id]);
        setGenStatus((prev) => new Map(prev).set(id, "completed"));
      }
    } catch {
      setStatusFor(docIds, "failed");
    } finally {
      setBatchBusy(false);
    }
  }

  async function handleBatchDelete() {
    if (!onBatchDelete || checkedIds.size === 0) return;
    const ids = Array.from(checkedIds);
    setBatchBusy(true);
    try {
      await onBatchDelete(ids);
      setCheckedIds(new Set());
    } finally {
      setBatchBusy(false);
    }
  }

  function exportCsv() {
    const selected = docs.filter((d) => checkedIds.has(d.doc_id));
    const rows = [
      ["doc_id", "filename", "chars", "created_at", "status"],
      ...selected.map((d) => [d.doc_id, d.filename ?? "", String(d.chars ?? ""), d.created_at ?? "", d.status ?? ""]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "studybot-documents.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-fade-scale">
      {/* Workspace header */}
      <div className="workspace-header">
        <div className="workspace-icon" style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)" }}>
          <Library className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="workspace-title">{t.libraryTitle}</h2>
          <p className="workspace-subtitle">
            {loading ? t.loadingDocs : `${docs.length} document${docs.length !== 1 ? "s" : ""} in library`}
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

      {/* Batch toolbar */}
      {someChecked && (
        <div className="lib-toolbar mb-4">
          <span className="text-xs font-semibold mr-1" style={{ color: "var(--text-secondary)" }}>
            {checkedIds.size} selected
          </span>
          <div className="h-4 w-px mx-1" style={{ background: "var(--border-strong)" }} />
          <button
            className="btn-secondary text-xs gap-1.5"
            onClick={() => setQuizModalOpen(true)}
            disabled={batchBusy}
            id="batch-gen-quiz-btn"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Quiz
          </button>
          <button
            className="btn-secondary text-xs gap-1.5"
            onClick={() => setCardsModalOpen(true)}
            disabled={batchBusy}
            id="batch-gen-cards-btn"
          >
            <Layers className="h-3.5 w-3.5" />
            Cards
          </button>
          <button
            className="btn-secondary text-xs gap-1.5"
            onClick={() => setSummaryModalOpen(true)}
            disabled={batchBusy}
            id="batch-gen-summary-btn"
          >
            <ScrollText className="h-3.5 w-3.5" />
            Summary
          </button>
          <button
            className="btn-secondary text-xs gap-1.5"
            onClick={exportCsv}
            disabled={batchBusy}
            id="batch-export-btn"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          {onBatchDelete && (
            <button
              className="btn-danger text-xs gap-1.5 ml-auto"
              onClick={() => void handleBatchDelete()}
              disabled={batchBusy}
              id="batch-delete-btn"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>
      )}

      {/* Batch progress bar */}
      {batchBusy && (
        <div className="progress-track mb-4">
          <div
            className="progress-fill"
            style={{
              width: `${
                Array.from(genStatus.values()).filter((s) => s === "completed" || s === "failed").length /
                Math.max(genStatus.size, 1) * 100
              }%`,
            }}
          />
        </div>
      )}

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
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>Upload a file to get started</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {/* Select-all row */}
          <div className="flex items-center gap-2 px-1">
            <button
              className="flex items-center gap-2 text-xs font-medium"
              onClick={toggleAll}
              style={{ color: "var(--text-muted)" }}
            >
              {allChecked
                ? <CheckSquare className="h-4 w-4" style={{ color: "#8b5cf6" }} />
                : <Square className="h-4 w-4" />}
              {allChecked ? "Deselect all" : "Select all"}
            </button>
            {someChecked && !allChecked && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                ({checkedIds.size} of {docs.length})
              </span>
            )}
          </div>

          {docs.map((doc, index) => {
            const name = doc.filename || doc.doc_id;
            const isSelected = doc.doc_id === selectedDocId;
            const isBusy = doc.doc_id === busyDocId;
            const isChecked = checkedIds.has(doc.doc_id);
            const status = genStatus.get(doc.doc_id);

            return (
              <article
                key={doc.doc_id}
                className={`doc-card animate-slide-up ${isSelected ? "is-selected" : ""}`}
                style={{
                  animationDelay: `${index * 40}ms`,
                  animationFillMode: "both",
                  outline: isChecked ? "2px solid rgba(124,58,237,0.5)" : "none",
                  outlineOffset: "1px",
                }}
              >
                {/* Top row: checkbox + icon + name + badges */}
                <div className="flex items-center gap-3 w-full">
                  {/* Checkbox */}
                  <button
                    className="shrink-0 flex items-center justify-center"
                    onClick={() => toggleDoc(doc.doc_id)}
                    aria-label={isChecked ? "Deselect" : "Select"}
                  >
                    {isChecked
                      ? <CheckSquare className="h-4.5 w-4.5" style={{ color: "#8b5cf6" }} />
                      : <Square className="h-4.5 w-4.5" style={{ color: "var(--text-muted)" }} />}
                  </button>

                  {/* Main clickable area */}
                  <button
                    className="flex flex-1 min-w-0 items-center gap-3 text-left"
                    onClick={() => onSelect(doc)}
                    id={`select-doc-${doc.doc_id.slice(0, 8)}`}
                  >
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-all duration-200"
                      style={
                        isSelected
                          ? { background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 4px 12px rgba(124,58,237,0.32)" }
                          : { background: "var(--surface-3)", border: "1px solid var(--border)" }
                      }
                    >
                      <FileText className="h-5 w-5" style={{ color: isSelected ? "#fff" : "#7c3aed" }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{name}</span>
                      <span className="mt-0.5 block text-xs" style={{ color: "var(--text-muted)" }}>
                        {(doc.chars || 0).toLocaleString()} chars · {doc.doc_id.slice(0, 8)}
                        {doc.created_at && ` · ${new Date(doc.created_at).toLocaleDateString()}`}
                      </span>
                    </span>
                  </button>

                  {/* Status badges */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {status && (
                      <span className={`gen-status ${status}`}>
                        {status === "processing" && <SpinnerMini />}
                        {status}
                      </span>
                    )}
                    {isSelected && !status && (
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "rgba(124,58,237,0.15)", color: "#8b5cf6" }}>
                        {t.selected}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action row */}
                <div className="action-row">
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => onGenerateSummary(doc)}
                    disabled={isBusy || batchBusy}
                    id={`gen-summary-${doc.doc_id.slice(0, 8)}`}
                    title={t.generateSummary}
                  >
                    {isBusy ? <SpinnerMini /> : <ScrollText className="h-3.5 w-3.5" />}
                    {t.summaryTitle}
                  </button>
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => onReviewCards(doc)}
                    disabled={isBusy || batchBusy}
                    id={`review-cards-${doc.doc_id.slice(0, 8)}`}
                    title={t.reviewCards}
                  >
                    {isBusy ? <SpinnerMini /> : <Layers className="h-3.5 w-3.5" />}
                    {t.reviewCards}
                  </button>
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => onTakeQuiz(doc)}
                    disabled={isBusy || batchBusy}
                    id={`take-quiz-${doc.doc_id.slice(0, 8)}`}
                    title={t.takeQuiz}
                  >
                    {isBusy ? <SpinnerMini /> : <HelpCircle className="h-3.5 w-3.5" />}
                    {t.takeQuiz}
                  </button>
                  <button
                    className="btn-ai text-xs"
                    onClick={() => { setSingleDocForModal(doc); setCardsModalOpen(true); }}
                    disabled={isBusy || batchBusy}
                    id={`gen-cards-${doc.doc_id.slice(0, 8)}`}
                  >
                    {isBusy ? <SpinnerMini color="#fff" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {t.generateCards}
                  </button>
                  <button
                    className="btn-primary text-xs"
                    onClick={() => { setSingleDocForModal(doc); setQuizModalOpen(true); }}
                    disabled={isBusy || batchBusy}
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

      {/* Generation Modals */}
      <GenerateQuizModal
        open={quizModalOpen}
        onClose={() => { setQuizModalOpen(false); setSingleDocForModal(null); }}
        selectedDocs={singleDocForModal ? [singleDocForModal] : selectedDocs}
        busy={batchBusy}
        onGenerate={(ids, count, difficulty, qType) => void handleBatchQuiz(ids, count, difficulty, qType)}
      />
      <GenerateCardsModal
        open={cardsModalOpen}
        onClose={() => { setCardsModalOpen(false); setSingleDocForModal(null); }}
        selectedDocs={singleDocForModal ? [singleDocForModal] : selectedDocs}
        busy={batchBusy}
        onGenerate={(ids, count, style) => void handleBatchCards(ids, count, style)}
      />
      <GenerateSummaryModal
        open={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
        docs={docs}
        preSelectedIds={Array.from(checkedIds)}
        busy={batchBusy}
        onGenerate={(ids) => void handleBatchSummary(ids)}
      />
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
