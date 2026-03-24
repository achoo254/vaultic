---
phase: 6
priority: high
status: pending
estimated_days: 5
depends_on: [5]
---

# Phase 6: Autofill & Content Script

## Overview
Content script injected into web pages: detect login/signup forms, show autofill icon, dropdown with matching credentials, fill forms, capture new credentials on submit.

## Key Insights
- Content scripts run in isolated world — communicate with background via `chrome.runtime.sendMessage`
- Must handle SPA frameworks (React, Angular, Vue) — dispatch native input events
- Inject minimal UI — icon in input + dropdown overlay
- Never expose encryption key in content script — all crypto ops go through background

## Architecture

```
packages/extension/src/
├── entrypoints/
│   └── content.ts              # WXT content script entry
├── content/
│   ├── form-detector.ts        # Detect login/signup forms
│   ├── autofill-icon.ts        # Inject 🔑 icon into inputs
│   ├── autofill-dropdown.tsx   # React dropdown overlay
│   ├── credential-capture.ts   # Capture on form submit
│   ├── save-banner.tsx         # "Save password?" notification
│   ├── field-filler.ts         # Fill fields + dispatch events
│   └── styles.css              # Isolated styles (Shadow DOM)
```

## Implementation Steps

### 1. Content script entry — content.ts (1h)
```typescript
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  async main() {
    const forms = detectLoginForms();
    if (forms.length > 0) {
      for (const form of forms) {
        injectAutofillIcon(form);
      }
      observeDOMChanges(); // MutationObserver for SPA
    }
  },
});
```

### 2. Form detector — form-detector.ts (4h)

```typescript
interface DetectedForm {
  formElement: HTMLFormElement | null;
  usernameInput: HTMLInputElement | null;
  passwordInput: HTMLInputElement;
  type: 'login' | 'signup' | 'change-password';
}

export function detectLoginForms(): DetectedForm[] {
  const passwordInputs = document.querySelectorAll<HTMLInputElement>(
    'input[type="password"]:not([aria-hidden="true"])'
  );

  return Array.from(passwordInputs).map(pwInput => {
    const form = pwInput.closest('form');
    const usernameInput = findUsernameInput(form || document, pwInput);
    const type = classifyFormType(form, passwordInputs.length);
    return { formElement: form, usernameInput, passwordInput: pwInput, type };
  });
}

function findUsernameInput(scope: Element | Document, pwInput: HTMLInputElement): HTMLInputElement | null {
  // Priority: autocomplete="username" > type="email" > name heuristics
  const candidates = scope.querySelectorAll<HTMLInputElement>(
    'input[autocomplete="username"], input[autocomplete="email"], ' +
    'input[type="email"], input[type="text"]'
  );
  // Return closest preceding input to password field
  // Filter: visible, not hidden, not password type
}

function classifyFormType(form: HTMLFormElement | null, totalPwInputs: number): string {
  if (totalPwInputs >= 2) return 'signup';
  // Check for "forgot password" link nearby → confirms login
  return 'login';
}
```

### 3. MutationObserver for SPA (2h)
```typescript
export function observeDOMChanges() {
  const observer = new MutationObserver(
    debounce(() => {
      const forms = detectLoginForms();
      forms.forEach(f => injectAutofillIcon(f));
    }, 300)
  );
  observer.observe(document.body, { childList: true, subtree: true });
}
```

### 4. Autofill icon injection (3h)
```typescript
export function injectAutofillIcon(form: DetectedForm) {
  const target = form.usernameInput || form.passwordInput;
  if (target.dataset.vaulticInjected) return;

  // Create Shadow DOM for style isolation
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute; z-index:2147483647;';
  const shadow = host.attachShadow({ mode: 'closed' });

  // Position icon at right edge of input
  const rect = target.getBoundingClientRect();
  host.style.top = `${rect.top + window.scrollY + (rect.height - 20) / 2}px`;
  host.style.left = `${rect.right + window.scrollX - 28}px`;

  // Render icon
  shadow.innerHTML = `<style>/* isolated styles */</style>
    <div class="vaultic-icon" title="Vaultic Autofill">🔑</div>`;

  shadow.querySelector('.vaultic-icon')!.addEventListener('click', () => {
    showAutofillDropdown(form, host);
  });

  document.body.appendChild(host);
  target.dataset.vaulticInjected = 'true';
}
```

