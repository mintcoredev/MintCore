import { AccountingError, ValidationError } from "../models/errors.js";
import type { Event } from "../models/event.js";
import type { Rule } from "../models/rule.js";

let _nextId = 1;
function nextId(): string {
  return String(_nextId++);
}

export class AccountingAPI {
  private balances = new Map<string, Map<string, bigint>>();
  private supply = new Map<string, bigint>();
  private events: Event[] = [];
  private rules: Rule[] = [];
  private owners = new Map<string, Set<string>>();

  // ── Supply helpers ─────────────────────────────────────────────────────────

  getSupply(asset: string): bigint {
    return this.supply.get(asset) ?? 0n;
  }

  // ── Balance helpers ────────────────────────────────────────────────────────

  getBalance(address: string, asset: string): bigint {
    return this.balances.get(address)?.get(asset) ?? 0n;
  }

  // ── Rule management ────────────────────────────────────────────────────────

  addRule(rule: Rule): void {
    this.rules.push(rule);
  }

  // ── Core operations ────────────────────────────────────────────────────────

  mint(
    asset: string,
    to: string,
    amount: bigint,
    metadata?: Record<string, unknown>
  ): void {
    this._validatePositiveBigInt(amount, "Mint amount");
    this._enforceRules("mint", asset, to, amount);

    this._credit(to, asset, amount);
    this.supply.set(asset, (this.supply.get(asset) ?? 0n) + amount);
    this._trackOwner(asset, to);

    this.events.push({
      id: nextId(),
      type: "mint",
      asset,
      to,
      amount,
      timestamp: Date.now(),
      metadata,
    });
  }

  transfer(
    asset: string,
    from: string,
    to: string,
    amount: bigint,
    metadata?: Record<string, unknown>
  ): void {
    this._validatePositiveBigInt(amount, "Transfer amount");
    this._enforceRules("transfer", asset, from, amount);
    this._debit(from, asset, amount);
    this._credit(to, asset, amount);
    this._trackOwner(asset, to);

    this.events.push({
      id: nextId(),
      type: "transfer",
      asset,
      from,
      to,
      amount,
      timestamp: Date.now(),
      metadata,
    });
  }

  burn(
    asset: string,
    from: string,
    amount: bigint,
    metadata?: Record<string, unknown>
  ): void {
    this._validatePositiveBigInt(amount, "Burn amount");
    this._debit(from, asset, amount);
    const current = this.supply.get(asset) ?? 0n;
    this.supply.set(asset, current - amount);

    this.events.push({
      id: nextId(),
      type: "burn",
      asset,
      from,
      amount,
      timestamp: Date.now(),
      metadata,
    });
  }

  adjust(params: {
    assetId: string;
    address: string;
    amount: bigint;
    direction: "credit" | "debit";
    metadata?: Record<string, unknown>;
  }): void {
    const { assetId, address, amount, direction, metadata } = params;
    this._validatePositiveBigInt(amount, "Adjustment amount");
    if (direction === "credit") {
      this._credit(address, assetId, amount);
    } else {
      this._debit(address, assetId, amount);
    }
    this.events.push({
      id: nextId(),
      type: "adjustment",
      asset: assetId,
      to: direction === "credit" ? address : undefined,
      from: direction === "debit" ? address : undefined,
      amount,
      timestamp: Date.now(),
      metadata,
    });
  }

  getEvents(): Event[] {
    return [...this.events];
  }

  getOwners(asset: string): string[] {
    return [...(this.owners.get(asset) ?? [])];
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _credit(address: string, asset: string, amount: bigint): void {
    const map = this.balances.get(address) ?? new Map<string, bigint>();
    map.set(asset, (map.get(asset) ?? 0n) + amount);
    this.balances.set(address, map);
  }

  private _debit(address: string, asset: string, amount: bigint): void {
    const map = this.balances.get(address) ?? new Map<string, bigint>();
    const current = map.get(asset) ?? 0n;
    if (current < amount) {
      throw new AccountingError(
        `Insufficient balance for ${address}: has ${current} ${asset}, needs ${amount}`
      );
    }
    map.set(asset, current - amount);
    this.balances.set(address, map);
  }

  private _trackOwner(asset: string, address: string): void {
    const set = this.owners.get(asset) ?? new Set<string>();
    set.add(address);
    this.owners.set(asset, set);
  }

  private _validatePositiveBigInt(value: bigint, label: string): void {
    if (typeof value !== "bigint" || value <= 0n) {
      throw new ValidationError(`${label} must be a positive BigInt`);
    }
  }

  private _enforceRules(
    op: "mint" | "transfer",
    asset: string,
    actor: string,
    amount: bigint
  ): void {
    for (const rule of this.rules) {
      if (rule.asset !== asset) continue;

      if (rule.type === "maxSupply" && op === "mint") {
        const maxSupply = rule.params.maxSupply;
        if (typeof maxSupply !== "bigint") continue;
        const currentSupply = this.supply.get(asset) ?? 0n;
        if (currentSupply + amount > maxSupply) {
          throw new AccountingError(
            `Max supply exceeded for ${asset}: max ${maxSupply}, current ${currentSupply}, requested ${amount}`
          );
        }
      }

      if (rule.type === "mintAuthority" && op === "mint") {
        const authorities = rule.params.authorities;
        if (!Array.isArray(authorities)) continue;
        if (!authorities.includes(actor)) {
          throw new AccountingError(
            `${actor} is not an authorized minter for ${asset}`
          );
        }
      }
    }
  }
}
