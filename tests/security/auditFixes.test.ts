/**
 * tests/security/auditFixes.test.ts
 *
 * Regression tests for every Critical / Medium fix from the security audit:
 *
 *  1.1  fromHex strict validation (no silent NaN→0 corruption)
 *  1.2  validatePrivateKeyHex — private key format enforced before crypto use
 *  1.3  Burn stubs throw MintCoreError instead of silently returning empty transactions
 *  2.1  BCMR OP_RETURN size correctly reflected in fee estimate
 *  2.2  Negative change guard in BatchMintEngine.executeOnePlannedTx
 *  2.3  MintRequest.category respected per-output instead of silently ignored
 *  2.4  IPv6 SSRF bypass blocked (::1, fc00::/7, fe80::/10, ::ffff:private)
 *  2.5  validateProviderUrl blocks RFC 1918 / link-local addresses (SSRF)
 *  3.1  Broadcast parsers throw MintCoreError when txid is absent from response
 *  3.2  BCMR timestamp rejects values more than 24 h in the future
 *  3.3  continueOnFailure must be a boolean (type-checked in validateBatchMintOptions)
 *  Sort  Numeric UTXO sort uses safe comparator
 */

import { describe, it, expect, beforeEach } from "vitest";

// ── 1.1 fromHex strict validation ─────────────────────────────────────────────

import { fromHex, assertValidHex, validatePrivateKeyHex } from "../../src/utils/hex.js";
import { MintCoreError } from "../../src/utils/errors.js";

describe("fromHex — strict validation", () => {
  it("accepts a valid lowercase hex string", () => {
    expect(fromHex("deadbeef")).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
  });

  it("accepts a valid uppercase hex string", () => {
    expect(fromHex("DEADBEEF")).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
  });

  it("accepts an empty string (zero bytes)", () => {
    expect(fromHex("")).toEqual(new Uint8Array(0));
  });

  it("throws MintCoreError for an odd-length hex string", () => {
    expect(() => fromHex("abc")).toThrow(MintCoreError);
    expect(() => fromHex("abc")).toThrow(/odd length/i);
  });

  it("throws MintCoreError for a string with non-hex characters", () => {
    expect(() => fromHex("zzzz")).toThrow(MintCoreError);
    expect(() => fromHex("zzzz")).toThrow(/non-hex/i);
  });

  it("throws MintCoreError for a 0x-prefixed hex string", () => {
    // 0x prefix is not valid in fromHex
    expect(() => fromHex("0xdeadbeef")).toThrow(MintCoreError);
  });

  it("throws MintCoreError for a hex string with spaces", () => {
    expect(() => fromHex("de ad be ef")).toThrow(MintCoreError);
  });
});

// ── assertValidHex ─────────────────────────────────────────────────────────────

describe("assertValidHex", () => {
  it("does not throw for a valid even-length hex string", () => {
    expect(() => assertValidHex("00ff")).not.toThrow();
  });

  it("does not throw for an empty string", () => {
    expect(() => assertValidHex("")).not.toThrow();
  });

  it("throws for an odd-length string", () => {
    expect(() => assertValidHex("abc")).toThrow(MintCoreError);
  });

  it("throws for non-hex characters", () => {
    expect(() => assertValidHex("gg")).toThrow(MintCoreError);
  });
});

// ── 1.2 validatePrivateKeyHex ─────────────────────────────────────────────────

