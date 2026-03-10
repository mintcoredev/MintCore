import { Ledger } from "../ledger/ledger.js";
import { BalanceEngine } from "../balances/balanceEngine.js";
import { SupplyEngine } from "../balances/supplyEngine.js";
import { OwnershipEngine } from "../balances/ownershipEngine.js";
import { HistoryEngine } from "../balances/historyEngine.js";
import { RuleEngine } from "../rules/ruleEngine.js";
import { MintService } from "../services/mintService.js";
import { TransferService } from "../services/transferService.js";
import { BurnService } from "../services/burnService.js";
import { RewardService } from "../services/rewardService.js";
import { FeeService } from "../services/feeService.js";
import type { Event } from "../models/event.js";
import type { Balance } from "../models/balance.js";
import type { Rule } from "../models/rule.js";

export class AccountingAPI {
  private readonly ledger: Ledger;
  private readonly balanceEngine: BalanceEngine;
  private readonly supplyEngine: SupplyEngine;
  private readonly ownershipEngine: OwnershipEngine;
  private readonly historyEngine: HistoryEngine;
  private readonly ruleEngine: RuleEngine;
  private readonly mintService: MintService;
  private readonly transferService: TransferService;
  private readonly burnService: BurnService;
  private readonly rewardService: RewardService;
  private readonly feeService: FeeService;

  constructor() {
    this.ledger = new Ledger();
    this.balanceEngine = new BalanceEngine();
    this.supplyEngine = new SupplyEngine();
    this.ownershipEngine = new OwnershipEngine();
    this.historyEngine = new HistoryEngine();
    this.ruleEngine = new RuleEngine();
    this.mintService = new MintService(
      this.ledger,
      this.balanceEngine,
      this.supplyEngine,
      this.ruleEngine,
    );
    this.transferService = new TransferService(
      this.ledger,
      this.balanceEngine,
      this.ruleEngine,
    );
    this.burnService = new BurnService(
      this.ledger,
      this.balanceEngine,
      this.supplyEngine,
      this.ruleEngine,
    );
    this.rewardService = new RewardService(
      this.ledger,
      this.balanceEngine,
      this.supplyEngine,
      this.ruleEngine,
    );
    this.feeService = new FeeService(this.ledger, this.balanceEngine);
  }

  mint(
    asset: string,
    to: string,
    amount: bigint,
    metadata?: Record<string, unknown>,
  ): Event {
    const event = this.mintService.mint({ asset, to, amount, metadata });
    this.ownershipEngine.applyEvent(event);
    this.historyEngine.applyEvent(event);
    return event;
  }

  transfer(asset: string, from: string, to: string, amount: bigint): Event {
    const event = this.transferService.transfer({ asset, from, to, amount });
    this.ownershipEngine.applyEvent(event);
    this.historyEngine.applyEvent(event);
    return event;
  }

  burn(asset: string, from: string, amount: bigint): Event {
    const event = this.burnService.burn({ asset, from, amount });
    this.historyEngine.applyEvent(event);
    return event;
  }

  reward(ruleId: string, to: string, asset: string, amount: bigint): Event {
    const event = this.rewardService.reward({ ruleId, asset, to, amount });
    this.ownershipEngine.applyEvent(event);
    this.historyEngine.applyEvent(event);
    return event;
  }

  collectFee(
    asset: string,
    from: string,
    amount: bigint,
    collector?: string,
  ): Event {
    const event = this.feeService.collectFee({
      asset,
      from,
      amount,
      collector,
    });
    if (collector) this.ownershipEngine.applyEvent(event);
    this.historyEngine.applyEvent(event);
    return event;
  }

  getBalance(address: string, asset: string): bigint {
    return this.balanceEngine.getBalance(address, asset);
  }

  getInventory(address: string): Balance[] {
    return this.balanceEngine
      .getAllBalances()
      .filter((b) => b.address === address && b.amount > 0n);
  }

  getHistory(address: string): Event[] {
    return this.historyEngine.getHistory(address);
  }

  getSupply(asset: string): bigint {
    return this.supplyEngine.getSupply(asset);
  }

  getHolders(asset: string): string[] {
    return this.ownershipEngine.getHolders(asset);
  }

  addRule(rule: Rule): void {
    this.ruleEngine.addRule(rule);
  }

  removeRule(ruleId: string): void {
    this.ruleEngine.removeRule(ruleId);
  }
}
