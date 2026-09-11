# notion_kau-agent

> 🇰🇷 **한국어 문서: [README.ko.md](README.ko.md)**
>
> Repository: https://github.com/4lph4-dvlp/notion_kau-agent

An agent-driven design system for running an Instagram account. AI agents (Claude Code,
Codex, Antigravity) build and maintain reusable design assets in Figma, then assemble
consistent carousel/post/story cards from those assets.

Built for a **Notion Campus Leader** account, so the visual language follows Notion's
brand: warm neutrals, a single sans typeface, generous whitespace, no decoration.

---

## Table of contents

1. [What this is](#1-what-this-is)
2. [How it works](#2-how-it-works)
3. [Prerequisites](#3-prerequisites)
4. [Setup](#4-setup)
5. [Running the bridge](#5-running-the-bridge)
6. [Commands and tools](#6-commands-and-tools)
7. [The design system](#7-the-design-system)
8. [Making a post, end to end](#8-making-a-post-end-to-end)
9. [Constraints and gotchas](#9-constraints-and-gotchas)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. What this is

Two things, in one Figma file:

```
Figma file "Notion CL"
├─ page 01_Assets      the design system — master components, variables, styles
└─ page 02_Workspace   actual posts — instances of those components
```

**Assets = source, Workspace = assembly.** That direction never reverses. Agents build
components once on `01_Assets`, then every post is just instances with text filled in.
That is what keeps a hundred posts looking like one account.

The repo holds the *specification* (tokens, component specs, brand rules, agent
instructions) and the *tooling* (a Figma bridge, an export script). The Figma file holds
the actual pixels.

### Why a custom Figma bridge

Figma ships an official MCP server, and it works — but on the **Starter (free) plan it
allows 20 tool calls per month**, which is not enough to build anything, let alone run a
weekly posting workflow. The official server is also not available to every client
(Antigravity is read-only/local-only in Figma's catalog).

So this project includes its own bridge: a small MCP server that talks to a local Figma
plugin over HTTP. **No call limit, works in every MCP client, zero npm dependencies.**

Off-the-shelf alternatives (`figma-edit-mcp`, `talk-to-figma-mcp`) expose dozens of
narrow tools — `create_frame`, `set_fill_color`, and so on. They cannot do
`combineAsVariants`, variable binding, exposed instances, or alpha masks, all of which
this design system needs. This bridge exposes **one tool that runs arbitrary Figma
Plugin API JavaScript**, so anything the Plugin API can do, an agent can do.

---

## 2. How it works

```
┌────────────────┐   stdio (MCP)    ┌──────────────┐   HTTP long-poll   ┌───────────────┐
│  Claude Code   │ ───────────────► │              │ ◄───────────────── │ Figma plugin  │
│  Codex         │                  │  server.mjs  │                    │ "Agent Bridge"│
│  Antigravity   │ ◄─────────────── │  :3055       │ ──────────────────►│  (desktop)    │
└────────────────┘   result + PNG   └──────────────┘   code to execute  └───────┬───────┘
                                                                                │
                                                                       Figma Plugin API
                                                                                │
                                                                                ▼
                                                                        the Figma file
```

1. An agent calls the `figma_run` MCP tool with a snippet of JavaScript.
2. `server.mjs` queues the job and hands it to whichever Figma plugin instance is polling.
3. The plugin's UI iframe relays it into the plugin sandbox, which `eval`s it with the
   `figma` global in scope.
4. The return value (and any screenshots) travels back the same way.

**Multiple agents can run at once.** Whichever process binds port 3055 first becomes the
*host*; the others detect the port is taken and become *clients* that proxy through the
host. If the host exits, a client promotes itself.

Reads that do not need the plugin — listing the file structure, exporting PNGs — go
through the Figma **REST API** instead, which has its own separate (and generous) limits.

### Where the content comes from

The bridge handles **pixels**. The **sentences** are decided upstream of it.

```
Notion «콘텐츠 기획» DB       planning · research · image plan   /content-plan
        │                     (humans and agents edit it together)
        ▼
content/posts/<slug>.md       approved copy snapshot (in git)    /instagram-post step 1
        │
        ▼
Figma 02_Workspace            assembled cards                    /instagram-post step 2
        │
        ▼
exports/<slug>/*.png          PNGs ready to upload               /instagram-post step 4
        │
        ▼
Notion «6. 디자인 결과»        node IDs · file list written back   /instagram-post step 5
```

Planning lives in Notion because that is **where a human can step in.** Adding research,
reordering cards, and tightening sentences is far easier on a Notion page than in a markdown
file. The repo keeps only the **approved copy** as a snapshot, which is what enters git history.

Spec: [`design/content-plan.md`](design/content-plan.md).

---

## 3. Prerequisites

| Requirement | Why | Notes |
|---|---|---|
| **Node.js 18+** | runs the bridge and the export script | no `npm install` needed — zero dependencies |
| **Figma desktop app** | the plugin only runs there | the browser version cannot run local dev plugins |
| **A Figma workspace** | assets and posts both live there | get invited to the shared file (A) or make your own (B) — [4.2](#42-choose-your-figma-workspace) |
| At least one MCP client | Claude Code, Codex, or Antigravity | all three can be registered simultaneously |
| **Notion account + internal integration** | Content planning documents | free. **Can differ from your Claude/OpenAI account** — see [4.3](#43-register-the-mcp-server) |

Korean text is set in **Noto Sans KR** alone — bundled with Figma, nothing to install.
(See [7.2](#72-design-tokens) for the optional Pretendard upgrade.)

---

## 4. Setup

### 4.1 Get the project

Place the repo anywhere. Every command below is run from the project root.
The absolute path is needed when registering the MCP server, so note it:

```
<PROJECT>/
```

> Everywhere `<PROJECT>` appears below, substitute **the path you cloned into**.
> Print the absolute path from the project root:
>
> ```bash
> pwd          # macOS · Linux · Git Bash
> ```
> ```powershell
> $PWD.Path    # Windows PowerShell
> ```

### 4.2 Choose your Figma workspace

There are two ways to use this project. **Pick one now** — the choice carries through to
4.5 (`.env`) and to what you do first.

| | **A. Join a shared workspace** | **B. Set up your own** |
|---|---|---|
| When | joining a team file already in use | starting fresh in your own account |
| Figma file | you get invited to the owner's | you create it |
| `design/figma-file.json` | **leave it alone** | replace with your file's values |
| `FIGMA_FILE_KEY` in `.env` | leave as is | your own file key |
| `01_Assets` | already built | you build it with `figma-assets` |
| First task | go straight to making a post | build assets → then make a post |

Either way the structure is the same: **one file, two pages.**

```
01_Assets      ← the design system (master components · variables · styles)
02_Workspace   ← the actual posts
```

> **Do not split these into two files.** On the free plan you cannot publish a team
> library, so components can only be shared inside a single file. One file, two pages.

#### A. Join a shared workspace

1. Ask the file owner to invite you with **can edit** access.
   On their side the file must live **inside a project**, not in Drafts, for invites to be
   possible ([section 9](#9-constraints-and-gotchas)).
2. Accept the invite and open the file in the **Figma desktop app** (plugins only run there).
3. Leave `design/figma-file.json` **untouched.** The file key, page IDs and component keys
   are already there; changing them points you at a **different file** than everyone else.

   ```jsonc
   {
     "fileKey": "l4iUTnc5fRX9vPDLSY8eDI",
     "fileName": "Notion CL",
     "pages": {
       "assets":    { "name": "01_Assets",    "id": "23:15" },
       "workspace": { "name": "02_Workspace", "id": "0:1" }
     }
   }
   ```
4. `01_Assets` is already built — **do not rebuild it.** Finish 4.3–4.5 and go straight to
   [making a post](#8-making-a-post-end-to-end).

> Since several people share the file, rule 7 in `AGENTS.md` applies: never touch sections
> you did not create.

#### B. Set up your own workspace

1. Create **one** Figma design file with **two pages** named exactly `01_Assets` and
   `02_Workspace`.
   If you plan to invite others later, create it **inside a project**, not in Drafts.
2. Take the key out of the file URL:

   ```
   https://www.figma.com/design/<FILE_KEY>/<file-name>
                                ^^^^^^^^^^
   ```
3. Point `design/figma-file.json` at your file: fill in `fileKey`, `fileName` and `fileUrl`,
   and **empty out** the `pages` ids, `components`, `variableCollections` and `styles` —
   the agent fills those in as it builds.
4. Your `01_Assets` is empty, so **build the assets first.** Finish 4.3–4.5, run the
   `figma-assets` skill ([6.3](#63-skills-all-three-agents)), then move on to posts.

> `design/figma-file.json` is a committed file, so path B leaves a permanent local diff in
> it. If you are running your own workspace long-term, **fork** the repo and commit there.

### 4.3 Register the MCP server

Do this once per agent. Use the **absolute path** to `bridge/server.mjs`.

#### Claude Code

```bash
claude mcp add --scope user figma-bridge -- node "<PROJECT>/bridge/server.mjs"
```

Verify with `claude mcp list`. Restart the session so the tools load.

#### Codex

```bash
codex mcp add figma-bridge -- node "<PROJECT>/bridge/server.mjs"
```

Verify with `codex mcp list`. This writes to `~/.codex/config.toml`:

```toml
[mcp_servers.figma-bridge]
command = "node"
args = ['<PROJECT>/bridge/server.mjs']
```

#### Antigravity

No CLI — edit the config file directly. Write to **both** of these (whichever the
installed variant reads):

```
~/.gemini/antigravity/mcp_config.json
~/.gemini/config/mcp_config.json
```

```json
{
  "mcpServers": {
    "figma-bridge": {
      "command": "node",
      "args": ["<PROJECT>/bridge/server.mjs"]
    }
  }
}
```

> **Use forward slashes**, even on Windows. Node accepts them, and they avoid
> backslash-escaping bugs in JSON.

#### Notion (for planning)

Content planning is written to Notion. This project uses the **official local server**,
[`@notionhq/notion-mcp-server`](https://github.com/makenotion/notion-mcp-server). It
authenticates with an **internal integration token** instead of OAuth, which means:

- **Your Notion account can differ from your Claude/OpenAI account.** Only Notion credentials are used
- All three agents register it **the same way** (all stdio)
- No browser login

**1. Create an internal integration**

[notion.so/profile/integrations](https://www.notion.so/profile/integrations) → **New integration**
→ type **Internal**, pick the workspace where posts will live. **Read / Update / Insert content**
capabilities are enough; user information access is not needed.

Copy the secret (`ntn_...`) into `.env`:

```bash
NOTION_TOKEN=ntn_xxxxxxxxxxxxxxxxxxxxx
```

**2. Grant the integration access to a page — skip this and nothing is visible**

An internal integration only sees pages **explicitly shared with it**. Open the page you want the
plans to live under and pick **⋯ → Connections → your new integration**. Child pages inherit it.

Verify:

```bash
node scripts/notion-mcp.mjs --check
```

It should print the integration name and ID.

**3. Register it with each agent**

The token stays in `.env` only; all three clients run `scripts/notion-mcp.mjs`, which reads `.env`
and passes the token to the real server. No copying the secret into three config files.

```bash
# Claude Code
claude mcp add --scope user notion -- node "<PROJECT>/scripts/notion-mcp.mjs"

# Codex
codex mcp add notion -- node "<PROJECT>/scripts/notion-mcp.mjs"
```

For Antigravity, add it next to `figma-bridge` in the same two `mcp_config.json` files:

```json
{
  "mcpServers": {
    "figma-bridge": {
      "command": "node",
      "args": ["<PROJECT>/bridge/server.mjs"]
    },
    "notion": {
      "command": "node",
      "args": ["<PROJECT>/scripts/notion-mcp.mjs"]
    }
  }
}
```

The first run takes a few seconds while `npx` downloads the server package. The launcher **pins
`@2.5.1`** — `npx` will happily serve a stale cached build, and versions below 2.4 lack the tools
that read and write a page as Markdown. To move off the pin, set
`NOTION_MCP_PACKAGE=@notionhq/notion-mcp-server@<version>` in `.env`.

**4. Create the database**

On the first `/content-plan` run the agent asks which page to create the «콘텐츠 기획» database
under — the page you shared in step 2. The database ID is recorded in `content/notion.json`, the
Notion counterpart of `design/figma-file.json`.

> **Why not the hosted server (`mcp.notion.com`)?**
>
> Notion recommends the hosted server and its tools are better (`notion-search`, `notion-fetch`, …).
> But it is **OAuth-only and does not support token authentication.** That means a browser login in
> each of the three agents and no headless operation. For this project, one `.env` token that works
> identically everywhere is the better trade.
>
> The cost is that the local package is one Notion **explicitly describes as no longer actively
> maintained.** It works today and has every tool we need, but if it ever breaks, switch:
>
> ```bash
> claude mcp add --scope user --transport http notion https://mcp.notion.com/mcp
> codex   mcp add notion --url https://mcp.notion.com/mcp
> ```
>
> Antigravity: `{"notion": {"serverUrl": "https://mcp.notion.com/mcp"}}`.
> Each one needs its own browser OAuth pass. You log in with your **Notion** account there, so a
> different Claude account is still not a problem.
> (Do not use the "Notion" connector in Antigravity's MCP gallery — it ships the old package.
> Register it as a custom server, per Notion's own docs.)

### 4.4 Install the Figma plugin

This is the step you must do by hand, once.

1. Open the **Figma desktop app** (not the browser).
2. Open your design file.
3. Menu → `Plugins` → `Development` → **`Import plugin from manifest…`**
4. Select `<PROJECT>/bridge/plugin/manifest.json`
5. Run it: `Plugins` → `Development` → **`Agent Bridge`**

A small panel appears. **A green dot and "연결됨" (connected) means you are ready.**
A red dot means the bridge server is not running — see [section 5](#5-running-the-bridge).

> **Keep the plugin panel open while you work.** Closing it kills the connection.
> Figma unloads plugins when you switch files, so re-run it after switching.

### 4.5 Environment configuration (`.env`)

Copy `.env.example` to `.env` and fill in:

```bash
FIGMA_FILE_KEY=l4iUTnc5fRX9vPDLSY8eDI   # path A: leave as is / path B: your own file key
NOTION_TOKEN=ntn_xxxxxxxxxxxxxxxxxxxxx  # Notion secret from 4.3
```

> **A Figma personal access token is not needed.** PNG export and frame inspection
> are performed directly through the `Agent Bridge` plugin running in Figma Desktop.
> `FIGMA_FILE_KEY` must always match `fileKey` in `design/figma-file.json`: unchanged on path A,
> both replaced with your own on path B.
> `.env` is gitignored — never commit it.

Verify (with the plugin running):

```bash
node scripts/export-frames.mjs --list
```

You should see your pages and their top-level nodes.

---

## 5. Running the bridge

There are two ways, and they are interchangeable.

**Automatic** — an MCP client starts `server.mjs` itself when its session begins. If you
are using Claude Code, Codex, or Antigravity, nothing to do.

**Manual** — useful when you want the bridge up without an agent session, or to see its
logs:

```bash
node bridge/server.mjs
```

```
[bridge] host — http bridge on http://127.0.0.1:3055 and [::1]
[bridge] mcp stdio ready
```

**That silence afterwards is normal.** The server only logs on startup and on errors;
polling is quiet. The plugin's green dot is your proof the connection is live.

Check health any time:

```bash
curl http://localhost:3055/agent/health
# {"ok":true,"pluginConnected":true,"queued":0}
```

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `FIGMA_BRIDGE_PORT` | `3055` | change if the port collides |
| `FIGMA_BRIDGE_TIMEOUT` | `180000` | ms to wait for the plugin before failing |

> If you change the port you must also update `bridge/plugin/manifest.json`
> (`networkAccess.allowedDomains`) and `bridge/plugin/ui.html` (`BASE`), then re-import
> the plugin. Figma blocks any domain not in the manifest.

---

## 6. Commands and tools

### 6.1 MCP tools (inside an agent)

#### `figma_status`

Reports whether the plugin is connected. Call this before doing any Figma work.

```json
{ "pluginConnected": true, "queued": 0, "port": 3055, "role": "host" }
```

#### `figma_run`

Executes Figma Plugin API JavaScript. The code is wrapped in an async function, so
**top-level `await` and `return` both work**.

```js
// list pages
return figma.root.children.map(p => ({ id: p.id, name: p.name }));
```

Three globals are in scope:

| Global | What it does |
|---|---|
| `figma` | the full [Figma Plugin API](https://developers.figma.com/docs/plugins/api/api-reference/) |
| `snap(node, scale?)` | renders `node` to PNG and attaches it to the result; scale defaults to fit 1024px |
| `AL(direction, props?)` | creates an auto-layout frame (`figma.createFrame()` + `layoutMode` in one call) |

**Always `return` the IDs of nodes you create or modify.** Subsequent calls need them,
and it is the only record of what happened.

### 6.2 CLI — no agent required

#### `bridge/run.mjs` — run a script against Figma

```bash
node bridge/run.mjs task.js                       # from a file
node bridge/run.mjs -e 'return figma.root.name'   # inline
echo 'return 1 + 1' | node bridge/run.mjs         # stdin
```

Screenshots taken with `snap()` are written to `exports/_bridge/`. If the bridge or the
plugin is down, it tells you before running anything.

This is the most convenient way to do multi-step work: put the script in a file, run it,
read the output, edit, re-run.

#### `scripts/export-frames.mjs` — export PNGs (REST, no plugin needed)

```bash
# inspect the file: pages and top-level nodes with their IDs
node scripts/export-frames.mjs --list

# export a finished post (reads node IDs from content/posts/<slug>.md)
node scripts/export-frames.mjs --slug notion-db-tips

# export arbitrary nodes
node scripts/export-frames.mjs --ids 47:43,47:66 --out exports/tmp

# options
--scale 1        # default; frames are already 1080px wide
--format png     # png | jpg | svg
```

> Keep `--scale 1`. The frames are natively 1080px, which is exactly what Instagram
> wants. Exporting at 2x only gets re-compressed and looks worse.

### 6.3 Skills (all three agents)

| Skill | Purpose |
|---|---|
| `figma-assets` | build or modify the design system on `01_Assets` |
| `content-plan <topic>` | research a topic and write a plan into Notion. Never opens Figma |
| `instagram-post <slug>` | turn a Notion plan into finished cards on `02_Workspace` |

How you invoke them differs per agent.

| Agent | Skill location | How to call |
|---|---|---|
| Claude Code | `.claude/skills/` | `/figma-assets`, `/content-plan <topic>`, `/instagram-post <slug>` |
| Codex | `.codex/skills/` | ask by name — "use the figma-assets skill to …" |
| Antigravity | `.agents/skills/` | ask by name (discovered as a workspace skill) |

**The procedure lives in exactly one place: `.claude/skills/<name>/SKILL.md`.** The Codex and
Antigravity copies are **pointer skills** that tell the agent to read the canonical file. Edit the
canonical file once and all three agents pick up the change.

All three read the shared rules in `AGENTS.md` automatically (`CLAUDE.md` points Claude at it;
Codex and Antigravity load `AGENTS.md` directly).

---

## 7. The design system

### 7.1 File map

Read these in order when you are new. `AGENTS.md` is the one agents must follow.

| File | Role |
|---|---|
| **`AGENTS.md`** | **The rules all agents obey.** Hard constraints, workflow, naming. Start here. |
| `CLAUDE.md` | Claude Code entry point; points at `AGENTS.md` plus a quick reference table |
| `GEMINI.md` | Antigravity (Gemini/AGY) entry point; points at `AGENTS.md` plus quick reference table and tool guidelines |
| `design/brand.md` | **Why** the colors and typefaces are what they are. Notion's palette, the single-sans decision, and an explicit table of what is Notion-derived vs. not |
| `design/tokens.json` | **The source of truth for values.** Colors, type scale, spacing, radii, canvas sizes, safe areas. Figma variables are generated from this |
| `design/design-system.md` | Component-by-component spec for `01_Assets`: structure, properties, build order, review checklist |
| `design/formats.md` | Per-format rules: canvas sizes, safe areas, the center-square law, category accent colors, copy length limits, voice |
| `design/content-plan.md` | **Plan document spec.** Notion database schema, page body skeleton, and the parsing contract for which fields become Figma properties |
| `design/figma-file.json` | **Registry.** File key, page IDs, every component's node ID / key / properties. Agents read this before working and update it after |
| `design/rebuild-plan.md` | Record of the center-square + light/dark migration, with the color mapping table. Useful when rebuilding |
| `bridge/README.md` | Bridge internals, Plugin API gotchas, API differences vs. the official MCP |
| `content/notion.json` | **Registry.** Notion workspace and database IDs. The Notion counterpart of `figma-file.json` |
| `content/briefs/` | Optional. Hand-written notes before planning. Not authoritative — the Notion page is |
| `content/posts/` | **Approved copy snapshot** pulled down from Notion + the Figma node IDs of the generated frames |
| `content/images/<slug>/` | The actual image files that go into card image slots |
| `exports/` | Generated PNGs (gitignored) |
| `scripts/export-frames.mjs` | Agent Bridge-based PNG export (no token needed) |
| `scripts/notion-mcp.mjs` | Notion MCP launcher. Reads `NOTION_TOKEN` from `.env` and starts the official server. `--check` diagnoses the connection |
| `bridge/` | The MCP server, the Figma plugin, and the CLI runner |

### 7.2 Design tokens

Everything lives in `design/tokens.json` and is mirrored into Figma as variables and
styles. **Never hardcode a color, font, or spacing value** — reference the variable or
the style.

#### Color — Notion's palette

Notion's neutrals are not pure grays; they carry a warm brown undertone. That single
detail does most of the work in making something feel like Notion.

| Role | Value | Source |
|---|---|---|
| Primary text | `#373530` | Notion light-mode default text |
| Secondary text | `#787774` | Notion "gray" text |
| Background | `#FFFFFF` | — |
| Subtle background | `#F1F1EF` | Notion "gray" background |
| Warm background | `#F7F6F3` | sidebar tone (not officially documented) |
| Inverse background | `#191919` | Notion dark-mode page background |
| Inverse text | `#D4D4D4` | Notion dark-mode default text |
| Divider | `#E9E9E7` / `#373737` (dark) | dark value is computed, not documented |

Plus Notion's **nine accent colors**, each with a light text value, a light background,
and a dark background:

| | gray | brown | orange | yellow | green | blue | purple | pink | red |
|---|---|---|---|---|---|---|---|---|---|
| text | `#787774` | `#976D57` | `#CC782F` | `#C29343` | `#548164` | `#487CA5` | `#8A67AB` | `#B35488` | `#C4554D` |
| bg | `#F1F1EF` | `#F3EEEE` | `#F8ECDF` | `#FAF3DD` | `#EEF3ED` | `#E9F3F7` | `#F6F3F8` | `#F9F2F5` | `#FAECEC` |
| bg dark | `#252525` | `#2E2724` | `#36291F` | `#372E20` | `#242B26` | `#1F282D` | `#2A2430` | `#2E2328` | `#332523` |

**Rules**
- **One accent per post.** Do not change color card to card.
- Pair an accent with its own background only. Never mix `blue` text on `green` background.
- `yellow`, `orange` and `gray` sit around 3:1 contrast on white — use them for badges,
  backgrounds, or 40px+ text, never for body copy.
- Fix a color per content category:

| Category | Accent |
|---|---|
| Notion features / tutorials | `blue` |
| Template shares | `purple` |
| Announcements / recruiting | `orange` |
| Mistakes / warnings | `red` |
| Retrospectives / results | `green` |
| Neutral | `gray` |

#### Typography

Notion pairs a **serif for marketing headlines** (Lyon) with a **sans for product UI**
(Inter). Carousels read closer to product than to marketing, so this project uses **one sans
throughout** and builds hierarchy from weight and size rather than from a second typeface:

| Notion | Original | Here |
|---|---|---|
| Product / body | Inter | **Noto Sans KR** (every style) |
| Editorial headlines | Lyon (commercial license) | not used |

Seven text styles:

| Style | Family | Figma style | Size | Line height | Tracking | Used for |
|---|---|---|---|---|---|---|
| `Display` | sans | Black | 88 | 1.2 | −2% | cover headline, max 3 lines |
| `Quote` | sans | Light | 52 | 1.5 | −1% | pull quotes |
| `Title` | sans | Bold | 60 | 1.3 | −2% | body-card heading, max 2 lines |
| `Subtitle` | sans | Medium | 40 | 1.4 | −2% | cover subheading, story body |
| `Body` | sans | Regular | 34 | 1.5 | −1% | body copy |
| `Caption` | sans | Regular | 26 | 1.5 | 0% | sources, progress counter |
| `Label` | sans | Bold | 24 | 1.2 | +2% | badges, logo wordmark |

> **`Body` line height is 1.5 because that is Notion's.** If text overflows, cut words —
> do not tighten the leading.

> **Optional upgrade:** [Pretendard](https://github.com/orioncactus/pretendard) shares
> Inter's metrics and is the better Korean match, but it is not on Google Fonts. Install
> it locally, change `typography.family.sans` in `tokens.json`, and rebuild the seven
> text styles — every component picks it up automatically.

> The `figmaStyle` field is the exact string Figma expects. Guessing (`SemiBold` vs
> `Semi Bold`) makes font loading fail.

#### Spacing and radius

```
spacing   xs 8 · sm 16 · md 24 · lg 40 · xl 64 · 2xl 96
          pagePadding 80 · squareInset 135 · blockGap 32
radius    none 0 · sm 12 · md 20 · lg 32 · pill 999
```

> The 8px scale is a common design-system convention, **not** something Notion published.
> `design/brand.md` has an explicit table separating what came from Notion from what did not.

### 7.3 Components

All twelve are variant sets on `01_Assets`. Node IDs live in `design/figma-file.json`.

#### The two shared axes

1. **`theme` = `light` | `dark`** — `theme` names the **background**. `light` is a white
   card with dark text. Every component except `UI/Badge` has it. Keep one theme per post.
2. **`showImage`** — every card has a 16:9 (920×518) image placeholder, off by default.

#### Cards

| Component | Size | Properties |
|---|---|---|
| `CN/Cover` | 1080×1350 | `title`, `subtitle`, `showBadge`, `showImage`, `theme` |
| `CN/Body` | 1080×1350 | `title`, `body`, `showImage`, `showCallout`, `theme` |
| `CN/Quote` | 1080×1350 | `quote`, `source`, `showImage`, `theme` |
| `CN/CTA` | 1080×1350 | `headline`, `sub`, `showImage`, `theme` |
| `PT/Single` | 1080×1350 | `title`, `body`, `showImage`, `theme` |
| `ST/Base` | 1080×1920 | `title`, `body`, `showImage`, `theme` |

- `CN/Cover` — carousel cover. `Display` (Black 88) headline on a badge. Keep the title
  under 20 characters.
- `CN/Body` — the workhorse. Progress counter pinned top, content centered, logo bottom.
  `showCallout` adds a Notion-style callout block under the body.
- `CN/Quote` — a pull quote with a left rule, vertically centered. No logo.
- `CN/CTA` — closing card. **One** call to action, never two.
- `PT/Single` — a standalone post that says everything in one frame.
- `ST/Base` — story. Body uses `Subtitle` (40px) because stories scroll fast.

#### UI parts

| Component | Properties | Notes |
|---|---|---|
| `UI/Logo` | `handle`, `theme` | paper-plane symbol + `@notion_kau` |
| `UI/Badge` | `text`, `color` (6) | Notion inline-tag pill. **No `theme`** — the light pill reads on both backgrounds |
| `UI/Callout` | `emoji`, `text`, `color` (6), `theme` (2) → 12 variants | Notion callout block |
| `UI/ProgressDots` | `current`, `total`, `theme` | `3 / 8` counter |
| `UI/Tag` | `text`, `theme` | hashtag / category text |
| `UI/Divider` | `theme` | 1px rule |

> **`UI/Logo`'s symbol is a raster image, not a vector,** so its fill cannot be changed
> directly. It is colored with an **alpha mask**: the image sits underneath as
> `isMask = true` / `maskType = 'ALPHA'`, and a colored rectangle above it gets clipped to
> the plane's silhouette. That is why one image serves both themes. A Figma mask applies
> to *subsequent* siblings — do not reorder those two layers.

### 7.4 Layout laws

#### The center square

A 1080×1350 post gets cropped in the profile grid:

| Crop | Cut | Survives |
|---|---|---|
| 1:1 (carousel cover in the grid) | **135px off top and bottom** | 1080×1080 |
| 3:4 (grid) | 34px off each side | 1012×1350 |

So content lives inside **y 135–1215, x 80–1000**, which satisfies both.

**Fitting inside is not enough.** The content block is also **vertically centered** within
that square. Pinning things to the top and bottom edges leaves the middle empty, and the
square crop then reads as an unfinished card.

| Element | Position |
|---|---|
| Headline / body block | vertically centered in the square |
| Logo footer | bottom of the square (1215) |
| Progress counter (`CN/Body`) | top of the square (135) |

Implementation: the `top` / `content` frame gets `layoutSizingVertical = 'FILL'` and
`primaryAxisAlignItems = 'CENTER'`; the card root stays `MIN`. **Do not set the root back
to `SPACE_BETWEEN`** — that is exactly the bug this replaced.

Stories are not grid-cropped, so they keep a 250px top/bottom inset instead.

#### Copy limits

| Slot | Limit |
|---|---|
| Cover title | 20 characters, one sentence |
| Body-card title | 15 characters |
| Body copy | 2–4 sentences, 150 characters, max 8 lines |
| Final card | exactly one call to action |

With `showImage` on, the image eats 518 of the 1080px square. Shorten accordingly:
cover title 2 lines · body copy 4 lines · quote 3 lines · single-post title 2 + body 2.
**Check visually with the image turned on** — `maxLines` truncates silently.

### 7.5 Brand rules

From `design/brand.md`:

- Paper-like warm neutrals. No pure black or pure gray in body text.
- **No shadows, no gradients, no heavy borders.** Hierarchy comes from type and space.
- Color is used to mark meaning, never to decorate. One accent per post.
- One typeface: Noto Sans KR. Hierarchy comes from weight (Black/Bold/Regular/Light) and size.
- Voice: declarative and short. Say the outcome, not the feature. No clickbait.
- **Do not draw or recreate Notion's logo.** Cards carry the account's own mark.
  If the Campus Leader program publishes ambassador brand rules, those take precedence.

---

## 8. Making a post, end to end

> On path B your `01_Assets` is empty. Build it with the `figma-assets` skill before you
> get here ([4.2](#42-choose-your-figma-workspace)).

### Step 1 — Plan it (in Notion)

```
/content-plan the mistakes beginners make with Notion databases
```

The agent works through this:

1. Scans existing rows in the «콘텐츠 기획» database for **topic overlap**. If something
   collides, it asks before spending time on research
2. Researches — facts with source links, Notion features verified against the **official help
   docs**, and layout references observed from Notion's own social accounts
   (`@notionhq`, `@notionhq_kr`) for **structure and length**, never copied wording
3. Creates a row and fills the page body with the fixed skeleton

```
1. 개요        topic · audience · key message · why now · voice · CTA
2. 조사        verified facts (with links) · references · what we cut and why
3. 카드 구성   per-card copy and image on/off      ← the part the design step reads
4. 캡션        Instagram caption + hashtags
5. 이미지 계획  a table of which image comes from where
6. 디자인 결과  (left empty — the design step fills it)
```

4. Counts the copy against the limits in `design/formats.md`, then sets the status to `기획완료`

Then it stops. **This is your turn to read and edit in Notion** — add research, reorder cards,
tighten sentences. It is the easiest point in the pipeline for a human to collaborate.

> If you already have notes, drop them in `content/briefs/<slug>.md` and the agent uses them
> as a starting point. Briefs are optional; **the Notion page is authoritative.**

The exact schema and field rules are in [`design/content-plan.md`](design/content-plan.md).

### Step 2 — Lock the copy *before* touching Figma

```
/instagram-post notion-db-tips
```

The agent finds the Notion plan by `slug`, pulls the approved copy down into
`content/posts/<slug>.md`, and **stops for your approval**. This is deliberate: a round trip to
the canvas is expensive, and rewriting text after the frames exist wastes far more time than
reading it first.

- If the status is below `기획완료` it refuses and sends you back to planning
- If it finds a spec violation it **does not quietly fix it in the repo**. It reports, you fix the
  Notion page, it pulls again. Notion and the repo drifting apart is the worst state to be in

Check against the limits in [7.4](#74-layout-laws): title length, sentence count, one CTA.

### Step 3 — Generate the frames

After approval the agent works on `02_Workspace`:

1. Creates a section named `YYYY-MM-DD_<slug>`
2. Adds one component **instance** per card — never a hand-drawn rectangle
3. Names frames `YYYY-MM-DD_<slug>_NN`
4. Fills text properties, sets `theme` and the accent consistently
5. Screenshots each frame and checks it

### Step 4 — Review

| Check | Why |
|---|---|
| 1080×1350 (or 1080×1920) | Instagram forces every carousel slide to match slide 1 |
| Content inside y 135–1215, centered | survives the grid crop |
| No truncated text | especially with `showImage` on |
| One accent, one `theme` across all cards | consistency |
| Korean line breaks read naturally | no orphaned particles |
| Exactly one CTA on the last card | — |

### Step 5 — Export

Record node IDs at the bottom of `content/posts/<slug>.md`:

```markdown
## figma-nodes
01 = 12:345
02 = 12:346
```

Then:

```bash
node scripts/export-frames.mjs --slug notion-db-tips
```

PNGs land in `exports/<slug>/`, numbered in order. Upload, paste the caption from the
post file, done. Set `status: approved`.

### Step 6 — Write the result back to Notion

The agent returns to the plan page, fills «6. 디자인 결과» with the Figma section name, node
IDs, and exported files, and moves the database status to `발행준비`. Someone reading only
Notion should still know where the post stands.

Moving it to `발행됨` is yours to do — the agent cannot know whether you actually posted.

---

## 9. Constraints and gotchas

### Figma free (Starter) plan

| Thing | Status |
|---|---|
| Official remote MCP (`mcp.figma.com`) | **20 calls per month** — effectively unusable, hence this bridge |
| Local Dev Mode MCP | requires a paid Dev/Full seat |
| Team library publishing | not available → Assets and Workspace **must** share one file |
| Variable modes | one per collection → light/dark is done with **variants**, not modes |
| REST API (read + image export) | works fine, separate limits |
| Inviting editors | no seat limit, but **files sitting in Drafts cannot have editors invited** |

> For several people to edit the same file, it must live **inside a project**. A file left in
> Drafts can only be shared view-only. The owner should move it out of Drafts, then invite.

### Figma Plugin API

Things that cost time to rediscover:

- **Component sets do not auto-resize.** Move variants around and the set's frame stays
  put; children overflow and get clipped on export. Call `resizeWithoutConstraints()`.
- `insertChild` reorders the **property dropdown**, not the canvas. Set `x`/`y` for that.
- `figma.createFrame()` starts with a **white fill**. Clear it (`fills = []`) or it hides
  white text.
- Set `textTruncation = 'ENDING'` **before** `maxLines`, or `maxLines` resets to 1.
- `resize()` before setting sizing modes; `layoutSizing*` `FILL`/`HUG` only after
  `appendChild`.
- Load fonts with `await figma.loadFontAsync()` before touching any text.
- Switch pages with `await figma.setCurrentPageAsync(page)`. The sync setter throws.
- Colors are 0–1, not 0–255.
- `figma.notify()` throws; `console.log()` is not returned. Use `return`.

### Plugin manifest

`networkAccess.allowedDomains` **rejects IP literals** — `http://127.0.0.1:3055` fails
validation. Only `http://localhost:3055` is accepted. Because Windows may resolve
`localhost` to IPv6 first, the server binds **both** `127.0.0.1` and `::1`.

---

## 10. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Invalid value for allowedDomains` on import | An IP literal in the manifest. Use `http://localhost:3055` only |
| Plugin shows a red dot | Bridge server not running. Start an agent session or `node bridge/server.mjs` |
| `Figma 플러그인이 연결돼 있지 않다` | Plugin not running in Figma desktop, or the panel was closed |
| Server logs nothing after startup | **Normal.** Only startup and errors are logged |
| `Figma API 404` on export | `FIGMA_FILE_KEY` holds a full URL instead of just the key |
| `Figma API 429` on export | REST rate limit — wait a few minutes. Large page renders are expensive |
| `sandbox blocks dynamic code` | Figma blocked both `eval` and `new Function`. Not observed in practice; the bridge would need a command-based protocol |
| Port 3055 in use | Handled automatically (host/client). To change it, set `FIGMA_BRIDGE_PORT` **and** update the manifest and `ui.html`, then re-import the plugin |
| Tools missing in the agent | MCP servers load at session start — restart the session after registering |

Structure reads and PNG exports never touch the bridge, so this always works:

```bash
node scripts/export-frames.mjs --list
```

---

## License / credit

Built as part of a **Notion Campus Leader** activity.
Notion's color values and typographic strategy are referenced from Notion's public
product and brand material; layout rules come from Instagram's crop behavior, not from
Notion. See `design/brand.md` for the full attribution table.
