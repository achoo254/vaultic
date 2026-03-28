// Inject autofill icon + dropdown into login form inputs using Shadow DOM
// Design: Screen 11 — Autofill Dropdown

import type { DetectedForm } from './form-detector';
import { fillLoginForm } from './field-filler';

const ICON_SIZE = 20;
const DROPDOWN_CSS = `
  .vaultic-icon {
    width: ${ICON_SIZE}px; height: ${ICON_SIZE}px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    border-radius: 4px; transition: background-color 0.15s; user-select: none;
  }
  .vaultic-icon:hover { background-color: rgba(37, 99, 235, 0.1); }

  /* Dropdown container — matches design screen 11 */
  .vaultic-dropdown {
    position: absolute; top: 100%; right: 0; width: 320px;
    background: #fff; border-radius: 10px; padding: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.09);
    z-index: 2147483647; margin-top: 4px;
    font-family: 'Inter', -apple-system, sans-serif;
    display: flex; flex-direction: column; gap: 4px;
  }

  /* Header: Vaultic logo + close */
  .vaultic-af-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 4px 8px;
  }
  .vaultic-af-logo {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 600; color: #2563EB;
  }
  .vaultic-af-close {
    width: 14px; height: 14px; cursor: pointer; opacity: 0.5;
  }
  .vaultic-af-close:hover { opacity: 1; }

  /* Credential item */
  .vaultic-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px; border-radius: 8px; cursor: pointer; height: 48px;
  }
  .vaultic-item:hover { background: #F4F4F5; }
  .vaultic-item-active { background: #EFF6FF; }
  .vaultic-item-active:hover { background: #DBEAFE; }
  .vaultic-avatar {
    width: 32px; height: 32px; border-radius: 6px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .vaultic-avatar svg { width: 16px; height: 16px; }
  .vaultic-info { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
  .vaultic-name { font-size: 13px; font-weight: 500; color: #18181B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .vaultic-sub { font-size: 11px; color: #71717A; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* Footer */
  .vaultic-af-footer {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 8px; border-top: 1px solid #E4E4E7;
    font-size: 12px; font-weight: 500; color: #71717A; cursor: pointer;
  }
  .vaultic-af-footer:hover { color: #18181B; }
  .vaultic-af-footer svg { width: 14px; height: 14px; }

  .vaultic-empty { padding: 16px; text-align: center; color: #71717a; font-size: 13px; }

  @media (prefers-color-scheme: dark) {
    .vaultic-dropdown { background: #18181B; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
    .vaultic-item:hover { background: #27272A; }
    .vaultic-item-active { background: #1E3A5F; }
    .vaultic-item-active:hover { background: #1E4976; }
    .vaultic-name { color: #FAFAFA; }
    .vaultic-sub { color: #A1A1AA; }
    .vaultic-af-footer { border-color: #27272A; color: #A1A1AA; }
    .vaultic-af-footer:hover { color: #FAFAFA; }
    .vaultic-empty { color: #A1A1AA; }
  }
`;

const SHIELD_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>`;
const GLOBE_SVG = (color: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;
const CLOSE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
const PLUS_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;

/** Inject the Vaultic autofill icon near a form's input. */
export function injectAutofillIcon(form: DetectedForm): void {
  const target = form.usernameInput || form.passwordInput;
  if (target.dataset.vaulticInjected === 'true') return;

  const host = document.createElement('div');
  host.style.cssText = 'position:absolute; z-index:2147483647; pointer-events:auto;';
  const shadow = host.attachShadow({ mode: 'closed' });

  const positionIcon = () => {
    const rect = target.getBoundingClientRect();
    host.style.top = `${rect.top + window.scrollY + (rect.height - ICON_SIZE) / 2}px`;
    host.style.left = `${rect.right + window.scrollX - ICON_SIZE - 8}px`;
  };
  positionIcon();

  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  const style = document.createElement('style');
  style.textContent = DROPDOWN_CSS;
  wrapper.appendChild(style);

  const icon = document.createElement('div');
  icon.className = 'vaultic-icon';
  icon.title = 'Vaultic Autofill';
  icon.innerHTML = SHIELD_SVG;
  icon.addEventListener('click', (e) => {
    e.stopPropagation();
    showDropdown(shadow, wrapper, form);
  });
  wrapper.appendChild(icon);
  shadow.appendChild(wrapper);

  document.body.appendChild(host);
  target.dataset.vaulticInjected = 'true';

  window.addEventListener('scroll', positionIcon, { passive: true });
  window.addEventListener('resize', positionIcon, { passive: true });
}

/** Show dropdown with matching credentials from vault. */
async function showDropdown(shadow: ShadowRoot, wrapper: HTMLElement, form: DetectedForm): Promise<void> {
  shadow.querySelector('.vaultic-dropdown')?.remove();

  const dropdown = document.createElement('div');
  dropdown.className = 'vaultic-dropdown';
  dropdown.innerHTML = `
    <div class="vaultic-af-header">
      <div class="vaultic-af-logo">${SHIELD_SVG} Vaultic</div>
      <div class="vaultic-af-close" id="vaultic-dd-close">${CLOSE_SVG}</div>
    </div>
    <div class="vaultic-empty">Loading...</div>
  `;
  wrapper.appendChild(dropdown);

  dropdown.querySelector('#vaultic-dd-close')!.addEventListener('click', () => dropdown.remove());

  const currentUrl = window.location.hostname;
  try {
    const response = await browser.runtime.sendMessage({ type: 'GET_MATCHES', url: currentUrl });
    const matches: Array<{ id: string; name: string; username: string; password: string }> = response?.matches || [];

    // Clear loading
    dropdown.querySelector('.vaultic-empty')?.remove();

    if (matches.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'vaultic-empty';
      empty.textContent = 'No saved credentials for this site';
      dropdown.appendChild(empty);
    } else {
      matches.forEach((match, i) => {
        const isFirst = i === 0;
        const item = document.createElement('div');
        item.className = `vaultic-item${isFirst ? ' vaultic-item-active' : ''}`;
        item.innerHTML = `
          <div class="vaultic-avatar" style="background:${isFirst ? '#2563EB' : '#F4F4F5'}; border-radius:6px">
            ${GLOBE_SVG(isFirst ? '#fff' : '#71717A')}
          </div>
          <div class="vaultic-info">
            <div class="vaultic-name">${escapeHtml(match.username || match.name)}</div>
            <div class="vaultic-sub">${escapeHtml(currentUrl)}</div>
          </div>
        `;
        item.addEventListener('click', () => {
          fillLoginForm(form.usernameInput, form.passwordInput, match.username, match.password);
          dropdown.remove();
        });
        dropdown.appendChild(item);
      });
    }

    // Footer: Add new login
    const footer = document.createElement('div');
    footer.className = 'vaultic-af-footer';
    footer.innerHTML = `${PLUS_SVG} Add new login`;
    footer.addEventListener('click', () => {
      dropdown.remove();
      // Open extension popup (best-effort)
      browser.runtime.sendMessage({ type: 'OPEN_POPUP' }).catch(() => {});
    });
    dropdown.appendChild(footer);
  } catch {
    const empty = dropdown.querySelector('.vaultic-empty');
    if (empty) empty.textContent = 'Failed to load credentials';
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
