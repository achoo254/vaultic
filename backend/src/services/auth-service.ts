import { createHmac, timingSafeEqual } from "node:crypto";
import { User } from "../models/user-model.js";
import { createAccessToken, createRefreshToken, verifyToken } from "../utils/jwt-utils.js";
import { envConfig } from "../config/env-config.js";
import { AppError } from "../utils/app-error.js";

function hashForStorage(authHash: string): string {
  return createHmac("sha256", envConfig.jwtSecret).update(authHash).digest("hex");
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
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) throw AppError.conflict("email already registered");

  const serverHash = hashForStorage(authHash);
  const user = await User.create({
    email,
    authHash: serverHash,
    encryptedSymmetricKey: encryptedSymmetricKey ?? null,
    ...(argon2Params && { argon2Params }),
  });

  return { user_id: user._id };
}

export async function login(email: string, authHash: string) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) throw AppError.unauthorized("invalid credentials");

  const providedHash = hashForStorage(authHash);
  if (!verifyHash(providedHash, user.authHash)) {
    throw AppError.unauthorized("invalid credentials");
  }

  const accessToken = createAccessToken(user._id, envConfig.jwtSecret, envConfig.accessTokenTtlMin);
  const refreshToken = createRefreshToken(user._id, envConfig.jwtSecret, envConfig.refreshTokenTtlDays);

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

  const accessToken = createAccessToken(payload.sub, envConfig.jwtSecret, envConfig.accessTokenTtlMin);
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
  if (newEncryptedSymmetricKey !== undefined) {
    user.encryptedSymmetricKey = newEncryptedSymmetricKey;
  }
  await user.save();

  return { message: "password updated" };
}
