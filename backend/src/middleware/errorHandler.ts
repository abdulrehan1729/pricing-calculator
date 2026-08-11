import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
    statusCode: number;
    details?: unknown;

    constructor(message: string, statusCode = 400, details: unknown) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
    }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: err.message,
            details: err.details,
        });
        return;
    }

    console.error('Unexpected Error:', err);
    res.status(500).json({error: 'Internal server error'})
}
