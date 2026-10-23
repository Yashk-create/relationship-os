// getAuthUser: first sign-in creates the profile, and the shared demo user is
// refused in production. Clerk itself is mocked; the database is real.
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(), currentUser: vi.fn() }));

import { auth, currentUser } from "@clerk/nextjs/server";
import { getAuthUser, MOCK_CLERK_ID } from "@/lib/auth";
import { db } from "@/lib/db";

const clerkIds: string[] = [];

afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  await db.userProfile.deleteMany({ where: { clerkId: { in: [...clerkIds, MOCK_CLERK_ID] } } });
});

describe("demo mode (no Clerk keys)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    vi.stubEnv("CLERK_SECRET_KEY", "");
  });

  it("uses one shared demo user in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const first = await getAuthUser();
    const second = await getAuthUser();
    expect(first.clerkId).toBe(MOCK_CLERK_ID);
    expect(second.dbUser.id).toBe(first.dbUser.id);
  });

  it("is refused in production unless explicitly allowed", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(getAuthUser()).rejects.toThrow(/not configured/);
    vi.stubEnv("ALLOW_DEMO_MODE", "true");
    await expect(getAuthUser()).resolves.toMatchObject({ clerkId: MOCK_CLERK_ID });
  });
});

describe("Clerk mode", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_placeholder");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_placeholder");
  });

  it("creates the profile on first sign-in, without waiting for the webhook", async () => {
    const clerkId = `user_${randomUUID()}`;
    clerkIds.push(clerkId);
    vi.mocked(auth).mockResolvedValue({ userId: clerkId } as never);
    vi.mocked(currentUser).mockResolvedValue({
      emailAddresses: [{ emailAddress: `${clerkId}@example.com` }], firstName: "Ravi", lastName: "K",
    } as never);

    const first = await getAuthUser();
    expect(first.dbUser).toMatchObject({ clerkId, email: `${clerkId}@example.com`, role: null });
    const again = await getAuthUser();
    expect(again.dbUser.id).toBe(first.dbUser.id);
  });

  it("rejects a request without a session", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    await expect(getAuthUser()).rejects.toThrow(/No session/);
  });
});
