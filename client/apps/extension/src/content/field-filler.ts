// Fill form fields with SPA-compatible event dispatch
// Works with React, Angular, Vue controlled components

/** Fill an input field and dispatch events that SPA frameworks listen to. */
export function fillField(input: HTMLInputElement, value: string): void {
  // Focus the input first
  input.focus();

  // Use the native value setter to bypass React's synthetic event system
  const nativeSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set;

  if (nativeSetter) {
    nativeSetter.call(input, value);
  } else {
    input.value = value;
  }

  // Dispatch events in order that frameworks expect
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
  input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));

  // Blur to trigger validation
  input.dispatchEvent(new Event('blur', { bubbles: true }));
}

/** Fill a complete login form with username and password. */
export function fillLoginForm(
  usernameInput: HTMLInputElement | null,
  passwordInput: HTMLInputElement,
  username: string,
  password: string,
): void {
  if (usernameInput && username) {
    fillField(usernameInput, username);
  }
  // Small delay between fields to mimic user behavior
  setTimeout(() => {
    fillField(passwordInput, password);
  }, 50);
}
