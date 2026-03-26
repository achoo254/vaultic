// Vault item and folder types

export enum ItemType {
  Login = 'login',
  SecureNote = 'secure_note',
  Card = 'card',
  Identity = 'identity',
}

export interface VaultItem {
  id: string;
  folder_id?: string;
  item_type: ItemType;
  /** Base64-encoded nonce + ciphertext */
  encrypted_data: string;
  device_id: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Folder {
  id: string;
  encrypted_name: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

/** Decrypted login credential for UI display */
export interface LoginCredential {
  name: string;
  url?: string;
  username: string;
  password: string;
  notes?: string;
}
