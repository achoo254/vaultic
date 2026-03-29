// Credential matching, capture detection, and save logic

import { IndexedDBStore, IndexedDBSyncQueue } from '@vaultic/storage';
import { decrypt } from '@vaultic/crypto';
import { getEncKey, extractDomain } from './crypto-helpers';
import { getVaultConfig } from '../../lib/session-storage';

const syncQueue = new IndexedDBSyncQueue();

/** Resolve current userId from stored VaultConfig. */
async function getCurrentUserId(): Promise<string> {
  const config = await getVaultConfig();
  return config?.mode === 'online' && config.userId ? config.userId : 'local';
}

/** Get decrypted credentials matching a URL. */
export async function getMatchingCredentials(url: string) {
  const key = await getEncKey();
  if (!key) return { matches: [] };

  const store = new IndexedDBStore();
  const userId = await getCurrentUserId();
  const items = await store.getAllItems(userId);
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
  const userId = await getCurrentUserId();
  const items = await store.getAllItems(userId);
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

/** Save a credential to the vault. Checks for duplicates (domain + username) first —
 *  if an existing credential matches, updates its password instead of creating a new entry. */
export async function saveCredential(data: {
  url: string; username: string; password: string; name: string;
}) {
  const key = await getEncKey();
  if (!key) return;

  const { encrypt } = await import('@vaultic/crypto');
  const store = new IndexedDBStore();
  const userId = await getCurrentUserId();
  const items = await store.getAllItems(userId);
  const dataDomain = extractDomain(data.url);

  // Check for existing credential with same domain + username
  for (const item of items) {
    try {
      const json = await decrypt(key, item.encrypted_data);
      const cred = JSON.parse(json);
      if (cred.url && extractDomain(cred.url) === dataDomain && cred.username === data.username) {
        // Duplicate found — update password if changed, otherwise skip
        if (cred.password === data.password) return;
        cred.password = data.password;
        const encrypted = await encrypt(key, JSON.stringify(cred));
        await store.putItem({ ...item, encrypted_data: encrypted, version: item.version + 1, updated_at: new Date().toISOString() });
        await syncQueue.enqueue({ id: crypto.randomUUID(), user_id: userId, item_id: item.id, action: 'update', timestamp: Date.now() });
        return;
      }
    } catch {
      // Skip items that fail to decrypt
    }
  }

  // No duplicate — create new entry
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const credential = { name: data.name || data.url, url: data.url, username: data.username, password: data.password };
  const encrypted = await encrypt(key, JSON.stringify(credential));

  await store.putItem({
    id,
    user_id: userId,
    item_type: 'login' as never,
    encrypted_data: encrypted,
    device_id: '',
    version: 1,
    created_at: now,
    updated_at: now,
  });
  await syncQueue.enqueue({ id: crypto.randomUUID(), user_id: userId, item_id: id, action: 'create', timestamp: Date.now() });
}
