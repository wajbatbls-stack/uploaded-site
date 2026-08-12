import { scryptSync } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ownerAccounts, ownerSessions } from "../drizzle/schema";

vi.mock("./db", () => ({ getDb: vi.fn() }));

import { getDb } from "./db";
import { createAdminSession, hasAdminSession, revokeOtherAdminSessions } from "./adminSession";

const TEST_PASSWORD = "test-admin-password";
const cookieFor = (token: string) => `wajbat_admin_session=${token}`;

describe("إبطال الجلسات الأخرى للمالك", () => {
  let account: { id: number; email: string; passwordHash: string; sessionVersion: number };
  let sessions: Array<{ ownerAccountId: number; sessionId: string; expiresAt: Date; revokedAt: Date | null }>;
  let selectedSession: { ownerAccountId: number; sessionId: string; expiresAt: Date; revokedAt: Date | null } | undefined;
  let currentSessionId = "";

  beforeEach(() => {
    const salt = "session-controls-test-salt";
    account = {
      id: 77,
      email: "owner@example.test",
      passwordHash: `scrypt:${salt}:${scryptSync(TEST_PASSWORD, salt, 64).toString("base64url")}`,
      sessionVersion: 1,
    };
    sessions = [];
    selectedSession = undefined;
    currentSessionId = "";

    const fakeDb = {
      select: () => ({
        from: (table: unknown) => ({
          limit: async () => table === ownerAccounts ? [account] : [],
          where: () => ({ limit: async () => selectedSession ? [selectedSession] : [] }),
        }),
      }),
      insert: () => ({
        values: async (value: { ownerAccountId: number; sessionId: string; expiresAt: Date }) => {
          sessions.push({ ...value, revokedAt: null });
        },
      }),
      update: () => ({
        set: (value: { revokedAt?: Date }) => ({
          where: async () => {
            sessions
              .filter(session => session.sessionId !== currentSessionId && !session.revokedAt)
              .forEach(session => { session.revokedAt = value.revokedAt ?? new Date(); });
          },
        }),
      }),
    };
    vi.mocked(getDb).mockResolvedValue(fakeDb as never);
  });

  it("يبقي الجلسة الحالية صالحة ويُبطل جلسة مالك أخرى فقط", async () => {
    const currentToken = await createAdminSession(account);
    const currentSession = sessions[0];
    if (!currentSession) throw new Error("تعذر إنشاء جلسة الاختبار الحالية");
    currentSessionId = currentSession.sessionId;

    const otherToken = await createAdminSession(account);
    const otherSession = sessions[1];
    if (!otherSession) throw new Error("تعذر إنشاء جلسة الاختبار الأخرى");

    selectedSession = currentSession;
    await expect(revokeOtherAdminSessions(cookieFor(currentToken), TEST_PASSWORD)).resolves.toEqual({ accountId: account.id });
    expect(currentSession.revokedAt).toBeNull();
    expect(otherSession.revokedAt).toBeInstanceOf(Date);

    selectedSession = otherSession;
    await expect(hasAdminSession(cookieFor(otherToken))).resolves.toBe(false);
    selectedSession = currentSession;
    await expect(hasAdminSession(cookieFor(currentToken))).resolves.toBe(true);
  });
});
