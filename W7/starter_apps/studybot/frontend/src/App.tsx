import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  configureApi,
  loadRuntimeConfig,
  type DashboardResponse,
  type DebugEntry,
  type Flashcard,
  type HealthResponse,
  type QueryResponse,
  type QuizQuestion,
  type StudySummary,
  type StudyDoc
} from "./api";
import { DashboardPanel } from "./components/DashboardPanel";
import { DebugPanel } from "./components/DebugPanel";
import { DocumentLibrary } from "./components/DocumentLibrary";
import { FlashcardDeck } from "./components/FlashcardDeck";
import { Header } from "./components/Header";
import { QuestionPanel } from "./components/QuestionPanel";
import { QuizPanel } from "./components/QuizPanel";
import { Sidebar, type TabId } from "./components/Sidebar";
import { SummaryPanel } from "./components/SummaryPanel";
import { ToastHost } from "./components/ToastHost";
import { UploadPanel } from "./components/UploadPanel";
import { dictionaries, getInitialLanguage, languageStorageKey, type Language } from "./i18n";
import type { Toast, ToastType } from "./toast";

/* ── Theme persistence ──────────────────────────────────── */
const themeStorageKey = "studybot.theme";
const activeTabStorageKey = "studybot.activeTab";
const sidebarCollapsedKey = "studybot.sidebarCollapsed";
const selectedDocStorageKey = "studybot.selectedDocId";
// answerStorageKey removed — chat history is managed inside QuestionPanel

function getInitialTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(themeStorageKey);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialTab(): TabId {
  const stored = localStorage.getItem(activeTabStorageKey) as TabId | null;
  if (stored && ["dashboard", "upload", "library", "summary", "ask", "cards", "quiz", "dev"].includes(stored)) return stored;
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
  dashboard: boolean;
  summary: boolean;
  docId: string | null;
};

