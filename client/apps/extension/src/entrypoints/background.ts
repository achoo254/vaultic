// Background service worker — orchestrator for auto-lock, autofill, clipboard

import { initAutoLock, checkAutoLock, recordActivity, listenAutoLockChanges } from './background/auto-lock-handler';
import { clearClipboardViaTab, scheduleClipboardClear } from './background/clipboard-handler';
import { getMatchingCredentials, handleCapturedCredential, saveCredential, fillCredentialById } from './background/credential-handler';
import { initSyncAlarm, handleSyncAlarm, listenSyncSettingsChanges } from './background/sync-alarm-handler';
import { initUpdateAlarm, handleUpdateAlarm, dismissUpdate } from './background/update-checker-handler';
import { UPDATE_ALARM_NAME, getUpdateState } from '../lib/update-checker';

export default defineBackground(() => {
  initAutoLock();
  listenAutoLockChanges();
  initSyncAlarm();
  listenSyncSettingsChanges();
  initUpdateAlarm();

  // Alarm handler for auto-lock check + clipboard clear + sync
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'auto-lock-check') await checkAutoLock();
    if (alarm.name === 'clear-clipboard') await clearClipboardViaTab();
    if (alarm.name === 'vaultic-sync') await handleSyncAlarm();
    if (alarm.name === UPDATE_ALARM_NAME) await handleUpdateAlarm();
  });

  // Message router for popup and content scripts
  browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    handleMessage(msg, sender).then(sendResponse).catch(() => sendResponse(null));
    return true;
  });

  console.log('Vaultic background service worker started');
});

/** Route messages from popup and content scripts. */
async function handleMessage(
  msg: { type: string; [key: string]: unknown },
  sender?: chrome.runtime.MessageSender,
) {
  switch (msg.type) {
    case 'lock': {
      await chrome.storage.session.remove('enc_key');
      return { ok: true };
    }
    case 'record-activity':
      return recordActivity();
    case 'schedule-clipboard-clear':
      return scheduleClipboardClear();
    case 'GET_MATCHES':
      return getMatchingCredentials(msg.url as string);
    case 'CREDENTIAL_CAPTURED':
      return handleCapturedCredential(msg.data as { url: string; username: string; password: string; name: string });
    case 'SAVE_CREDENTIAL':
      return saveCredential(msg.data as { url: string; username: string; password: string; name: string });
    case 'FILL_CREDENTIAL': {
      const tabId = sender?.tab?.id;
      if (tabId !== undefined) await fillCredentialById(msg.credentialId as string, tabId);
      return { ok: true };
    }
    case 'SYNC_NOW': {
      await handleSyncAlarm();
      return { ok: true };
    }
    case 'CHECK_UPDATE': {
      await handleUpdateAlarm();
      return { ok: true };
    }
    case 'GET_UPDATE_STATE': {
      return await getUpdateState();
    }
    case 'DISMISS_UPDATE': {
      await dismissUpdate(msg.version as string);
      return { ok: true };
    }
    default:
      return null;
  }
}
