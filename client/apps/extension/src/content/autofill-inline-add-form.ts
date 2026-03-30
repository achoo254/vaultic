// Inline add-credential form shown inside the autofill dropdown
// Replaces dropdown content with username/password fields + save button

import type { DetectedForm } from './form-detector';
import { fillLoginForm } from './field-filler';
import { escapeHtml } from './utils/escape-html';

/** Replace dropdown content with inline add-credential form. */
export function showInlineAddForm(dropdown: HTMLElement, form: DetectedForm): void {
  // Preserve header, clear the rest
  const header = dropdown.querySelector('.vaultic-af-header');
  dropdown.innerHTML = '';
  if (header) dropdown.appendChild(header);

  const formEl = document.createElement('div');
  formEl.className = 'vaultic-add-form';

  // Pre-fill from the page's form inputs if available
  const prefillUser = form.usernameInput?.value || '';
  const prefillPass = form.passwordInput?.value || '';
  const currentHost = window.location.hostname;

  formEl.innerHTML = `
    <input type="text" id="vaultic-add-user" placeholder="Username or email" value="${escapeHtml(prefillUser)}" />
    <input type="password" id="vaultic-add-pass" placeholder="Password" value="${escapeHtml(prefillPass)}" />
    <div class="vaultic-add-error" id="vaultic-add-err" style="display:none"></div>
    <div class="vaultic-add-btns">
      <button type="button" class="vaultic-btn-cancel" id="vaultic-add-cancel">Cancel</button>
      <button type="button" class="vaultic-btn-save" id="vaultic-add-save">Save</button>
    </div>
  `;
  dropdown.appendChild(formEl);

  // Prevent clicks inside form from triggering the outside-click close handler
  formEl.addEventListener('click', (e) => e.stopPropagation());

  const userInput = formEl.querySelector('#vaultic-add-user') as HTMLInputElement;
  const passInput = formEl.querySelector('#vaultic-add-pass') as HTMLInputElement;
  const errEl = formEl.querySelector('#vaultic-add-err') as HTMLElement;
  const saveBtn = formEl.querySelector('#vaultic-add-save') as HTMLButtonElement;
  const cancelBtn = formEl.querySelector('#vaultic-add-cancel') as HTMLButtonElement;

  // Focus username field (or password if username pre-filled)
  setTimeout(() => (prefillUser ? passInput : userInput).focus(), 50);

  cancelBtn.addEventListener('click', () => dropdown.remove());

  saveBtn.addEventListener('click', async () => {
    const username = userInput.value.trim();
    const password = passInput.value;
    if (!username && !password) {
      errEl.textContent = 'Enter username or password';
      errEl.style.display = 'block';
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    errEl.style.display = 'none';

    try {
      await browser.runtime.sendMessage({
        type: 'SAVE_CREDENTIAL',
        data: { url: currentHost, username, password, name: currentHost },
      });
      // Auto-fill the form after saving
      fillLoginForm(form.usernameInput, form.passwordInput, username, password);
      dropdown.remove();
    } catch {
      errEl.textContent = 'Failed to save';
      errEl.style.display = 'block';
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  });

  // Allow Enter to save
  const handleEnter = (e: KeyboardEvent) => {
    if (e.key === 'Enter') saveBtn.click();
  };
  userInput.addEventListener('keydown', handleEnter);
  passInput.addEventListener('keydown', handleEnter);
}

