import { SecureShare } from "../models/secure-share-model.js";
import { AppError } from "../utils/app-error.js";

export async function create(
  userId: string,
  encryptedData: string,
  maxViews?: number,
  ttlHours?: number,
  vaultItemId?: string,
) {
  const expiresAt = ttlHours ? new Date(Date.now() + ttlHours * 3600_000) : null;

  const share = await SecureShare.create({
    userId,
    encryptedData,
    maxViews: maxViews ?? null,
    expiresAt,
    vaultItemId: vaultItemId ?? null,
  });

  return { share_id: share._id, expires_at: share.expiresAt };
}

/**
 * Retrieve share data — atomic view counting via findOneAndUpdate.
 */
export async function retrieve(shareId: string) {
  const now = new Date();
  const share = await SecureShare.findOneAndUpdate(
    {
      _id: shareId,
      $and: [
        { $or: [{ maxViews: null }, { $expr: { $lt: ["$currentViews", "$maxViews"] } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      ],
    },
    { $inc: { currentViews: 1 }, $set: { accessedAt: now } },
    { new: false },
  );

  if (!share) {
    const existing = await SecureShare.findById(shareId).lean();
    if (!existing) throw AppError.notFound("share not found");
    if (existing.expiresAt && now > existing.expiresAt) {
      throw AppError.gone("share link has expired");
    }
    throw AppError.gone("share link max views reached");
  }

  return { encrypted_data: share.encryptedData };
}

/**
 * Get share metadata — does NOT increment view count.
 */
export async function getMeta(shareId: string) {
  const share = await SecureShare.findById(shareId).lean();
  if (!share) throw AppError.notFound("share not found");

  const now = new Date();
  if (share.expiresAt && now > share.expiresAt) {
    throw AppError.gone("share link has expired");
  }
  if (share.maxViews !== null && share.currentViews >= share.maxViews) {
    throw AppError.gone("share link max views reached");
  }

  return {
    share_id: share._id,
    max_views: share.maxViews,
    current_views: share.currentViews,
    expires_at: share.expiresAt,
    created_at: share.createdAt,
  };
}

/**
 * Delete share — owner only.
 */
export async function deleteShare(shareId: string, userId: string) {
  const share = await SecureShare.findById(shareId);
  if (!share) throw AppError.notFound("share not found");
  if (share.userId !== userId) throw AppError.unauthorized("not the share owner");

  await share.deleteOne();
  return { message: "share deleted" };
}
