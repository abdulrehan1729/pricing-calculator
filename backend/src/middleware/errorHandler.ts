import { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
    statusCode: number;
    details?: unknown;

    constructor(message: string, statusCode = 400, details: unknown = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
    }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
    if (isAppError(err)) {
        res.status(err.statusCode).json({
            error: err.message,
            details: err.details,
        });
        return;
    }

    if (err instanceof SyntaxError && 'body' in err) {
        res.status(400).json({
            error: 'Invalid JSON request body',
            details: null,
        });
        return;
    }

    if (isDuplicateKeyError(err)) {
        res.status(409).json({
            error: 'Email already registered',
            details: null,
        });
        return;
    }

    console.error('Unexpected Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        details: null,
    });
}

function isAppError(error: unknown): error is AppError {
    return error instanceof AppError || (
        typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        typeof error.statusCode === 'number' &&
        'message' in error &&
        typeof error.message === 'string'
    );
}

function isDuplicateKeyError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}
