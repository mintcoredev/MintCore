import { describe, it, expect } from "vitest";
import { FlipstarterBuilder } from "../src/core/FlipstarterBuilder.js";
import { MintCoreError } from "../src/utils/errors.js";
import { estimateFee, DEFAULT_FEE_RATE } from "../src/utils/fee.js";
import type { MintConfig } from "../src/types/MintConfig.js";
import type { FlipstarterCampaign } from "../src/types/FlipstarterTypes.js";
import type { Utxo } from "../src/types/TransactionTypes.js";

const TEST_PRIVATE_KEY =
  "0000000000000000000000000000000000000000000000000000000000000001";

// regtest address derived from TEST_PRIVATE_KEY
const SELF_ADDRESS = "bchreg:qp63uahgrxged4z5jswyt5dn5v3lzsem6c6mz8vuwd";

const baseConfig: MintConfig = {
  network: "regtest",
  privateKey: TEST_PRIVATE_KEY,
};

const campaign: FlipstarterCampaign = {
  recipientAddress: SELF_ADDRESS,
  goalSatoshis: 50_000,
  description: "Fund the MintCore flipstarter",
};

const makeUtxo = (satoshis: number, index = 0): Utxo => ({
  txid: "a".repeat(64),
  vout: index,
  satoshis,
  scriptPubKey: "",
});

describe("FlipstarterBuilder – createPledge", () => {
  it("creates a pledge with a valid unlocking bytecode", () => {
    const builder = new FlipstarterBuilder(baseConfig);
    const utxo = makeUtxo(60_000);
    const pledge = builder.createPledge(utxo, campaign);

    expect(pledge.txid).toBe(utxo.txid);
    expect(pledge.vout).toBe(utxo.vout);
    expect(pledge.satoshis).toBe(utxo.satoshis);
    expect(pledge.unlockingBytecode).toBeInstanceOf(Uint8Array);
    expect(pledge.unlockingBytecode.length).toBeGreaterThan(0);
    expect(pledge.lockingBytecode).toBeInstanceOf(Uint8Array);
  });

  it("unlocking bytecode contains the ANYONECANPAY sighash byte (0xC1)", () => {
    const builder = new FlipstarterBuilder(baseConfig);
    const pledge = builder.createPledge(makeUtxo(60_000), campaign);

    // The sighash type byte 0xC1 should appear in the unlocking bytecode
    expect(Array.from(pledge.unlockingBytecode)).toContain(0xc1);
  });

  it("throws MintCoreError when privateKey is missing", () => {
    const builder = new FlipstarterBuilder({ network: "regtest" });
    expect(() => builder.createPledge(makeUtxo(60_000), campaign)).toThrow(
      MintCoreError
    );
    expect(() => builder.createPledge(makeUtxo(60_000), campaign)).toThrow(
      /privateKey/
    );
  });

  it("throws MintCoreError for an invalid recipient address", () => {
    const builder = new FlipstarterBuilder(baseConfig);
    const badCampaign: FlipstarterCampaign = {
      ...campaign,
      recipientAddress: "not-a-valid-address",
    };
    expect(() => builder.createPledge(makeUtxo(60_000), badCampaign)).toThrow(
      MintCoreError
    );
  });

  it("produces deterministic results for the same inputs", () => {
    const builder = new FlipstarterBuilder(baseConfig);
    const utxo = makeUtxo(60_000);
    const p1 = builder.createPledge(utxo, campaign);
    const p2 = builder.createPledge(utxo, campaign);
    expect(Array.from(p1.unlockingBytecode)).toEqual(
      Array.from(p2.unlockingBytecode)
    );
  });
});

describe("FlipstarterBuilder – assembleCampaign", () => {
  const fee = estimateFee(1, 1, DEFAULT_FEE_RATE, false);

  it("assembles a valid transaction from a single sufficient pledge", () => {
    const builder = new FlipstarterBuilder(baseConfig);
    const utxo = makeUtxo(campaign.goalSatoshis + fee + 1_000);
    const pledge = builder.createPledge(utxo, campaign);
    const result = builder.assembleCampaign(campaign, [pledge]);

    expect(result.hex).toMatch(/^[0-9a-f]+$/);
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/);
    expect(result.totalPledged).toBe(utxo.satoshis);
    expect(result.fee).toBeGreaterThan(0);
  });

  it("assembles from multiple pledges", () => {
    const builder = new FlipstarterBuilder(baseConfig);
    // Two pledges each covering half the goal (plus enough extra for fees)
    const fee2 = estimateFee(2, 1, DEFAULT_FEE_RATE, false);
    const PLEDGE_BUFFER_SATS = 100; // small buffer to ensure sufficient funds after fee split
    const halfGoal = Math.ceil(campaign.goalSatoshis / 2) + Math.ceil(fee2 / 2) + PLEDGE_BUFFER_SATS;
    const p1 = builder.createPledge(makeUtxo(halfGoal, 0), campaign);
    const p2 = builder.createPledge(makeUtxo(halfGoal, 1), campaign);
    const result = builder.assembleCampaign(campaign, [p1, p2]);

    expect(result.hex).toMatch(/^[0-9a-f]+$/);
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/);
    expect(result.totalPledged).toBe(halfGoal * 2);
  });

  it("throws MintCoreError when pledges are empty", () => {
    const builder = new FlipstarterBuilder(baseConfig);
    expect(() => builder.assembleCampaign(campaign, [])).toThrow(MintCoreError);
    expect(() => builder.assembleCampaign(campaign, [])).toThrow(/no pledges/);
  });

  it("throws MintCoreError when pledges are insufficient", () => {
    const builder = new FlipstarterBuilder(baseConfig);
    // Pledge only 100 sats – far below the 50_000 goal
    const pledge = builder.createPledge(makeUtxo(100), campaign);
    expect(() => builder.assembleCampaign(campaign, [pledge])).toThrow(
      MintCoreError
    );
    expect(() => builder.assembleCampaign(campaign, [pledge])).toThrow(
      /[Ii]nsufficient/
    );
  });

  it("throws MintCoreError for an invalid recipient address", () => {
    const builder = new FlipstarterBuilder(baseConfig);
    const badCampaign: FlipstarterCampaign = {
      ...campaign,
      recipientAddress: "not-a-valid-address",
    };
    const pledge = builder.createPledge(makeUtxo(60_000), campaign);
    expect(() => builder.assembleCampaign(badCampaign, [pledge])).toThrow(
      MintCoreError
    );
  });
});

describe("FlipstarterBuilder – getPledgeTotal", () => {
  it("sums satoshis across all pledges", () => {
    const builder = new FlipstarterBuilder(baseConfig);
    const p1 = builder.createPledge(makeUtxo(10_000, 0), campaign);
    const p2 = builder.createPledge(makeUtxo(20_000, 1), campaign);
    expect(builder.getPledgeTotal([p1, p2])).toBe(30_000);
  });

  it("returns 0 for an empty pledge list", () => {
    const builder = new FlipstarterBuilder(baseConfig);
    expect(builder.getPledgeTotal([])).toBe(0);
  });
});
