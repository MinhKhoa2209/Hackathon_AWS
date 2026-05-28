import type { StudyDoc } from "./api";

const BUNDLE_PREFIX = "bundle:";

function fallbackDocName(docId: string) {
  return `Doc ${docId.slice(0, 8)}`;
}

function resolveDocName(docId: string, docs: StudyDoc[], fallbackDoc?: StudyDoc | null) {
  const foundDoc = docs.find((doc) => doc.doc_id === docId);
  if (foundDoc?.filename) return foundDoc.filename;
  if (foundDoc?.doc_id) return foundDoc.doc_id;
  if (fallbackDoc?.doc_id === docId) return fallbackDoc.filename ?? docId;
  return fallbackDocName(docId);
}

export function parseBundleDocIds(docId: string): string[] | null {
  if (!docId.startsWith(BUNDLE_PREFIX)) return null;
  const raw = docId.slice(BUNDLE_PREFIX.length).trim();
  if (!raw) return [];
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

export function buildBundleLabel(docIds: string[], docs: StudyDoc[], fallbackDoc?: StudyDoc | null) {
  const names = docIds.map((id) => resolveDocName(id, docs, fallbackDoc));
  if (names.length === 0) return "Combined set";
  if (names.length <= 2) return names.join(" + ");
  return `${names[0]} + ${names[1]} + ${names.length - 2} more`;
}

export function resolveCollectionName(docId: string, docs: StudyDoc[], fallbackDoc?: StudyDoc | null) {
  const bundleDocIds = parseBundleDocIds(docId);
  if (bundleDocIds) {
    return buildBundleLabel(bundleDocIds, docs, fallbackDoc);
  }
  return resolveDocName(docId, docs, fallbackDoc);
}
