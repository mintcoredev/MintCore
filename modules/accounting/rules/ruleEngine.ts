import type { Event } from "../models/event.js";
import type { Rule } from "../models/rule.js";
import { validateMint } from "./validators/mintValidator.js";
import { validateTransfer } from "./validators/transferValidator.js";
import { validateBurn } from "./validators/burnValidator.js";
import { validateReward } from "./validators/rewardValidator.js";

export interface ValidationContext {
  currentSupply?: bigint;
  currentBalance?: bigint;
}

export class RuleEngine {
  private rules: Rule[] = [];

  addRule(rule: Rule): void {
    this.rules.push(rule);
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter((r) => r.id !== ruleId);
  }

  getRules(): Rule[] {
    return [...this.rules];
  }

  validate(event: Event, context: ValidationContext = {}): void {
    this.runValidators(event, context);
  }

  runValidators(event: Event, context: ValidationContext = {}): void {
    const { currentSupply = 0n, currentBalance = 0n } = context;
    validateMint(event, this.rules, currentSupply);
    validateTransfer(event, this.rules);
    validateBurn(event, this.rules, currentBalance);
    validateReward(event, this.rules);
  }
}
