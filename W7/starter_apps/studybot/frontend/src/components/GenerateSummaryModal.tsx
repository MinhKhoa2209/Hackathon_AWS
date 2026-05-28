import { FileText, ScrollText, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { StudyDoc } from "../api";
import { Modal } from "./Modal";

type SummaryLength = "short" | "medium" | "detailed";

type Props = {
  open: boolean;
  onClose: () => void;
  docs: StudyDoc[];
  preSelectedIds?: string[];
  busy: boolean;
  onGenerate: (docIds: string[], length: SummaryLength) => void;
};

export function GenerateSummaryModal({ open, onClose, docs, preSelectedIds = [], busy, onGenerate }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(preSelectedIds));
  const [summaryLength, setSummaryLength] = useState<SummaryLength>("medium");

  // Sync pre-selected IDs whenever the modal opens
  useEffect(() => {
    if (open) setSelectedIds(new Set(preSelectedIds));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleDoc(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleGenerate() {
    if (selectedIds.size === 0 || busy) return;
    onGenerate(Array.from(selectedIds), summaryLength);
  }

  const lengths: { value: SummaryLength; label: string; desc: string; icon: string }[] = [
    { value: "short",    label: "Short",    desc: "Key points only (~200 words)",    icon: "⚡" },
    { value: "medium",   label: "Medium",   desc: "Balanced overview (~500 words)",  icon: "📝" },
    { value: "detailed", label: "Detailed", desc: "In-depth coverage (~1000 words)", icon: "📚" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate Summary"
      icon={<ScrollText className="h-4 w-4" />}
      iconColor="#10b981"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={selectedIds.size === 0 || busy}
            id="generate-summary-confirm-btn"
            style={{ background: "linear-gradient(135deg, #10b981, #0e7490)" }}
          >
            {busy ? (
              <><SpinnerMini /> Generating…</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Generate {selectedIds.size > 0 ? `${selectedIds.size} summar${selectedIds.size > 1 ? "ies" : "y"}` : ""}</>
            )}
          </button>
        </>
      }
    >
      {/* Document selector */}
      <div>
        <label className="form-label">Select documents</label>
        <div className="grid gap-1.5 max-h-44 overflow-y-auto scroll-region pr-1">
          {docs.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No documents uploaded yet.</p>
          ) : (
            docs.map((doc) => {
              const checked = selectedIds.has(doc.doc_id);
              return (
                <label
                  key={doc.doc_id}
                  className={`checkbox-card ${checked ? "is-checked" : ""}`}
                  htmlFor={`smodal-doc-${doc.doc_id}`}
                  style={checked ? { borderColor: "rgba(16,185,129,0.5)", background: "rgba(16,185,129,0.08)" } : {}}
                >
                  <input
                    type="checkbox"
                    id={`smodal-doc-${doc.doc_id}`}
                    checked={checked}
                    onChange={() => toggleDoc(doc.doc_id)}
                    className="h-4 w-4 rounded accent-emerald-500"
                  />
                  <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: "#10b981" }} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {doc.filename || doc.doc_id}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>

      {/* Summary length */}
      <div>
        <label className="form-label">Summary length</label>
        <div className="grid gap-2">
          {lengths.map(({ value, label, desc, icon }) => {
            const isSelected = summaryLength === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setSummaryLength(value)}
                className="flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-150"
                style={{
                  background: isSelected ? "rgba(16,185,129,0.08)" : "var(--surface-2)",
                  borderColor: isSelected ? "rgba(16,185,129,0.45)" : "var(--border)",
                }}
              >
                <span className="text-xl">{icon}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: isSelected ? "#10b981" : "var(--text-primary)" }}>
                    {label}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>
                </div>
                {isSelected && (
                  <span className="ml-auto h-2 w-2 rounded-full" style={{ background: "#10b981" }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div
          className="rounded-xl p-3 text-sm flex items-center gap-2"
          style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.20)", color: "#10b981" }}
        >
          <ScrollText className="h-4 w-4 shrink-0" />
          <span>
            <strong>{selectedIds.size} {summaryLength}</strong> summar{selectedIds.size > 1 ? "ies" : "y"} will be generated.
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
