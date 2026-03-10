import mintcore from "mintcore";

async function main() {
  const assetId = "GOLD";
  const alice = "alice";
  const bob = "bob";

  // Mint to Alice
  await mintcore.minting.mintFungibleToken({
    assetId,
    to: alice,
    amount: 500n,
  });

  // Transfer 200 GOLD from Alice to Bob
  await mintcore.accounting.transfer(assetId, alice, bob, 200n);

  console.log("Alice:", mintcore.accounting.getBalance(alice, assetId));
  console.log("Bob:", mintcore.accounting.getBalance(bob, assetId));
}

main();
