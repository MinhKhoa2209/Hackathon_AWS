import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  type DebugEntry,
  type Flashcard,
  type HealthResponse,
  type QueryResponse,
  type QuizQuestion,
  type StudyDoc
} from "./api";
import { DebugPanel } from "./components/DebugPanel";
import { DocumentLibrary } from "./components/DocumentLibrary";
import { FlashcardDeck } from "./components/FlashcardDeck";
import { Header } from "./components/Header";
import { QuestionPanel } from "./components/QuestionPanel";
import { QuizPanel } from "./components/QuizPanel";
import { Sidebar, type TabId } from "./components/Sidebar";
import { ToastHost } from "./components/ToastHost";
import { UploadPanel } from "./components/UploadPanel";
import { dictionaries, getInitialLanguage, languageStorageKey, type Language } from "./i18n";
import type { Toast, ToastType } from "./toast";

/* ── Theme persistence ──────────────────────────────────── */
const themeStorageKey = "studybot.theme";
const activeTabStorageKey = "studybot.activeTab";
const sidebarCollapsedKey = "studybot.sidebarCollapsed";

function getInitialTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(themeStorageKey);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialTab(): TabId {
  const stored = localStorage.getItem(activeTabStorageKey) as TabId | null;
  if (stored && ["upload", "library", "ask", "cards", "quiz", "dev"].includes(stored)) return stored;
  return "upload";
}

function applyTheme(theme: "dark" | "light") {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    theme === "dark" ? "#090d18" : "#f4f6fb"
  );
}

/* ── Busy state ─────────────────────────────────────────── */
type BusyState = {
  upload: boolean;
  ask: boolean;
  docs: boolean;
  docId: string | null;
};

const initialBusy: BusyState = {
  upload: false,
  ask: false,
  docs: false,
  docId: null
};

