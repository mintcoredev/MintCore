import mintcore from "mintcore";

async function main() {
  const assetId = "GOLD";
  const alice = "alice";

  await mintcore.minting.mintFungibleToken({
    assetId,
    to: alice,
    amount: 100n,
  });

  // Debit 10 GOLD from Alice (admin correction)
  await mintcore.accounting.adjust({
    assetId,
    address: alice,
    amount: 10n,
    direction: "debit",
    metadata: { reason: "admin-correction" },
  });

  console.log("Alice balance:", mintcore.accounting.getBalance(alice, assetId));
  console.log("Supply:", mintcore.accounting.getSupply(assetId));
}

main();
