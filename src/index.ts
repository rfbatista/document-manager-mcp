import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import {
  getProjectRoot,
  getDocPath,
  listDocFiles,
  getProductVisionStrategyPath,
  DOC_TYPES,
  isValidDocType,
  type DocType,
} from "./paths.js";

const DEFAULT_VISION_STRATEGY_TEMPLATE = `# Product Vision and Strategy

## Vision
<!-- Describe the product vision: what problem we solve, for whom, and the desired long-term impact -->

## Strategy
<!-- Describe the product strategy: how we get there, key initiatives, and success criteria -->
`;

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

/** Server name shown in MCP clients; use DOCS_PROJECT_NAME to distinguish multiple instances. */
function getServerName(): string {
  const project = process.env.DOCS_PROJECT_NAME?.trim();
  return project ? `document-manager (${project})` : "document-manager";
}

const server = new McpServer(
  {
    name: getServerName(),
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// --- Tools ---

server.registerTool(
  "list_docs",
  {
    description:
      "List documentation files. Optionally filter by doc type (feature-specs, jtbd, user-stories, api).",
    inputSchema: {
      docType: z
        .enum(["feature-specs", "jtbd", "user-stories", "api"])
        .optional()
        .describe("Filter by document type. Omit to list all types."),
    },
  },
  async ({ docType }) => {
    try {
      const root = getProjectRoot();
      const items = listDocFiles(root, docType as DocType | undefined);
      if (items.length === 0) {
        return textResult(
          docType
            ? `No markdown files found in ${docType}.`
            : "No markdown documentation files found. Create some with create_doc."
        );
      }
      const lines = items.map(
        (i) => `- **${i.docType}** / ${i.slug}`
      );
      return textResult(`Documentation files (${items.length}):\n\n${lines.join("\n")}`);
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }
  }
);

server.registerTool(
  "read_doc",
  {
    description: "Read the content of a documentation file by type and slug (filename without path).",
    inputSchema: {
      docType: z
        .enum(["feature-specs", "jtbd", "user-stories", "api"])
        .describe("Document type"),
      slug: z.string().describe("Filename or slug (e.g. my-feature.md or my-feature)"),
    },
  },
  async ({ docType, slug }) => {
    try {
      const root = getProjectRoot();
      const filePath = getDocPath(root, docType as DocType, slug);
      if (!fs.existsSync(filePath)) {
        return errorResult(`File not found: ${docType}/${slug}`);
      }
      const content = fs.readFileSync(filePath, "utf-8");
      return textResult(content);
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }
  }
);

server.registerTool(
  "write_doc",
  {
    description:
      "Write or overwrite a documentation file. Content must be markdown. Creates parent folder if needed.",
    inputSchema: {
      docType: z
        .enum(["feature-specs", "jtbd", "user-stories", "api"])
        .describe("Document type"),
      slug: z.string().describe("Filename or slug (e.g. my-feature.md)"),
      content: z.string().describe("Markdown content to write"),
    },
  },
  async ({ docType, slug, content }) => {
    try {
      const root = getProjectRoot();
      const filePath = getDocPath(root, docType as DocType, slug);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, "utf-8");
      return textResult(`Wrote ${docType}/${path.basename(filePath)}`);
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }
  }
);

server.registerTool(
  "create_doc",
  {
    description:
      "Create a new documentation file with optional initial content. Use docType to choose category.",
    inputSchema: {
      docType: z
        .enum(["feature-specs", "jtbd", "user-stories", "api"])
        .describe("Document type"),
      slug: z.string().describe("Filename or slug (e.g. my-feature.md)"),
      content: z.string().optional().describe("Initial markdown content (optional)"),
    },
  },
  async ({ docType, slug, content }) => {
    try {
      const root = getProjectRoot();
      const filePath = getDocPath(root, docType as DocType, slug);
      if (fs.existsSync(filePath)) {
        return errorResult(`File already exists: ${docType}/${slug}. Use write_doc to overwrite.`);
      }
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content ?? "", "utf-8");
      return textResult(`Created ${docType}/${path.basename(filePath)}`);
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }
  }
);

server.registerTool(
  "delete_doc",
  {
    description: "Delete a documentation file by type and slug.",
    inputSchema: {
      docType: z
        .enum(["feature-specs", "jtbd", "user-stories", "api"])
        .describe("Document type"),
      slug: z.string().describe("Filename or slug to delete"),
    },
  },
  async ({ docType, slug }) => {
    try {
      const root = getProjectRoot();
      const filePath = getDocPath(root, docType as DocType, slug);
      if (!fs.existsSync(filePath)) {
        return errorResult(`File not found: ${docType}/${slug}`);
      }
      fs.unlinkSync(filePath);
      return textResult(`Deleted ${docType}/${slug}`);
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }
  }
);

