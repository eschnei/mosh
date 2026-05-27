import { WebContentsView, app, session } from 'electron'
import { join, sep } from 'path'

const SAFE_URL  = /^https?:\/\//i
const UUID_RE   = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
import fs from 'fs/promises'
import { IPC } from '../shared/ipc-channels.js'

// Chrome desktop UA — required so sites like Claude/ChatGPT don't fingerprint
// us as Electron and trip Cloudflare's bot defenses.
const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

/**
 * Owns one WebContentsView per account. Views are children of the
 * BrowserWindow and laid out manually — no setAutoResize on WebContentsView,
 * so we listen to window resize ourselves.
 */
export class ViewManager {
  constructor(window) {
    this.window = window
    this.views = new Map() // accountId -> WebContentsView
    this.activeId = null
    this.contentBounds = this.#calcContentBounds()

    window.on('resize', () => {
      this.contentBounds = this.#calcContentBounds()
      this.updateBounds(this.contentBounds)
    })
  }

  #calcContentBounds() {
    const [w, h] = this.window.getContentSize()
    return { x: 84, y: 0, width: Math.max(0, w - 84), height: h }
  }

  /**
   * Push view lifecycle status to the renderer. Guarded against firing into a
   * destroyed window, which can happen during shutdown if a view emits a late
   * did-stop-loading after the BrowserWindow has already closed.
   */
  _emitStatus(accountId, status, errorCode) {
    if (!this.window || this.window.isDestroyed()) return
    this.window.webContents.send(IPC.VIEW_STATUS, { accountId, status, errorCode })
  }

  /**
   * Lazy-create a WebContentsView for the given account. Each view runs in
   * its own persist:<id> partition for full session isolation, and ships a
   * Chrome UA. We deliberately attach NO preload script — these views host
   * untrusted third-party sites.
   */
  createView(account) {
    if (this.views.has(account.id)) return this.views.get(account.id)

    const partition = `persist:${account.id}`
    const ses = session.fromPartition(partition)
    ses.setUserAgent(CHROME_UA)

    const view = new WebContentsView({
      webPreferences: {
        partition,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })

    // M2 will handle OAuth popups properly. For M1, deny all new windows.
    view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    view.webContents.setUserAgent(CHROME_UA)

    // Emit load lifecycle to the renderer so the sidebar can show spinners /
    // error chips per account. did-fail-load fires for sub-resources too, so
    // we filter out the ERR_ABORTED noise that comes from normal redirects.
    view.webContents.on('did-start-loading', () => {
      this._emitStatus(account.id, 'loading')
    })

    view.webContents.on('did-stop-loading', () => {
      this._emitStatus(account.id, 'ready')
    })

    view.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      // Ignore aborted navigations (e.g. redirect chains), only surface real errors
      if (errorCode === -3) return
      this._emitStatus(account.id, 'error', errorCode)
    })

    // Recover from renderer crashes (OOM, GPU hang, sad-tab). We skip clean
    // exits (which fire when we ourselves close the webContents on delete)
    // and defer reload by 1s so a hard crash loop doesn't pin a CPU core.
    view.webContents.on('render-process-gone', (_event, details) => {
      if (details.reason === 'clean-exit') return
      this._emitStatus(account.id, 'error')
      setTimeout(() => {
        // Guard against reload-after-delete: account may have been removed
        // while we were waiting.
        if (!this.views.has(account.id)) return
        try {
          view.webContents.reload()
        } catch (e) {
          // webContents may be destroyed mid-recovery
        }
      }, 1000)
    })

    // Start hidden behind the sidebar's content area. showView() will
    // promote it to the front when the user picks this account.
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 })

    this.window.contentView.addChildView(view)
    this.views.set(account.id, view)

    if (account.url && SAFE_URL.test(account.url)) {
      view.webContents.loadURL(account.url).catch((err) => {
        console.error(`[ViewManager] loadURL failed for ${account.id}:`, err)
      })
    }
    return view
  }

  showView(accountId) {
    const view = this.views.get(accountId)
    if (!view) return

    // Hide every other view by collapsing its bounds to zero.
    for (const [id, v] of this.views) {
      if (id !== accountId) v.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    }
    view.setBounds(this.contentBounds)
    this.activeId = accountId
  }

  /**
   * Ensure a view exists for the account, then show it. Returns the view.
   */
  ensureAndShow(account) {
    const existing = this.views.get(account.id) || this.createView(account)
    this.showView(account.id)
    return existing
  }

  /**
   * Synchronous in-memory teardown only. Used both by destroyView() for
   * account deletion and by destroyAll() during app shutdown, where we
   * cannot afford to await disk I/O.
   */
  _teardownView(accountId) {
    const view = this.views.get(accountId)
    if (!view) return
    try {
      this.window.contentView.removeChildView(view)
    } catch (e) {
      // child may have already been removed
    }
    try {
      view.webContents.close()
    } catch (e) {
      // already closed
    }
    this.views.delete(accountId)
    if (this.activeId === accountId) this.activeId = null
  }

  /**
   * Tear down a view and reclaim every byte it owned on disk.
   *
   * Three-step cleanup:
   *  1. Detach from contentView and close the webContents (in-memory teardown).
   *  2. clearStorageData() on the session — flushes cookies/IDB/localStorage
   *     before the disk dir is removed, so Chromium doesn't trip on a missing
   *     directory mid-flush.
   *  3. Remove the on-disk Partitions/<accountId> tree. Electron names the
   *     directory after the bare partition id (the `persist:` prefix is
   *     stripped). The `force: true` rm is best-effort — if Chromium still
   *     holds a file handle we swallow the error rather than block delete.
   */
  async destroyView(accountId) {
    this._teardownView(accountId)

    // Even if there was no live view (e.g. account never opened), the
    // partition dir may still exist from a prior session — clean it up.
    const partition = `persist:${accountId}`
    try {
      const ses = session.fromPartition(partition)
      await ses.clearStorageData()
    } catch (e) {
      // session may not exist if view was never created
    }

    // Guard against path traversal via a crafted accountId in accounts.json.
    const base = join(app.getPath('userData'), 'Partitions')
    const partitionDir = join(base, accountId)
    if (partitionDir.startsWith(base + sep) && UUID_RE.test(accountId)) {
      await fs.rm(partitionDir, { recursive: true, force: true }).catch(() => {})
    }
  }

  // Temporarily collapse the active view so HTML modals (Radix Dialog, etc.)
  // are visible. WebContentsViews are main-process children that always paint
  // on top of the renderer's HTML layer — cover/uncover are the handshake.
  cover() {
    if (!this.activeId) return
    const view = this.views.get(this.activeId)
    if (view) view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  }

  uncover() {
    this.updateBounds()
  }

  updateBounds(contentBounds = this.contentBounds) {
    this.contentBounds = contentBounds
    if (!this.activeId) return
    const active = this.views.get(this.activeId)
    if (active) active.setBounds(contentBounds)
  }

  reload(accountId) {
    const view = this.views.get(accountId)
    if (view) view.webContents.reload()
  }

  async logout(accountId) {
    const partition = `persist:${accountId}`
    const ses = session.fromPartition(partition)
    await ses.clearStorageData()
    this.reload(accountId)
  }

  /**
   * Best-effort synchronous teardown for app shutdown. Skips on-disk
   * partition cleanup — Chromium still owns those file handles until the
   * process exits, and we can't await during 'before-quit'.
   */
  destroyAll() {
    for (const id of [...this.views.keys()]) this._teardownView(id)
  }
}
