// CSS styles for autofill icon, dropdown, and inline add-credential form
// Supports light + dark theme via prefers-color-scheme

const ICON_SIZE = 20;

export { ICON_SIZE };

export const DROPDOWN_CSS = `
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

  /* Inline add-credential form */
  .vaultic-add-form {
    display: flex; flex-direction: column; gap: 8px;
    padding: 4px 0;
  }
  .vaultic-add-form input {
    width: 100%; box-sizing: border-box;
    padding: 8px 10px; border: 1px solid #E4E4E7; border-radius: 6px;
    font-size: 13px; font-family: 'Inter', -apple-system, sans-serif;
    color: #18181B; background: #FAFAFA; outline: none;
  }
  .vaultic-add-form input:focus { border-color: #2563EB; background: #fff; }
  .vaultic-add-form input::placeholder { color: #A1A1AA; }
  .vaultic-add-btns { display: flex; gap: 6px; }
  .vaultic-add-btns button {
    flex: 1; padding: 8px; border-radius: 6px; border: none;
    font-size: 12px; font-weight: 500; cursor: pointer;
    font-family: 'Inter', -apple-system, sans-serif;
  }
  .vaultic-btn-cancel { background: #F4F4F5; color: #71717A; }
  .vaultic-btn-cancel:hover { background: #E4E4E7; }
  .vaultic-btn-save { background: #2563EB; color: #fff; }
  .vaultic-btn-save:hover { background: #1D4ED8; }
  .vaultic-btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
  .vaultic-add-error { font-size: 11px; color: #EF4444; padding: 0 2px; }

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
    .vaultic-add-form input { background: #27272A; border-color: #3F3F46; color: #FAFAFA; }
    .vaultic-add-form input:focus { border-color: #2563EB; background: #18181B; }
    .vaultic-add-form input::placeholder { color: #71717A; }
    .vaultic-btn-cancel { background: #27272A; color: #A1A1AA; }
    .vaultic-btn-cancel:hover { background: #3F3F46; }
  }
`;

// SVG icons used in autofill dropdown
export const SHIELD_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>`;
export const GLOBE_SVG = (color: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;
export const CLOSE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
export const PLUS_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;
