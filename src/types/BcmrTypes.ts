/**
 * TypeScript types for BCMR (Bitcoin Cash Metadata Registry) v2 documents.
 *
 * Follows the CHIP-BCMR specification:
 * https://github.com/bitjson/chip-bcmr
 */

/** Semantic version embedded in every BCMR document. */
export interface BcmrVersion {
  major: number;
  minor: number;
  patch: number;
}

/**
 * On-chain token record within a BCMR identity snapshot.
 * Describes the fungible-token properties of the identity.
 */
export interface BcmrTokenRecord {
  /** The token category (genesis txid as a hex string). */
  category: string;
  /** Number of decimal places (0–18). Omit for NFT-only categories. */
  decimals?: number;
  /** Ticker symbol used in wallets and exchanges. */
  symbol?: string;
}

/**
 * A single point-in-time snapshot of an identity in the registry.
 * Each key in the `identities` map is a category; its value is a map from
 * ISO 8601 timestamp to the snapshot valid from that time onward.
 */
export interface BcmrIdentitySnapshot {
  /** Human-readable display name. */
  name: string;
  /** Optional human-readable description. */
  description?: string;
  /** Token record; omit for non-token identities. */
  token?: BcmrTokenRecord;
  /**
   * URI map keyed by well-known names such as "icon", "web", "forum", etc.
   * Values should be HTTPS or IPFS URIs.
   */
  uris?: Record<string, string>;
  /** Arbitrary tag strings for discovery and categorisation. */
  tags?: string[];
}

/**
 * A complete BCMR v2 document as returned by {@link generateBcmr}.
 *
 * Suitable for hosting at the URI embedded in a BCMR OP_RETURN output and
 * for hash-pinned authchain registrations.
 */
export interface BcmrDocument {
  $schema: string;
  version: BcmrVersion;
  /** ISO 8601 datetime of the most recent registry revision. */
  latestRevision: string;
  /** Registry identity; may be an empty object for self-hosted registries. */
  registryIdentity: Record<string, unknown>;
  /**
   * Map of token category hex strings to timestamped identity snapshots.
   */
  identities: Record<string, Record<string, BcmrIdentitySnapshot>>;
}

/**
 * Input options accepted by {@link generateBcmr}.
 */
export interface BcmrGeneratorOptions {
  /**
   * The token category as a 64-character hex string.
   * For CashTokens this is the genesis transaction ID in internal byte order.
   */
  category: string;
  /** Human-readable token name (e.g. "My Token"). */
  name: string;
  /** Ticker symbol (e.g. "MTK"). */
  symbol?: string;
  /** Number of decimal places (0–18). */
  decimals?: number;
  /** Short human-readable description of the token or project. */
  description?: string;
  /**
   * URI map keyed by well-known names ("icon", "web", "forum", …).
   * Values should be absolute HTTPS or IPFS URIs.
   */
  uris?: Record<string, string>;
  /** Arbitrary tag strings for discovery and categorisation. */
  tags?: string[];
  /**
   * ISO 8601 timestamp used as the identity snapshot key.
   * Defaults to the current UTC time when omitted.
   */
  timestamp?: string;
}