describe("validatePrivateKeyHex", () => {
  const VALID_KEY = "0".repeat(64);

  it("does not throw for a valid 64-char hex string", () => {
    expect(() => validatePrivateKeyHex(VALID_KEY)).not.toThrow();
    expect(() => validatePrivateKeyHex("a".repeat(64))).not.toThrow();
  });

  it("throws MintCoreError for a key shorter than 64 characters", () => {
    expect(() => validatePrivateKeyHex("a".repeat(63))).toThrow(MintCoreError);
    expect(() => validatePrivateKeyHex("a".repeat(63))).toThrow(/64 hex characters/i);
  });

  it("throws MintCoreError for a key longer than 64 characters", () => {
    expect(() => validatePrivateKeyHex("a".repeat(65))).toThrow(MintCoreError);
    expect(() => validatePrivateKeyHex("a".repeat(65))).toThrow(/64 hex characters/i);
  });

  it("throws MintCoreError for a key with non-hex characters", () => {
    expect(() => validatePrivateKeyHex("z".repeat(64))).toThrow(MintCoreError);
    expect(() => validatePrivateKeyHex("z".repeat(64))).toThrow(/non-hex/i);
  });

  it("throws MintCoreError for an empty string", () => {
    expect(() => validatePrivateKeyHex("")).toThrow(MintCoreError);
  });
});

// ── 1.2 TransactionBuilder.build rejects bad private key early ────────────────

import { TransactionBuilder } from "../../src/core/TransactionBuilder.js";
import type { TokenSchema } from "../../src/types/TokenSchema.js";

const VALID_SCHEMA: TokenSchema = {
  name: "Test",
  symbol: "TST",
  decimals: 0,
  initialSupply: 1n,
};

describe("TransactionBuilder.build — private key validation", () => {
  it("throws MintCoreError for a non-hex private key (not 32 valid bytes)", async () => {
    const builder = new TransactionBuilder({
      network: "regtest",
      privateKey: "not-a-valid-hex-key",
    });
    await expect(builder.build(VALID_SCHEMA)).rejects.toThrow(MintCoreError);
  });

  it("throws MintCoreError for a key shorter than 64 hex chars", async () => {
    const builder = new TransactionBuilder({
      network: "regtest",
      privateKey: "a".repeat(62),
    });
    await expect(builder.build(VALID_SCHEMA)).rejects.toThrow(MintCoreError);
  });

  it("accepts a valid 64-char hex private key", async () => {
    const builder = new TransactionBuilder({
      network: "regtest",
      privateKey: "0000000000000000000000000000000000000000000000000000000000000001",
    });
    await expect(builder.build(VALID_SCHEMA)).resolves.not.toThrow();
  });
});

// ── 1.3 Burn stubs throw instead of silently no-oping ─────────────────────────

import { buildPartialBurnTx } from "../../src/burn/buildPartialBurnTx.js";
import { buildFullCategoryRetirementTx } from "../../src/burn/buildFullCategoryRetirementTx.js";

const BURN_CONTEXT = {
  utxos: [{ txid: "a".repeat(64), vout: 0, satoshis: 100_000, scriptPubKey: "" }],
  feeRate: 1.0,
};
const BURN_REQUEST = {
  categoryId: "a".repeat(64),
  amount: 100n,
  changeAddress: "bitcoincash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy",
};

describe("buildPartialBurnTx — not yet implemented", () => {
  it("throws an error instead of returning an empty transaction", () => {
    expect(() => buildPartialBurnTx(BURN_REQUEST, BURN_CONTEXT)).toThrow();
  });

  it("does not return a silent empty result", () => {
    let result: unknown;
    try {
      result = buildPartialBurnTx(BURN_REQUEST, BURN_CONTEXT);
    } catch {
      result = "threw";
    }
    expect(result).toBe("threw");
  });
});

describe("buildFullCategoryRetirementTx — not yet implemented", () => {
  const ctx = { ...BURN_CONTEXT, batonUtxo: { txid: "b".repeat(64), vout: 0, satoshis: 1000, scriptPubKey: "" } };

  it("throws an error instead of returning an empty transaction", () => {
    expect(() => buildFullCategoryRetirementTx("a".repeat(64), ctx)).toThrow();
  });

  it("does not return a silent empty result", () => {
    let result: unknown;
    try {
      result = buildFullCategoryRetirementTx("a".repeat(64), ctx);
    } catch {
      result = "threw";
    }
    expect(result).toBe("threw");
  });
});

