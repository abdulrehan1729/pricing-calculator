type LogContext = Record<string, unknown>;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const sensitiveKey = /authorization|cookie|password|secret|token/i;

function serialize(value: unknown, key?: string): unknown {
  if (key && sensitiveKey.test(key)) {
    return '[REDACTED]';
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => serialize(item));
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [entryKey, serialize(entryValue, entryKey)]),
    );
  }

  return value;
}

function write(level: LogLevel, message: string, context: LogContext = {}): void {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...serialize(context) as LogContext,
  });

  if (level === 'error') {
    console.error(entry);
    return;
  }

  console.log(entry);
}

export const logger = {
  debug: (message: string, context?: LogContext): void => write('debug', message, context),
  info: (message: string, context?: LogContext): void => write('info', message, context),
  warn: (message: string, context?: LogContext): void => write('warn', message, context),
  error: (message: string, context?: LogContext): void => write('error', message, context),
};
