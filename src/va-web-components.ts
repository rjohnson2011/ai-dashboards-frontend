// VA Design System Web Components Setup
import {
  applyPolyfills,
  defineCustomElements
} from "@department-of-veterans-affairs/web-components/loader";

// Initialize VA web components
export const initializeVAComponents = () => {
  // Ensure DOM is ready before initializing
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyPolyfills().then(() => {
        defineCustomElements(window);
      });
    });
  } else {
    applyPolyfills().then(() => {
      defineCustomElements(window);
    });
  }
};