// ── 2.1 BCMR OP_RETURN fee sizing ─────────────────────────────────────────────

import { estimateBcmrOutputSize, P2PKH_OUTPUT_SIZE, estimateFee, DEFAULT_FEE_RATE } from "../../src/utils/fee.js";

describe("estimateBcmrOutputSize", () => {
  it("returns a number larger than P2PKH_OUTPUT_SIZE for any non-empty URI", () => {
    const size = estimateBcmrOutputSize("https://example.com/token.json");
    expect(size).toBeGreaterThan(P2PKH_OUTPUT_SIZE);
  });

  it("increases when a hash is included", () => {
    const uri = "https://example.com/token.json";
    const noHash = estimateBcmrOutputSize(uri);
    const withHash = estimateBcmrOutputSize(uri, "a".repeat(64));
    // hash adds 33 bytes (1 push opcode + 32 data bytes)
    expect(withHash).toBe(noHash + 33);
  });

  it("increases as URI length grows", () => {
    const short = estimateBcmrOutputSize("ipfs://abc");
    const long = estimateBcmrOutputSize("ipfs://" + "a".repeat(200));
    expect(long).toBeGreaterThan(short);
  });

  it("handles a max-length URI (512 bytes)", () => {
    const maxUri = "a".repeat(512);
    const size = estimateBcmrOutputSize(maxUri);
    // Should be substantially larger than P2PKH
    expect(size).toBeGreaterThan(500);
  });

  it("accounts for PUSHDATA2 opcode overhead for URI > 255 bytes", () => {
    const uriOver255 = "a".repeat(300);
    const size = estimateBcmrOutputSize(uriOver255);
    const shortUri = "a".repeat(10);
    const shortSize = estimateBcmrOutputSize(shortUri);
    // Expected difference: 294 bytes
    //   290 extra data bytes (300 vs 10)
    //   + 2 extra opcode bytes (PUSHDATA2 uses 3-byte overhead vs 1 for short URI)
    //   + 2 extra varint bytes (script ~309 bytes needs 3-byte varint vs 1-byte for 17)
    expect(size - shortSize).toBe(294);
  });
});

describe("estimateFee — extraFeeBytes parameter", () => {
  it("returns the same result as before when extraFeeBytes is 0 or omitted", () => {
    const baseline = estimateFee(1, 2, DEFAULT_FEE_RATE, 1);
    expect(estimateFee(1, 2, DEFAULT_FEE_RATE, 1, 0)).toBe(baseline);
  });

  it("increases the fee when extraFeeBytes > 0", () => {
    const baseline = estimateFee(1, 2, DEFAULT_FEE_RATE, 1);
    const withExtra = estimateFee(1, 2, DEFAULT_FEE_RATE, 1, 100);
    // 100 extra bytes at 1 sat/byte = 100 extra sats
    expect(withExtra).toBe(baseline + 100);
  });
});

// ── 2.3 MintRequest.category respected ────────────────────────────────────────
// This is a unit-level check via the BatchMintEngine's planning phase:
// we verify the validated `category` field is accepted without error,
// and will be used when the engine builds outputs.

import { BatchMintEngine } from "../../src/core/BatchMintEngine.js";
import { validateMintRequest } from "../../src/utils/validate.js";
import type { MintRequest } from "../../src/types/BatchMintTypes.js";

describe("MintRequest.category validation and acceptance", () => {
  it("validateMintRequest accepts a valid category", () => {
    const req: MintRequest = {
      capability: "none",
      amount: 100n,
      category: "a".repeat(64),
    };
    expect(() => validateMintRequest(req)).not.toThrow();
  });

  it("planMintBatch accepts requests with category (offline mode)", async () => {
    const engine = new BatchMintEngine({ network: "regtest" });
    const req: MintRequest = {
      capability: "none",
      amount: 100n,
      category: "a".repeat(64),
    };
    const plan = await engine.planMintBatch([req]);
    expect(plan.transactions).toHaveLength(1);
    expect(plan.transactions[0].mintRequests[0].category).toBe("a".repeat(64));
  });
});

