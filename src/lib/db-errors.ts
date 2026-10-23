/**
 * Text describing which unique constraint a Prisma P2002 error hit.
 * With the pg driver adapter `meta.target` is absent; the constraint name (e.g. "Product_sku_key")
 * is inside `meta.driverAdapterError`. Serialising the whole meta covers both shapes.
 */
export function uniqueViolationInfo(error: { meta?: unknown }): string {
  try {
    return JSON.stringify(error.meta ?? {}).toLowerCase();
  } catch {
    return "";
  }
}
