// Inject autofill icon into login form inputs using Shadow DOM for style isolation

import type { DetectedForm } from './form-detector';
import { fillLoginForm } from './field-filler';

const ICON_SIZE = 20;
const ICON_HTML = `
<style>
  .vaultic-icon {
    width: ${ICON_SIZE}px; height: ${ICON_SIZE}px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    border-radius: 4px; font-size: 14px;
    transition: background-color 0.15s;
    user-select: none;
  }
  .vaultic-icon:hover { background-color: rgba(37, 99, 235, 0.1); }
  .vaultic-dropdown {
    position: absolute; top: 100%; left: 0; right: 0; min-width: 280px;
    background: #fff; border: 1px solid #e4e4e7; border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12); z-index: 2147483647;
    max-height: 300px; overflow-y: auto; margin-top: 4px;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  .vaultic-item {
    padding: 10px 12px; cursor: pointer; display: flex; align-items: center; gap: 10px;
    border-bottom: 1px solid #f4f4f5;
  }
  .vaultic-item:hover { background-color: #f4f4f5; }
  .vaultic-item:last-child { border-bottom: none; }
  .vaultic-name { font-size: 14px; color: #18181b; font-weight: 500; }
  .vaultic-user { font-size: 12px; color: #71717a; }
  .vaultic-empty { padding: 16px; text-align: center; color: #71717a; font-size: 13px; }
  .vaultic-avatar {
    width: 32px; height: 32px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 600; flex-shrink: 0;
  }
</style>
`;

/** Inject the Vaultic autofill icon near a form's input. */
export function injectAutofillIcon(form: DetectedForm): void {
  const target = form.usernameInput || form.passwordInput;
  if (target.dataset.vaulticInjected === 'true') return;

  // Create Shadow DOM host
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute; z-index:2147483647; pointer-events:auto;';
  const shadow = host.attachShadow({ mode: 'closed' });

  // Position at right edge of input
  const positionIcon = () => {
    const rect = target.getBoundingClientRect();
    host.style.top = `${rect.top + window.scrollY + (rect.height - ICON_SIZE) / 2}px`;
    host.style.left = `${rect.right + window.scrollX - ICON_SIZE - 8}px`;
  };
  positionIcon();

  // Build icon
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.innerHTML = ICON_HTML + '<div class="vaultic-icon" title="Vaultic Autofill">🔑</div>';
  shadow.appendChild(wrapper);

  const icon = shadow.querySelector('.vaultic-icon')!;
  icon.addEventListener('click', (e) => {
    e.stopPropagation();
    showDropdown(shadow, wrapper, form);
  });

  document.body.appendChild(host);
  target.dataset.vaulticInjected = 'true';

  // Reposition on scroll/resize
  window.addEventListener('scroll', positionIcon, { passive: true });
  window.addEventListener('resize', positionIcon, { passive: true });
}

/** Show dropdown with matching credentials from vault. */
async function showDropdown(
  shadow: ShadowRoot,
  wrapper: HTMLElement,
  form: DetectedForm,
): Promise<void> {
  // Remove existing dropdown
  shadow.querySelector('.vaultic-dropdown')?.remove();

  const dropdown = document.createElement('div');
  dropdown.className = 'vaultic-dropdown';
  dropdown.innerHTML = '<div class="vaultic-empty">Loading...</div>';
  wrapper.appendChild(dropdown);

  // Ask background for matching credentials
  try {
    const currentUrl = window.location.hostname;
    const response = await browser.runtime.sendMessage({
      type: 'GET_MATCHES',
      url: currentUrl,
    });

    const matches: Array<{ id: string; name: string; username: string; password: string }> =
      response?.matches || [];

    if (matches.length === 0) {
      dropdown.innerHTML = '<div class="vaultic-empty">No saved credentials for this site</div>';
    } else {
      dropdown.innerHTML = '';
      for (const match of matches) {
        const initial = match.name.charAt(0).toUpperCase();
        const hue = match.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

        const item = document.createElement('div');
        item.className = 'vaultic-item';
        item.innerHTML = `
          <div class="vaultic-avatar" style="background:hsl(${hue},60%,90%);color:hsl(${hue},60%,40%)">${initial}</div>
          <div>
            <div class="vaultic-name">${escapeHtml(match.name)}</div>
            <div class="vaultic-user">${escapeHtml(match.username)}</div>
          </div>
        `;
        item.addEventListener('click', () => {
          fillLoginForm(form.usernameInput, form.passwordInput, match.username, match.password);
          dropdown.remove();
        });
        dropdown.appendChild(item);
      }
    }
  } catch {
    dropdown.innerHTML = '<div class="vaultic-empty">Failed to load credentials</div>';
  }

  // Close on outside click
  const closeHandler = (e: Event) => {
    if (!wrapper.contains(e.target as Node)) {
      dropdown.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 0);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