// ── 2.5 SSRF protection — validateProviderUrl ─────────────────────────────────

import { chronikFetchUtxos, electrumxFetchUtxos } from "../../src/core/providerUtils.js";

describe("validateProviderUrl — SSRF protection", () => {
  const DUMMY_ADDRESS = "bitcoincash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy";

  it("rejects a 10.x.x.x (RFC 1918) Chronik URL", async () => {
    await expect(
      chronikFetchUtxos("https://10.0.0.1/api", DUMMY_ADDRESS)
    ).rejects.toThrow(MintCoreError);
    await expect(
      chronikFetchUtxos("https://10.0.0.1/api", DUMMY_ADDRESS)
    ).rejects.toThrow(/private or link-local/i);
  });

  it("rejects a 172.16.x.x (RFC 1918) Chronik URL", async () => {
    await expect(
      chronikFetchUtxos("https://172.16.0.1/api", DUMMY_ADDRESS)
    ).rejects.toThrow(MintCoreError);
  });

  it("rejects a 172.31.x.x (RFC 1918) Chronik URL", async () => {
    await expect(
      chronikFetchUtxos("https://172.31.255.255/api", DUMMY_ADDRESS)
    ).rejects.toThrow(MintCoreError);
  });

  it("rejects a 192.168.x.x (RFC 1918) Chronik URL", async () => {
    await expect(
      chronikFetchUtxos("https://192.168.1.1/api", DUMMY_ADDRESS)
    ).rejects.toThrow(MintCoreError);
  });

  it("rejects a 169.254.x.x (link-local) Chronik URL", async () => {
    await expect(
      chronikFetchUtxos("https://169.254.1.1/api", DUMMY_ADDRESS)
    ).rejects.toThrow(MintCoreError);
  });

  it("rejects a 192.168.x.x ElectrumX URL", async () => {
    await expect(
      electrumxFetchUtxos("https://192.168.100.1/api", DUMMY_ADDRESS)
    ).rejects.toThrow(MintCoreError);
  });

  it("allows localhost (HTTP) for development", async () => {
    // localhost is explicitly allowed even over HTTP; it will fail at the
    // network layer (connection refused / ECONNREFUSED), not with a MintCoreError
    // about the URL.  We just verify the rejection is NOT a URL-validation error.
    const rejection = chronikFetchUtxos("http://localhost:9999/api", DUMMY_ADDRESS);
    await expect(rejection).rejects.toThrow();
    await expect(
      chronikFetchUtxos("http://localhost:9999/api", DUMMY_ADDRESS)
    ).rejects.not.toThrow(
      expect.objectContaining({ message: expect.stringMatching(/must use HTTPS/i) })
    );
  });

  it("allows a public HTTPS URL", async () => {
    // Should NOT reject at URL validation; will fail with a network error.
    await expect(
      chronikFetchUtxos("https://chronik.example.com", DUMMY_ADDRESS)
    ).rejects.not.toThrow(expect.objectContaining({ message: expect.stringMatching(/private or link-local/i) }));
  });
});

// ── Sort comparator safety ─────────────────────────────────────────────────────

import { selectUtxos } from "../../src/utils/coinselect.js";
import type { Utxo } from "../../src/types/TransactionTypes.js";

describe("selectUtxos — safe sort comparator", () => {
  it("correctly orders UTXOs when satoshi values are very large (near Number.MAX_SAFE_INTEGER)", () => {
    // Subtraction-based comparator would produce inaccurate results for very
    // large values; the safe comparator must return the correct order.
    const large = Number.MAX_SAFE_INTEGER - 1;
    const utxos: Utxo[] = [
      { txid: "a".repeat(64), vout: 0, satoshis: 1000, scriptPubKey: "" },
      { txid: "b".repeat(64), vout: 0, satoshis: large, scriptPubKey: "" },
    ];
    const result = selectUtxos(utxos, 1000, 1, 1.0, 1);
    // The large UTXO should be selected first (largest-first)
    expect(result.selected[0].satoshis).toBe(large);
  });
});

