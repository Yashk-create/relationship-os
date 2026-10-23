import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

const getPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;

  // Prisma 7 needs an adapter or accelerateUrl. The old fallback, a bare
  // `new PrismaClient()` when DATABASE_URL was unset, threw on import and
  // broke `next build` on any machine without a .env. The pg Pool below only
  // connects on the first query, so a missing URL now fails at query time,
  // not at build time.
  if (connectionString?.startsWith("prisma+postgres://")) {
    return new PrismaClient({
      accelerateUrl: connectionString,
    });
  }

  // Standard TCP postgres: use PG Pool with PrismaPg adapter
  // The local `prisma dev` server (PGlite) handles one connection at a time;
  // parallel connections interleave protocol messages and fail with 08P01.
  // Set DATABASE_POOL_MAX=1 for it. Real Postgres can use the default (10).
  const max = Number(process.env.DATABASE_POOL_MAX) || 10;
  const pool = globalForPrisma.pool ?? new Pool({ connectionString, max });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

export const db = globalForPrisma.prisma ?? getPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
