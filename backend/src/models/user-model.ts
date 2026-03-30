import { Schema, model } from "mongoose";
import { randomUUID } from "node:crypto";

export interface IUser {
  _id: string;
  email: string;
  authHash: string;
  encryptedSymmetricKey: string | null;
  argon2Params: { m: number; t: number; p: number };
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    _id: { type: String, default: () => randomUUID() },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    authHash: { type: String, required: true },
    encryptedSymmetricKey: { type: String, default: null },
    argon2Params: {
      type: { m: Number, t: Number, p: Number },
      default: { m: 65536, t: 3, p: 4 },
    },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const User = model<IUser>("User", userSchema);
