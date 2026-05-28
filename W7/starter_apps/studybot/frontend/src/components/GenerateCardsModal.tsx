import { Layers, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { StudyDoc } from "../api";
import { Modal } from "./Modal";

type CardStyle = "basic" | "definition" | "qa" | "mixed";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedDocs: StudyDoc[];
  busy: boolean;
  onGenerate: (docIds: string[], count: number, style: CardStyle) => void;
};

export function GenerateCardsModal({ open, onClose, selectedDocs, busy, onGenerate }: Props) {
  const [count, setCount] = useState(10);
  const [cardStyle, setCardStyle] = useState<CardStyle>("basic");

  const selectedDocIds = useMemo(() => selectedDocs.map((doc) => doc.doc_id), [selectedDocs]);

  function handleGenerate() {
    if (selectedDocIds.length === 0 || busy) return;
    onGenerate(selectedDocIds, count, cardStyle);
  }

  const styles: { value: CardStyle; label: string; desc: string }[] = [
    { value: "basic", label: "Basic", desc: "Question → Answer" },
    { value: "definition", label: "Definition", desc: "Term → Meaning" },
    { value: "qa", label: "Q & A", desc: "Detailed Q&A format" },
    { value: "mixed", label: "Mixed", desc: "Variety of formats" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate Flashcards"
      icon={<Layers className="h-4 w-4" />}
      iconColor="#7c3aed"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={selectedDocIds.length === 0 || busy}
            id="generate-cards-confirm-btn"
          >
            {busy ? (
              <><SpinnerMini /> Generating…</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Generate {count > 0 ? `${count} cards` : ""}</>
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
          <label className="form-label !mb-0">Card count</label>
          <span className="text-sm font-bold tabular-nums" style={{ color: "#8b5cf6" }}>{count}</span>
        </div>
        <input
          type="range"
          className="range-slider"
          min={5}
          max={20}
          step={5}
          value={count}
          onChange={(event) => setCount(Number(event.target.value))}
        />
        <div className="mt-1 flex justify-between text-[10px]" style={{ color: "var(--text-muted)" }}>
          <span>5</span><span>10</span><span>15</span><span>20</span>
        </div>
      </div>

      <div>
        <label className="form-label">Card style</label>
        <div className="grid grid-cols-2 gap-2">
          {styles.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setCardStyle(value)}
              className={`rounded-xl border p-3 text-left transition-all duration-150 ${
                cardStyle === value
                  ? "border-violet-500/50 bg-violet-500/10"
                  : "border-transparent bg-[var(--surface-2)] hover:border-[var(--border-strong)]"
              }`}
            >
              <p
                className={`text-sm font-semibold ${cardStyle === value ? "text-violet-400" : ""}`}
                style={{ color: cardStyle === value ? "#8b5cf6" : "var(--text-primary)" }}
              >
                {label}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {selectedDocIds.length > 0 && (
        <div
          className="flex items-center gap-2 rounded-xl p-3 text-sm"
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.20)", color: "#8b5cf6" }}
        >
          <Layers className="h-4 w-4 shrink-0" />
          <span>
            One shared deck with <strong>{count} flashcards</strong> will be generated from{" "}
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
