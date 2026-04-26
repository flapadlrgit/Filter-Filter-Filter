import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import FilterTracker from './FilterTracker.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FilterTracker />
  </StrictMode>,
)
