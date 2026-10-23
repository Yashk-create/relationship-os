import "dotenv/config";
import { vi } from "vitest";

// Tests write to a real Postgres database, so they must never point at the
// development database. Refuse to run unless a separate one is configured.
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error("Set TEST_DATABASE_URL to a separate, disposable database (see README).");
}
if (testUrl === process.env.DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL.");
}
process.env.DATABASE_URL = testUrl;

// Server Actions call revalidatePath, which needs a Next.js request context.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
