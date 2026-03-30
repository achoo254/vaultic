// Shared HTML escaping utility for content scripts
// Prevents XSS when inserting user-controlled strings into innerHTML

/** Escape &, <, >, " in a string so it is safe for HTML injection. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
