import type { Event } from "../../models/event.js";
import type { Rule } from "../../models/rule.js";
import { ValidationError } from "../../models/errors.js";

export function validateReward(event: Event, rules: Rule[]): void {
  if (event.type !== "REWARD") return;
  for (const rule of rules) {
    if (rule.type === "QUEST_REWARD" && rule.asset === event.asset) {
      const expectedAmount = rule.params["amount"] as bigint;
      if (event.amount !== expectedAmount) {
        throw new ValidationError(
          `Reward amount ${event.amount} does not match rule amount ${expectedAmount}`,
        );
      }
    }
  }
}
