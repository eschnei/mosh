# Mosh v1 — Development Plan

> Generated 2026-05-26 from PRD v0.2 review by PM, UX Architect, Full-Stack, and Visual Design agents.

---

## Confirmed Decisions

| Topic | Decision |
|---|---|
| Platform | macOS only |
| Window chrome | Native title bar (`titleBarStyle: 'default'`) |
| UI stack | Electron + React + shadcn/ui + Tailwind CSS (renderer) |
| Drag-to-reorder | SortableJS |
| ChatGPT | Spike before committing as a preset (Cloudflare Turnstile risk) |
| Persistence | electron-store (accounts.json) |
| Distribution | Universal binary (arm64 + x64); code signing TBD |

---

## Tech Stack

```
main.js             — Electron main process (BaseWindow, ViewManager, AccountStore, IPC handlers)
preload.js          — contextBridge API surface (window.mosh)
renderer/           — React app (Vite + React + Tailwind + shadcn/ui)
  Sidebar.jsx
  AddAccountModal.jsx
  IconChooser.jsx
  ContextMenu.jsx   — shadcn DropdownMenu
assets/icons/       — preset service PNGs
electron-store      — accounts.json persistence
```

---

## Milestones

| Milestone | Description | Est. |
|---|---|---|
| **M1 Walking Skeleton** | Electron opens, one hardcoded account in a WebContentsView, static sidebar shell, IPC plumbing wired | 1–2 days |
| **M2 Multi-Account MVP** | Add accounts via modal, switch between them, sessions isolated, config persists on restart | 3–5 days |
| **M3 Full Management** | Context menu (rename/color/icon/reload/logout/delete), drag-to-reorder, custom icons, confirm dialogs | 3–4 days |
| **M4 Ship-Ready** | Packaged DMG, universal binary, loading/error/empty states polished, README | 2–3 days |

**Pre-M1 spike (day 0):** Test ChatGPT login in a bare `WebContentsView` with `persist:test` partition + Chrome UA override. Pass → add to presets. Fail → remove from v1.

**Total estimate: 9–14 working days.**

---

## Critical Path

```
E1 Foundation → E2 Data Layer → E4 ViewManager → E3 Sidebar → E5 Add Flow
```

E6–E9 can parallelize once the core four are stable.

---

## Epics & Tasks

### E1 — Project Foundation

| ID | Task | Size | Deps |
|---|---|---|---|
| T1.1 | Init repo, `package.json`, `.nvmrc`, `.gitignore` | S | — |
| T1.2 | Install Electron (latest), configure main + preload skeleton | S | T1.1 |
| T1.3 | Set up Vite + React renderer inside Electron (`electron-vite` recommended) | M | T1.2 |
| T1.4 | Install Tailwind CSS, shadcn/ui, configure `components.json` | S | T1.3 |
| T1.5 | Install `electron-store`, `uuid`, `sortablejs` | S | T1.2 |
| T1.6 | Define IPC channel names in shared `ipc-channels.js` | S | T1.2 |
| T1.7 | Implement `contextBridge` exposing typed `window.mosh` API | S | T1.6 |
| T1.8 | Configure `BrowserWindow`: `contextIsolation: true`, `nodeIntegration: false`, native title bar | S | T1.2 |
| T1.9 | `app.requestSingleInstanceLock()` — prevent concurrent instances racing on writes | S | T1.2 |

### E2 — Data Layer

| ID | Task | Size | Deps |
|---|---|---|---|
| T2.1 | Define `accounts.json` schema + JSDoc types | S | T1.5 |
| T2.2 | Configure `electron-store` with schema validation + migration scaffold (`version` field) | S | T2.1 |
| T2.3 | `AccountStore` module: `list`, `get`, `create`, `update`, `delete`, `reorder`, `setActive` | M | T2.2 |
| T2.4 | Preset services registry (`services.js`): id, name, url, defaultIcon | S | — |
| T2.5 | IPC handlers for all account operations | M | T2.3, T1.6 |

