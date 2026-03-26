import { Schema, model } from "mongoose";

export interface IVaultItem {
  _id: string;
  userId: string;
  folderId: string | null;
  itemType: number;
  encryptedData: string;
  deviceId: string;
  version: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const vaultItemSchema = new Schema<IVaultItem>(
  {
    _id: { type: String },
    userId: { type: String, required: true, index: true },
    folderId: { type: String, default: null },
    itemType: { type: Number, default: 1 },
    encryptedData: { type: String, required: true },
    deviceId: { type: String, required: true },
    version: { type: Number, default: 1 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

vaultItemSchema.index({ userId: 1, deviceId: 1, updatedAt: 1 });

export const VaultItem = model<IVaultItem>("VaultItem", vaultItemSchema);
