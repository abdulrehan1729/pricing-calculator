import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { AppError, errorHandler } from "./middleware/errorHandler";
import { connectDB } from "./config/db";
import authRoutes from "./routes/authRoutes";
import documentRoutes from "./routes/documentRoutes";
import reportRoutes from "./routes/reportRoutes";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

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
            console.log(`Server is running on port: ${PORT} for health check go on : http://localhost:4000/health`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exitCode = 1;
    }
}

void startServer();
