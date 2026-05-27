import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Dark theme is the only theme in M1 (per plan.md open-questions: "light theme for now"
// is parked; the walking skeleton ships dark-only so we have a stable visual baseline).
document.documentElement.classList.add('dark')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
