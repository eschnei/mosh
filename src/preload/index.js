import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels.js'

// All renderer ↔ main communication goes through this typed surface.
// The renderer must never import electron directly — contextIsolation is on.
const mosh = {
  listAccounts: () => ipcRenderer.invoke(IPC.ACCOUNTS_LIST),
  createAccount: (data) => ipcRenderer.invoke(IPC.ACCOUNTS_CREATE, data),
  updateAccount: (id, patch) => ipcRenderer.invoke(IPC.ACCOUNTS_UPDATE, id, patch),
  deleteAccount: (id) => ipcRenderer.invoke(IPC.ACCOUNTS_DELETE, id),
  reorderAccounts: (ids) => ipcRenderer.invoke(IPC.ACCOUNTS_REORDER, ids),
  setActive: (id) => ipcRenderer.invoke(IPC.ACCOUNTS_SET_ACTIVE, id),
  reloadView: (id) => ipcRenderer.invoke(IPC.VIEW_RELOAD, id),
  logoutView: (id) => ipcRenderer.invoke(IPC.VIEW_LOGOUT, id),
  coverViews: () => ipcRenderer.invoke(IPC.VIEW_COVER),
  uncoverViews: () => ipcRenderer.invoke(IPC.VIEW_UNCOVER),
  listServices: () => ipcRenderer.invoke(IPC.SERVICES_LIST),
  onAccountsChanged: (cb) => {
    const handler = (_event, data) => cb(data)
    ipcRenderer.on(IPC.ACCOUNTS_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.ACCOUNTS_CHANGED, handler)
  },
  onViewStatus: (cb) => {
    const handler = (_event, data) => cb(data)
    ipcRenderer.on(IPC.VIEW_STATUS, handler)
    return () => ipcRenderer.removeListener(IPC.VIEW_STATUS, handler)
  }
}

contextBridge.exposeInMainWorld('mosh', mosh)
