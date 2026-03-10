import type { Event } from "../../models/event.js";
import type { Rule } from "../../models/rule.js";
import { ValidationError } from "../../models/errors.js";

export function validateBurn(
  event: Event,
  rules: Rule[],
  currentBalance: bigint,
): void {
  if (event.type !== "BURN") return;
  if (currentBalance < event.amount) {
    throw new ValidationError(
      `Insufficient balance to burn: has ${currentBalance}, needs ${event.amount}`,
    );
  }
  for (const rule of rules) {
    if (rule.asset && rule.asset !== event.asset) continue;
    // Additional burn rules can be added here
  }
}
