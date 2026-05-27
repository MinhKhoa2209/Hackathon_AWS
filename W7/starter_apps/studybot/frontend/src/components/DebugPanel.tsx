import { Bug, ChevronDown, Terminal } from "lucide-react";
import { useState } from "react";
import type { DebugEntry } from "../api";
import type { Dictionary } from "../i18n";

type Props = {
  entries: DebugEntry[];
  t: Dictionary;
};

export function DebugPanel({ entries, t }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6 animate-fade-scale">
      {/* Workspace header */}
      <div className="workspace-header">
        <div
          className="workspace-icon"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
        >
          <Bug className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="workspace-title">{t.debugTitle}</h2>
          <p className="workspace-subtitle">Raw request/response payloads from API calls</p>
        </div>
        {entries.length > 0 && (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums"
            style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            {entries.length}
          </span>
        )}
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="empty-state animate-fade-in">
          <div
            className="mb-4 grid h-14 w-14 place-items-center rounded-2xl"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}
          >
            <Terminal className="h-7 w-7" style={{ color: "#f59e0b", opacity: 0.5 }} />
          </div>
          <p className="text-base font-semibold" style={{ color: "var(--text-secondary)" }}>
            No API calls yet
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {t.debugEmpty}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <div
                key={entry.id}
                className="overflow-hidden rounded-xl animate-slide-up"
                style={{ border: "1px solid rgba(245,158,11,0.15)", background: "var(--surface)" }}
              >
                {/* Entry header */}
                <button
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm transition-all duration-150"
                  style={{
                    background: "rgba(245,158,11,0.06)",
                    borderBottom: isExpanded ? "1px solid rgba(245,158,11,0.12)" : "none",
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  id={`debug-entry-${entry.id.slice(0, 8)}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: "#f59e0b" }}
                    />
                    <span className="text-sm font-semibold truncate" style={{ color: "#f59e0b" }}>
                      {entry.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="font-mono text-[11px] tabular-nums"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {entry.createdAt}
                    </span>
                    <ChevronDown
                      className="h-4 w-4 transition-transform duration-200"
                      style={{
                        color: "var(--text-muted)",
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </div>
                </button>

                {/* JSON payload */}
                {isExpanded && (
                  <div className="animate-slide-up">
                    <pre
                      className="scroll-region max-h-72 overflow-auto px-4 py-3 text-xs leading-relaxed"
                      style={{
                        fontFamily: "var(--font-mono)",
                        background: "#06090f",
                        color: "#94d8fb",
                      }}
                    >
                      {JSON.stringify(entry.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
