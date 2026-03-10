import mintcore from "mintcore";

async function main() {
  const assetId = "EVENT2026-TICKET";
  const venue = "venue";
  const buyer = "alice";
  const reseller = "bob";

  // 1. Define metadata for the ticket
  const metadata = mintcore.metadata.createMetadata({
    name: "Live Concert — General Admission",
    event: "MintCore Music Fest 2026",
    date: "2026-08-12",
    seat: "GA",
    venue: "South Bruce Pavilion",
  });

  // 2. Add rules for ticket minting
  mintcore.rules.addRule(
    mintcore.rules.createMaxSupplyRule(assetId, 100n) // Only 100 tickets exist
  );

  mintcore.rules.addRule(
    mintcore.rules.createMintAuthorityRule(assetId, [venue]) // Only the venue can mint
  );

  // Optional: Make tickets non-transferable (soulbound)
  // mintcore.rules.addRule(
  //   mintcore.rules.createSoulboundRule(assetId)
  // );

  // 3. Venue mints a ticket to the buyer
  await mintcore.minting.mintNFT({
    assetId,
    to: buyer,
    metadata,
    authority: venue,
  });

  console.log("Buyer inventory:", mintcore.accounting.getInventory(buyer));

  // 4. Buyer resells the ticket to Bob (if not soulbound)
  await mintcore.accounting.transfer(assetId, buyer, reseller, 1n);

  console.log("Reseller inventory:", mintcore.accounting.getInventory(reseller));

  // 5. Check ticket history for authenticity
  const history = mintcore.accounting.getHistory(reseller);
  console.log("Ticket history:", history);
}

main();
