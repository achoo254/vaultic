// Background service worker — auto-lock, autofill message handlers

import { IndexedDBStore } from '@vaultic/storage';
import { decrypt } from '@vaultic/crypto';

const DEFAULT_AUTO_LOCK_MINUTES = 15;

export default defineBackground(() => {
  // Auto-lock via chrome.idle API — tracks system-wide idle, not just popup
  initAutoLock();

  // Re-apply idle interval when user changes setting
  chrome.storage.local.onChanged.addListener((changes) => {
    if (changes.auto_lock_min) {
      const minutes = changes.auto_lock_min.newValue || DEFAULT_AUTO_LOCK_MINUTES;
      chrome.idle.setDetectionInterval(minutes * 60);
    }
  });

  // Clipboard clear alarm handler
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'clear-clipboard') await clearClipboardViaTab();
  });

  // Message router for popup and content scripts
  browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    handleMessage(msg).then(sendResponse).catch(() => sendResponse(null));
    return true; // Keep channel open for async
  });

  console.log('Vaultic background service worker started');
});

/** Route messages from popup and content scripts. */
async function handleMessage(msg: { type: string; [key: string]: unknown }) {
  switch (msg.type) {
    case 'lock': {
      await chrome.storage.session.remove('enc_key');
      return { ok: true };
    }

    case 'schedule-clipboard-clear': {
      return scheduleClipboardClear();
    }

    case 'GET_MATCHES': {
      return getMatchingCredentials(msg.url as string);
    }

    case 'CREDENTIAL_CAPTURED': {
      return handleCapturedCredential(msg.data as {
        url: string; username: string; password: string; name: string;
      });
    }

    case 'SAVE_CREDENTIAL': {
      return saveCredential(msg.data as {
        url: string; username: string; password: string; name: string;
      });
    }

    default:
      return null;
  }
}

/** Get decrypted credentials matching a URL. */
async function getMatchingCredentials(url: string) {
  const key = await getEncKey();
  if (!key) return { matches: [] };

  const store = new IndexedDBStore();
  const items = await store.getAllItems();
  const matches: Array<{ id: string; name: string; username: string; password: string }> = [];

  for (const item of items) {
    try {
      const json = await decrypt(key, item.encrypted_data);
      const cred = JSON.parse(json);
      if (cred.url && url.includes(extractDomain(cred.url))) {
        matches.push({
          id: item.id,
          name: cred.name || cred.url,
          username: cred.username || '',
          password: cred.password || '',
        });
      }
    } catch {
      // Skip items that fail to decrypt
    }
  }

  return { matches };
}

/** Handle a captured credential — check if new or updated, notify content script. */
async function handleCapturedCredential(data: {
  url: string; username: string; password: string; name: string;
}) {
  const key = await getEncKey();
  if (!key) return;

  const store = new IndexedDBStore();
  const items = await store.getAllItems();
  let isUpdate = false;

  // Check if credential already exists
  for (const item of items) {
    try {
      const json = await decrypt(key, item.encrypted_data);
      const cred = JSON.parse(json);
      if (cred.url && data.url.includes(extractDomain(cred.url)) && cred.username === data.username) {
        if (cred.password === data.password) return; // Unchanged — do nothing
        isUpdate = true;
        break;
      }
    } catch {
      // Skip
    }
  }

  // Send save banner to the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'SHOW_SAVE_BANNER',
      site: data.url,
      isUpdate,
      credential: data,
    }).catch(() => {});
  }
}

/** Save a credential to the vault. */
async function saveCredential(data: {
  url: string; username: string; password: string; name: string;
}) {
  const key = await getEncKey();
  if (!key) return;

  const { encrypt } = await import('@vaultic/crypto');
  const store = new IndexedDBStore();

  const now = new Date().toISOString();
  const credential = { name: data.name || data.url, url: data.url, username: data.username, password: data.password };
  const encrypted = await encrypt(key, JSON.stringify(credential));

  await store.putItem({
    id: crypto.randomUUID(),
    item_type: 'login' as never,
    encrypted_data: encrypted,
    device_id: '',
    version: 1,
    created_at: now,
    updated_at: now,
  });
}

/** Get encryption key from session storage. */
async function getEncKey(): Promise<CryptoKey | null> {
  const result = await chrome.storage.session.get('enc_key');
  if (!result.enc_key) return null;
  return crypto.subtle.importKey(
    'raw', new Uint8Array(result.enc_key),
    { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'],
  );
}

/** Extract base domain from a URL string. */
function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}

/** Initialize auto-lock using chrome.idle API — tracks system-wide idle state. */
async function initAutoLock() {
  const settings = await chrome.storage.local.get('auto_lock_min');
  const minutes = settings.auto_lock_min || DEFAULT_AUTO_LOCK_MINUTES;
  chrome.idle.setDetectionInterval(minutes * 60);

  chrome.idle.onStateChanged.addListener(async (state) => {
    if (state === 'locked' || state === 'idle') {
      const result = await chrome.storage.session.get('enc_key');
      if (result.enc_key) {
        await chrome.storage.session.remove('enc_key');
        console.log(`Auto-locked vault (system ${state})`);
      }
    }
  });
}

/** Schedule clipboard clear via alarm — survives popup close. */
async function scheduleClipboardClear() {
  const settings = await chrome.storage.local.get('clipboard_clear_sec');
  const seconds = settings.clipboard_clear_sec ?? 30;
  if (seconds === 0) return { ok: true }; // "Never" — skip

  // Alarms need minimum 0.5 min in production, use delayInMinutes
  await browser.alarms.create('clear-clipboard', {
    delayInMinutes: Math.max(seconds / 60, 0.5),
  });
  return { ok: true };
}

/** Clear clipboard by sending message to active tab's content script. */
async function clearClipboardViaTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_CLIPBOARD' }).catch(() => {});
    }
  } catch {
    // No active tab — clipboard already protected by session end
  }
}
