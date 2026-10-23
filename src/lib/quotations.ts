import type { QuotationStatus } from "@/generated/prisma/client";

export const QUOTATION_STATUS_LABEL: Record<QuotationStatus, string> = {
  NEW: "New",
  UNDER_REVIEW: "Under review",
  QUOTATION_PREPARED: "Quotation prepared",
  SENT_TO_CUSTOMER: "Sent to customer",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CLOSED: "Closed",
};