server.registerTool(
  "search_docs",
  {
    description:
      "Search documentation by text (case-insensitive). Optionally limit to a doc type.",
    inputSchema: {
      query: z.string().min(1).describe("Text to search for in document content"),
      docType: z
        .enum(["feature-specs", "jtbd", "user-stories", "api"])
        .optional()
        .describe("Limit search to this doc type"),
    },
  },
  async ({ query, docType }) => {
    try {
      const root = getProjectRoot();
      const items = listDocFiles(root, docType as DocType | undefined);
      const lowerQuery = query.toLowerCase();
      const matches: { docType: DocType; slug: string; snippet: string }[] = [];

      for (const item of items) {
        const content = fs.readFileSync(item.path, "utf-8");
        const lower = content.toLowerCase();
        const idx = lower.indexOf(lowerQuery);
        if (idx === -1) continue;
        const start = Math.max(0, idx - 40);
        const end = Math.min(content.length, idx + query.length + 40);
        const snippet = (start > 0 ? "…" : "") + content.slice(start, end) + (end < content.length ? "…" : "");
        matches.push({ docType: item.docType, slug: item.slug, snippet });
      }

      if (matches.length === 0) {
        return textResult(`No documents containing "${query}" found.`);
      }
      const lines = matches.map(
        (m) => `- **${m.docType}** / ${m.slug}\n  ${m.snippet.trim()}`
      );
      return textResult(`Found ${matches.length} match(es):\n\n${lines.join("\n\n")}`);
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }
  }
);

server.registerTool(
  "product_vision_and_strategy",
  {
    description:
      "View the product vision and strategy document. Creates the file with a default template (docs/product-vision-and-strategy.md) if it does not exist.",
    inputSchema: {},
  },
  async () => {
    try {
      const root = getProjectRoot();
      const filePath = getProductVisionStrategyPath(root);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, DEFAULT_VISION_STRATEGY_TEMPLATE, "utf-8");
        return textResult(
          `Created docs/product-vision-and-strategy.md. Content:\n\n${DEFAULT_VISION_STRATEGY_TEMPLATE}`
        );
      }
      const content = fs.readFileSync(filePath, "utf-8");
      return textResult(content);
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }
  }
);

// --- Resources: doc://{docType}/{slug} ---

server.registerResource(
  "doc",
  new ResourceTemplate("doc://{docType}/{slug}", {
    list: async () => {
      const root = getProjectRoot();
      const items = listDocFiles(root);
      return {
        resources: items.map((item) => ({
          uri: `doc://${item.docType}/${encodeURIComponent(item.slug)}`,
          name: `${item.docType}/${item.slug}`,
          mimeType: "text/markdown",
        })),
      };
    },
  }),
  { mimeType: "text/markdown" },
  async (uri, variables) => {
    const docType = typeof variables.docType === "string" ? variables.docType : variables.docType?.[0];
    const slug = typeof variables.slug === "string" ? variables.slug : variables.slug?.[0];
    if (!docType || !slug) {
      return { contents: [{ uri: uri.href, mimeType: "text/plain", text: "Invalid doc URI: need docType and slug" }] };
    }
    if (!isValidDocType(docType)) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/plain",
            text: `Invalid doc type: ${docType}. Use one of: ${DOC_TYPES.join(", ")}`,
          },
        ],
      };
    }
    try {
      const root = getProjectRoot();
      const filePath = getDocPath(root, docType as DocType, slug);
      if (!fs.existsSync(filePath)) {
        return {
          contents: [{ uri: uri.href, mimeType: "text/plain", text: `Not found: ${docType}/${slug}` }],
        };
      }
      const content = fs.readFileSync(filePath, "utf-8");
      return {
        contents: [{ uri: uri.href, mimeType: "text/markdown", text: content }],
      };
    } catch (err) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/plain",
            text: err instanceof Error ? err.message : String(err),
          },
        ],
      };
    }
  }
);

server.registerResource(
  "product-vision-and-strategy",
  "doc://product-vision-and-strategy",
  { mimeType: "text/markdown" },
  async (uri: URL) => {
    try {
      const root = getProjectRoot();
      const filePath = getProductVisionStrategyPath(root);
      if (!fs.existsSync(filePath)) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: "File not created yet. Use the product_vision_and_strategy tool to create it.",
            },
          ],
        };
      }
      const content = fs.readFileSync(filePath, "utf-8");
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: content }] };
    } catch (err) {
      return {
        contents: [
          { uri: uri.href, mimeType: "text/plain", text: err instanceof Error ? err.message : String(err) },
        ],
      };
    }
  }
);

// --- Run ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Document Manager MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
