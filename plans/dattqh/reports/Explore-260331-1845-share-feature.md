# Vaultic Share Feature - Complete Exploration Report

## EXECUTIVE SUMMARY

Vaultic implements a hybrid share model combining:
- URL-based encryption (AES-256-GCM, stays client-side)
- Server-side metadata tracking (expiry, view counts, ownership)
- 2KB URL size limit (MAX_FRAGMENT_LENGTH = 2000)
- TTL + view limits with atomic MongoDB operations
- Backward compatible with legacy server-stored shares

---

## KEY FILES & PATHS
