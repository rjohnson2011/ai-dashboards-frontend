import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeVAComponents } from './va-web-components'
import "@department-of-veterans-affairs/component-library/dist/main.css"

// Set the sprite location for VA icons
(window as any).VetsGov = { 
  iconSprite: '/sprite.svg' 
}

// Initialize VA Design System components
initializeVAComponents()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
