import type { Event } from "../../models/event.js";
import type { Rule } from "../../models/rule.js";
import { ValidationError } from "../../models/errors.js";

export function validateMint(
  event: Event,
  rules: Rule[],
  currentSupply: bigint,
): void {
  if (event.type !== "MINT") return;
  for (const rule of rules) {
    if (rule.asset && rule.asset !== event.asset) continue;
    if (rule.type === "MAX_SUPPLY") {
      const maxSupply = rule.params["maxSupply"] as bigint;
      if (currentSupply + event.amount > maxSupply) {
        throw new ValidationError(
          `Mint would exceed max supply of ${maxSupply} for asset ${event.asset}`,
        );
      }
    }
    if (rule.type === "MINT_AUTHORITY") {
      const authority = rule.params["authority"] as string;
      if (event.from !== authority) {
        throw new ValidationError(
          `Mint not authorized: expected authority ${authority}`,
        );
      }
    }
  }
}
