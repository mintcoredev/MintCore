import mintcore from "mintcore";

async function main() {
  const assetId = "SWORD001";
  const player = "player1";

  // Create metadata for the NFT
  const metadata = mintcore.metadata.createMetadata({
    name: "Sword of Dawn",
    rarity: "legendary",
    attack: 42,
  });

  // Mint the NFT
  await mintcore.minting.mintNFT({
    assetId,
    to: player,
    metadata,
  });

  console.log("Player inventory:", mintcore.accounting.getInventory(player));
}

main();
