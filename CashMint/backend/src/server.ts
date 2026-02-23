import app from "./app.js";
import { log } from "./utils/logger.js";

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, () => {
  log("info", `CashMint backend running on port ${PORT}`);
});
