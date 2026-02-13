/**
 * Interface for embedding providers (local model or API).
 * Used by semantic search to embed query and document chunks.
 */
export interface EmbeddingProvider {
  /** Embed a single text. Returns a normalized vector for cosine similarity. */
  embed(text: string): Promise<number[]>;

  /** Embed multiple texts in one call (for indexing). Returns one vector per text. */
  embedBatch(texts: string[]): Promise<number[][]>;
}

export interface SemanticSearchResult {
  docType: string;
  slug: string;
  score: number;
  snippet: string;
}
