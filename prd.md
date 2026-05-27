# PRD — Mosh

> All your tools in one pit.

**Owner:** Eric
**Status:** Draft v0.2

---

## Overview

A minimal Electron desktop app that runs multiple tool accounts side-by-side in one window, switching between them via a left sidebar. Ferdium-style, but stripped down and built for how AI builders actually work.

**Why:** Claude desktop doesn't support multiple accounts. Bouncing between Cora workspace and personal in a browser kills flow. Same problem exists across ChatGPT, Gemini, and basically every web tool worth having open all day. Mosh is the wrapper that makes all of them feel like one app.

**Wedge:** Multi-account AI clients. **Reality:** any web tool fits in the pit.

---

## v1 Scope (the whole thing)

### Sidebar
- Vertical strip on the left (~72px wide)
- Each account = a circular icon
- Active account highlighted
- Color tag rendered as a small dot or ring on the icon
- Tooltip shows the display name on hover
- `+` button pinned at the bottom

### Add Account Flow
Click `+` → modal with three steps on one screen:

1. **Pick service** — grid of preset tiles: Claude, ChatGPT, Gemini, Perplexity, Copilot, Grok, Mistral, Custom URL
2. **Name it** — text input, defaults to service name (e.g. "Claude" → user edits to "Cora")
3. **Tag it** — optional color swatch picker (6–8 presets, e.g. purple, blue, green, orange, red, pink, gray, none)

Hit Save → account is created, view loads, sidebar updates, app switches to the new account.

### Account Management
Right-click an icon for a context menu:
- Rename
- Change color tag
- Change icon (preset library or upload custom PNG)
- Reload
- Log out (clears that account's partition)
- Delete

Drag to reorder.

### Preset Icon Library
- Ship with default icons for the preset services
- Icons live in `/assets/icons/services/`
- Custom uploads saved to `app.getPath('userData')/icons/`
- "Change icon" opens a chooser: preset grid on the left, "Upload custom" button on the right

### Session Isolation
- Each account gets a unique `persist:${accountId}` partition
- Cookies, localStorage, service workers fully isolated — two Claude accounts can both be logged in simultaneously

### Persistence
- All config stored in `app.getPath('userData')/accounts.json`
- Loaded on startup, sidebar rebuilt from config
- Use `electron-store` for atomic writes

---

## Data Model

```json
{
  "version": 1,
  "activeAccountId": "uuid-1",
  "accounts": [
    {
      "id": "uuid-1",
      "service": "claude",
      "url": "https://claude.ai",
      "displayName": "Cora",
      "colorTag": "#8B5CF6",
      "iconPath": null,
      "order": 0,
      "createdAt": "2026-05-26T20:00:00Z"
    }
  ]
}
```

`iconPath: null` → use the service's default icon. Set to a file path for custom uploads.

---

## Preset Services

| Service     | URL                              | Default Icon       |
|-------------|----------------------------------|--------------------|
| Claude      | https://claude.ai                | claude.png         |
| ChatGPT     | https://chatgpt.com              | chatgpt.png        |
| Gemini      | https://gemini.google.com        | gemini.png         |
| Perplexity  | https://perplexity.ai            | perplexity.png     |
| Copilot     | https://copilot.microsoft.com    | copilot.png        |
| Grok        | https://grok.com                 | grok.png           |
| Mistral     | https://chat.mistral.ai          | mistral.png        |
| Custom      | (user-entered)                   | generic.png        |

---

## Tech Stack

- **Electron** (latest stable)
- **WebContentsView** per account (one per session partition)
- **electron-store** for config persistence
- **Vanilla HTML/CSS/JS** for the sidebar and modal — no framework needed, the UI surface is tiny
- No backend, no telemetry, no analytics, no auto-update in v1

---

## Out of Scope (v1)

- Notification/unread badges
- Hotkeys (Cmd+1, Cmd+2, etc.)
- Workspace grouping / folders
- Cross-machine sync
- Auto-update
- Mobile or web version
- Per-account custom user agents

---

## v2 Parking Lot

- Cmd+1…9 to jump between accounts
- Global hotkey to summon the app (Spotlight-style)
- Unread badge dots via `page-title-updated` listeners
- Workspace folders (group accounts by client/project: Cora, Patchr, Personal)
- Shared prompt library accessible from any account
- Theme follows OS dark/light
- Export/import config JSON for moving between machines
- `electron-updater` for releases

---

## Open Questions

- Final name?
- Sidebar only on the left, or make position configurable?
- Should "Custom URL" services get a generic icon, or auto-pull the favicon from the URL?
- Ship as unsigned binary first, or set up code signing from day one?