### E3 — Sidebar UI (React)

| ID | Task | Size | Deps |
|---|---|---|---|
| T3.1 | App shell: native title bar + 72px sidebar + content area (Tailwind layout) | S | T1.4 |
| T3.2 | `AccountIcon` component: circular avatar, active ring, color tag dot | M | T3.1 |
| T3.3 | Sidebar renders accounts list from store; click-to-switch wired to IPC | M | T3.2, T2.5 |
| T3.4 | shadcn `Tooltip` on hover showing display name | S | T3.2 |
| T3.5 | Add `+` button (dashed circle, pinned bottom), fires open-add-account | S | T3.1 |
| T3.6 | Empty state: zero accounts → centered CTA pointing at `+` | S | T3.3 |
| T3.7 | Sidebar overflow: scrollable with `scrollbar-none`, `+` sticky at bottom | S | T3.3 |

### E4 — WebContentsView Manager (Main Process)

| ID | Task | Size | Deps |
|---|---|---|---|
| T4.1 | `ViewManager` module: create, attach, detach, destroy views (explicit `webContents.close()` + null-ref cleanup on delete) | L | T1.2 |
| T4.2 | Per-account `persist:${accountId}` partition; `setWindowOpenHandler` routing for OAuth popups (Google, Microsoft) | M | T4.1 |
| T4.3 | View bounds sync on window resize (manual `setBounds` listener — `setAutoResize` is gone in WebContentsView) | M | T4.1 |
| T4.4 | Lazy-create views on first switch; show/hide active view | M | T4.1 |
| T4.5 | Loading state: spinner overlay while `did-start-loading` | S | T4.4 |
| T4.6 | Error state: catch `did-fail-load`, show retry button | M | T4.4 |
| T4.7 | `render-process-gone` handler: auto-reload crashed view | S | T4.1 |
| T4.8 | Partition cleanup on delete/logout: `session.clearStorageData()` + `fs.rm` on Partitions dir | M | T4.1 |

### E5 — Add Account Flow (React)

| ID | Task | Size | Deps |
|---|---|---|---|
| T5.1 | shadcn `Dialog` wrapper with ESC-to-close, focus trap | S | T1.4 |
| T5.2 | Step 1: 4×2 service tile grid (8 preset tiles + Custom URL) | M | T5.1, T2.4 |
| T5.3 | Custom URL input (shown when Custom selected); URL validation, auto-prepend `https://` | M | T5.2 |
| T5.4 | Step 2: name input (defaults to service name) using shadcn `Input` | S | T5.2 |
| T5.5 | Step 3: color swatch picker (8 presets + None) | S | T5.4 |
| T5.6 | Save: call `accounts:create` → close modal → switch to new account → trigger ViewManager | M | T5.5, T2.5, T4.4 |

### E6 — Account Management (React + Main)

| ID | Task | Size | Deps |
|---|---|---|---|
| T6.1 | shadcn `DropdownMenu` on right-click of sidebar icons, with `accountId` context | M | T3.2 |
| T6.2 | Rename: shadcn `Dialog` with prefilled input → `accounts:update` | S | T6.1 |
| T6.3 | Change color tag: swatch picker in dialog → `accounts:update` | S | T6.1, T5.5 |
| T6.4 | Reload: IPC → `webContents.reload()` | S | T6.1 |
| T6.5 | Log out: shadcn `AlertDialog` confirm → `clearStorageData()` + reload | M | T6.1, T4.8 |
| T6.6 | Delete: `AlertDialog` confirm → `accounts:delete` → `ViewManager.destroy()` → switch to next account | M | T6.1, T2.5, T4.8 |
| T6.7 | Change icon: opens icon chooser (E7) | S | T6.1, T7.4 |

### E7 — Icon System

