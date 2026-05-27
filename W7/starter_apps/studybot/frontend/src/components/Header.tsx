import { BookOpen, Moon, Sun, WifiOff } from "lucide-react";
import { getApiBase, getUserId, type HealthResponse } from "../api";
import type { Dictionary, Language } from "../i18n";

type Props = {
  t: Dictionary;
  language: Language;
  onLanguageChange: (language: Language) => void;
  health: HealthResponse | null;
  theme: "dark" | "light";
  onThemeToggle: () => void;
};

export function Header({ t, language, onLanguageChange, health, theme, onThemeToggle }: Props) {
  const apiBase = getApiBase();
  const displayUser = getUserId();

  return (
    <header className="app-header">
      <div className="mx-auto flex h-full max-w-none items-center gap-2 px-3 sm:px-4">

        {/* ── Logo + Brand ───────────────────────────────── */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="relative grid h-8 w-8 shrink-0 place-items-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              boxShadow: "0 0 0 1px rgba(124,58,237,0.25), 0 4px 16px rgba(124,58,237,0.35)",
            }}
          >
            <BookOpen className="h-[1.05rem] w-[1.05rem] text-white" />
            {/* Glass sheen */}
            <span
              className="absolute inset-0 rounded-xl"
              style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.18) 0%, transparent 55%)" }}
            />
          </div>

          <div className="min-w-0">
            <h1
              className="text-[15px] font-bold leading-none tracking-tight text-gradient-animate"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {t.appName}
            </h1>
          </div>
        </div>

        {/* ── Spacer ─────────────────────────────────────── */}
        <div className="flex-1" />

        {/* ── Right controls ─────────────────────────────── */}
        <div className="flex items-center gap-1.5 sm:gap-2">

          {/* Status + backend badges */}
          <div className="hidden items-center gap-1.5 sm:flex">
            {health ? (
              <span className="badge-green flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                  style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
                />
                <span className="hidden md:inline">{t.healthOk}</span>
                <span className="md:hidden">OK</span>
              </span>
            ) : (
              <span className="badge-red flex items-center gap-1.5">
                <WifiOff className="h-3 w-3" />
                <span className="hidden md:inline">{t.backendOffline}</span>
              </span>
            )}

            {/* Backend badges (compact) */}
            {health && Object.entries(health.backends).map(([name, value]) => (
              <span
                key={name}
                className={`hidden lg:inline-flex ${value === "local" ? "badge-amber" : "badge-violet"}`}
              >
                {name}: {value}
              </span>
            ))}
          </div>

          {/* API base chip */}
          {apiBase && (
            <span className="badge-muted hidden xl:inline-flex" title={apiBase}>
              {t.api}: {apiBase.replace(/^https?:\/\//, "").slice(0, 20)}
            </span>
          )}

          {/* Language toggle */}
          <div
            className="flex rounded-lg p-0.5"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            role="group"
            aria-label={t.language}
          >
            {(["en", "vi"] as Language[]).map((lang) => (
              <button
                key={lang}
                id={`lang-${lang}`}
                onClick={() => onLanguageChange(lang)}
                className="relative rounded-md px-2.5 py-1 text-xs font-semibold transition-all duration-200"
                style={
                  language === lang
                    ? {
                        background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                        color: "#fff",
                        boxShadow: "0 2px 8px rgba(124,58,237,0.32)",
                      }
                    : {
                        color: "var(--text-muted)",
                      }
                }
                aria-pressed={language === lang}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          {/* User chip */}
          <div
            className="header-user-chip hidden sm:flex"
          >
            <span
              className="grid h-5 w-5 place-items-center rounded-full text-white text-[10px] font-bold shrink-0"
              style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
            >
              {displayUser.charAt(0).toUpperCase()}
            </span>
            <span className="hidden md:block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{displayUser}</span>
          </div>

          {/* Theme toggle */}
          <button
            id="theme-toggle"
            onClick={onThemeToggle}
            className="btn-icon"
            aria-label="Toggle theme"
            style={{ width: "2rem", height: "2rem" }}
          >
            {theme === "dark"
              ? <Sun className="h-[1.05rem] w-[1.05rem]" />
              : <Moon className="h-[1.05rem] w-[1.05rem]" />
            }
          </button>
        </div>
      </div>

      {/* Gradient accent line */}
      <div className="header-gradient-line" />
    </header>
  );
}
