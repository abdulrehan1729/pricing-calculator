import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { AppError, errorHandler } from "./middleware/errorHandler";
import { connectDB } from "./config/db";
import authRoutes from "./routes/authRoutes";
import documentRoutes from "./routes/documentRoutes";
import reportRoutes from "./routes/reportRoutes";
import { logger } from "./utils/logger";
import { randomUUID } from "crypto";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

app.use((req, res, next) => {
    const requestId = randomUUID();
    const startedAt = performance.now();
    res.locals.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);

    res.on("finish", () => {
        logger.info("HTTP request completed", {
            requestId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
        });
    });
    next();
});

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/documents", documentRoutes);
app.use("/reports", reportRoutes);

app.use((req, _res, next) => {
    next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
});
app.use(errorHandler);

async function startServer(): Promise<void> {
    try {
        await connectDB();
        app.listen(PORT, () => {
            logger.info("Server started", { port: PORT, healthCheck: "/health" });
        });
    } catch (error) {
        logger.error('Failed to start server', { error });
        process.exitCode = 1;
    }
}

void startServer();
