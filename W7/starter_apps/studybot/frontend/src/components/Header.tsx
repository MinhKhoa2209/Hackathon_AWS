import { BookOpen, ChevronDown, Menu, Moon, Server, Sun, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getApiBase, getUserId, type HealthResponse } from "../api";
import type { Dictionary, Language } from "../i18n";

type Props = {
  t: Dictionary;
  language: Language;
  onLanguageChange: (language: Language) => void;
  health: HealthResponse | null;
  theme: "dark" | "light";
  onThemeToggle: () => void;
  onMenuToggle: () => void;
};

export function Header({ t, language, onLanguageChange, health, theme, onThemeToggle, onMenuToggle }: Props) {
  const apiBase = getApiBase();
  const displayUser = getUserId();
  const [connOpen, setConnOpen] = useState(false);
  const connRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (connRef.current && !connRef.current.contains(e.target as Node)) {
        setConnOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="app-header">
      <div className="mx-auto flex h-full max-w-none items-center gap-2 px-3 sm:px-4">

        {/* ── Mobile menu button ─────────────────────────── */}
        <button
          id="mobile-menu-btn"
          className="btn-icon"
          onClick={onMenuToggle}
          aria-label="Open menu"
          style={{ width: "2rem", height: "2rem", flexShrink: 0 }}
        >
          <Menu className="h-[1.05rem] w-[1.05rem]" />
        </button>

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

          {/* Connection info dropdown */}
          <div className="relative hidden sm:block" ref={connRef}>
            <button
              onClick={() => setConnOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-150"
              style={{
                background: health ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)",
                border: `1px solid ${health ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
                color: health ? "#10b981" : "#ef4444",
              }}
              aria-expanded={connOpen}
            >
              <Server className="h-3 w-3 shrink-0" />
              {health ? (
                <>
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0"
                    style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
                  />
                  <span className="hidden md:inline">Connection Info</span>
                  <span className="md:hidden">Info</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 shrink-0" />
                  <span className="hidden md:inline">{t.backendOffline}</span>
                </>
              )}
              <ChevronDown
                className="h-3 w-3 shrink-0 transition-transform duration-200"
                style={{ transform: connOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>

            {/* Dropdown panel */}
            {connOpen && (
              <div
                className="absolute right-0 top-full mt-2 z-50 min-w-[220px] rounded-xl p-3 shadow-xl animate-slide-up"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: "0.5rem",
                  zIndex: 9999,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.24)",
                }}
              >
                {/* Backend rows */}
                <div className="flex items-center justify-between py-1.5 mb-2">
                  <span className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>Backend Lambda</span>
                  <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold badge-violet">
                    AWS
                  </span>
                </div>

                {health && Object.entries(health.backends).map(([name, value]) => (
                  <div key={name} className="flex items-center justify-between py-1.5">
                    <span className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>{name}</span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${value === "local" ? "badge-amber" : "badge-violet"}`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

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
