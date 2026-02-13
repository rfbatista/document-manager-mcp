import fs from "node:fs";
import path from "node:path";

const INDEX_DIR = ".document-manager";
const INDEX_FILENAME = "embedding-index.json";
const INDEX_VERSION = 1;

export interface IndexChunk {
  text: string;
  start: number;
  end: number;
  embedding: number[];
}

export interface IndexDoc {
  docType: string;
  slug: string;
  path: string;
  mtime: number;
  chunks: IndexChunk[];
}

export interface EmbeddingIndex {
  version: number;
  docs: IndexDoc[];
}

export function getIndexPath(projectRoot: string): string {
  const dir = path.join(projectRoot, INDEX_DIR);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, INDEX_FILENAME);
}

export function loadIndex(projectRoot: string): EmbeddingIndex | null {
  const indexPath = getIndexPath(projectRoot);
  if (!fs.existsSync(indexPath)) return null;
  try {
    const raw = fs.readFileSync(indexPath, "utf-8");
    const data = JSON.parse(raw) as EmbeddingIndex;
    if (data.version !== INDEX_VERSION || !Array.isArray(data.docs)) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveIndex(projectRoot: string, index: EmbeddingIndex): void {
  const indexPath = getIndexPath(projectRoot);
  fs.writeFileSync(indexPath, JSON.stringify(index), "utf-8");
}

export function deleteIndex(projectRoot: string): void {
  const indexPath = getIndexPath(projectRoot);
  if (fs.existsSync(indexPath)) fs.unlinkSync(indexPath);
}

export function isIndexStale(projectRoot: string, index: EmbeddingIndex): boolean {
  for (const doc of index.docs) {
    try {
      if (!fs.existsSync(doc.path)) return true;
      const stat = fs.statSync(doc.path);
      if (stat.mtimeMs !== doc.mtime) return true;
    } catch {
      return true;
    }
  }
  return false;
}