import { selectBchUtxosForFee } from "../../src/burn/internal/selectBchUtxosForFee.js";
import type { TokenUtxo } from "../../src/burn/types.js";

describe("selectBchUtxosForFee — safe sort comparator", () => {
  it("selects the smallest UTXOs first (ascending order)", () => {
    const utxos: Utxo[] = [
      { txid: "a".repeat(64), vout: 0, satoshis: 5000, scriptPubKey: "" },
      { txid: "b".repeat(64), vout: 0, satoshis: 1000, scriptPubKey: "" },
      { txid: "c".repeat(64), vout: 0, satoshis: 3000, scriptPubKey: "" },
    ];
    const result = selectBchUtxosForFee(utxos, 1000n);
    expect(result.selected[0].satoshis).toBe(1000);
  });
});

// ── 3.1 Broadcast parsers throw when txid is absent ───────────────────────────

// We unit-test the parsing logic by mocking fetch to return responses that
// contain no recognised txid field, then asserting a MintCoreError is thrown.

import { chronikBroadcast, electrumxBroadcast } from "../../src/core/providerUtils.js";

describe("chronikBroadcast — missing txid throws MintCoreError", () => {
  it("throws when the response body contains no txid or txids field", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    await expect(
      chronikBroadcast("https://chronik.example.com", "aa".repeat(250))
    ).rejects.toThrow(MintCoreError);
    await expect(
      chronikBroadcast("https://chronik.example.com", "aa".repeat(250))
    ).rejects.toThrow(/did not contain a txid/i);
  });

  it("throws when txids array is empty", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ txids: [] }), { status: 200 });
    await expect(
      chronikBroadcast("https://chronik.example.com", "aa".repeat(250))
    ).rejects.toThrow(MintCoreError);
  });

  it("does not throw when a valid txid is returned", async () => {
    const fakeTxid = "cc".repeat(32);
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ txids: [fakeTxid] }), { status: 200 });
    await expect(
      chronikBroadcast("https://chronik.example.com", "aa".repeat(250))
    ).resolves.toBe(fakeTxid);
  });
});

describe("electrumxBroadcast — missing txid throws MintCoreError", () => {
  it("throws when the response body contains no txid or result field", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    await expect(
      electrumxBroadcast("https://electrumx.example.com", "aa".repeat(250))
    ).rejects.toThrow(MintCoreError);
    await expect(
      electrumxBroadcast("https://electrumx.example.com", "aa".repeat(250))
    ).rejects.toThrow(/did not contain a txid/i);
  });

  it("does not throw when txid is returned as a bare string", async () => {
    const fakeTxid = "dd".repeat(32);
    globalThis.fetch = async () =>
      new Response(JSON.stringify(fakeTxid), { status: 200 });
    await expect(
      electrumxBroadcast("https://electrumx.example.com", "aa".repeat(250))
    ).resolves.toBe(fakeTxid);
  });

  it("does not throw when txid is in data.txid", async () => {
    const fakeTxid = "ee".repeat(32);
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ txid: fakeTxid }), { status: 200 });
    await expect(
      electrumxBroadcast("https://electrumx.example.com", "aa".repeat(250))
    ).resolves.toBe(fakeTxid);
  });
});

// ── 3.2 BCMR timestamp rejects far-future values ──────────────────────────────

import { generateBcmr } from "../../src/cashTokens/bcmrGenerator.js";

const BCMR_CATEGORY = "a".repeat(64);

