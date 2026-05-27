import claudeIcon from './claude.svg'
import chatgptIcon from './chatgpt.svg'
import geminiIcon from './gemini.svg'
import perplexityIcon from './perplexity.svg'
import copilotIcon from './copilot.svg'
import grokIcon from './grok.svg'
import mistralIcon from './mistral.svg'
import genericIcon from './generic.svg'

export const SERVICE_ICONS = {
  claude: claudeIcon,
  chatgpt: chatgptIcon,
  gemini: geminiIcon,
  perplexity: perplexityIcon,
  copilot: copilotIcon,
  grok: grokIcon,
  mistral: mistralIcon,
  custom: genericIcon,
}

export function getServiceIcon(serviceId) {
  return SERVICE_ICONS[serviceId] ?? genericIcon
}
