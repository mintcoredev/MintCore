import type { Event } from "../../models/event.js";
import type { Rule } from "../../models/rule.js";
import { ValidationError } from "../../models/errors.js";

export function validateTransfer(event: Event, rules: Rule[]): void {
  if (event.type !== "TRANSFER") return;
  for (const rule of rules) {
    if (rule.asset && rule.asset !== event.asset) continue;
    if (rule.type === "SOULBOUND") {
      throw new ValidationError(
        `Asset ${event.asset} is soulbound and cannot be transferred`,
      );
    }
  }
}
