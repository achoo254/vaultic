// "Save password?" banner — injected at top of page when new credentials detected

/** Show a save password banner at the top of the page. */
export function showSaveBanner(
  site: string,
  isUpdate: boolean,
  onSave: () => void,
  onDismiss: () => void,
): void {
  // Remove existing banner
  document.getElementById('vaultic-save-banner')?.remove();

  const banner = document.createElement('div');
  banner.id = 'vaultic-save-banner';
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
    background: #2563eb; color: #fff; padding: 12px 20px;
    display: flex; align-items: center; justify-content: space-between;
    font-family: 'Inter', -apple-system, sans-serif; font-size: 14px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2); animation: vaultic-slide-in 0.3s ease;
  `;

  const text = isUpdate
    ? `Update password for ${site}?`
    : `Save password for ${site}?`;

  banner.innerHTML = `
    <style>
      @keyframes vaultic-slide-in { from { transform: translateY(-100%); } to { transform: translateY(0); } }
    </style>
    <span>🔐 ${text}</span>
    <div style="display:flex;gap:8px">
      <button id="vaultic-save-btn" style="background:#fff;color:#2563eb;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-weight:500;font-size:13px">Save</button>
      <button id="vaultic-dismiss-btn" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.3);padding:6px 12px;border-radius:6px;cursor:pointer;font-size:13px">Dismiss</button>
    </div>
  `;

  document.body.prepend(banner);

  banner.querySelector('#vaultic-save-btn')!.addEventListener('click', () => {
    onSave();
    banner.remove();
  });
  banner.querySelector('#vaultic-dismiss-btn')!.addEventListener('click', () => {
    onDismiss();
    banner.remove();
  });

  // Auto-dismiss after 15 seconds
  setTimeout(() => banner.remove(), 15000);
}
