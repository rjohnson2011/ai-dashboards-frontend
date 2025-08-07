// VA Design System Web Components Setup
import {
  applyPolyfills,
  defineCustomElements
} from "@department-of-veterans-affairs/component-library";

// Initialize VA web components
export const initializeVAComponents = () => {
  applyPolyfills().then(() => {
    defineCustomElements();
  });
};