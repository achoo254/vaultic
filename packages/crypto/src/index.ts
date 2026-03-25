// WebCrypto bridge — Argon2id KDF + AES-256-GCM encryption
export { deriveMasterKey, deriveEncryptionKey, deriveAuthHash } from './kdf';
export { encrypt, decrypt } from './cipher';
export { generatePassword } from './password-gen';
