// Background service worker — auto-lock, autofill message handlers

import { IndexedDBStore } from '@vaultic/storage';
import { decrypt } from '@vaultic/crypto';

const AUTO_LOCK_MINUTES = 15;
const LAST_ACTIVITY_KEY = 'last_activity_at';

export default defineBackground(() => {
  // Auto-lock check every minute
  browser.alarms.create('auto-lock-check', { periodInMinutes: 1 });
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'auto-lock-check') await checkIdleAndLock();
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
    case 'activity-ping': {
      await chrome.storage.session.set({ [LAST_ACTIVITY_KEY]: Date.now() });
      return { ok: true };
    }

    case 'lock': {
      await chrome.storage.session.remove('enc_key');
      return { ok: true };
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

/** Auto-lock vault after idle timeout. */
async function checkIdleAndLock() {
  const result = await chrome.storage.session.get([LAST_ACTIVITY_KEY, 'enc_key']);
  if (!result.enc_key) return;
  const lastActivity = result[LAST_ACTIVITY_KEY] || 0;
  if (Date.now() - lastActivity > AUTO_LOCK_MINUTES * 60 * 1000) {
    await chrome.storage.session.remove('enc_key');
    console.log('Auto-locked vault after idle timeout');
  }
}
