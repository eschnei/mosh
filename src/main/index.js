import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell } from 'electron'
import { join } from 'path'
import fs from 'fs/promises'
import { electronApp, is } from '@electron-toolkit/utils'
import { AccountStore } from './AccountStore.js'
import { ViewManager } from './ViewManager.js'
import { SERVICES } from './services.js'
import { IPC } from '../shared/ipc-channels.js'

// Prevent two app instances from racing on accounts.json writes.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

let mainWindow = null
let store = null
let viewManager = null

function broadcastAccountsChanged() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send(IPC.ACCOUNTS_CHANGED, store.snapshot())
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 }, // centered in the 84px sidebar
    backgroundColor: '#1a1a1c',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // Only open http/https URLs in the system browser — blocks javascript:, file://, etc.
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (/^https?:\/\//i.test(details.url)) shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()

    // Boot the active account's view once the shell is visible.
    const active = store.getActive()
    if (active) {
      viewManager.ensureAndShow(active)
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  viewManager = new ViewManager(mainWindow)
}

function registerIpc() {
  ipcMain.handle(IPC.ACCOUNTS_LIST, () => store.snapshot())

  ipcMain.handle(IPC.ACCOUNTS_CREATE, (_e, data) => {
    const account = store.create(data)
    broadcastAccountsChanged()
    return account
  })

  ipcMain.handle(IPC.ACCOUNTS_UPDATE, (_e, id, patch) => {
    const updated = store.update(id, patch)
    broadcastAccountsChanged()
    return updated
  })

  ipcMain.handle(IPC.ACCOUNTS_DELETE, async (_e, id) => {
    // Await the partition cleanup so the renderer can trust that, once this
    // returns, every trace of the account is gone from memory and disk.
    await viewManager.destroyView(id)
    const remaining = store.delete(id)
    broadcastAccountsChanged()

    // Auto-promote next account into view if we just deleted the active one.
    const active = store.getActive()
    if (active) viewManager.ensureAndShow(active)
    return remaining
  })

  ipcMain.handle(IPC.ACCOUNTS_REORDER, (_e, ids) => {
    const next = store.reorder(ids)
    broadcastAccountsChanged()
    return next
  })

  ipcMain.handle(IPC.ACCOUNTS_SET_ACTIVE, (_e, id) => {
    const account = store.get(id)
    if (!account) return null
    store.setActive(id)
    viewManager.ensureAndShow(account)
    broadcastAccountsChanged()
    return id
  })

  ipcMain.handle(IPC.VIEW_RELOAD, (_e, id) => {
    viewManager.reload(id)
    return true
  })

  ipcMain.handle(IPC.VIEW_LOGOUT, async (_e, id) => {
    await viewManager.logout(id)
    return true
  })

  ipcMain.handle(IPC.VIEW_COVER, () => viewManager.cover())
  ipcMain.handle(IPC.VIEW_UNCOVER, () => viewManager.uncover())

  ipcMain.handle(IPC.SERVICES_LIST, () => SERVICES)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.mosh.app')

  store = new AccountStore()
  registerIpc()
  createWindow()

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (viewManager) viewManager.destroyAll()
})
