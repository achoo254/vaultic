// WXT content script — detect login forms, inject autofill UI, capture credentials

import { detectLoginForms, observeDOMChanges } from '../content/form-detector';
import { injectAutofillIcon, getIconMap, cleanupIcon } from '../content/autofill-icon';
import { captureCredentials } from '../content/credential-capture';
import { showSaveBanner } from '../content/save-banner';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',

  main() {
    // Initial scan for login forms
    const forms = detectLoginForms();
    for (const form of forms) {
      injectAutofillIcon(form);
      captureCredentials(form);
    }

    // Cleanup orphaned icons when inputs are removed from DOM
    const cleanupRemovedIcons = () => {
      for (const [input] of getIconMap()) {
        if (!document.contains(input)) cleanupIcon(input);
      }
    };

    // Watch for SPA DOM changes + cleanup
    observeDOMChanges((newForms) => {
      for (const form of newForms) {
        injectAutofillIcon(form);
        captureCredentials(form);
      }
    }, cleanupRemovedIcons);

    // Listen for messages from background
    browser.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'SHOW_SAVE_BANNER') {
        showSaveBanner(
          msg.site,
          msg.isUpdate,
          () => browser.runtime.sendMessage({ type: 'SAVE_CREDENTIAL', data: msg.credential }),
          () => {}, // Dismiss — do nothing
          msg.credential?.username,
        );
      }
      if (msg.type === 'CLEAR_CLIPBOARD') {
        navigator.clipboard.writeText('').catch(() => {});
      }
    });
  },
});
