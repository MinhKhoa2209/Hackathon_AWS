import { FileText, ListChecks, Sparkles } from "lucide-react";
import type { StudyDoc, StudySummary } from "../api";
import type { Dictionary } from "../i18n";

type Props = {
  t: Dictionary;
  doc: StudyDoc | null;
  summary: StudySummary | null;
  busy: boolean;
  onGenerate: (doc: StudyDoc) => void;
};

export function SummaryPanel({ t, doc, summary, busy, onGenerate }: Props) {
  return (
    <div className="animate-fade-scale">
      <div className="workspace-header">
        <div className="workspace-icon" style={{ background: "linear-gradient(135deg, #10b981, #0e7490)" }}>
          <FileText className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="workspace-title">{t.summaryTitle}</h2>
          <p className="workspace-subtitle">
            {doc ? doc.filename || doc.doc_id : t.workspaceHint}
          </p>
        </div>
        {summary?.status && (
          <span className={summary.status === "completed" ? "badge-green" : summary.status === "failed" ? "badge-red" : "badge-amber"}>
            {summary.status}
          </span>
        )}
        {doc && (
          <button className="btn-primary shrink-0" onClick={() => onGenerate(doc)} disabled={busy}>
            <Sparkles className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{t.generateSummary}</span>
          </button>
        )}
      </div>

      {!doc ? (
        <div className="empty-state">
          <FileText className="mb-3 h-8 w-8 opacity-50" />
          <p className="text-sm font-semibold">{t.noSummary}</p>
        </div>
      ) : !summary ? (
        <div className="panel panel-pad">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {busy ? t.summaryBusy : t.noSummary}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          <section className="panel panel-pad">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: "#10b981" }} />
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                {t.onePageSummary}
              </h3>
            </div>
            <div className="space-y-3 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
              {summary.summary.split(/\n{2,}/).filter(Boolean).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </section>

          <section className="panel panel-pad">
            <div className="mb-3 flex items-center gap-2">
              <ListChecks className="h-4 w-4" style={{ color: "#06b6d4" }} />
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                {t.testableConcepts}
              </h3>
            </div>
            <div className="grid gap-2">
              {summary.testable_concepts.map((item, index) => (
                <article key={`${item.concept}-${index}`} className="rounded-xl border p-3" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                  <div className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold" style={{ background: "rgba(6,182,212,0.12)", color: "#06b6d4" }}>
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{item.concept}</p>
                      <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-muted)" }}>{item.why_testable}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
