import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  // Serverless hosts start many instances, each with its own pool, so keep pools small to stay
// under the database's connection limit. Override with DB_POOL_MAX if your plan allows more.
  const max = Number.parseInt(process.env.DB_POOL_MAX ?? "", 10) || (process.env.NODE_ENV === "production" ? 5 : 10);
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max }) });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
