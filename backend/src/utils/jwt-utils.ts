import jwt from "jsonwebtoken";

export interface TokenPayload {
  sub: string;
  tokenType: "access" | "refresh";
  iat: number;
  exp: number;
}

export function createAccessToken(userId: string, secret: string, ttlMin: number): string {
  return jwt.sign({ sub: userId, tokenType: "access" }, secret, { expiresIn: `${ttlMin}m` });
}

export function createRefreshToken(userId: string, secret: string, ttlDays: number): string {
  return jwt.sign({ sub: userId, tokenType: "refresh" }, secret, { expiresIn: `${ttlDays}d` });
}

export function verifyToken(token: string, secret: string): TokenPayload {
  return jwt.verify(token, secret) as TokenPayload;
}
