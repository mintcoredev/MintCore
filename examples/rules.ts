import mintcore from "mintcore";

async function main() {
  const assetId = "GEM";
  const alice = "alice";

  // Add a max supply rule
  mintcore.rules.addRule(
    mintcore.rules.createMaxSupplyRule(assetId, 100n)
  );

  // Add a mint authority rule
  mintcore.rules.addRule(
    mintcore.rules.createMintAuthorityRule(assetId, ["admin"])
  );

  // Minting as admin works
  await mintcore.minting.mintFungibleToken({
    assetId,
    to: alice,
    amount: 50n,
    authority: "admin",
  });

  // Minting as non-admin fails
  try {
    await mintcore.minting.mintFungibleToken({
      assetId,
      to: alice,
      amount: 50n,
      authority: "bob",
    });
  } catch (err) {
    console.log("Expected error:", err.message);
  }

  console.log("Alice balance:", mintcore.accounting.getBalance(alice, assetId));
}

main();
