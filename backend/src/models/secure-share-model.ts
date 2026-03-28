import { Schema, model } from "mongoose";
import { randomBytes } from "node:crypto";

export interface ISecureShare {
  _id: string;
  vaultItemId: string | null;
  userId: string;
  encryptedData: string | null; // null for new hybrid shares, present for legacy
  maxViews: number | null;
  currentViews: number;
  expiresAt: Date | null;
  accessedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SHARE_ID_LEN = 12;
const ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateShareId(): string {
  const bytes = randomBytes(SHARE_ID_LEN);
  return Array.from(bytes, (b) => ID_CHARS[b % ID_CHARS.length]).join("");
}

const secureShareSchema = new Schema<ISecureShare>(
  {
    _id: { type: String, default: generateShareId },
    vaultItemId: { type: String, default: null },
    userId: { type: String, required: true, index: true },
    encryptedData: { type: String, default: null }, // null for hybrid, present for legacy
    maxViews: { type: Number, default: null },
    currentViews: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    accessedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// TTL index — MongoDB auto-deletes expired shares
secureShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SecureShare = model<ISecureShare>("SecureShare", secureShareSchema);
