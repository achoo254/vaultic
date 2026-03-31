// WebCrypto bridge — Argon2id KDF + AES-256-GCM encryption
export { deriveMasterKey, deriveMasterKeyWithSalt, deriveEncryptionKey, deriveEncryptionKeyWithBytes, deriveAuthHash, deriveKeys } from './kdf';
export { encrypt, decrypt, encryptBytes, decryptBytes } from './cipher';
export { generatePassword } from './password-gen';
export {
  toBase64Url, fromBase64Url,
  encodeShareFragment, decodeShareFragment,
  estimateFragmentSize, isWithinUrlLimit, MAX_FRAGMENT_LENGTH,
} from './url-share-codec';

// Vault helpers — encrypt/decrypt vault items and folder names
export { encryptVaultItem, decryptVaultItem, encryptFolderName, decryptFolderName } from './vault-helpers';

// Encoding utilities — Base64 conversion + key verifier
export { uint8ToBase64, base64ToUint8, computeVerifier } from './encoding-utils';
