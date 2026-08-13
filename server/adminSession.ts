import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, isNull, ne } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { parse } from "cookie";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { ownerAccounts, ownerSessions } from "../drizzle/schema";
import {
  consumeOwnerWebAuthnChallenge,
  createOwnerPasskey,
  createOwnerWebAuthnChallenge,
  deleteOwnerPasskey,
  getOwnerPasskey,
  getDb,
  listOwnerPasskeys,
  useOwnerPasskey,
} from "./db";
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

export async function verifyAdminCurrentPassword(currentPassword: string) {
  const account = await getOrSeedOwnerAccount();
  return Boolean(account && verifyPassword(currentPassword, account.passwordHash));
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

type WebAuthnContext = { origin: string; rpId: string };

function parseStoredTransports(value: string | null) {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === "string") : undefined;
  } catch {
    return undefined;
  }
}

export async function startOwnerPasskeyRegistration(context: WebAuthnContext) {
  const account = await getOrSeedOwnerAccount();
  if (!account) throw new Error("تعذر العثور على حساب المالك");
  const registered = await listOwnerPasskeys(account.id);
  const options = await generateRegistrationOptions({
    rpName: "لوحة إدارة واجبات بلس",
    rpID: context.rpId,
    userID: new TextEncoder().encode(String(account.id)),
    userName: account.email,
    userDisplayName: "مالك واجبات بلس",
    attestationType: "none",
    timeout: 60_000,
    excludeCredentials: registered.map(passkey => ({ id: passkey.credentialId })),
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "required",
      userVerification: "required",
    },
  });
  await createOwnerWebAuthnChallenge({
    ownerAccountId: account.id,
    challenge: options.challenge,
    ceremony: "registration",
    origin: context.origin,
    rpId: context.rpId,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });
  return options;
}

export async function finishOwnerPasskeyRegistration(input: { challenge: string; response: unknown; label: string; ownerAccountId: number }) {
  const challenge = await consumeOwnerWebAuthnChallenge(input.challenge, "registration");
  if (!challenge || challenge.ownerAccountId !== input.ownerAccountId) throw new Error("انتهت جلسة تسجيل Passkey أو لا تنتمي إلى الحساب الحالي");
  const verification = await verifyRegistrationResponse({
    response: input.response as Parameters<typeof verifyRegistrationResponse>[0]["response"],
    expectedChallenge: challenge.challenge,
    expectedOrigin: challenge.origin,
    expectedRPID: challenge.rpId,
    requireUserVerification: true,
  });
  if (!verification.verified || !verification.registrationInfo) throw new Error("تعذر التحقق من Passkey المسجّل");
  const credential = verification.registrationInfo.credential;
  await createOwnerPasskey({
    ownerAccountId: input.ownerAccountId,
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    transports: credential.transports?.length ? JSON.stringify(credential.transports) : null,
    label: input.label.trim().slice(0, 120) || "Passkey المالك",
  });
  return { success: true as const };
}

export async function startOwnerPasskeyAuthentication(context: WebAuthnContext) {
  const account = await getOrSeedOwnerAccount();
  if (!account) throw new Error("تعذر العثور على حساب المالك");
  const passkeys = await listOwnerPasskeys(account.id);
  if (!passkeys.length) throw new Error("لم يتم إعداد Passkey لحساب المالك بعد");
  const options = await generateAuthenticationOptions({
    rpID: context.rpId,
    timeout: 60_000,
    userVerification: "required",
    allowCredentials: passkeys.map(passkey => ({ id: passkey.credentialId })),
  });
  await createOwnerWebAuthnChallenge({
    ownerAccountId: account.id,
    challenge: options.challenge,
    ceremony: "authentication",
    origin: context.origin,
    rpId: context.rpId,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });
  return options;
}

export async function finishOwnerPasskeyAuthentication(input: { challenge: string; response: unknown; metadata?: SessionMetadata }) {
  const challenge = await consumeOwnerWebAuthnChallenge(input.challenge, "authentication");
  if (!challenge || !challenge.ownerAccountId) throw new Error("انتهت جلسة دخول Passkey");
  const credentialId = typeof (input.response as { id?: unknown }).id === "string" ? (input.response as { id: string }).id : "";
  const passkey = credentialId ? await getOwnerPasskey(credentialId) : undefined;
  if (!passkey || passkey.ownerAccountId !== challenge.ownerAccountId) throw new Error("Passkey غير معروف");
  const verification = await verifyAuthenticationResponse({
    response: input.response as Parameters<typeof verifyAuthenticationResponse>[0]["response"],
    expectedChallenge: challenge.challenge,
    expectedOrigin: challenge.origin,
    expectedRPID: challenge.rpId,
    credential: {
      id: passkey.credentialId,
      publicKey: Buffer.from(passkey.publicKey, "base64url"),
      counter: passkey.counter,
      transports: parseStoredTransports(passkey.transports) as Parameters<typeof verifyAuthenticationResponse>[0]["credential"]["transports"],
    },
    requireUserVerification: true,
  });
  if (!verification.verified) throw new Error("تعذر التحقق من Passkey");
  await useOwnerPasskey(passkey.credentialId, verification.authenticationInfo.newCounter);
  const account = await getOrSeedOwnerAccount();
  if (!account || account.id !== challenge.ownerAccountId) throw new Error("تعذر إتمام جلسة المالك");
  return createAdminSession(account, input.metadata);
}

export async function removeOwnerPasskey(ownerAccountId: number, passkeyId: number, currentPassword: string) {
  if (!(await verifyAdminCurrentPassword(currentPassword))) return false;
  await deleteOwnerPasskey(ownerAccountId, passkeyId);
  return true;
}
