import { timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { parse } from "cookie";
import { ENV } from "./_core/env";

export const ADMIN_SESSION_COOKIE = "wajbat_admin_session";

const signingKey = () => new TextEncoder().encode(ENV.cookieSecret);

function secureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function hasConfiguredAdminCredentials() {
  return Boolean(ENV.adminEmail && ENV.adminPassword && ENV.cookieSecret);
}

export function validateAdminCredentials(email: string, password: string) {
  if (!hasConfiguredAdminCredentials()) return false;
  return secureEqual(email.trim().toLowerCase(), ENV.adminEmail.trim().toLowerCase())
    && secureEqual(password, ENV.adminPassword);
}

export async function createAdminSession() {
  return new SignJWT({ scope: "owner-admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(signingKey());
}

export async function hasAdminSession(cookieHeader?: string) {
  const token = parse(cookieHeader ?? "")[ADMIN_SESSION_COOKIE];
  if (!token || !ENV.cookieSecret) return false;
  try {
    const verified = await jwtVerify(token, signingKey());
    return verified.payload.scope === "owner-admin";
  } catch {
    return false;
  }
}