/* ── App ────────────────────────────────────────────────── */
export function App() {
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());
  const t = dictionaries[language];
  const [theme, setTheme] = useState<"dark" | "light">(() => getInitialTheme());
  const [activeTab, setActiveTab] = useState<TabId>(() => getInitialTab());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem(sidebarCollapsedKey) === "true";
  });

  function toggleSidebarCollapse() {
    setSidebarCollapsed((v) => {
      const next = !v;
      localStorage.setItem(sidebarCollapsedKey, String(next));
      return next;
    });
  }

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [docs, setDocs] = useState<StudyDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<StudyDoc | null>(null);
  const [answer, setAnswer] = useState<QueryResponse | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [busy, setBusy] = useState<BusyState>(initialBusy);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [debugEntries, setDebugEntries] = useState<DebugEntry[]>([]);

  // Apply theme class to <html>
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  // Persist active tab
  useEffect(() => {
    localStorage.setItem(activeTabStorageKey, activeTab);
  }, [activeTab]);

  function toggleTheme() {
    setTheme((v) => (v === "dark" ? "light" : "dark"));
  }

  const addDebug = useCallback((entry: Omit<DebugEntry, "id" | "createdAt">) => {
    setDebugEntries((entries) =>
      [
        {
          ...entry,
          id: crypto.randomUUID(),
          createdAt: new Date().toLocaleTimeString()
        },
        ...entries
      ].slice(0, 12)
    );
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = crypto.randomUUID();
    setToasts((items) => [...items, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const refreshDocs = useCallback(async () => {
    setBusy((value) => ({ ...value, docs: true }));
    try {
      const response = await api.listDocs(addDebug);
      setDocs(response.docs);
      setSelectedDoc((current) => {
        if (!current) return response.docs[0] || null;
        return response.docs.find((doc) => doc.doc_id === current.doc_id) || response.docs[0] || null;
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.actionFailed, "error");
    } finally {
      setBusy((value) => ({ ...value, docs: false }));
    }
  }, [addDebug, showToast, t.actionFailed]);

  useEffect(() => {
    window.localStorage.setItem(languageStorageKey, language);
  }, [language]);

  useEffect(() => {
    api.health(addDebug)
      .then((response) => setHealth(response))
      .catch(() => setHealth(null));
    void refreshDocs();
  }, [addDebug, refreshDocs]);

  async function upload(files: File[]) {
    if (!files.length) return;
    setBusy((value) => ({ ...value, upload: true }));
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const response = await api.upload(file, addDebug);
        uploaded.push(response.filename);
      }
      showToast(
        files.length === 1
          ? `${t.uploadDone}: ${uploaded[0]}`
          : `${t.uploadDoneMany}: ${uploaded.length}`,
        "success"
      );
      await refreshDocs();
    } catch (error) {
      showToast(`${t.uploadError}: ${error instanceof Error ? error.message : t.actionFailed}`, "error");
    } finally {
      setBusy((value) => ({ ...value, upload: false }));
    }
  }

  async function ask(question: string) {
    setBusy((value) => ({ ...value, ask: true }));
    try {
      const response = await api.query(question, addDebug);
      setAnswer(response);
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.actionFailed, "error");
    } finally {
      setBusy((value) => ({ ...value, ask: false }));
    }
  }

  async function loadFlashcards(doc: StudyDoc) {
    setSelectedDoc(doc);
    setBusy((value) => ({ ...value, docId: doc.doc_id }));
    try {
      const response = await api.listFlashcards(doc.doc_id, addDebug);
      setFlashcards(response.flashcards);
      showToast(t.cardsLoaded, "success");
      setActiveTab("cards");
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.actionFailed, "error");
    } finally {
      setBusy((value) => ({ ...value, docId: null }));
    }
  }

  async function generateFlashcards(doc: StudyDoc) {
    setSelectedDoc(doc);
    setBusy((value) => ({ ...value, docId: doc.doc_id }));
    try {
      const response = await api.generateFlashcards(doc.doc_id, 5, addDebug);
      setFlashcards(response.flashcards);
      showToast(t.cardsGenerated, "success");
      setActiveTab("cards");
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.actionFailed, "error");
    } finally {
      setBusy((value) => ({ ...value, docId: null }));
    }
  }

  async function deleteFlashcard(id: string) {
    try {
      await api.deleteFlashcard(id, addDebug);
      setFlashcards((items) => items.filter((item) => item.id !== id));
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.actionFailed, "error");
    }
  }

  async function loadQuiz(doc: StudyDoc) {
    setSelectedDoc(doc);
    setBusy((value) => ({ ...value, docId: doc.doc_id }));
    try {
      const response = await api.listQuiz(doc.doc_id, addDebug);
      setQuiz(response.quizzes);
      setActiveTab("quiz");
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.actionFailed, "error");
    } finally {
      setBusy((value) => ({ ...value, docId: null }));
    }
  }

  async function generateQuiz(doc: StudyDoc) {
    setSelectedDoc(doc);
    setBusy((value) => ({ ...value, docId: doc.doc_id }));
    try {
      const response = await api.generateQuiz(doc.doc_id, 5, addDebug);
      setQuiz(response.quizzes);
      showToast(t.quizGenerated, "success");
      setActiveTab("quiz");
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.actionFailed, "error");
    } finally {
      setBusy((value) => ({ ...value, docId: null }));
    }
  }

  const stats = useMemo(
    () => ({
      docs: docs.length,
      cards: flashcards.length,
      quiz: quiz.length
    }),
    [docs.length, flashcards.length, quiz.length]
  );

  return (
    <div className="app-shell">
      {/* Header */}
      <Header
        t={t}
        language={language}
        onLanguageChange={setLanguage}
        health={health}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      {/* Body */}
      <div className="app-body">
        {/* Sidebar */}
        <Sidebar
          t={t}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          stats={stats}
        />

        {/* Workspace */}
        <main className="workspace" id="workspace">
          <div className="mx-auto w-full max-w-3xl">
            {activeTab === "upload" && (
              <UploadPanel t={t} busy={busy.upload} onUpload={upload} existingDocs={docs} />
            )}

            {activeTab === "library" && (
              <DocumentLibrary
                t={t}
                docs={docs}
                selectedDocId={selectedDoc?.doc_id ?? null}
                loading={busy.docs}
                busyDocId={busy.docId}
                onRefresh={refreshDocs}
                onSelect={setSelectedDoc}
                onGenerateCards={generateFlashcards}
                onReviewCards={loadFlashcards}
                onGenerateQuiz={generateQuiz}
                onTakeQuiz={loadQuiz}
              />
            )}

            {activeTab === "ask" && (
              <QuestionPanel t={t} busy={busy.ask} answer={answer} onAsk={ask} />
            )}

            {activeTab === "cards" && (
              <FlashcardDeck
                t={t}
                doc={selectedDoc}
                cards={flashcards}
                onDelete={deleteFlashcard}
              />
            )}

            {activeTab === "quiz" && (
              <QuizPanel t={t} doc={selectedDoc} questions={quiz} />
            )}

            {activeTab === "dev" && (
              <DebugPanel entries={debugEntries} t={t} />
            )}
          </div>
        </main>
      </div>

      <ToastHost toasts={toasts} />
    </div>
  );
}
