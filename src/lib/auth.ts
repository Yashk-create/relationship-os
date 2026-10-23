import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { UserProfile } from "@prisma/client";

// Checks if Clerk keys are present in env
export const isClerkConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY
  );
};

// Without Clerk keys the app runs as one shared demo user, which is fine on a
// laptop but would let anyone in on a deployed site. So demo mode is refused in
// production unless it is switched on deliberately (e.g. for a public demo
// with throwaway data).
export const isDemoModeAllowed = () =>
  process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_MODE === "true";

// Return mock user profile if clerk is not configured
export const MOCK_CLERK_ID = "user_mock_000000000000000001";
export const MOCK_EMAIL = "alexander@relationshipos.dev";
export const MOCK_NAME = "Alexander Pierce";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function getAuthUser(): Promise<{
  clerkId: string;
  email: string;
  name: string;
  dbUser: UserProfile;
}> {
  if (!isClerkConfigured()) {
    if (!isDemoModeAllowed()) {
      throw new UnauthorizedError("Authentication is not configured");
    }
    const dbUser = await db.userProfile.upsert({
      where: { clerkId: MOCK_CLERK_ID },
      update: {},
      create: { clerkId: MOCK_CLERK_ID, email: MOCK_EMAIL, name: MOCK_NAME, role: null },
    });
    return { clerkId: MOCK_CLERK_ID, email: MOCK_EMAIL, name: MOCK_NAME, dbUser };
  }

  // Real Clerk Mode
  let userId: string | null;
  try {
    ({ userId } = await auth());
  } catch (error) {
    console.error("Clerk auth failed", error);
    throw new UnauthorizedError("Unauthorized: Auth session error");
  }
  if (!userId) {
    throw new UnauthorizedError("Unauthorized: No session active");
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress || `${userId}@users.invalid`;
  const name = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || "User";

  // The Clerk webhook normally creates the profile, but if it hasn't run yet
  // (e.g. local development without a webhook tunnel) the user would be stuck
  // on onboarding. Create the profile on first sign-in instead.
  const dbUser = await db.userProfile.upsert({
    where: { clerkId: userId },
    update: {},
    create: { clerkId: userId, email, name, role: null },
  });

  return { clerkId: userId, email, name, dbUser };
}

/** The signed-in user's profile. Every Server Action starts with this. */
export async function requireUser(): Promise<UserProfile> {
  const { dbUser } = await getAuthUser();
  return dbUser;
}
