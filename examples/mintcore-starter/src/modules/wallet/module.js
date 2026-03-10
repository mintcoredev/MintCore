import { generateKey, deriveAddress } from "mintcore";

export default {
  id: "wallet",

  init(core) {
    console.log("wallet module initialized");
  },

  actions: {
    generateWallet() {
      const privateKey = generateKey();
      const address = deriveAddress(privateKey, "mainnet");
      return { ok: true, address };
    }
  }
};
