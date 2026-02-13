import { pipeline } from "@huggingface/transformers";
import type { EmbeddingProvider } from "./types.js";

const DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2";

/** Options for the feature-extraction pipeline (pooling, normalize). */
const EXTRACT_OPTIONS = { pooling: "mean" as const, normalize: true };

type FeatureExtractionOutput = { data?: Float32Array; tolist?: () => unknown[]; dims?: number[] };

/**
 * Local embedding provider using Transformers.js (runs in Node, no API key).
 * Model is downloaded on first use and cached.
 */
export function createLocalEmbeddingProvider(modelName?: string): EmbeddingProvider {
  const model = modelName ?? process.env.DOCS_EMBEDDING_MODEL ?? DEFAULT_MODEL;
  let extractor: ((input: string | string[], options: typeof EXTRACT_OPTIONS) => Promise<unknown>) | null = null;

  async function getExtractor(): Promise<(input: string | string[], options: typeof EXTRACT_OPTIONS) => Promise<unknown>> {
    if (!extractor) {
      extractor = (await pipeline("feature-extraction", model)) as unknown as (input: string | string[], options: typeof EXTRACT_OPTIONS) => Promise<unknown>;
    }
    return extractor!;
  }

  return {
    async embed(text: string): Promise<number[]> {
      const pipe = await getExtractor();
      const out = await pipe(text, EXTRACT_OPTIONS);
      return tensorToList(out as FeatureExtractionOutput);
    },

    async embedBatch(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return [];
      const pipe = await getExtractor();
      const out = await pipe(texts, EXTRACT_OPTIONS);
      return tensorBatchToList(out as FeatureExtractionOutput);
    },
  };
}

/** Get float array from pipeline output (single text → [1, dim] or [dim]). */
function tensorToList(tensor: FeatureExtractionOutput): number[] {
  if (Array.isArray(tensor)) return tensor.flat() as number[];
  if (tensor.data) {
    return Array.from(tensor.data);
  }
  if (typeof tensor.tolist === "function") {
    const list = tensor.tolist() as unknown[];
    const first = list[0];
    if (Array.isArray(first)) return first as number[];
    return list as number[];
  }
  throw new Error("Unexpected embedding output shape");
}

/** Get list of vectors from batch output (multiple texts → [n, dim]). */
function tensorBatchToList(tensor: FeatureExtractionOutput): number[][] {
  if (typeof tensor.tolist === "function") {
    const list = tensor.tolist() as unknown[];
    return list.map((row) => (Array.isArray(row) ? (row as number[]) : [row as number]));
  }
  if (tensor.data && tensor.dims && tensor.dims.length >= 2) {
    const [rows, dim] = tensor.dims;
    const out: number[][] = [];
    for (let i = 0; i < rows; i++) {
      out.push(Array.from(tensor.data!.slice(i * dim, (i + 1) * dim)));
    }
    return out;
  }
  return [tensorToList(tensor)];
}
