import mintcore from "mintcore";

async function main() {
  const assetId = "GOLD";
  const alice = "alice";

  await mintcore.minting.mintFungibleToken({
    assetId,
    to: alice,
    amount: 100n,
  });

  await mintcore.accounting.transfer(assetId, alice, "bob", 40n);

  const snapshot = mintcore.accounting.exportLedger();
  const replayed = mintcore.accounting.replayLedger(snapshot);

  console.log("Live balance:", mintcore.accounting.getBalance("bob", assetId));
  console.log("Replayed balance:", replayed.getBalance("bob", assetId));
}

main();
