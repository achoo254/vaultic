// Credential matching, capture detection, and save logic

import { IndexedDBStore } from '@vaultic/storage';
import { decrypt } from '@vaultic/crypto';
import { getEncKey, extractDomain } from './crypto-helpers';

/** Get decrypted credentials matching a URL. */
export async function getMatchingCredentials(url: string) {
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
export async function handleCapturedCredential(data: {
  url: string; username: string; password: string; name: string;
}) {
  const key = await getEncKey();
  if (!key) return;

  const store = new IndexedDBStore();
  const items = await store.getAllItems();
  let isUpdate = false;

  for (const item of items) {
    try {
      const json = await decrypt(key, item.encrypted_data);
      const cred = JSON.parse(json);
      if (cred.url && data.url.includes(extractDomain(cred.url)) && cred.username === data.username) {
        if (cred.password === data.password) return; // Unchanged
        isUpdate = true;
        break;
      }
    } catch {
      // Skip
    }
  }

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
export async function saveCredential(data: {
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
