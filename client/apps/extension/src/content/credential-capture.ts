// Capture credentials on form submit — detect new/changed passwords

import type { DetectedForm } from './form-detector';

/** Watch a form for submit events and capture credentials. */
export function captureCredentials(form: DetectedForm): void {
  const handler = () => {
    const username = form.usernameInput?.value?.trim();
    const password = form.passwordInput.value;
    const url = window.location.hostname;
    const pageTitle = document.title;

    if (password && password.length > 0) {
      browser.runtime.sendMessage({
        type: 'CREDENTIAL_CAPTURED',
        data: { url, username: username || '', password, name: pageTitle },
      }).catch(() => {});
    }
  };

  // Listen to form submit
  if (form.formElement) {
    form.formElement.addEventListener('submit', handler, { once: true });
  }

  // Also watch submit buttons (covers SPA forms without native submit)
  const submitBtn = (form.formElement || document).querySelector<HTMLElement>(
    'button[type="submit"], input[type="submit"], button:not([type])',
  );
  if (submitBtn) {
    submitBtn.addEventListener('click', handler, { once: true });
  }
}
