import path from "node:path";
import fs from "node:fs";

/** Document types supported by the MCP */
export const DOC_TYPES = [
  "feature-specs",
  "jtbd",
  "user-stories",
  "api",
] as const;

export type DocType = (typeof DOC_TYPES)[number];

const DEFAULT_DOCS_DIR = "docs";

/** Filename for the product vision and strategy document (under docs/). */
export const PRODUCT_VISION_STRATEGY_FILENAME = "product-vision-and-strategy.md";

/**
 * Returns the absolute path to the product vision and strategy document.
 * Parent directory (docs/) is created if it doesn't exist.
 */
export function getProductVisionStrategyPath(projectRoot: string): string {
  const dir = path.join(projectRoot, DEFAULT_DOCS_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, PRODUCT_VISION_STRATEGY_FILENAME);
}

/**
 * Resolves the project root. Uses DOCS_PROJECT_ROOT env var if set;
 * otherwise uses process.cwd().
 */
export function getProjectRoot(): string {
  const root = process.env.DOCS_PROJECT_ROOT || process.cwd();
  const resolved = path.resolve(root);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Project root does not exist: ${resolved}`);
  }
  return resolved;
}

/**
 * Returns the absolute path to the folder for a given doc type.
 * Creates the folder if it doesn't exist.
 */
export function getDocTypeDir(projectRoot: string, docType: DocType): string {
  const dir = path.join(projectRoot, DEFAULT_DOCS_DIR, docType);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Resolves the full path for a document file.
 * Ensures the filename ends with .md and is within the doc type folder.
 */
export function getDocPath(
  projectRoot: string,
  docType: DocType,
  slug: string
): string {
  const base = slug.replace(/\.md$/i, "") || "untitled";
  const filename = base.endsWith(".md") ? base : `${base}.md`;
  const dir = getDocTypeDir(projectRoot, docType);
  const fullPath = path.join(dir, filename);
  const relative = path.relative(dir, fullPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid document path: path traversal not allowed");
  }
  return fullPath;
}

/**
 * Lists all .md files in a doc type folder (or all doc types if docType is omitted).
 */
export function listDocFiles(
  projectRoot: string,
  docType?: DocType
): { docType: DocType; slug: string; path: string }[] {
  const types: DocType[] = docType ? [docType] : [...DOC_TYPES];
  const results: { docType: DocType; slug: string; path: string }[] = [];

  for (const type of types) {
    const dir = path.join(projectRoot, DEFAULT_DOCS_DIR, type);
    if (!fs.existsSync(dir)) continue;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isFile() && ent.name.toLowerCase().endsWith(".md")) {
        results.push({
          docType: type,
          slug: ent.name,
          path: path.join(dir, ent.name),
        });
      }
    }
  }

  return results;
}

export function isValidDocType(value: string): value is DocType {
  return DOC_TYPES.includes(value as DocType);
}
