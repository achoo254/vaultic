// WebCrypto bridge — Argon2id KDF + AES-256-GCM encryption
export { deriveMasterKey, deriveMasterKeyWithSalt, deriveEncryptionKey, deriveAuthHash, deriveKeys } from './kdf';
export { encrypt, decrypt, encryptBytes, decryptBytes } from './cipher';
export { generatePassword } from './password-gen';
export {
  toBase64Url, fromBase64Url,
  encodeShareFragment, decodeShareFragment,
  estimateFragmentSize, isWithinUrlLimit, MAX_FRAGMENT_LENGTH,
} from './url-share-codec';
