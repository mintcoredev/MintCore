/**
 * define-pack example
 *
 * Demonstrates:
 *   - Creating a PackDefinition
 *   - Adding ItemDefinitions
 *   - Using the Rarity enum
 *   - Serializing to JSON
 *
 * No blockchain RPC calls. No pack-opening logic. No RNG.
 */

import {
  Rarity,
  isRarity,
  rarityToString,
  isItemDefinition,
  assertItemDefinition,
  isPackDefinition,
  assertPackDefinition,
  serializePack,
  deserializePack,
} from "mintcore";
import type { ItemDefinition, PackDefinition } from "mintcore";

// ── 1. Use the Rarity enum ─────────────────────────────────────────────────

console.log("Rarity values:");
for (const [name, value] of Object.entries(Rarity).filter(([, v]) => typeof v === "number")) {
  console.log(`  ${value}: ${name}`);
}

// Type guard
console.log("\nisRarity(2):", isRarity(2));     // true  (Rarity.Rare)
console.log("isRarity(99):", isRarity(99));    // false

// String conversion
console.log("rarityToString(Rarity.Legendary):", rarityToString(Rarity.Legendary));

// ── 2. Create ItemDefinitions ──────────────────────────────────────────────

// Items are pure data — they describe what an item is, not how it behaves.
// All functional logic (minting, selection, distribution) lives in
// application-layer modules built on top of the SDK.

const ironSword: ItemDefinition = {
  id: "iron-sword-001",
  version: 1,
  rarity: Rarity.Common,
  metadata: {
    name: "Iron Sword",
    description: "A basic melee weapon",
    attributes: { damage: 10, type: "sword" },
  },
};

const steelShield: ItemDefinition = {
  id: "steel-shield-001",
  version: 1,
  rarity: Rarity.Uncommon,
  metadata: {
    name: "Steel Shield",
    description: "A sturdy defensive item",
    attributes: { defense: 15, type: "shield" },
  },
};

const dragonScale: ItemDefinition = {
  id: "dragon-scale-001",
  version: 1,
  rarity: Rarity.Epic,
  metadata: {
    name: "Dragon Scale",
    description: "A rare crafting material",
    image: "ipfs://bafybeiscale...",
    attributes: { material: "scale", element: "fire", durability: 95 },
  },
};

// Validate each item
for (const item of [ironSword, steelShield, dragonScale]) {
  assertItemDefinition(item);
  console.log(`\nItem: ${item.metadata.name} (${rarityToString(item.rarity)})`);
  console.log("  isItemDefinition:", isItemDefinition(item));
}

// ── 3. Create a PackDefinition ─────────────────────────────────────────────

const pack: PackDefinition = {
  id: "warrior-starter-pack-v1",
  version: 1,
  metadata: {
    name: "Warrior Starter Pack",
    description: "A beginner pack for warriors with weapons and armor",
    image: "ipfs://bafybeipackimage...",
    attributes: { theme: "fantasy", class: "warrior" },
  },
  items: [ironSword, steelShield, dragonScale],
};

console.log("\nPackDefinition:");
console.log("  id:", pack.id);
console.log("  items:", pack.items.length);
console.log("  isPackDefinition:", isPackDefinition(pack));

// Assertion — throws MintCoreError if the pack is malformed
assertPackDefinition(pack);

// ── 4. Serialize to JSON ───────────────────────────────────────────────────

const json = serializePack(pack);
console.log("\nSerialized JSON:");
console.log(json);

// ── 5. Deserialize back ────────────────────────────────────────────────────

const restored = deserializePack(json);
console.log("\nDeserialized pack id:", restored.id);
console.log("Deserialized items:", restored.items.map((i) => i.metadata.name));

console.log("\nDone.");