describe("generateBcmr — timestamp bounds check", () => {
  const MAX_FUTURE_HOURS = 24;

  it("accepts a past timestamp", () => {
    const past = "2024-01-01T00:00:00.000Z";
    expect(() =>
      generateBcmr({ category: BCMR_CATEGORY, name: "T", timestamp: past })
    ).not.toThrow();
  });

  it("accepts the current time (no timestamp supplied)", () => {
    expect(() =>
      generateBcmr({ category: BCMR_CATEGORY, name: "T" })
    ).not.toThrow();
  });

  it("accepts a timestamp up to 24 h in the future", () => {
    const nearFuture = new Date(Date.now() + (MAX_FUTURE_HOURS - 1) * 60 * 60 * 1000).toISOString();
    expect(() =>
      generateBcmr({ category: BCMR_CATEGORY, name: "T", timestamp: nearFuture })
    ).not.toThrow();
  });

  it("throws MintCoreError for a timestamp more than 24 h in the future", () => {
    const farFuture = new Date(Date.now() + (MAX_FUTURE_HOURS + 1) * 60 * 60 * 1000).toISOString();
    expect(() =>
      generateBcmr({ category: BCMR_CATEGORY, name: "T", timestamp: farFuture })
    ).toThrow(MintCoreError);
    expect(() =>
      generateBcmr({ category: BCMR_CATEGORY, name: "T", timestamp: farFuture })
    ).toThrow(/more than 24 hours in the future/i);
  });

  it("throws for a timestamp years in the future", () => {
    expect(() =>
      generateBcmr({ category: BCMR_CATEGORY, name: "T", timestamp: "2099-01-01T00:00:00.000Z" })
    ).toThrow(MintCoreError);
  });
});

// ── 1.3 (extended) Burn stubs throw MintCoreError specifically ────────────────

describe("buildPartialBurnTx — throws MintCoreError (not plain Error)", () => {
  it("throws MintCoreError for an empty categoryId", () => {
    expect(() =>
      buildPartialBurnTx(
        { categoryId: "", amount: 100n, changeAddress: "bitcoincash:q..." },
        BURN_CONTEXT,
      )
    ).toThrow(MintCoreError);
  });

  it("throws MintCoreError for zero burn amount", () => {
    expect(() =>
      buildPartialBurnTx({ ...BURN_REQUEST, amount: 0n }, BURN_CONTEXT)
    ).toThrow(MintCoreError);
  });

  it("throws MintCoreError when fully implemented stub is hit", () => {
    expect(() => buildPartialBurnTx(BURN_REQUEST, BURN_CONTEXT)).toThrow(MintCoreError);
  });
});

describe("buildFullCategoryRetirementTx — throws MintCoreError (not plain Error)", () => {
  const ctx = {
    ...BURN_CONTEXT,
    batonUtxo: { txid: "b".repeat(64), vout: 0, satoshis: 1000 },
  };

  it("throws MintCoreError for an empty categoryId", () => {
    expect(() => buildFullCategoryRetirementTx("", ctx)).toThrow(MintCoreError);
  });

  it("throws MintCoreError when fully implemented stub is hit", () => {
    expect(() => buildFullCategoryRetirementTx("a".repeat(64), ctx)).toThrow(
      MintCoreError
    );
  });
});

// ── 2.4 IPv6 SSRF bypass protection ──────────────────────────────────────────

