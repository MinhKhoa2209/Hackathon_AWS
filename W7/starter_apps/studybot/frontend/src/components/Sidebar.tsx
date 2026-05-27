import {
  BookOpen,
  Bug,
  PanelLeftClose,
  PanelLeftOpen,
  HelpCircle,
  Layers,
  Library,
  MessageSquareText,
  UploadCloud,
} from "lucide-react";
import type { Dictionary } from "../i18n";

export type TabId = "upload" | "library" | "ask" | "cards" | "quiz" | "dev";

type Props = {
  t: Dictionary;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  stats: { docs: number; cards: number; quiz: number };
};

const navItems: { id: TabId; icon: React.ElementType; labelKey: keyof Dictionary; accent?: string }[] = [
  { id: "upload",  icon: UploadCloud,       labelKey: "uploadTitle",   accent: "#7c3aed" },
  { id: "library", icon: Library,            labelKey: "libraryTitle",  accent: "#06b6d4" },
  { id: "ask",     icon: MessageSquareText,  labelKey: "askTitle",      accent: "#8b5cf6" },
  { id: "cards",   icon: Layers,             labelKey: "cardsTitle",    accent: "#7c3aed" },
  { id: "quiz",    icon: HelpCircle,         labelKey: "quizTitle",     accent: "#06b6d4" },
];

const shortLabels: Record<TabId, { en: string; vi: string }> = {
  upload:  { en: "Upload",  vi: "Tải lên" },
  library: { en: "Library", vi: "Thư viện" },
  ask:     { en: "Ask AI",  vi: "Hỏi AI" },
  cards:   { en: "Cards",   vi: "Thẻ học" },
  quiz:    { en: "Quiz",    vi: "Quiz" },
  dev:     { en: "Dev",     vi: "Dev" },
};

type StatItem = { label: string; value: number; color: string };

export function Sidebar({ t, activeTab, onTabChange, isOpen, onClose, isCollapsed, onToggleCollapse, stats }: Props) {
  const lang = (t.appName === "StudyBot" && t.tagline.startsWith("AI")) ? "en" : "vi";

  const statItems: StatItem[] = [
    { label: "Docs",  value: stats.docs,  color: "#7c3aed" },
    { label: "Cards", value: stats.cards, color: "#06b6d4" },
    { label: "Quiz",  value: stats.quiz,  color: "#10b981" },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${isOpen ? "is-open" : ""} ${isCollapsed ? "is-collapsed" : ""}`}>
        {/* Nav group */}
        <div className="sidebar-section flex-1">
          <nav className="grid gap-0.5" role="navigation">
            {navItems.map(({ id, icon: Icon, accent }, idx) => (
              <button
                key={id}
                id={`nav-${id}`}
                className={`nav-item animate-slide-in-left animation-delay-${Math.min(idx * 50, 300)}`}
                style={
                  activeTab === id
                    ? { color: accent, borderColor: `${accent}55`, background: `${accent}12` }
                    : {}
                }
                onClick={() => {
                  onTabChange(id);
                  onClose();
                }}
                aria-current={activeTab === id ? "page" : undefined}
                title={isCollapsed ? shortLabels[id][lang] : undefined}
              >
                <Icon
                  className="nav-item-icon"
                  style={{ color: activeTab === id ? accent : undefined }}
                />
                {!isCollapsed && <span>{shortLabels[id][lang]}</span>}

                {/* Active dot */}
                {activeTab === id && !isCollapsed && (
                  <span
                    className="ml-auto h-1.5 w-1.5 rounded-full"
                    style={{ background: accent }}
                  />
                )}

                {/* Collapsed active indicator */}
                {activeTab === id && isCollapsed && (
                  <span
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full"
                    style={{ background: accent }}
                  />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Divider */}
        <div className="mx-3 h-px" style={{ background: "var(--border)" }} />

        {/* Dev tab */}
        <div className="sidebar-section">
          <button
            id="nav-dev"
            className={`nav-item ${activeTab === "dev" ? "is-active" : ""}`}
            style={activeTab === "dev" ? { color: "#f59e0b", borderColor: "#f59e0b55", background: "#f59e0b12" } : {}}
            onClick={() => { onTabChange("dev"); onClose(); }}
            aria-current={activeTab === "dev" ? "page" : undefined}
            title={isCollapsed ? "Dev" : undefined}
          >
            <Bug className="nav-item-icon" style={{ color: activeTab === "dev" ? "#f59e0b" : undefined }} />
            {!isCollapsed && <span>Dev</span>}
          </button>
        </div>

        {/* Divider */}
        <div className="mx-3 h-px" style={{ background: "var(--border)" }} />

        {/* Stats footer — hidden when collapsed */}
        {!isCollapsed && (
          <div className="sidebar-section pb-4">
            <span className="sidebar-label">Stats</span>
            <div className="grid gap-2">
              {statItems.map(({ label, value, color }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg px-2.5 py-2"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                >
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    {label}
                  </span>
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer brand + sidebar toggle */}
        <div className="flex items-center justify-center gap-2 px-4 pb-5">
          <BookOpen className="h-4 w-4 opacity-25" style={{ color: "#7c3aed" }} />
          {!isCollapsed && (
            <span className="text-[11px] font-semibold opacity-25" style={{ color: "var(--text-muted)" }}>
              StudyBot
            </span>
          )}
          <button
            className="btn-icon sidebar-footer-toggle"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            id="menu-toggle-btn"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed
              ? <PanelLeftOpen className="h-3.5 w-3.5" />
              : <PanelLeftClose className="h-3.5 w-3.5" />
            }
          </button>
        </div>
      </aside>
    </>
  );
}
