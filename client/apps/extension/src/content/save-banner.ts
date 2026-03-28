// "Save password?" banner — floating card matching design (screen 12)

/** Show a save password banner as a floating card at top-right of page. */
export function showSaveBanner(
  site: string,
  isUpdate: boolean,
  onSave: () => void,
  onDismiss: () => void,
  username?: string,
): void {
  // Remove existing banner
  document.getElementById('vaultic-save-banner')?.remove();

  const title = isUpdate
    ? `Update password for ${site}?`
    : `Save password for ${site}?`;

  const banner = document.createElement('div');
  banner.id = 'vaultic-save-banner';
  banner.innerHTML = `
    <style>
      @keyframes vaultic-banner-in { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
      #vaultic-save-banner { all:initial; position:fixed; top:12px; right:12px; z-index:2147483647;
        display:flex; align-items:center; gap:12px; height:56px; padding:10px 16px;
        background:#fff; border-radius:10px; font-family:'Inter',-apple-system,sans-serif;
        box-shadow:0 4px 16px rgba(0,0,0,0.09); animation:vaultic-banner-in 0.25s ease; }
      #vaultic-save-banner * { all:unset; box-sizing:border-box; }
      .vaultic-sb-icon { width:20px; height:20px; flex-shrink:0; }
      .vaultic-sb-text { display:flex; flex-direction:column; gap:1px; flex:1; min-width:0; }
      .vaultic-sb-title { font-size:13px; font-weight:600; color:#18181B; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .vaultic-sb-sub { font-size:11px; color:#71717A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .vaultic-sb-save { display:flex; align-items:center; justify-content:center; height:32px; padding:0 14px;
        background:#2563EB; color:#fff; font-size:12px; font-weight:600; border-radius:6px; cursor:pointer; flex-shrink:0; }
      .vaultic-sb-save:hover { background:#1D4ED8; }
      .vaultic-sb-never { font-size:12px; font-weight:500; color:#71717A; cursor:pointer; flex-shrink:0; }
      .vaultic-sb-never:hover { color:#18181B; }
      .vaultic-sb-close { width:16px; height:16px; cursor:pointer; flex-shrink:0; opacity:0.5; }
      .vaultic-sb-close:hover { opacity:1; }
      @media (prefers-color-scheme: dark) {
        #vaultic-save-banner { background:#18181B; box-shadow:0 4px 16px rgba(0,0,0,0.3); }
        .vaultic-sb-title { color:#FAFAFA; }
        .vaultic-sb-sub { color:#A1A1AA; }
        .vaultic-sb-save { background:#3B82F6; }
        .vaultic-sb-save:hover { background:#2563EB; }
        .vaultic-sb-never { color:#A1A1AA; }
        .vaultic-sb-never:hover { color:#FAFAFA; }
      }
    </style>
    <svg class="vaultic-sb-icon" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
    <div class="vaultic-sb-text">
      <span class="vaultic-sb-title">${escapeHtml(title)}</span>
      ${username ? `<span class="vaultic-sb-sub">${escapeHtml(username)}</span>` : ''}
    </div>
    <div class="vaultic-sb-save" id="vaultic-save-btn">Save</div>
    <span class="vaultic-sb-never" id="vaultic-never-btn">Never</span>
    <svg class="vaultic-sb-close" id="vaultic-close-btn" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  `;

  document.body.appendChild(banner);

  banner.querySelector('#vaultic-save-btn')!.addEventListener('click', () => {
    onSave();
    banner.remove();
  });
  banner.querySelector('#vaultic-never-btn')!.addEventListener('click', () => {
    onDismiss();
    banner.remove();
  });
  banner.querySelector('#vaultic-close-btn')!.addEventListener('click', () => {
    banner.remove();
  });

  // Auto-dismiss after 15 seconds
  setTimeout(() => banner.remove(), 15000);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
