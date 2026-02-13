# Document Manager MCP

An MCP (Model Context Protocol) server for managing product documentation as markdown files. Use it from Cursor, Claude Desktop, or any MCP client to create, read, update, delete, and search documentation.

## Document types

All files are stored as **markdown** under a configurable project root, in these categories:

| Type            | Folder                | Use for                |
| --------------- | --------------------- | ---------------------- |
| `feature-specs` | `docs/feature-specs/` | Feature specifications |
| `jtbd`          | `docs/jtbd/`          | Jobs to be done        |
| `user-stories`  | `docs/user-stories/`  | User stories           |
| `api`           | `docs/api/`           | API documentation      |

A special file **`docs/product-vision-and-strategy.md`** holds the product vision and strategy. Use the **`product_vision_and_strategy`** tool to view it and create it (with a default template) if it doesn’t exist.

## Project identity (multiple MCPs)

When you run **several** Document Manager MCPs (e.g. one per project), set a **project name** so you can tell them apart in Cursor:

- **Environment variable:** `DOCS_PROJECT_NAME` — short label for this project (e.g. `my-app`, `backend-api`).
- The server then appears in Cursor as **"document-manager (my-app)"** instead of just "document-manager".

Example with two projects:

```json
{
  "mcpServers": {
    "document-manager-my-app": {
      "command": "npx",
      "args": ["document-manager-mcp"],
      "env": {
        "DOCS_PROJECT_ROOT": "/path/to/my-app",
        "DOCS_PROJECT_NAME": "my-app"
      }
    },
    "document-manager-backend": {
      "command": "npx",
      "args": ["document-manager-mcp"],
      "env": {
        "DOCS_PROJECT_ROOT": "/path/to/backend",
        "DOCS_PROJECT_NAME": "backend-api"
      }
    }
  }
}
```

You’ll see two MCPs: **document-manager (my-app)** and **document-manager (backend-api)**.

## Project root

Set the **project root** so the MCP knows where to read/write files:

- **Environment variable:** `DOCS_PROJECT_ROOT` (absolute or relative path).
- If unset, the server uses the current working directory when the server starts.

Example: if `DOCS_PROJECT_ROOT=/Users/you/my-product`, then:

- Feature specs go in `/Users/you/my-product/docs/feature-specs/`
- API docs go in `/Users/you/my-product/docs/api/`, etc.

## MCP tools

| Tool                          | Description                                                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_docs`                   | List all docs, optionally filtered by type.                                                                                                           |
| `read_doc`                    | Read a doc by `docType` and `slug` (filename).                                                                                                        |
| `write_doc`                   | Create or overwrite a doc (markdown content).                                                                                                         |
| `create_doc`                  | Create a new doc; fails if it already exists.                                                                                                         |
| `delete_doc`                  | Delete a doc by type and slug.                                                                                                                        |
| `search_docs`                 | Search by text. With `DOCS_EMBEDDING_PROVIDER=local`, uses semantic search (by meaning); otherwise keyword search. Optional type filter, mode, limit. |
| `product_vision_and_strategy` | View the product vision and strategy doc; creates `docs/product-vision-and-strategy.md` with a default template if it doesn’t exist.                  |

## MCP resources

Docs are exposed as **resources** with URIs:

- **Pattern:** `doc://{docType}/{slug}`
- **Examples:** `doc://feature-specs/auth-spec.md`, `doc://api/users-endpoint.md`
- **Product vision and strategy:** `doc://product-vision-and-strategy` (single resource; create the file with the `product_vision_and_strategy` tool if needed).

Clients can list and read these resources like files (e.g. in Cursor’s MCP resource UI).

## Run with npx (recommended)

No install needed. Use **npx** so the package is run on demand:

```bash
npx document-manager-mcp
```

With environment variables:

```bash
DOCS_PROJECT_ROOT=/path/to/your/project DOCS_PROJECT_NAME=my-project npx document-manager-mcp
```

In Cursor (or another MCP client), configure the server to run via npx:

```json
{
  "mcpServers": {
    "document-manager": {
      "command": "npx",
      "args": ["document-manager-mcp"],
      "env": {
        "DOCS_PROJECT_ROOT": "/ABSOLUTE/PATH/TO/YOUR/PROJECT",
        "DOCS_PROJECT_NAME": "your-project"
      }
    }
  }
}
```

Replace `/ABSOLUTE/PATH/TO/YOUR/PROJECT` with the folder that should contain the `docs/` tree. `DOCS_PROJECT_NAME` is optional; use it when you run multiple Document Manager MCPs so you can tell them apart.

### Semantic search (local embeddings)

To search by **meaning** (e.g. “login” matching “authentication”, “sign-in”) instead of exact text only, use a local embedding model. No API key required.

Set in your MCP server `env`:

- **`DOCS_EMBEDDING_PROVIDER=local`** — enables semantic search using [Transformers.js](https://huggingface.co/docs/transformers.js) and the default model `Xenova/all-MiniLM-L6-v2` (downloaded on first use, then cached).
- **`DOCS_EMBEDDING_MODEL`** (optional) — another Hugging Face model ID for feature extraction (e.g. `Xenova/all-mpnet-base-v2` for higher quality, larger download).

Example:

```json
{
  "mcpServers": {
    "document-manager": {
      "command": "npx",
      "args": ["document-manager-mcp"],
      "env": {
        "DOCS_PROJECT_ROOT": "/path/to/your/project",
        "DOCS_PROJECT_NAME": "my-project",
        "DOCS_EMBEDDING_PROVIDER": "local"
      }
    }
  }
}
```

The first semantic search will build an index under `.document-manager/embedding-index.json`; later searches reuse it until docs change. You can pass `mode: "keyword"` to `search_docs` to force exact-text search, or `mode: "semantic"` when local embeddings are enabled.

## Cursor setup

1. **Configure Cursor**  
   In Cursor: **Settings → MCP** (or edit your MCP config file). Add a server entry using **npx** and set the project root via `env`:

   ```json
   {
     "mcpServers": {
       "document-manager": {
         "command": "npx",
         "args": ["document-manager-mcp"],
         "env": {
           "DOCS_PROJECT_ROOT": "/ABSOLUTE/PATH/TO/YOUR/PROJECT",
           "DOCS_PROJECT_NAME": "your-project"
         }
       }
     }
   }
   ```

   Replace `/ABSOLUTE/PATH/TO/YOUR/PROJECT` with the folder that should contain the `docs/` tree (feature-specs, jtbd, user-stories, api). Use `DOCS_PROJECT_NAME` as a short label when you have multiple Document Manager MCPs (optional).

2. **Restart Cursor** (or reload MCP) so it picks up the server.

### Running from source

If you develop or fork this repo and want to run the built server without npx:

```bash
git clone https://github.com/rfbatista/document-manager-mcp.git
cd document-manager-mcp
npm install
npm run build
```

Then in your MCP config use `"command": "node"` and `"args": ["/ABSOLUTE/PATH/TO/document-manager-mcp/build/index.js"]`.

## Claude Desktop setup

Add the server to `claude_desktop_config.json` and run it with npx:

```json
{
  "mcpServers": {
    "document-manager": {
      "command": "npx",
      "args": ["document-manager-mcp"],
      "env": {
        "DOCS_PROJECT_ROOT": "/ABSOLUTE/PATH/TO/YOUR/PROJECT",
        "DOCS_PROJECT_NAME": "your-project"
      }
    }
  }
}
```

## Development

```bash
npm install
npm run build   # build once
npm run start   # run built server (stdio)
```

Use **stderr** for logs; stdout is used for MCP JSON-RPC.

## License

MIT

# document-manager-mcp
