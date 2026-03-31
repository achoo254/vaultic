// Detect login/signup forms on web pages by finding password inputs
// and their associated username/email fields

export interface DetectedForm {
  formElement: HTMLFormElement | null;
  usernameInput: HTMLInputElement | null;
  passwordInput: HTMLInputElement;
  type: 'login' | 'signup' | 'change-password';
}

/** Scan the page for visible password inputs and their associated forms. */
export function detectLoginForms(): DetectedForm[] {
  const passwordInputs = document.querySelectorAll<HTMLInputElement>(
    'input[type="password"]:not([aria-hidden="true"])',
  );

  const forms: DetectedForm[] = [];
  const seen = new Set<HTMLInputElement>();

  for (const pwInput of passwordInputs) {
    if (seen.has(pwInput) || !isVisible(pwInput)) continue;
    seen.add(pwInput);

    const form = pwInput.closest('form');
    const scope = form || document;
    const usernameInput = findUsernameInput(scope, pwInput);
    const type = classifyFormType(form, scope);

    forms.push({ formElement: form, usernameInput, passwordInput: pwInput, type });
  }

  return forms;
}

/** Find the most likely username/email input near a password field. */
function findUsernameInput(
  scope: Element | Document,
  pwInput: HTMLInputElement,
): HTMLInputElement | null {
  // Priority 1: autocomplete hints
  const byAutocomplete = scope.querySelector<HTMLInputElement>(
    'input[autocomplete="username"], input[autocomplete="email"]',
  );
  if (byAutocomplete && isVisible(byAutocomplete)) return byAutocomplete;

  // Priority 2: type="email"
  const byType = scope.querySelector<HTMLInputElement>('input[type="email"]');
  if (byType && isVisible(byType)) return byType;

  // Priority 3: text inputs with name/id heuristics
  const textInputs = scope.querySelectorAll<HTMLInputElement>(
    'input[type="text"], input:not([type])',
  );
  const heuristics = /user|email|login|account|name|id/i;

  for (const input of textInputs) {
    if (!isVisible(input)) continue;
    const attrs = `${input.name} ${input.id} ${input.placeholder}`;
    if (heuristics.test(attrs)) return input;
  }

  // Priority 4: closest preceding visible text/email input
  const allInputs = Array.from(
    scope.querySelectorAll<HTMLInputElement>('input'),
  ).filter((i) => isVisible(i) && i.type !== 'password' && i.type !== 'hidden' && i.type !== 'submit');

  const pwIndex = allInputs.indexOf(pwInput);
  // Take the input immediately before the password field
  for (let i = allInputs.length - 1; i >= 0; i--) {
    if (allInputs[i] !== pwInput && (pwIndex === -1 || i < pwIndex)) {
      return allInputs[i];
    }
  }

  return null;
}

/** Classify form as login, signup, or change-password. */
function classifyFormType(
  form: HTMLFormElement | null,
  scope: Element | Document,
): 'login' | 'signup' | 'change-password' {
  const pwInputs = scope.querySelectorAll('input[type="password"]');

  // 3+ password fields → likely change password (current + new + confirm)
  if (pwInputs.length >= 3) return 'change-password';

  // 2 password fields → signup (password + confirm)
  if (pwInputs.length >= 2) return 'signup';

  // Check for signup indicators in form text/action
  if (form) {
    const formText = `${form.action} ${form.textContent}`.toLowerCase();
    if (/sign.?up|register|create.?account|join/i.test(formText)) return 'signup';
  }

  return 'login';
}

/** Check if an element is visible in the viewport. */
function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    el.offsetWidth > 0 &&
    el.offsetHeight > 0
  );
}

/** Watch for dynamic DOM changes (SPA) — re-detect new forms + cleanup removed icons. */
export function observeDOMChanges(
  callback: (forms: DetectedForm[]) => void,
  onCleanup?: () => void,
) {
  let timeout: ReturnType<typeof setTimeout>;

  const observer = new MutationObserver((mutations) => {
    // Cleanup orphaned icons when nodes are removed from DOM
    if (mutations.some((m) => m.removedNodes.length > 0)) {
      onCleanup?.();
    }

    // Debounced: detect new forms
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const forms = detectLoginForms();
      if (forms.length > 0) callback(forms);
    }, 300);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}
