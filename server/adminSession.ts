import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, isNull, ne } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { parse } from "cookie";
import { ownerAccounts, ownerSessions } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";

export const ADMIN_SESSION_COOKIE = "wajbat_admin_session";
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

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
type SessionMetadata = { userAgent?: string; ipAddress?: string };
type VerifiedAdminSession = { accountId: number; sessionId: string };

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
  const db = await getDb();
  if (!db) return null;
  const nextEmail = input.email ? normalizedEmail(input.email) : account.email;
  const nextPasswordHash = input.newPassword ? hashPassword(input.newPassword) : account.passwordHash;
  const nextVersion = account.sessionVersion + 1;
  await db.update(ownerAccounts).set({ email: nextEmail, passwordHash: nextPasswordHash, sessionVersion: nextVersion }).where(eq(ownerAccounts.id, account.id));
  await db.update(ownerSessions).set({ revokedAt: new Date() }).where(and(eq(ownerSessions.ownerAccountId, account.id), isNull(ownerSessions.revokedAt)));
  return { id: account.id, email: nextEmail, sessionVersion: nextVersion };
}

export async function createAdminSession(account?: OwnerAccount, metadata: SessionMetadata = {}) {
  const activeAccount = account ?? await getOrSeedOwnerAccount();
  const version = activeAccount?.sessionVersion ?? 1;
  const sessionId = randomBytes(32).toString("base64url");
  if (activeAccount && activeAccount.id > 0) {
    const db = await getDb();
    if (db) {
      await db.insert(ownerSessions).values({
        ownerAccountId: activeAccount.id,
        sessionId,
        userAgent: metadata.userAgent?.slice(0, 512),
        ipAddress: metadata.ipAddress?.slice(0, 64),
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS),
      });
    }
  }
  return new SignJWT({ scope: "owner-admin", version, aid: activeAccount?.id ?? 0, sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(signingKey());
}

export async function getVerifiedAdminSession(cookieHeader?: string): Promise<VerifiedAdminSession | undefined> {
  const token = parse(cookieHeader ?? "")[ADMIN_SESSION_COOKIE];
  if (!token || !ENV.cookieSecret) return undefined;
  try {
    const verified = await jwtVerify(token, signingKey());
    if (verified.payload.scope !== "owner-admin") return undefined;
    const account = await getOrSeedOwnerAccount();
    const accountId = Number(verified.payload.aid ?? 0);
    const sessionId = typeof verified.payload.sid === "string" ? verified.payload.sid : "";
    if (!account || !accountId || account.id !== accountId || !sessionId) return undefined;
    if (Number(verified.payload.version ?? 0) !== account.sessionVersion) return undefined;
    const db = await getDb();
    if (!db) return undefined;
    const sessions = await db.select().from(ownerSessions).where(eq(ownerSessions.sessionId, sessionId)).limit(1);
    const session = sessions[0];
    if (!session || session.ownerAccountId !== account.id || session.revokedAt || session.expiresAt <= new Date()) return undefined;
    return { accountId, sessionId };
  } catch {
    return undefined;
  }
}

export async function hasAdminSession(cookieHeader?: string) {
  return Boolean(await getVerifiedAdminSession(cookieHeader));
}

export async function revokeCurrentAdminSession(cookieHeader?: string) {
  const verified = await getVerifiedAdminSession(cookieHeader);
  if (!verified) return false;
  const db = await getDb();
  if (!db) return false;
  await db.update(ownerSessions).set({ revokedAt: new Date() }).where(eq(ownerSessions.sessionId, verified.sessionId));
  return true;
}

export async function revokeOtherAdminSessions(cookieHeader: string | undefined, currentPassword: string) {
  const verified = await getVerifiedAdminSession(cookieHeader);
  const account = await getOrSeedOwnerAccount();
  if (!verified || !account || verified.accountId !== account.id || !verifyPassword(currentPassword, account.passwordHash)) return null;
  const db = await getDb();
  if (!db) return null;
  await db.update(ownerSessions).set({ revokedAt: new Date() }).where(and(
    eq(ownerSessions.ownerAccountId, account.id),
    ne(ownerSessions.sessionId, verified.sessionId),
    isNull(ownerSessions.revokedAt),
  ));
  return { accountId: account.id };
}
