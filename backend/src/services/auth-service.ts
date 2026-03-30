import { createHmac, timingSafeEqual } from "node:crypto";
import { User } from "../models/user-model.js";
import { createAccessToken, createRefreshToken, verifyToken } from "../utils/jwt-utils.js";
import { envConfig } from "../config/env-config.js";
import { AppError } from "../utils/app-error.js";

/**
 * HMAC-SHA256 server-side hash of the client's authHash.
 * Accepts optional key param to support lazy rehash during migration from jwtSecret to authHashKey.
 */
function hashForStorage(authHash: string, key: string = envConfig.authHashKey): string {
  return createHmac("sha256", key).update(authHash).digest("hex");
}

function verifyHash(provided: string, stored: string): boolean {
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(stored, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function register(
  email: string,
  authHash: string,
  encryptedSymmetricKey?: string,
  argon2Params?: { m: number; t: number; p: number },
) {
  // Remove pre-check TOCTOU race — rely on unique index + catch duplicate key error
  const serverHash = hashForStorage(authHash);
  try {
    const user = await User.create({
      email,
      authHash: serverHash,
      encryptedSymmetricKey: encryptedSymmetricKey ?? null,
      ...(argon2Params && { argon2Params }),
    });
    return { user_id: user._id };
  } catch (err: unknown) {
    // MongoDB duplicate key error code
    if ((err as { code?: number }).code === 11000) {
      throw AppError.conflict("email already registered");
    }
    throw err;
  }
}

export async function login(email: string, authHash: string) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) throw AppError.unauthorized("invalid credentials");

  // Compute hash with new dedicated key
  const hashNew = hashForStorage(authHash, envConfig.authHashKey);
  const matchNew = verifyHash(hashNew, user.authHash);

  // Lazy rehash: check legacy hash (jwtSecret) for accounts hashed before key separation
  const matchLegacy = !matchNew && verifyHash(hashForStorage(authHash, envConfig.jwtSecret), user.authHash);

  if (!matchNew && !matchLegacy) {
    throw AppError.unauthorized("invalid credentials");
  }

  // Upgrade stored hash to new key on first login after migration
  if (matchLegacy) {
    user.authHash = hashForStorage(authHash, envConfig.authHashKey);
    await user.save();
  }

  const accessToken = createAccessToken(user._id, envConfig.jwtSecret, envConfig.accessTokenTtlMin, user.tokenVersion);
  const refreshToken = createRefreshToken(user._id, envConfig.jwtSecret, envConfig.refreshTokenTtlDays, user.tokenVersion);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user_id: user._id,
  };
}

export async function refresh(refreshTokenStr: string) {
  const payload = verifyToken(refreshTokenStr, envConfig.jwtSecret);
  if (payload.tokenType !== "refresh") {
    throw AppError.unauthorized("expected refresh token");
  }

  // Validate tokenVersion against DB — rejects revoked tokens
  const user = await User.findById(payload.sub).select("tokenVersion");
  if (!user || payload.tokenVersion !== user.tokenVersion) {
    throw AppError.unauthorized("token revoked");
  }

  const accessToken = createAccessToken(payload.sub, envConfig.jwtSecret, envConfig.accessTokenTtlMin, user.tokenVersion);
  return { access_token: accessToken };
}

export async function getMe(userId: string) {
  const user = await User.findById(userId).select("-authHash");
  if (!user) throw AppError.notFound("user not found");

  return {
    user_id: user._id,
    email: user.email,
    encrypted_symmetric_key: user.encryptedSymmetricKey,
    argon2_params: user.argon2Params,
    created_at: user.createdAt,
  };
}

export async function changePassword(
  userId: string,
  currentAuthHash: string,
  newAuthHash: string,
  newEncryptedSymmetricKey?: string,
) {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound("user not found");

  const providedHash = hashForStorage(currentAuthHash);
  if (!verifyHash(providedHash, user.authHash)) {
    throw AppError.unauthorized("invalid current password");
  }

  user.authHash = hashForStorage(newAuthHash);
  // Increment tokenVersion to revoke all existing tokens on password change
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  if (newEncryptedSymmetricKey !== undefined) {
    user.encryptedSymmetricKey = newEncryptedSymmetricKey;
  }
  await user.save();

  // Issue new tokens with updated tokenVersion
  const accessToken = createAccessToken(user._id, envConfig.jwtSecret, envConfig.accessTokenTtlMin, user.tokenVersion);
  const refreshToken = createRefreshToken(user._id, envConfig.jwtSecret, envConfig.refreshTokenTtlDays, user.tokenVersion);

  return {
    message: "password updated",
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}
