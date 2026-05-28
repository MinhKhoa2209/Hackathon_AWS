export type HealthResponse = {
  status: string;
  backends: Record<string, string>;
};

export type StudyDoc = {
  doc_id: string;
  filename?: string;
  size?: number;
  chars?: number;
  created_at?: string;
  status?: "processing" | "completed" | "failed" | string;
  extraction_method?: string;
  confidence_score?: number;
  processing_time?: number;
  fallback_reason?: string;
  text_density?: number;
  image_ratio?: number;
  table_presence?: boolean;
  scanned?: boolean;
};

export type Citation = {
  chunk?: number;
  doc_id?: string;
  filename?: string;
  score?: number;
  text?: string;
  source?: unknown;
};

export type QueryResponse = {
  question: string;
  answer: string;
  citations: Citation[];
};

export type StudySummary = {
  id?: string;
  doc_id: string;
  filename: string;
  summary: string;
  testable_concepts: { concept: string; why_testable: string }[];
  status?: "processing" | "completed" | "failed";
  created_at?: string;
  updated_at?: string;
  extraction_method?: string;
  confidence_score?: number;
  processing_time?: number;
  fallback_reason?: string;
};

export type DashboardActivity = {
  date: string;
  queries: number;
  docs: number;
  cards: number;
  quiz: number;
};

export type DashboardResponse = {
  user_id: string;
  week_start: string;
  week_end: string;
  active_days: number;
  studied_count: number;
  activity: DashboardActivity[];
  topics: { topic: string; count: number }[];
  recent_queries: { query: string; answer: string; created_at?: string }[];
};

export type UploadResponse = {
  doc_id: string;
  filename: string;
  size: number;
  chars_extracted: number;
  location: string;
  status?: string;
  extraction_method?: string;
  confidence_score?: number;
  processing_time?: number;
  fallback_reason?: string;
  text_density?: number;
  image_ratio?: number;
  table_presence?: boolean;
  scanned?: boolean;
};

export type Flashcard = {
  id: string;
  doc_id: string;
  source_doc_ids?: string[];
  question: string;
  answer: string;
  created_at?: string;
  status?: "processing" | "completed" | "failed" | string;
};

export type QuizQuestion = {
  id: string;
  doc_id: string;
  source_doc_ids?: string[];
  question: string;
  options: string[];
  correct_option: number;
  explanation: string;
  created_at?: string;
  status?: "processing" | "completed" | "failed" | string;
};

export type DebugEntry = {
  id: string;
  label: string;
  payload: unknown;
  createdAt: string;
};

export type RuntimeConfig = {
  apiBaseUrl?: string;
  awsRegion?: string;
  authMode?: "iam-only" | string;
};

type RequestOptions = RequestInit & {
  skipJsonHeader?: boolean;
};

const query = new URLSearchParams(window.location.search);

export const apiBase = (
  query.get("api") ||
  import.meta.env.VITE_API_BASE ||
  ""
).replace(/\/$/, "");

export const userId = query.get("user") || "test-user-001";

let runtimeApiBase = apiBase;
let runtimeUserId = userId;

export function configureApi(options: { apiBaseUrl?: string; userId?: string }) {
  runtimeApiBase = (query.get("api") || options.apiBaseUrl || apiBase || "").replace(/\/$/, "");
  runtimeUserId = query.get("user") || options.userId || userId;
}

export function getApiBase() {
  return runtimeApiBase;
}

export function getUserId() {
  return runtimeUserId;
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const response = await fetch("/config.json", { cache: "no-store" });
    if (!response.ok) return {};
    return (await response.json()) as RuntimeConfig;
  } catch {
    return {};
  }
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, payload: unknown) {
    const message =
      typeof payload === "object" && payload !== null && "detail" in payload
        ? String((payload as { detail: unknown }).detail)
        : `Request failed with status ${status}`;
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
  onDebug?: (entry: Omit<DebugEntry, "id" | "createdAt">) => void
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("X-User-Id", runtimeUserId);
  if (!options.skipJsonHeader && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(runtimeApiBase + path, {
    ...options,
    headers
  });
  const raw = await response.text();
  let payload: unknown = raw;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = raw;
  }

  onDebug?.({
    label: `${options.method || "GET"} ${path}`,
    payload
  });

  if (!response.ok) {
    throw new ApiError(response.status, payload);
  }

  return payload as T;
}

export const api = {
  health: (debug?: DebugCallback) => request<HealthResponse>("/health", {}, debug),
  upload: (file: File, debug?: DebugCallback) => {
    const body = new FormData();
    body.append("file", file);
    return request<UploadResponse>("/upload", { method: "POST", body, skipJsonHeader: true }, debug);
  },
  query: async (question: string, debug?: DebugCallback) => {
    const response = await request<Partial<QueryResponse>>("/query", {
      method: "POST",
      body: JSON.stringify({ question })
    }, debug);
    return {
      question: String(response.question || question),
      answer: String(response.answer || ""),
      citations: Array.isArray(response.citations) ? response.citations : []
    };
  },
  listDocs: (debug?: DebugCallback) =>
    request<{ user_id: string; docs: StudyDoc[] }>("/docs/list", {}, debug),
  dashboard: (debug?: DebugCallback) =>
    request<DashboardResponse>("/dashboard", {}, debug),
  generateSummary: (docId: string, debug?: DebugCallback) =>
    request<StudySummary>("/summary/generate", {
      method: "POST",
      body: JSON.stringify({ doc_id: docId })
    }, debug),
  generateFlashcards: (docIds: string | string[], count = 5, debug?: DebugCallback) =>
    request<{ doc_id: string; source_doc_ids?: string[]; flashcards: Flashcard[] }>("/flashcards/generate", {
      method: "POST",
      body: JSON.stringify(
        Array.isArray(docIds)
          ? { doc_ids: docIds, count }
          : { doc_id: docIds, count }
      )
    }, debug),
  listFlashcards: (docId?: string, debug?: DebugCallback) =>
    request<{ user_id: string; flashcards: Flashcard[] }>(
      docId ? `/flashcards?doc_id=${encodeURIComponent(docId)}` : "/flashcards",
      {},
      debug
    ),
  deleteFlashcard: (id: string, debug?: DebugCallback) =>
    request<{ status: string; flashcard_id: string }>(`/flashcards/${id}`, { method: "DELETE" }, debug),
  generateQuiz: (docIds: string | string[], count = 5, debug?: DebugCallback) =>
    request<{ doc_id: string; source_doc_ids?: string[]; quizzes: QuizQuestion[] }>("/quiz/generate", {
      method: "POST",
      body: JSON.stringify(
        Array.isArray(docIds)
          ? { doc_ids: docIds, count }
          : { doc_id: docIds, count }
      )
    }, debug),
  listQuiz: (docId?: string, debug?: DebugCallback) =>
    request<{ user_id: string; quizzes: QuizQuestion[] }>(
      docId ? `/quiz?doc_id=${encodeURIComponent(docId)}` : "/quiz",
      {},
      debug
    ),
  deleteQuiz: (id: string, debug?: DebugCallback) =>
    request<{ status: string; quiz_id: string }>(`/quiz/${id}`, { method: "DELETE" }, debug)
};

export type DebugCallback = (entry: Omit<DebugEntry, "id" | "createdAt">) => void;
