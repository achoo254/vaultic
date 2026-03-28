// Vault configuration — offline vs online mode
export type VaultMode = 'offline' | 'online';

export interface VaultConfig {
  mode: VaultMode;
  salt: string;              // Argon2id salt (base64)
  authHashVerifier: string;  // SHA256(encryption_key) for offline verify
  createdAt: number;
  // Online-only fields:
  email?: string;
  userId?: string;
}
