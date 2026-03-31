// Centralized web app configuration — single source of truth for env vars

/** API base URL — empty string means same-origin (works with Vite proxy in dev, nginx in prod) */
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
