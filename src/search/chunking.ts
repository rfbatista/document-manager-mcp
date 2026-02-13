/**
 * Split markdown content into overlapping chunks for embedding.
 * Fixed size + overlap so long docs are searchable by section and context is preserved.
 */
const DEFAULT_CHUNK_SIZE = 600;
const DEFAULT_OVERLAP = 100;

export interface Chunk {
  text: string;
  start: number;
  end: number;
}

export function chunkText(
  content: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_OVERLAP
): Chunk[] {
  if (!content.trim()) return [];
  const chunks: Chunk[] = [];
  let start = 0;
  while (start < content.length) {
    let end = Math.min(start + chunkSize, content.length);
    // Prefer breaking at paragraph or line boundary
    if (end < content.length) {
      const slice = content.slice(Math.max(0, end - 80), end + 20);
      const lineBreak = slice.lastIndexOf("\n\n");
      const singleBreak = slice.lastIndexOf("\n");
      if (lineBreak >= 0) end = Math.max(start + 1, end - 80 + lineBreak);
      else if (singleBreak >= 0) end = Math.max(start + 1, end - 80 + singleBreak);
    }
    const text = content.slice(start, end).trim();
    if (text) chunks.push({ text, start, end });
    start = Math.max(start + 1, end - (end - start >= chunkSize ? overlap : 0));
    if (start >= content.length) break;
  }
  return chunks;
}
