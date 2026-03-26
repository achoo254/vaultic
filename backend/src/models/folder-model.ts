import { Schema, model } from "mongoose";

export interface IFolder {
  _id: string;
  userId: string;
  encryptedName: string;
  parentId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const folderSchema = new Schema<IFolder>(
  {
    _id: { type: String },
    userId: { type: String, required: true, index: true },
    encryptedName: { type: String, required: true },
    parentId: { type: String, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

folderSchema.index({ userId: 1, updatedAt: 1 });

export const Folder = model<IFolder>("Folder", folderSchema);
