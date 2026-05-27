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
};

export type Citation = {
  chunk?: number;
  doc_id?: string;
  score?: number;
  text?: string;
  source?: unknown;
};

export type QueryResponse = {
  question: string;
  answer: string;
  citations: Citation[];
};

export type UploadResponse = {
  doc_id: string;
  filename: string;
  size: number;
  chars_extracted: number;
  location: string;
};

export type Flashcard = {
  id: string;
  doc_id: string;
  question: string;
  answer: string;
  created_at?: string;
};

export type QuizQuestion = {
  id: string;
  doc_id: string;
  question: string;
  options: string[];
  correct_option: number;
  explanation: string;
  created_at?: string;
};

export type DebugEntry = {
  id: string;
  label: string;
  payload: unknown;
  createdAt: string;
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
  headers.set("X-User-Id", userId);
  if (!options.skipJsonHeader && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(apiBase + path, {
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
  query: (question: string, debug?: DebugCallback) =>
    request<QueryResponse>("/query", {
      method: "POST",
      body: JSON.stringify({ question })
    }, debug),
  listDocs: (debug?: DebugCallback) =>
    request<{ user_id: string; docs: StudyDoc[] }>("/docs/list", {}, debug),
  generateFlashcards: (docId: string, count = 5, debug?: DebugCallback) =>
    request<{ doc_id: string; flashcards: Flashcard[] }>("/flashcards/generate", {
      method: "POST",
      body: JSON.stringify({ doc_id: docId, count })
    }, debug),
  listFlashcards: (docId: string, debug?: DebugCallback) =>
    request<{ user_id: string; flashcards: Flashcard[] }>(
      `/flashcards?doc_id=${encodeURIComponent(docId)}`,
      {},
      debug
    ),
  deleteFlashcard: (id: string, debug?: DebugCallback) =>
    request<{ status: string; flashcard_id: string }>(`/flashcards/${id}`, { method: "DELETE" }, debug),
  generateQuiz: (docId: string, count = 5, debug?: DebugCallback) =>
    request<{ doc_id: string; quizzes: QuizQuestion[] }>("/quiz/generate", {
      method: "POST",
      body: JSON.stringify({ doc_id: docId, count })
    }, debug),
  listQuiz: (docId: string, debug?: DebugCallback) =>
    request<{ user_id: string; quizzes: QuizQuestion[] }>(
      `/quiz?doc_id=${encodeURIComponent(docId)}`,
      {},
      debug
    ),
  deleteQuiz: (id: string, debug?: DebugCallback) =>
    request<{ status: string; quiz_id: string }>(`/quiz/${id}`, { method: "DELETE" }, debug)
};

export type DebugCallback = (entry: Omit<DebugEntry, "id" | "createdAt">) => void;
