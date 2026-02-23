import express from "express";
import cors from "cors";
import morgan from "morgan";
import healthRouter from "./routes/health.routes.js";
import mintRouter from "./routes/mint.routes.js";
import tokensRouter from "./routes/tokens.routes.js";
import walletsRouter from "./routes/wallets.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/health", healthRouter);
app.use("/api/mint", mintRouter);
app.use("/api/tokens", tokensRouter);
app.use("/api/wallets", walletsRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
