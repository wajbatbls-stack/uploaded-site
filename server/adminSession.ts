import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { parse } from "cookie";
import { ownerAccounts } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";

export const ADMIN_SESSION_COOKIE = "wajbat_admin_session";

const signingKey = () => new TextEncoder().encode(ENV.cookieSecret);

function secureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, expected] = passwordHash.split(":");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString("base64url");
  return secureEqual(actual, expected);
}

export function hasConfiguredAdminCredentials() {
  return Boolean(ENV.adminEmail && ENV.adminPassword && ENV.cookieSecret);
}

type OwnerAccount = { id: number; email: string; passwordHash: string; sessionVersion: number };

async function getOrSeedOwnerAccount(): Promise<OwnerAccount | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const accounts = await db.select().from(ownerAccounts).limit(1);
  if (accounts[0]) return accounts[0];
  if (!ENV.adminEmail || !ENV.adminPassword) return undefined;

  const email = normalizedEmail(ENV.adminEmail);
  await db.insert(ownerAccounts).values({ email, passwordHash: hashPassword(ENV.adminPassword) });
  const seeded = await db.select().from(ownerAccounts).where(eq(ownerAccounts.email, email)).limit(1);
  return seeded[0];
}

export async function validateAdminCredentials(email: string, password: string) {
  const account = await getOrSeedOwnerAccount();
  if (account) {
    if (!secureEqual(normalizedEmail(email), account.email)) return null;
    return verifyPassword(password, account.passwordHash) ? account : null;
  }

  if (!hasConfiguredAdminCredentials()) return null;
  const matches = secureEqual(normalizedEmail(email), normalizedEmail(ENV.adminEmail))
    && secureEqual(password, ENV.adminPassword);
  return matches ? { id: 0, email: normalizedEmail(ENV.adminEmail), passwordHash: "", sessionVersion: 1 } : null;
}

export async function getAdminAccount() {
  const account = await getOrSeedOwnerAccount();
  return account ? { id: account.id, email: account.email } : undefined;
}

export async function updateAdminCredentials(input: { currentPassword: string; email?: string; newPassword?: string }) {
  const account = await getOrSeedOwnerAccount();
  if (!account || !verifyPassword(input.currentPassword, account.passwordHash)) return null;

  const nextEmail = input.email ? normalizedEmail(input.email) : account.email;
  const nextPasswordHash = input.newPassword ? hashPassword(input.newPassword) : account.passwordHash;
  const db = await getDb();
  if (!db) return null;

  const nextVersion = account.sessionVersion + 1;
  await db.update(ownerAccounts).set({
    email: nextEmail,
    passwordHash: nextPasswordHash,
    sessionVersion: nextVersion,
  }).where(eq(ownerAccounts.id, account.id));
  return { id: account.id, email: nextEmail, sessionVersion: nextVersion };
}

export async function createAdminSession(sessionVersion = 1) {
  return new SignJWT({ scope: "owner-admin", version: sessionVersion })
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
    if (verified.payload.scope !== "owner-admin") return false;
    const account = await getOrSeedOwnerAccount();
    if (!account) return Number(verified.payload.version ?? 1) === 1;
    return Number(verified.payload.version ?? 0) === account.sessionVersion;
  } catch {
    return false;
  }
}
