import { randomUUID } from "node:crypto";
import type { UserProfile, UserRole } from "@prisma/client";
import { db } from "@/lib/db";

const created: string[] = [];

/** A fresh, isolated user for one test. Deleted (with all their data) by cleanupUsers(). */
export async function createTestUser(role: UserRole = "JOB_SEEKER"): Promise<UserProfile> {
  const tag = randomUUID();
  const user = await db.userProfile.create({
    data: { clerkId: `test_${tag}`, email: `${tag}@test.invalid`, name: "Test User", role },
  });
  created.push(user.id);
  return user;
}

export async function cleanupUsers(): Promise<void> {
  if (created.length) {
    // onDelete: Cascade removes every contact, opportunity, note, ... they own.
    await db.userProfile.deleteMany({ where: { id: { in: created.splice(0) } } });
  }
}
