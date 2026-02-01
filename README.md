# Document Manager MCP

An MCP (Model Context Protocol) server for managing product documentation as markdown files. Use it from Cursor, Claude Desktop, or any MCP client to create, read, update, delete, and search documentation.

## Document types

All files are stored as **markdown** under a configurable project root, in these categories:

| Type            | Folder          | Use for                          |
|-----------------|-----------------|----------------------------------|
| `feature-specs` | `docs/feature-specs/` | Feature specifications          |
| `jtbd`          | `docs/jtbd/`    | Jobs to be done                  |
| `user-stories`  | `docs/user-stories/` | User stories                 |
| `api`           | `docs/api/`     | API documentation                |

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
      "command": "node",
      "args": ["/path/to/document-manager-mcp/build/index.js"],
      "env": {
        "DOCS_PROJECT_ROOT": "/path/to/my-app",
        "DOCS_PROJECT_NAME": "my-app"
      }
    },
    "document-manager-backend": {
      "command": "node",
      "args": ["/path/to/document-manager-mcp/build/index.js"],
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

| Tool                         | Description |
|------------------------------|-------------|
| `list_docs`                  | List all docs, optionally filtered by type. |
| `read_doc`                   | Read a doc by `docType` and `slug` (filename). |
| `write_doc`                  | Create or overwrite a doc (markdown content). |
| `create_doc`                 | Create a new doc; fails if it already exists. |
| `delete_doc`                 | Delete a doc by type and slug. |
| `search_docs`               | Search doc content by text; optional type filter. |
| `product_vision_and_strategy` | View the product vision and strategy doc; creates `docs/product-vision-and-strategy.md` with a default template if it doesn’t exist. |

## MCP resources

Docs are exposed as **resources** with URIs:

- **Pattern:** `doc://{docType}/{slug}`
- **Examples:** `doc://feature-specs/auth-spec.md`, `doc://api/users-endpoint.md`
- **Product vision and strategy:** `doc://product-vision-and-strategy` (single resource; create the file with the `product_vision_and_strategy` tool if needed).

Clients can list and read these resources like files (e.g. in Cursor’s MCP resource UI).

## Install from npm

```bash
npm install document-manager-mcp
```

Then in Cursor (or another MCP client), point to the installed binary. Two options:

**Option A – from a project that has it as a dependency**

```json
{
  "mcpServers": {
    "document-manager": {
      "command": "node",
      "args": ["./node_modules/document-manager-mcp/build/index.js"],
      "env": {
        "DOCS_PROJECT_ROOT": "/ABSOLUTE/PATH/TO/YOUR/PROJECT",
        "DOCS_PROJECT_NAME": "your-project"
      }
    }
  }
}
```

**Option B – global install and run by name**

```bash
npm install -g document-manager-mcp
```

```json
{
  "mcpServers": {
    "document-manager": {
      "command": "document-manager-mcp",
      "env": {
        "DOCS_PROJECT_ROOT": "/ABSOLUTE/PATH/TO/YOUR/PROJECT",
        "DOCS_PROJECT_NAME": "your-project"
      }
    }
  }
}
```

## Cursor setup (from source)

1. **Build the server**
   ```bash
   git clone https://github.com/YOUR_USERNAME/document-manager-mcp.git
   cd document-manager-mcp
   npm install
   npm run build
   ```

2. **Configure Cursor**  
   In Cursor: **Settings → MCP** (or edit your MCP config file). Add a server entry and set the project root via `env`:

   ```json
   {
     "mcpServers": {
       "document-manager": {
         "command": "node",
         "args": ["/ABSOLUTE/PATH/TO/document-manager-mcp/build/index.js"],
         "env": {
           "DOCS_PROJECT_ROOT": "/ABSOLUTE/PATH/TO/YOUR/PROJECT",
           "DOCS_PROJECT_NAME": "your-project"
         }
       }
     }
   }
   ```

   Replace:
- `/ABSOLUTE/PATH/TO/document-manager-mcp` with the path to this repo.
- `/ABSOLUTE/PATH/TO/YOUR/PROJECT` with the folder that should contain the `docs/` tree (feature-specs, jtbd, user-stories, api).
- `your-project` with a short label so this instance is recognizable when you have multiple Document Manager MCPs (optional; omit to use the default name "document-manager").

3. **Restart Cursor** (or reload MCP) so it picks up the server.

## Claude Desktop setup

Same idea: add the server to `claude_desktop_config.json` and set `DOCS_PROJECT_ROOT` in `env`:

```json
{
  "mcpServers": {
    "document-manager": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/document-manager-mcp/build/index.js"],
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

## Publishing to npm

To publish this package so others can install it with `npm install document-manager-mcp`:

1. **Create an npm account** (if needed): [npmjs.com/signup](https://www.npmjs.com/signup).

2. **Log in from the terminal**
   ```bash
   npm login
   ```
   Enter your npm username, password, and email.

3. **Check the package name**
   - The name `document-manager-mcp` might already be taken. Check: [npmjs.com/package/document-manager-mcp](https://www.npmjs.com/package/document-manager-mcp).
   - If taken, use a scoped name in `package.json`, e.g. `"name": "@your-username/document-manager-mcp"`. Scoped packages are public by default when you run `npm publish --access public`.

4. **Set repository URLs**  
   In `package.json`, replace `YOUR_USERNAME` in `repository`, `bugs`, and `homepage` with your GitHub (or other) username.

5. **Publish**
   ```bash
   npm run build    # optional; prepublishOnly runs it automatically
   npm publish
   ```
   For a scoped package: `npm publish --access public`.

6. **Bump and republish**  
   For later releases, bump the version (e.g. `npm version patch`) then run `npm publish` again.

## License

MIT
# document-manager-mcp
