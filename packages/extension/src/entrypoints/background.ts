// Background service worker — orchestrator for auto-lock, autofill, clipboard

import { initAutoLock, listenAutoLockChanges } from './background/auto-lock-handler';
import { clearClipboardViaTab, scheduleClipboardClear } from './background/clipboard-handler';
import { getMatchingCredentials, handleCapturedCredential, saveCredential } from './background/credential-handler';

export default defineBackground(() => {
  initAutoLock();
  listenAutoLockChanges();

  // Clipboard clear alarm handler
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'clear-clipboard') await clearClipboardViaTab();
  });

  // Message router for popup and content scripts
  browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    handleMessage(msg).then(sendResponse).catch(() => sendResponse(null));
    return true;
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
    case 'schedule-clipboard-clear':
      return scheduleClipboardClear();
    case 'GET_MATCHES':
      return getMatchingCredentials(msg.url as string);
    case 'CREDENTIAL_CAPTURED':
      return handleCapturedCredential(msg.data as { url: string; username: string; password: string; name: string });
    case 'SAVE_CREDENTIAL':
      return saveCredential(msg.data as { url: string; username: string; password: string; name: string });
    default:
      return null;
  }
}
