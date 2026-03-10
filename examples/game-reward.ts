import mintcore from "mintcore";

async function main() {
  const assetId = "XP";
  const player = "player1";

  // Rule: XP can only be minted via reward events
  mintcore.rules.addRule(
    mintcore.rules.createMintAuthorityRule(assetId, ["reward-engine"])
  );

  // Reward the player with 50 XP
  await mintcore.accounting.reward({
    assetId,
    to: player,
    amount: 50n,
    authority: "reward-engine",
    metadata: { reason: "quest-complete" },
  });

  console.log("Player XP:", mintcore.accounting.getBalance(player, assetId));
}

main();
