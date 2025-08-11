import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import App from './App.tsx'

// VA Design System imports (commented out but preserved)
// import { initializeVAComponents } from './va-web-components'
// import "@uswds/uswds/css/uswds.min.css"
// import "@department-of-veterans-affairs/component-library/dist/main.css"

// VA Design System initialization (commented out but preserved)
// (window as any).__SVGSPRITE__ = '/sprite.svg';
// (window as any).VetsGov = { 
//   iconSprite: '/sprite.svg' 
// };
// initializeVAComponents()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
)
