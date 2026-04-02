# Code Review: Chrome Web Store Publish Preparation

**Reviewer:** code-reviewer | **Date:** 2026-03-31
**Files:** wxt.config.ts, consent-screen.tsx (NEW), popup/app.tsx

## Overall Assessment

Clean implementation. Consent gate logic is correct. Design tokens used properly. A few issues to address before CWS submission.

---

## WARNING: chrome.storage.local error not handled (app.tsx:57-59)

`chrome.storage.local.get()` can fail (e.g., storage corruption, quota exceeded). The callback does not check `chrome.runtime.lastError`. If it fails silently, `consentAccepted` stays `null` forever and the user sees a blank popup.

```tsx
// Current
chrome.storage.local.get(CONSENT_KEY, (result) => {
  setConsentAccepted(result[CONSENT_KEY] === true);
});

// Fix — add error handling
chrome.storage.local.get(CONSENT_KEY, (result) => {
  if (chrome.runtime.lastError) {
    console.error('Consent check failed:', chrome.runtime.lastError);
    setConsentAccepted(false); // fallback: show consent again
    return;
  }
  setConsentAccepted(result[CONSENT_KEY] === true);
});
```

Same applies to `chrome.storage.local.set()` in `handleConsentAccept` (line 63). If `set` fails, the user accepted but it was not persisted — they will see consent again next open. Consider adding `lastError` check there too.

## WARNING: Manifest icon paths may be wrong (wxt.config.ts:14-18)

WXT resolves manifest icon paths relative to the `public/` directory. The icons exist at both `src/assets/icons/` and `src/public/assets/icons/`. Current config specifies `assets/icons/icon-*.png` — this will resolve correctly from `public/` only if WXT copies them. Verify the built manifest contains valid icon references by checking `.output/chrome-mv3/manifest.json` after a build.

## NOTE: Checkmark uses Unicode character instead of Tabler icon (consent-screen.tsx:86)

Project rule: "ALL icons must use `@tabler/icons-react`". The `✓` character on line 86 is a text glyph, not an icon component. Minor, but for consistency could use `<IconCheck size={14} stroke={1.5} />` from Tabler. Low priority.

## NOTE: ConsentScreen renders outside ThemeProvider's useTheme scope (app.tsx:112-113)

`ConsentScreen` calls `useTheme()` internally. It renders inside `<ThemeProvider>` (line 110), so this is fine. No issue.

## NOTE: Race condition assessment — SAFE

Consent check (useEffect #1) is async but sets state. Hydrate (useEffect #2) guards on `consentAccepted === true`. Because React batches state updates and effects run in order, there is no race: hydrate will only fire after consent state is resolved. The `consentAccepted === null` early return (line 107) prevents any flash of wrong content.

## NOTE: XSS vector assessment — SAFE

`openLink()` passes hardcoded constant URLs (`PRIVACY_URL`, `TERMS_URL`) to `chrome.tabs.create()`. No user input flows into these URLs. No injection vector.

## NOTE: `host_permissions: ['<all_urls>']` (wxt.config.ts:21)

This is a broad permission. CWS reviewers may flag this and ask for justification. Make sure the extension description or CWS listing explains why (autofill on all sites). This is expected for a password manager but worth noting for the CWS review process.

---

## Summary

| Severity | Count | Items |
|----------|-------|-------|
| CRITICAL | 0 | — |
| WARNING | 2 | chrome.storage error handling, icon path verification |
| NOTE | 4 | Unicode checkmark, theme scope (OK), race condition (OK), broad permissions |

**Verdict:** Ship after fixing the two WARNINGs. No blocking issues.
