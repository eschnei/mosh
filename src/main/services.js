// Preset services registry. The "Custom" entry has no URL — the user supplies one.
export const SERVICES = [
  { id: 'claude', name: 'Claude', url: 'https://claude.ai', defaultIcon: 'claude.png' },
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com', defaultIcon: 'chatgpt.png' },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com', defaultIcon: 'gemini.png' },
  { id: 'perplexity', name: 'Perplexity', url: 'https://perplexity.ai', defaultIcon: 'perplexity.png' },
  {
    id: 'copilot',
    name: 'Copilot',
    url: 'https://copilot.microsoft.com',
    defaultIcon: 'copilot.png'
  },
  { id: 'grok', name: 'Grok', url: 'https://grok.com', defaultIcon: 'grok.png' },
  { id: 'mistral', name: 'Mistral', url: 'https://chat.mistral.ai', defaultIcon: 'mistral.png' },
  { id: 'custom', name: 'Custom', url: null, defaultIcon: 'generic.png' }
]

export function getService(id) {
  return SERVICES.find((s) => s.id === id) || null
}