| ID | Task | Size | Deps |
|---|---|---|---|
| T7.1 | Source 7 preset PNG icons (Claude, ChatGPT, Gemini, Perplexity, Copilot, Grok, Mistral) + generic fallback; place in `/assets/icons/services/` | M | — |
| T7.2 | Icon resolution helper: `iconPath` → service default → `generic.png` | S | T7.1 |
| T7.3 | Render resolved icons in sidebar; graceful fallback on missing file | S | T7.2, T3.2 |
| T7.4 | Icon chooser: shadcn `Dialog` with preset grid + "Upload custom" button | M | T5.1, T7.1 |
| T7.5 | Upload: `dialog.showOpenDialog` (PNG/JPG/WebP), normalize via `nativeImage` → resize 128×128 → save to `userData/icons/` | M | T7.4 |
| T7.6 | File validation: reject non-image or >2MB; surface error to user | S | T7.5 |
| T7.7 | Cleanup orphaned icon files on account delete or icon replacement | S | T7.5, T6.6 |

### E8 — Reordering

| ID | Task | Size | Deps |
|---|---|---|---|
| T8.1 | Wire SortableJS to sidebar accounts list | M | T3.3 |
| T8.2 | Drop insert-line indicator (Tailwind before-pseudo or inline style) | S | T8.1 |
| T8.3 | On drop: compute new order → `accounts:reorder` → re-render | S | T8.1, T2.5 |

### E9 — Packaging & Distribution

| ID | Task | Size | Deps |
|---|---|---|---|
| T9.1 | Configure `electron-builder` for macOS universal binary (arm64 + x64) | M | T1.1 |
| T9.2 | App icon (.icns) + DMG background | S | T7.1 |
| T9.3 | Smoke test packaged build: install → add account → restart → verify persistence | M | T9.1 |
| T9.4 | Code signing decision: Developer ID cert + notarization OR unsigned + Gatekeeper workaround doc | L | T9.1 |
| T9.5 | README: dev setup + build instructions | S | T9.1 |

---

## Milestone → Task Mapping

| Milestone | Tasks |
|---|---|
| M1 Walking Skeleton | T1.1–T1.9, T2.1–T2.2, T3.1, T4.1–T4.2 |
| M2 Multi-Account MVP | T2.3–T2.5, T3.2–T3.7, T4.3–T4.6, T5.1–T5.6, T7.1–T7.3 |
| M3 Full Management | T4.7–T4.8, T6.1–T6.7, T7.4–T7.7, T8.1–T8.3 |
| M4 Ship-Ready | T9.1–T9.5 + loading/error/empty polish |

---

## Open Questions (Deferred)

These were in the PRD or surfaced in review — not blocking, but need decisions before the relevant tasks begin:

| Question | Blocking task |
|---|---|
| Final app name ("Mosh" confirmed?) | T9.2, T1.1 | - Mosh is confirmed - use jetbrains mono all caps for the text
| Custom URL services: generic icon or auto-pull favicon? | T7.1 |  - autopull favicon or result back to generic emoji icon. 
| Sidebar overflow at 15+ accounts: scroll or compact? | T3.7 | - scroll
| Light theme in v1 or v1.1? | Design system setup | - light theme for now. 
| `accounts.json` migration strategy for v2 schema changes | T2.2 | - not sure that is v2

---

## Key Technical Notes

- **WebContentsView has no `.destroy()`** — must explicitly call `webContents.close()` and null the map entry on account delete to avoid renderer process leaks.
- **No `setAutoResize`** — manually call `setBounds()` on `BaseWindow` resize event.
- **Partition cleanup** requires both `session.fromPartition(id).clearStorageData()` AND `fs.rm` of the Partitions directory — or disk use balloons over time.
- **OAuth popups** (Google/Microsoft login flows) must be handled via `setWindowOpenHandler` or they silently disappear.
- **ChatGPT Cloudflare risk** — spike before M1. UA override may be required (`session.setUserAgent(chromeUA)`).
- **Single instance lock** — prevents two app windows racing on `accounts.json` writes.
