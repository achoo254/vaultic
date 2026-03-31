// Inject autofill icon + dropdown into login form inputs using Shadow DOM
// Design: Screen 11 — Autofill Dropdown

import type { DetectedForm } from './form-detector';
import { showInlineAddForm } from './autofill-inline-add-form';
import {
  ICON_SIZE, DROPDOWN_CSS,
  SHIELD_SVG, GLOBE_SVG, CLOSE_SVG, PLUS_SVG,
} from './autofill-dropdown-styles';
import { escapeHtml } from './utils/escape-html';

// Track input → shadow host and input → listener refs for cleanup
const iconMap = new Map<HTMLInputElement, HTMLDivElement>();
const listenerMap = new Map<HTMLInputElement, { scroll: () => void; resize: () => void }>();

/** Remove icon host, window listeners, and tracking entries for a given input. */
export function cleanupIcon(input: HTMLInputElement): void {
  const host = iconMap.get(input);
  if (host) host.remove();

  const listeners = listenerMap.get(input);
  if (listeners) {
    window.removeEventListener('scroll', listeners.scroll);
    window.removeEventListener('resize', listeners.resize);
  }

  iconMap.delete(input);
  listenerMap.delete(input);
  delete input.dataset.vaulticInjected;
}

/** Get the icon tracking map — used by MutationObserver cleanup in form-detector. */
export function getIconMap(): Map<HTMLInputElement, HTMLDivElement> {
  return iconMap;
}

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

  // Track icon and listeners for cleanup when input is removed from DOM
  iconMap.set(target, host);
  listenerMap.set(target, { scroll: positionIcon, resize: positionIcon });

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
    const matches: Array<{ id: string; name: string; username: string }> = response?.matches || [];

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
          <div class="vaultic-avatar" style="background:${isFirst ? '#024799' : '#F4F7FA'}; border-radius:6px">
            ${GLOBE_SVG(isFirst ? '#fff' : '#4A6278')}
          </div>
          <div class="vaultic-info">
            <div class="vaultic-name">${escapeHtml(match.username || match.name)}</div>
            <div class="vaultic-sub">${escapeHtml(currentUrl)}</div>
          </div>
        `;
        item.addEventListener('click', () => {
          // Send fill request to background — plaintext password never crosses this boundary
          browser.runtime.sendMessage({ type: 'FILL_CREDENTIAL', credentialId: match.id }).catch(() => {});
          dropdown.remove();
        });
        dropdown.appendChild(item);
      });
    }

    // Footer: Add new login — shows inline form
    const footer = document.createElement('div');
    footer.className = 'vaultic-af-footer';
    footer.innerHTML = `${PLUS_SVG} Add new login`;
    footer.addEventListener('click', (e) => {
      e.stopPropagation();
      showInlineAddForm(dropdown, form);
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

