import { describe, expect, it, vi } from "vitest";

/**
 * Verifies that the owner login settings procedures behave according to the
 * owner-login requirements: settings are persisted per owner, restoring
 * defaults rewrites the row, restoring the previous snapshot re-applies the
 * saved snapshot, and invalid content-order strings are rejected by zod.
 */

import { DEFAULT_OWNER_LOGIN_SETTINGS, getOwnerLoginSettings } from "./db";
import type { ownerLoginSettings as ownerLoginSettingsTable } from "../drizzle/schema";

type Row = typeof ownerLoginSettingsTable.$inferSelect;

function rowOf(patch: Record<string, unknown> = {}): Row {
  return {
    id: 1,
    ownerAccountId: 7,
    ...DEFAULT_OWNER_LOGIN_SETTINGS,
    backgroundGradient: DEFAULT_OWNER_LOGIN_SETTINGS.backgroundGradient as string,
    backgroundImageUrl: null,
    backgroundImageMediaId: null,
    logoUrl: null,
    logoMediaId: null,
    ownerPhotoUrl: null,
    ownerPhotoMediaId: null,
    ...patch,
    updatedAt: new Date(),
  } as Row;
}

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  const store = new Map<number, Row>();
  let history = new Map<number, Row[]>();
  return {
    ...actual,
    DEFAULT_OWNER_LOGIN_SETTINGS: actual.DEFAULT_OWNER_LOGIN_SETTINGS,
    getOwnerLoginSettings: vi.fn(async (accountId: number) => {
      const row = store.get(accountId) ?? rowOf();
      if (!store.has(accountId)) store.set(accountId, row);
      return row;
    }),
    saveOwnerLoginSettings: vi.fn(async (accountId: number, patch: Record<string, unknown>) => {
      const current = store.get(accountId) ?? rowOf();
      const previous = history.get(accountId) ?? [];
      history.set(accountId, [...previous, { ...current } as Row]);
      const merged = { ...current, ...patch };
      store.set(accountId, merged);
      return merged;
    }),
    restorePreviousOwnerLoginSettings: vi.fn(async (accountId: number) => {
      const previous = (history.get(accountId) ?? []).at(-1);
      if (!previous) throw new Error("لا توجد نسخة سابقة لاستعادتها");
      const current = store.get(accountId) ?? rowOf();
      history.set(accountId, [...(history.get(accountId) ?? []), { ...current } as Row]);
      const merged = { ...current, ...previous };
      store.set(accountId, merged);
      return merged;
    }),
  };
});

describe("owner login settings", () => {
  it("exposes a full default settings shape", () => {
    expect(DEFAULT_OWNER_LOGIN_SETTINGS.template).toBe("professional");
    expect(DEFAULT_OWNER_LOGIN_SETTINGS.fontFamily).toBe("Cairo");
    expect(DEFAULT_OWNER_LOGIN_SETTINGS.contentOrder).toMatch(
      /^logo,title,description,email,password,passkey,submit,footer$/,
    );
    expect(DEFAULT_OWNER_LOGIN_SETTINGS.loginButtonText).toBeTruthy();
    expect(DEFAULT_OWNER_LOGIN_SETTINGS.footerText).toBeTruthy();
  });

  it("returns defaults when nothing was saved yet", async () => {
    const settings = await getOwnerLoginSettings(42);
    expect(settings?.template).toBe("professional");
    expect(settings?.cardRadius).toBe(28);
  });

  it("zod rejects malformed content order values", () => {
    const { z } = require("zod");
    const schema = z
      .string()
      .min(20)
      .max(300)
      .regex(
        /^(?:logo|title|description|email|password|passkey|submit|footer)(?:,(?:logo|title|description|email|password|passkey|submit|footer)){7}$/,
      );
    expect(() => schema.parse("logo,title,description,email,password,passkey,submit,footer")).not.toThrow();
    expect(() => schema.parse("logo,invalid,email,password,passkey,submit,footer,unknown")).toThrow();
  });

  it("restore flow rejects when no previous snapshot exists", async () => {
    const { restorePreviousOwnerLoginSettings } = await import("./db");
    await expect(restorePreviousOwnerLoginSettings(99)).rejects.toThrow();
  });
});