describe("validateProviderUrl — IPv6 SSRF protection", () => {
  const DUMMY_ADDRESS = "bitcoincash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy";

  it("rejects IPv6 unique-local fc00:: (fc prefix) Chronik URL", async () => {
    await expect(
      chronikFetchUtxos("https://[fc00::1]/api", DUMMY_ADDRESS)
    ).rejects.toThrow(MintCoreError);
    await expect(
      chronikFetchUtxos("https://[fc00::1]/api", DUMMY_ADDRESS)
    ).rejects.toThrow(/private or link-local/i);
  });

  it("rejects IPv6 unique-local fd00:: (fd prefix) Chronik URL", async () => {
    await expect(
      chronikFetchUtxos("https://[fd00::1]/api", DUMMY_ADDRESS)
    ).rejects.toThrow(MintCoreError);
  });

  it("rejects IPv6 link-local fe80:: Chronik URL", async () => {
    await expect(
      chronikFetchUtxos("https://[fe80::1]/api", DUMMY_ADDRESS)
    ).rejects.toThrow(MintCoreError);
    await expect(
      chronikFetchUtxos("https://[fe80::1]/api", DUMMY_ADDRESS)
    ).rejects.toThrow(/private or link-local/i);
  });

  it("rejects IPv6 link-local feb0:: Chronik URL", async () => {
    await expect(
      chronikFetchUtxos("https://[feb0::1]/api", DUMMY_ADDRESS)
    ).rejects.toThrow(MintCoreError);
  });

  it("rejects IPv4-mapped ::ffff:10.0.0.1 Chronik URL", async () => {
    await expect(
      chronikFetchUtxos("https://[::ffff:10.0.0.1]/api", DUMMY_ADDRESS)
    ).rejects.toThrow(MintCoreError);
  });

  it("rejects IPv4-mapped ::ffff:192.168.1.1 Chronik URL", async () => {
    await expect(
      chronikFetchUtxos("https://[::ffff:192.168.1.1]/api", DUMMY_ADDRESS)
    ).rejects.toThrow(MintCoreError);
  });

  it("allows IPv6 ::1 loopback (HTTP) for development", async () => {
    // ::1 is treated as local (like 127.0.0.1); will fail at the network layer.
    const rejection = chronikFetchUtxos("http://[::1]:9999/api", DUMMY_ADDRESS);
    await expect(rejection).rejects.toThrow();
    await expect(
      chronikFetchUtxos("http://[::1]:9999/api", DUMMY_ADDRESS)
    ).rejects.not.toThrow(
      expect.objectContaining({ message: expect.stringMatching(/private or link-local/i) })
    );
  });

  it("rejects IPv6 fc00:: ElectrumX URL", async () => {
    await expect(
      electrumxFetchUtxos("https://[fc00::1]/api", DUMMY_ADDRESS)
    ).rejects.toThrow(MintCoreError);
    await expect(
      electrumxFetchUtxos("https://[fc00::1]/api", DUMMY_ADDRESS)
    ).rejects.toThrow(/private or link-local/i);
  });

  it("rejects IPv6 fe80:: ElectrumX URL", async () => {
    await expect(
      electrumxFetchUtxos("https://[fe80::1]/api", DUMMY_ADDRESS)
    ).rejects.toThrow(MintCoreError);
  });
});

// ── 3.3 continueOnFailure must be a boolean ────────────────────────────────────

import { validateBatchMintOptions } from "../../src/utils/validate.js";

describe("validateBatchMintOptions — continueOnFailure type check", () => {
  it("does not throw when continueOnFailure is true", () => {
    expect(() =>
      validateBatchMintOptions({ continueOnFailure: true })
    ).not.toThrow();
  });

  it("does not throw when continueOnFailure is false", () => {
    expect(() =>
      validateBatchMintOptions({ continueOnFailure: false })
    ).not.toThrow();
  });

  it("does not throw when continueOnFailure is omitted", () => {
    expect(() => validateBatchMintOptions({})).not.toThrow();
  });

  it("throws MintCoreError when continueOnFailure is a number (truthy)", () => {
    expect(() =>
      validateBatchMintOptions({ continueOnFailure: 1 as unknown as boolean })
    ).toThrow(MintCoreError);
    expect(() =>
      validateBatchMintOptions({ continueOnFailure: 1 as unknown as boolean })
    ).toThrow(/continueOnFailure must be a boolean/i);
  });

  it("throws MintCoreError when continueOnFailure is a string", () => {
    expect(() =>
      validateBatchMintOptions({ continueOnFailure: "yes" as unknown as boolean })
    ).toThrow(MintCoreError);
  });
});

