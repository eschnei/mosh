// Channel name constants shared between main and renderer (via preload).
// Keeping these in one place prevents typos and drift between sides of IPC.
export const IPC = {
  ACCOUNTS_LIST: 'accounts:list',
  ACCOUNTS_CREATE: 'accounts:create',
  ACCOUNTS_UPDATE: 'accounts:update',
  ACCOUNTS_DELETE: 'accounts:delete',
  ACCOUNTS_REORDER: 'accounts:reorder',
  ACCOUNTS_SET_ACTIVE: 'accounts:setActive',
  ACCOUNTS_CHANGED: 'accounts:changed',   // main → renderer push
  VIEW_RELOAD: 'view:reload',
  VIEW_LOGOUT: 'view:logout',
  VIEW_STATUS: 'view:status',             // main → renderer: { accountId, status: 'loading'|'ready'|'error', errorCode? }
  VIEW_COVER: 'view:cover',               // renderer → main: hide active view while a modal is open
  VIEW_UNCOVER: 'view:uncover',           // renderer → main: restore active view after modal closes
  ICON_OPEN_CHOOSER: 'icon:openChooser',
  ICON_UPLOAD: 'icon:upload',
  SERVICES_LIST: 'services:list',         // renderer → main: get preset services list
}
