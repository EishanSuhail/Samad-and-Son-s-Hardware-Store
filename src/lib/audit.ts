import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { getClientIp } from "./rate-limit";

/** Records who did what. Never throws: a failed audit write must not break the action itself. */
export async function logAudit(entry: {
  adminUserId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Prisma.InputJsonValue;
}) {
  try {
    await db.auditLog.create({
      data: {
        adminUserId: entry.adminUserId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        details: entry.details,
        ipAddress: await getClientIp(),
      },
    });
  } catch (error) {
    console.error("Audit log write failed", error);
  }
}
