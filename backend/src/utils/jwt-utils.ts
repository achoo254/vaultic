import jwt from "jsonwebtoken";

export interface TokenPayload {
  sub: string;
  tokenType: "access" | "refresh";
  tokenVersion: number;
  iat: number;
  exp: number;
}

export function createAccessToken(userId: string, secret: string, ttlMin: number, tokenVersion: number): string {
  return jwt.sign(
    { sub: userId, tokenType: "access", tokenVersion },
    secret,
    { expiresIn: `${ttlMin}m`, algorithm: "HS256" },
  );
}

export function createRefreshToken(userId: string, secret: string, ttlDays: number, tokenVersion: number): string {
  return jwt.sign(
    { sub: userId, tokenType: "refresh", tokenVersion },
    secret,
    { expiresIn: `${ttlDays}d`, algorithm: "HS256" },
  );
}

export function verifyToken(token: string, secret: string): TokenPayload {
  return jwt.verify(token, secret, { algorithms: ["HS256"] }) as TokenPayload;
}