### 5. Autofill dropdown (4h)
```typescript
async function showAutofillDropdown(form: DetectedForm, anchor: HTMLElement) {
  // Ask background for matching credentials
  const currentUrl = window.location.hostname;
  const matches = await browser.runtime.sendMessage({
    type: 'GET_MATCHES',
    url: currentUrl
  });

  // Render dropdown (React in Shadow DOM)
  // Show: matching credentials + "Add new" + "Generate password"
  // On select: fill form fields
}
```

### 6. Field filler — dispatch SPA-compatible events (3h)
```typescript
export function fillField(input: HTMLInputElement, value: string) {
  // Set value via native setter (bypass React controlled component)
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype, 'value'
  )!.set!;
  nativeInputValueSetter.call(input, value);

  // Dispatch events that React/Angular/Vue listen to
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
}
```

### 7. Credential capture on submit (3h)
```typescript
export function captureCredentials(form: DetectedForm) {
  const submitHandler = (e: Event) => {
    const username = form.usernameInput?.value;
    const password = form.passwordInput.value;
    const url = window.location.hostname;

    if (username && password) {
      browser.runtime.sendMessage({
        type: 'CREDENTIAL_CAPTURED',
        data: { url, username, password }
      });
    }
  };

  if (form.formElement) {
    form.formElement.addEventListener('submit', submitHandler);
  }
  // Also watch for navigation (SPA) and button clicks
  form.passwordInput.closest('form')?.querySelector('[type="submit"], button')
    ?.addEventListener('click', submitHandler);
}
```

### 8. "Save password?" banner (3h)
Background receives `CREDENTIAL_CAPTURED` → checks if exists in vault:
- New credential → inject banner: "Save password for [site]?"
- Changed password → inject banner: "Update password for [site]?"
- Already saved & unchanged → do nothing

Banner UI: notification bar at top of page with [Save] [Never] [Dismiss]

### 9. Background message handlers (2h)
```typescript
// In background.ts
browser.runtime.onMessage.addListener(async (msg) => {
  switch (msg.type) {
    case 'GET_MATCHES':
      return getMatchingCredentials(msg.url);
    case 'CREDENTIAL_CAPTURED':
      return handleCapturedCredential(msg.data);
    case 'FILL_CREDENTIAL':
      return getDecryptedCredential(msg.id);
  }
});
```

## Todo List
- [ ] Content script entry (WXT defineContentScript)
- [ ] Form detector: find password + username inputs
- [ ] Form classifier: login vs signup vs change-password
- [ ] MutationObserver for SPA DOM changes
- [ ] Autofill icon injection (Shadow DOM)
- [ ] Autofill dropdown (matching credentials)
- [ ] Field filler (SPA-compatible event dispatch)
- [ ] Credential capture on form submit
- [ ] "Save password?" banner injection
- [ ] Background message handlers (GET_MATCHES, CREDENTIAL_CAPTURED)
- [ ] Keyboard shortcut: Ctrl+Shift+L to fill
- [ ] Test on: GitHub, Gmail, Amazon, Facebook, Twitter
- [ ] Test SPA: React app, Angular app
- [ ] Handle iframes (login forms in iframes)

## Success Criteria
- Autofill icon appears on login forms of top 20 sites
- Click icon → dropdown → select → fields filled correctly
- Works on React/Angular SPA login forms
- Credential capture detects new logins
- "Save password?" banner appears for new credentials
- Shadow DOM isolates styles (no conflict with page CSS)
- MutationObserver catches dynamically rendered forms
