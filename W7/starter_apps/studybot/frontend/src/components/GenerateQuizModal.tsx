import { HelpCircle, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { StudyDoc } from "../api";
import { Modal } from "./Modal";

type Difficulty = "easy" | "medium" | "hard";
type QuestionType = "mcq" | "truefalse" | "mixed";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedDocs: StudyDoc[];
  busy: boolean;
  onGenerate: (docIds: string[], count: number, difficulty: Difficulty, qType: QuestionType) => void;
};

export function GenerateQuizModal({ open, onClose, selectedDocs, busy, onGenerate }: Props) {
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [qType, setQType] = useState<QuestionType>("mcq");

  const selectedDocIds = useMemo(() => selectedDocs.map((doc) => doc.doc_id), [selectedDocs]);

  function handleGenerate() {
    if (selectedDocIds.length === 0 || busy) return;
    onGenerate(selectedDocIds, count, difficulty, qType);
  }

  const difficulties: { value: Difficulty; label: string; color: string }[] = [
    { value: "easy", label: "Easy", color: "#10b981" },
    { value: "medium", label: "Medium", color: "#f59e0b" },
    { value: "hard", label: "Hard", color: "#ef4444" },
  ];

  const qTypes: { value: QuestionType; label: string }[] = [
    { value: "mcq", label: "Multiple Choice" },
    { value: "truefalse", label: "True / False" },
    { value: "mixed", label: "Mixed" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate Quiz"
      icon={<HelpCircle className="h-4 w-4" />}
      iconColor="#06b6d4"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={selectedDocIds.length === 0 || busy}
            id="generate-quiz-confirm-btn"
          >
            {busy ? (
              <><SpinnerMini /> Generating…</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Generate {count > 0 ? `${count} Qs` : ""}</>
            )}
          </button>
        </>
      }
    >
      <div>
        <label className="form-label">Selected documents</label>
        {selectedDocs.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Choose documents in the library first.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedDocs.map((doc) => (
              <span
                key={doc.doc_id}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                style={{ background: "var(--surface-2)", borderColor: "var(--border-strong)", color: "var(--text-secondary)" }}
              >
                {doc.filename || doc.doc_id}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="form-label !mb-0">Question count</label>
          <span className="text-sm font-bold tabular-nums" style={{ color: "#8b5cf6" }}>{count}</span>
        </div>
        <input
          type="range"
          className="range-slider"
          min={5}
          max={30}
          step={5}
          value={count}
          onChange={(event) => setCount(Number(event.target.value))}
        />
        <div className="mt-1 flex justify-between text-[10px]" style={{ color: "var(--text-muted)" }}>
          <span>5</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span>
        </div>
      </div>

      <div>
        <label className="form-label">Difficulty</label>
        <div className="flex gap-2">
          {difficulties.map(({ value, label, color }) => (
            <button
              key={value}
              type="button"
              className={`option-pill flex-1 justify-center ${difficulty === value ? "is-selected" : ""}`}
              style={difficulty === value ? { borderColor: `${color}60`, color, background: `${color}15` } : {}}
              onClick={() => setDifficulty(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="form-label">Question type</label>
        <div className="flex flex-wrap gap-2">
          {qTypes.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`option-pill ${qType === value ? "is-selected" : ""}`}
              onClick={() => setQType(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {selectedDocIds.length > 0 && (
        <div
          className="flex items-center gap-2 rounded-xl p-3 text-sm"
          style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.20)", color: "#06b6d4" }}
        >
          <HelpCircle className="h-4 w-4 shrink-0" />
          <span>
            One shared quiz with <strong>{count} questions</strong> will be generated from{" "}
            <strong>{selectedDocIds.length} document{selectedDocIds.length > 1 ? "s" : ""}</strong>.
          </span>
        </div>
      )}
    </Modal>
  );
}

function SpinnerMini() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 01-8 8z" />
    </svg>
  );
}
