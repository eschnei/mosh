import Store from 'electron-store'
import { v4 as uuidv4 } from 'uuid'

const SAFE_URL = /^https?:\/\//i
const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function safeUrl(url) {
  if (url === null || url === undefined) return null
  return SAFE_URL.test(url) ? url : null
}

/**
 * accounts.json schema:
 * {
 *   version: 1,
 *   activeAccountId: string | null,
 *   accounts: Account[]
 * }
 *
 * Account: { id, service, url, displayName, colorTag, iconPath, order, createdAt }
 */

const DEFAULTS = {
  version: 1,
  activeAccountId: null,
  accounts: []
}

export class AccountStore {
  constructor() {
    this.store = new Store({
      name: 'accounts',
      defaults: DEFAULTS,
      clearInvalidConfig: false
    })

    // First-launch seed: hardcoded Claude account so the walking skeleton
    // always has something to render.
    if (this.store.get('accounts').length === 0) {
      const seed = {
        id: 'hardcoded-claude',
        service: 'claude',
        url: 'https://claude.ai',
        displayName: 'Claude',
        colorTag: '#A78BFA',
        iconPath: null,
        order: 0,
        createdAt: new Date().toISOString()
      }
      this.store.set('accounts', [seed])
      this.store.set('activeAccountId', seed.id)
    }
  }

  list() {
    const accounts = this.store.get('accounts') || []
    // Always hand callers a sorted, defensive copy.
    return [...accounts].sort((a, b) => a.order - b.order)
  }

  get(id) {
    return this.list().find((a) => a.id === id) || null
  }

  create({ service, url, displayName, colorTag = null, iconPath = null, emoji = null, emojiColor = null }) {
    const accounts = this.list()
    const account = {
      id: uuidv4(),
      service,
      url: safeUrl(url),
      displayName,
      colorTag,
      iconPath,
      emoji,
      emojiColor,
      order: accounts.length,
      createdAt: new Date().toISOString()
    }
    this.store.set('accounts', [...accounts, account])
    if (!this.store.get('activeAccountId')) {
      this.store.set('activeAccountId', account.id)
    }
    return account
  }

  update(id, patch) {
    // Sanitise fields that could be weaponised via a crafted accounts.json.
    const safePatch = { ...patch }
    if ('url' in safePatch) safePatch.url = safeUrl(safePatch.url)
    if ('id' in safePatch) delete safePatch.id
    const accounts = this.list().map((a) => (a.id === id ? { ...a, ...safePatch, id: a.id } : a))
    this.store.set('accounts', accounts)
    return this.get(id)
  }

  delete(id) {
    const remaining = this.list()
      .filter((a) => a.id !== id)
      .map((a, idx) => ({ ...a, order: idx }))
    this.store.set('accounts', remaining)

    if (this.store.get('activeAccountId') === id) {
      this.store.set('activeAccountId', remaining[0]?.id ?? null)
    }
    return remaining
  }

  reorder(orderedIds) {
    const byId = new Map(this.list().map((a) => [a.id, a]))
    const next = orderedIds
      .map((id, idx) => {
        const acct = byId.get(id)
        return acct ? { ...acct, order: idx } : null
      })
      .filter(Boolean)
    this.store.set('accounts', next)
    return next
  }

  setActive(id) {
    if (!this.get(id)) return null
    this.store.set('activeAccountId', id)
    return id
  }

  getActive() {
    const id = this.store.get('activeAccountId')
    if (!id) return null
    return this.get(id)
  }

  snapshot() {
    return {
      activeAccountId: this.store.get('activeAccountId'),
      accounts: this.list()
    }
  }
}
