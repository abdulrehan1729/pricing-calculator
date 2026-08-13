import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler";

export interface AuthRequest extends Request {
    userId?: string;
}

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        next(new AppError("Missing or invalid authorization header", 401, null));
        return;
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
        next(new AppError("Missing or invalid authorization header", 401, null));
        return;
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
        next(new Error("JWT_SECRET is not defined"));
        return;
    }

    try {
        const payload = jwt.verify(token, secret);
        if (typeof payload === "string" || typeof payload.userId !== "string") {
            next(new AppError("Invalid or expired token", 401, null));
            return;
        }

        req.userId = payload.userId;
        next();
    } catch {
        next(new AppError("Invalid or expired token", 401, null));
    }
}