const initialBusy: BusyState = {
  upload: false,
  ask: false,
  docs: false,
  dashboard: false,
  summary: false,
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
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [summary, setSummary] = useState<StudySummary | null>(null);
  const [generatedSummaryDocId, setGeneratedSummaryDocId] = useState<string | null>(null);
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

  useEffect(() => {
    if (selectedDoc?.doc_id) localStorage.setItem(selectedDocStorageKey, selectedDoc.doc_id);
  }, [selectedDoc?.doc_id]);

  function toggleTheme() {
    setTheme((v) => (v === "dark" ? "light" : "dark"));
  }

  function selectDoc(doc: StudyDoc) {
    setSelectedDoc(doc);
    setSummary(null);
    setGeneratedSummaryDocId(null);
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
        if (!current) {
          const storedDocId = localStorage.getItem(selectedDocStorageKey);
          return response.docs.find((doc) => doc.doc_id === storedDocId) || response.docs[0] || null;
        }
        return response.docs.find((doc) => doc.doc_id === current.doc_id) || response.docs[0] || null;
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.actionFailed, "error");
    } finally {
      setBusy((value) => ({ ...value, docs: false }));
    }
  }, [addDebug, showToast, t.actionFailed]);

  const refreshDashboard = useCallback(async () => {
    setBusy((value) => ({ ...value, dashboard: true }));
    try {
      const response = await api.dashboard(addDebug);
      setDashboard(response);
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.actionFailed, "error");
    } finally {
      setBusy((value) => ({ ...value, dashboard: false }));
    }
  }, [addDebug, showToast, t.actionFailed]);

  useEffect(() => {
    window.localStorage.setItem(languageStorageKey, language);
  }, [language]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      localStorage.removeItem("studybot.summaries.v2");
      const config = await loadRuntimeConfig();
      configureApi({
        apiBaseUrl: config.apiBaseUrl,
        userId: undefined
      });
      if (cancelled) return;

      // Sequential requests to avoid Lambda concurrency throttling
      try { const h = await api.health(addDebug); setHealth(h); } catch { setHealth(null); }
      if (cancelled) return;
      try { const d = await api.listDocs(addDebug); setDocs(d.docs); } catch { /* */ }
      if (cancelled) return;
      try { const f = await api.listFlashcards(undefined, addDebug); setFlashcards(f.flashcards); } catch { /* */ }
      if (cancelled) return;
      try { const q = await api.listQuiz(undefined, addDebug); setQuiz(q.quizzes); } catch { /* */ }
      if (cancelled) return;
      try { const db = await api.dashboard(addDebug); setDashboard(db); } catch { /* */ }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [addDebug, refreshDashboard, refreshDocs]);

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
      setSummary(null);
      setGeneratedSummaryDocId(null);
      void refreshDashboard();
    } catch (error) {
      showToast(`${t.uploadError}: ${error instanceof Error ? error.message : t.actionFailed}`, "error");
    } finally {
      setBusy((value) => ({ ...value, upload: false }));
    }
  }

  async function ask(question: string): Promise<QueryResponse> {
    setBusy((value) => ({ ...value, ask: true }));
    try {
      const response = await api.query(question, addDebug);
      void refreshDashboard();
      return response;
    } finally {
      setBusy((value) => ({ ...value, ask: false }));
    }
  }

  // Batch handlers for DocumentLibrary
  async function batchGenerateQuiz(docIds: string[], count: number, _difficulty?: string, _qType?: string) {
    try {
      const response = await api.generateQuiz(docIds, count, addDebug);
      setQuiz((items) => [
        ...response.quizzes,
        ...items.filter((item) => item.doc_id !== response.doc_id)
      ]);
      showToast(t.quizGenerated, "success");
      setActiveTab("quiz");
      void refreshDashboard();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.actionFailed, "error");
      throw error;
    }
  }

  async function batchGenerateCards(docIds: string[], count: number, _style?: string) {
    try {
      const response = await api.generateFlashcards(docIds, count, addDebug);
      setFlashcards((items) => [
        ...response.flashcards,
        ...items.filter((item) => item.doc_id !== response.doc_id)
      ]);
      showToast(t.cardsGenerated, "success");
      setActiveTab("cards");
      void refreshDashboard();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.actionFailed, "error");
      throw error;
    }
  }

  async function batchGenerateSummary(docIds: string[]) {
    for (const docId of docIds) {
      const doc = docs.find((d) => d.doc_id === docId);
      if (!doc) continue;
      try {
        await generateSummary(doc);
      } catch (error) {
        showToast(error instanceof Error ? error.message : t.actionFailed, "error");
      }
    }
  }

  async function loadFlashcards(doc: StudyDoc) {
    setSelectedDoc(doc);
    setBusy((value) => ({ ...value, docId: doc.doc_id }));
    try {
      const response = await api.listFlashcards(undefined, addDebug);
      setFlashcards(response.flashcards);
      showToast(t.cardsLoaded, "success");
      setActiveTab("cards");
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.actionFailed, "error");
    } finally {
      setBusy((value) => ({ ...value, docId: null }));
    }
  }

  async function generateSummary(doc: StudyDoc) {
    setSelectedDoc(doc);
    setGeneratedSummaryDocId(doc.doc_id);
    const pending: StudySummary = {
      id: `summary_${doc.doc_id}`,
      doc_id: doc.doc_id,
      filename: doc.filename || doc.doc_id,
      summary: "",
      testable_concepts: [],
      status: "processing",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setSummary(pending);
    setBusy((value) => ({ ...value, summary: true, docId: doc.doc_id }));
    try {
      const response = await api.generateSummary(doc.doc_id, addDebug);
      const completed = {
        ...response,
        id: response.id || `summary_${doc.doc_id}`,
        status: "completed" as const,
        created_at: response.created_at || pending.created_at,
        updated_at: new Date().toISOString()
      };
      setSummary(completed);
      showToast(t.summaryGenerated, "success");
      setActiveTab("summary");
    } catch (error) {
      const failed = { ...pending, status: "failed" as const, updated_at: new Date().toISOString() };
      setSummary(failed);
      showToast(error instanceof Error ? error.message : t.actionFailed, "error");
    } finally {
      setBusy((value) => ({ ...value, summary: false, docId: null }));
    }
  }

  const visibleSummary =
    summary && selectedDoc && generatedSummaryDocId === selectedDoc.doc_id
      ? summary
      : null;

  async function generateFlashcards(doc: StudyDoc, count = 5) {
    setSelectedDoc(doc);
    setBusy((value) => ({ ...value, docId: doc.doc_id }));
    try {
      const response = await api.generateFlashcards([doc.doc_id], count, addDebug);
      setFlashcards((items) => [
        ...response.flashcards,
        ...items.filter((item) => item.doc_id !== response.doc_id)
      ]);
      showToast(t.cardsGenerated, "success");
      setActiveTab("cards");
      void refreshDashboard();
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

  async function deleteQuiz(id: string) {
    try {
      await api.deleteQuiz(id, addDebug);
      setQuiz((items) => items.filter((item) => item.id !== id));
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.actionFailed, "error");
    }
  }

  async function deleteQuizBatch(ids: string[]) {
    const failed: string[] = [];
    for (const id of ids) {
      try {
        await api.deleteQuiz(id, addDebug);
      } catch {
        failed.push(id);
      }
    }
    // Remove successfully deleted from state
    const deletedIds = new Set(ids.filter((id) => !failed.includes(id)));
    setQuiz((items) => items.filter((item) => !deletedIds.has(item.id)));
    if (failed.length > 0) {
      showToast(`${failed.length} quiz question(s) failed to delete`, "error");
    }
  }

  async function deleteDoc(docId: string) {
    try {
      await api.deleteDoc(docId, addDebug);
      setDocs((items) => items.filter((item) => item.doc_id !== docId));
      if (selectedDoc?.doc_id === docId) setSelectedDoc(null);
      showToast("Document deleted", "success");
      void refreshDashboard();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.actionFailed, "error");
    }
  }

  async function batchDeleteDocs(docIds: string[]) {
    for (const docId of docIds) {
      await deleteDoc(docId);
    }
  }

  async function loadQuiz(doc: StudyDoc) {
    setSelectedDoc(doc);
    setBusy((value) => ({ ...value, docId: doc.doc_id }));
    try {
      const response = await api.listQuiz(undefined, addDebug);
      setQuiz(response.quizzes);
      setActiveTab("quiz");
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.actionFailed, "error");
    } finally {
      setBusy((value) => ({ ...value, docId: null }));
    }
  }

  async function generateQuiz(doc: StudyDoc, count = 10) {
    setSelectedDoc(doc);
    setBusy((value) => ({ ...value, docId: doc.doc_id }));
    try {
      const response = await api.generateQuiz([doc.doc_id], count, addDebug);
      setQuiz((items) => [
        ...response.quizzes,
        ...items.filter((item) => item.doc_id !== response.doc_id)
      ]);
      showToast(t.quizGenerated, "success");
      setActiveTab("quiz");
      void refreshDashboard();
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

  // Wide tabs that benefit from more horizontal space
  const wideTab = activeTab === "library" || activeTab === "summary" || activeTab === "cards" || activeTab === "quiz";

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
        onMenuToggle={() => setSidebarOpen((v) => !v)}
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
          <div className={`mx-auto w-full ${wideTab ? "max-w-5xl" : "max-w-3xl"}`}>
            {activeTab === "upload" && (
              <UploadPanel t={t} busy={busy.upload} onUpload={upload} existingDocs={docs} />
            )}

            {activeTab === "dashboard" && (
              <DashboardPanel
                t={t}
                dashboard={dashboard}
                loading={busy.dashboard}
                onRefresh={refreshDashboard}
              />
            )}

            {activeTab === "library" && (
              <DocumentLibrary
                t={t}
                docs={docs}
                selectedDocId={selectedDoc?.doc_id ?? null}
                loading={busy.docs}
                busyDocId={busy.docId}
                onRefresh={refreshDocs}
                onSelect={selectDoc}
                onGenerateCards={generateFlashcards}
                onReviewCards={loadFlashcards}
                onGenerateQuiz={generateQuiz}
                onTakeQuiz={loadQuiz}
                onGenerateSummary={generateSummary}
                onBatchGenerateQuiz={batchGenerateQuiz}
                onBatchGenerateCards={batchGenerateCards}
                onBatchGenerateSummary={batchGenerateSummary}
                onBatchDelete={batchDeleteDocs}
              />
            )}

            {activeTab === "summary" && (
              <SummaryPanel
                t={t}
                doc={selectedDoc}
                docs={docs}
                summary={visibleSummary}
                busy={busy.summary}
                onGenerate={generateSummary}
              />
            )}

            {activeTab === "ask" && (
              <QuestionPanel t={t} busy={busy.ask} docs={docs} onAsk={ask} />
            )}

            {activeTab === "cards" && (
              <FlashcardDeck
                t={t}
                doc={selectedDoc}
                docs={docs}
                cards={flashcards}
                onDelete={deleteFlashcard}
              />
            )}

            {activeTab === "quiz" && (
              <QuizPanel t={t} doc={selectedDoc} docs={docs} questions={quiz} onDeleteQuiz={deleteQuiz} onDeleteQuizBatch={deleteQuizBatch} />
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
