import { AlertTriangle, FileText, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import type { StudyDoc } from "../api";
import type { Dictionary } from "../i18n";

type Props = {
  t: Dictionary;
  busy: boolean;
  onUpload: (files: File[]) => void;
  existingDocs: StudyDoc[];
};

export function UploadPanel({ t, busy, onUpload, existingDocs }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string[] | null>(null);
  const pendingFilesRef = useRef<File[]>([]);

  function checkAndUpload(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;

    const existingNames = new Set(
      existingDocs
        .map((doc) => doc.filename?.toLowerCase())
        .filter((name): name is string => Boolean(name))
    );
    const seenInBatch = new Set<string>();
    const duplicates: File[] = [];
    const fresh: File[] = [];

    for (const file of files) {
      const normalized = file.name.toLowerCase();
      if (existingNames.has(normalized) || seenInBatch.has(normalized)) {
        duplicates.push(file);
      } else {
        fresh.push(file);
      }
      seenInBatch.add(normalized);
    }

    if (duplicates.length) {
      pendingFilesRef.current = duplicates;
      setDuplicateWarning(duplicates.map((file) => file.name));
      if (fresh.length) onUpload(fresh);
    } else {
      setDuplicateWarning(null);
      onUpload(fresh);
    }
  }

  function confirmDuplicate() {
    if (pendingFilesRef.current.length) {
      onUpload(pendingFilesRef.current);
      pendingFilesRef.current = [];
    }
    setDuplicateWarning(null);
  }

  function cancelDuplicate() {
    pendingFilesRef.current = [];
    setDuplicateWarning(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave() {
    setIsDragging(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) checkAndUpload(e.dataTransfer.files);
  }

  return (
    <div className="animate-fade-scale">
      {/* Workspace header */}
      <div className="workspace-header">
        <div
          className="workspace-icon"
          style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
        >
          <UploadCloud className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="workspace-title">{t.uploadTitle}</h2>
          <p className="workspace-subtitle">{t.uploadMeta}</p>
        </div>
      </div>

      {/* Duplicate warning banner */}
      {duplicateWarning && (
        <div
          className="mb-4 flex items-start gap-3 rounded-xl px-4 py-3.5 animate-slide-up"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.32)",
          }}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#f59e0b" }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: "#d97706" }}>
              {t.duplicateTitle}
            </p>
            <p className="mt-0.5 text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
              {t.duplicateMessage}
              <span className="mt-1 block font-medium">
                {duplicateWarning.slice(0, 4).join(", ")}
                {duplicateWarning.length > 4 ? ` +${duplicateWarning.length - 4}` : ""}
              </span>
            </p>
            <div className="mt-2.5 flex gap-2">
              <button
                className="btn-secondary text-xs"
                style={{ borderColor: "rgba(245,158,11,0.4)", color: "#d97706" }}
                onClick={confirmDuplicate}
              >
                {t.duplicateUploadAnyway}
              </button>
              <button className="btn-quiet text-xs" onClick={cancelDuplicate}>
                {t.duplicateSkip}
              </button>
            </div>
          </div>
          <button
            className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            onClick={cancelDuplicate}
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>
      )}

      {/* Drop zone */}
      <label
        className="gradient-border group relative flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-2xl px-8 py-12 text-center transition-all duration-300"
        style={{
          background: isDragging
            ? "rgba(124,58,237,0.06)"
            : "var(--surface)",
          border: isDragging ? "2px solid #7c3aed" : undefined,
          opacity: busy ? 0.75 : 1,
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Radial glow on hover */}
        <span
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: "radial-gradient(ellipse at center, rgba(124,58,237,0.06) 0%, transparent 65%)" }}
        />

        {/* Icon */}
        <div className="relative mb-6">
          {busy ? (
            <span
              className="grid h-20 w-20 place-items-center rounded-full"
              style={{ background: "rgba(124,58,237,0.10)" }}
            >
              <svg className="h-9 w-9 animate-spin" style={{ color: "#7c3aed" }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l-3 3 3-3v4a8 8 0 01-8 8z" />
              </svg>
            </span>
          ) : (
            <span
              className="grid h-20 w-20 place-items-center rounded-full"
              style={{
                background: "rgba(124,58,237,0.10)",
                animation: isDragging ? undefined : "float 3.5s ease-in-out infinite",
                boxShadow: isDragging ? "0 0 0 6px rgba(124,58,237,0.12)" : undefined,
              }}
            >
              <UploadCloud className="h-9 w-9" style={{ color: "#7c3aed" }} />
            </span>
          )}
        </div>

        {/* Text */}
        <p className="relative text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          {busy ? (
            <span className="flex items-center gap-2">
              {t.uploadBusy}
              <Dots />
            </span>
          ) : isDragging ? (
            t.uploadDrop
          ) : (
            t.uploadDrop
          )}
        </p>

        {!busy && (
          <>
            <p className="relative mt-1 text-sm font-medium" style={{ color: "#8b5cf6" }}>
              {t.uploadBrowse}
            </p>
            <p className="relative mt-4 max-w-sm text-sm leading-6" style={{ color: "var(--text-muted)" }}>
              {t.uploadHint}
            </p>
          </>
        )}

        {/* File type chips */}
        {!busy && (
          <div className="relative mt-6 flex gap-2">
            {[".PDF", ".TXT", ".MD"].map((ext) => (
              <span key={ext} className="badge-muted text-xs">
                <FileText className="h-3 w-3" />
                {ext}
              </span>
            ))}
          </div>
        )}

        <input
          className="sr-only"
          type="file"
          accept=".pdf,.txt,.md"
          multiple
          disabled={busy}
          onChange={(event) => {
            if (event.target.files?.length) checkAndUpload(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

/** Animated typing dots */
function Dots() {
  return (
    <span className="inline-flex items-end gap-0.5 pb-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{
            background: "#7c3aed",
            animation: "dot-bounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 160}ms`,
          }}
        />
      ))}
    </span>
  );
}