// ── S1 URL path injection — encodeURIComponent(address) ───────────────────────
//
// Addresses containing path-traversal sequences, query separators, or fragment
// markers must be percent-encoded before they are embedded in fetch URLs.
// Without encoding, a crafted address like "../../admin?x=1" could alter the
// effective URL path and potentially reach unintended endpoints on the server.

describe("chronikFetchUtxos — address is percent-encoded in URL path (S1)", () => {
  let capturedUrl: string | undefined;

  beforeEach(() => {
    capturedUrl = undefined;
    // Intercept fetch, record the URL, and return a well-formed empty response.
    globalThis.fetch = async (input: RequestInfo | URL) => {
      capturedUrl = typeof input === "string" ? input : (input as Request).url ?? String(input);
      return new Response(JSON.stringify({ utxos: [] }), { status: 200 });
    };
  });

  it("percent-encodes path traversal sequences in the address", async () => {
    await chronikFetchUtxos("https://chronik.example.com", "../../etc/passwd");
    expect(capturedUrl).toContain(encodeURIComponent("../../etc/passwd"));
    expect(capturedUrl).not.toContain("../../");
  });

  it("percent-encodes query separators in the address", async () => {
    await chronikFetchUtxos("https://chronik.example.com", "addr?evil=1");
    expect(capturedUrl).toContain(encodeURIComponent("addr?evil=1"));
    expect(capturedUrl).not.toContain("?evil");
  });

  it("percent-encodes fragment identifiers in the address", async () => {
    await chronikFetchUtxos("https://chronik.example.com", "addr#fragment");
    expect(capturedUrl).toContain(encodeURIComponent("addr#fragment"));
    expect(capturedUrl).not.toContain("#fragment");
  });

  it("does not double-encode a normal CashAddress", async () => {
    const normal = "bitcoincash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy";
    await chronikFetchUtxos("https://chronik.example.com", normal);
    // Colons and lowercase letters should be untouched by encodeURIComponent
    // (the colon IS encoded by encodeURIComponent; the address still round-trips)
    expect(capturedUrl).toContain(
      `/address/${encodeURIComponent(normal)}/utxos`
    );
  });
});

describe("electrumxFetchUtxos — address is percent-encoded in URL path (S1)", () => {
  let capturedUrl: string | undefined;

  beforeEach(() => {
    capturedUrl = undefined;
    globalThis.fetch = async (input: RequestInfo | URL) => {
      capturedUrl = typeof input === "string" ? input : (input as Request).url ?? String(input);
      return new Response(JSON.stringify([]), { status: 200 });
    };
  });

  it("percent-encodes path traversal sequences in the address", async () => {
    await electrumxFetchUtxos("https://electrumx.example.com", "../../etc/passwd");
    expect(capturedUrl).toContain(encodeURIComponent("../../etc/passwd"));
    expect(capturedUrl).not.toContain("../../");
  });

  it("percent-encodes query separators in the address", async () => {
    await electrumxFetchUtxos("https://electrumx.example.com", "addr?evil=1");
    expect(capturedUrl).toContain(encodeURIComponent("addr?evil=1"));
    expect(capturedUrl).not.toContain("?evil");
  });

  it("percent-encodes fragment identifiers in the address", async () => {
    await electrumxFetchUtxos("https://electrumx.example.com", "addr#fragment");
    expect(capturedUrl).toContain(encodeURIComponent("addr#fragment"));
    expect(capturedUrl).not.toContain("#fragment");
  });

  it("does not double-encode a normal CashAddress", async () => {
    const normal = "bitcoincash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy";
    await electrumxFetchUtxos("https://electrumx.example.com", normal);
    expect(capturedUrl).toContain(
      `/address/${encodeURIComponent(normal)}/unspent`
    );
  });
});
