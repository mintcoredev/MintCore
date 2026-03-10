import { MintCore } from "./src/core.js";
import helloModule from "./src/modules/hello/index.js";
import walletModule from "./src/modules/wallet/index.js";
import { VERSION } from "mintcore";
import http from "http";

async function main() {
  const core = new MintCore({
    modules: [helloModule, walletModule],
    config: {}
  });

  await core.init();

  console.log(`MintCore starter app initialized. (mintcore v${VERSION})`);
  console.log("Loaded modules:", core.listModules());

  const server = http.createServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        message: "MintCore starter app is running",
        version: VERSION,
        modules: core.listModules()
      }));
      return;
    }

    if (req.url === "/hello") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(core.call("hello.sayHello")));
      return;
    }

    if (req.url === "/wallet") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(core.call("wallet.generateWallet")));
      return;
    }

    if (req.url === "/version") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, version: VERSION }));
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  server.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
  });
}

main();
