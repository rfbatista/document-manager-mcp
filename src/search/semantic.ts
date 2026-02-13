import fs from "node:fs";
import type { EmbeddingProvider } from "./embedding/types.js";
import type { SemanticSearchResult } from "./embedding/types.js";
import { createLocalEmbeddingProvider } from "./embedding/local.js";
import { chunkText } from "./chunking.js";
import {
  loadIndex,
  saveIndex,
  deleteIndex,
  isIndexStale,
  type EmbeddingIndex,
  type IndexDoc,
  type IndexChunk,
} from "./indexStore.js";
import { listDocFiles } from "../paths.js";
import type { DocType } from "../paths.js";

/** Cosine similarity between two normalized vectors (dot product). */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i]! * b[i]!;
  return Math.max(0, Math.min(1, sum));
}

function getProvider(): EmbeddingProvider | null {
  const provider = process.env.DOCS_EMBEDDING_PROVIDER?.toLowerCase().trim();
  if (provider === "local") return createLocalEmbeddingProvider();
  return null;
}

/**
 * Build or load the embedding index. Rebuilds if missing or stale.
 * Index always includes all doc types; filter by docType at search time.
 */
async function getOrBuildIndex(projectRoot: string, provider: EmbeddingProvider): Promise<EmbeddingIndex> {
  let index = loadIndex(projectRoot);
  if (index && isIndexStale(projectRoot, index)) {
    deleteIndex(projectRoot);
    index = null;
  }
  if (index) return index;

  const items = listDocFiles(projectRoot, undefined);
  const docs: IndexDoc[] = [];

  for (const item of items) {
    const content = fs.readFileSync(item.path, "utf-8");
    const stat = fs.statSync(item.path);
    const chunks = chunkText(content);
    if (chunks.length === 0) {
      docs.push({ docType: item.docType, slug: item.slug, path: item.path, mtime: stat.mtimeMs, chunks: [] });
      continue;
    }
    const texts = chunks.map((c) => c.text);
    const embeddings = await provider.embedBatch(texts);
    const indexChunks: IndexChunk[] = chunks.map((chunk, i) => ({
      text: chunk.text,
      start: chunk.start,
      end: chunk.end,
      embedding: embeddings[i] ?? [],
    }));
    docs.push({
      docType: item.docType,
      slug: item.slug,
      path: item.path,
      mtime: stat.mtimeMs,
      chunks: indexChunks,
    });
  }

  const newIndex: EmbeddingIndex = { version: 1, docs };
  saveIndex(projectRoot, newIndex);
  return newIndex;
}

/**
 * Run semantic search: embed query, compare to index chunks, return top results.
 */
export async function semanticSearch(
  projectRoot: string,
  query: string,
  options: { docType?: DocType; limit?: number }
): Promise<SemanticSearchResult[]> {
  const provider = getProvider();
  if (!provider) return [];

  const { docType, limit = 10 } = options;
  const index = await getOrBuildIndex(projectRoot, provider);
  const queryEmbedding = await provider.embed(query);

  const scored: { docType: string; slug: string; score: number; snippet: string }[] = [];
  for (const doc of index.docs) {
    if (docType && doc.docType !== docType) continue;
    for (const chunk of doc.chunks) {
      if (chunk.embedding.length === 0) continue;
      const score = cosineSimilarity(queryEmbedding, chunk.embedding);
      scored.push({
        docType: doc.docType,
        slug: doc.slug,
        score,
        snippet: chunk.text.slice(0, 200) + (chunk.text.length > 200 ? "…" : ""),
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);
  return top;
}

/**
 * Invalidate the embedding index (call after write_doc, create_doc, delete_doc).
 */
export function invalidateIndex(projectRoot: string): void {
  deleteIndex(projectRoot);
}

/**
 * Whether semantic search is enabled (local provider configured).
 */
export function isSemanticSearchEnabled(): boolean {
  return process.env.DOCS_EMBEDDING_PROVIDER?.toLowerCase().trim() === "local";
}
