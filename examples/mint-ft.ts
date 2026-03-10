import mintcore from "mintcore";

async function main() {
  // Mint 1,000 GOLD tokens to Alice
  const assetId = "GOLD";
  const alice = "alice";

  const result = await mintcore.minting.mintFungibleToken({
    assetId,
    to: alice,
    amount: 1000n,
    metadata: {
      name: "Gold Token",
      description: "In‑game currency",
    },
  });

  console.log("Mint result:", result);
  console.log("Alice balance:", mintcore.accounting.getBalance(alice, assetId));
}

main();
