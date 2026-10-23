// Safe to import from client components (no database or Node-only imports).
export type LineProblem = "UNAVAILABLE" | "OUT_OF_STOCK" | "NOT_ENOUGH_STOCK";

export const PROBLEM_TEXT: Record<LineProblem, string> = {
  UNAVAILABLE: "No longer available",
  OUT_OF_STOCK: "Out of stock",
  NOT_ENOUGH_STOCK: "Not enough stock",
};
