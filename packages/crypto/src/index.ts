// WebCrypto bridge — Argon2id KDF + AES-256-GCM encryption
export { deriveMasterKey, deriveEncryptionKey, deriveAuthHash, deriveKeys } from './kdf';
export { encrypt, decrypt, encryptBytes, decryptBytes } from './cipher';
export { generatePassword } from './password-gen';
