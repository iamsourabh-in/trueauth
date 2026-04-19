export type LogMeta = Record<string, unknown>;

function safeMeta(meta?: LogMeta): string {
  if (!meta || Object.keys(meta).length === 0) return '';
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ' [meta serialization failed]';
  }
}

function line(level: string, context: string, msg: string, meta?: LogMeta): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level}] [${context}] ${msg}${safeMeta(meta)}`;
}

export function createLogger(context: string) {
  return {
    info(msg: string, meta?: LogMeta) {
      console.log(line('INFO', context, msg, meta));
    },
    warn(msg: string, meta?: LogMeta) {
      console.warn(line('WARN', context, msg, meta));
    },
    error(msg: string, meta?: LogMeta) {
      console.error(line('ERROR', context, msg, meta));
    },
    debug(msg: string, meta?: LogMeta) {
      if (process.env.LOG_LEVEL === 'debug') {
        console.log(line('DEBUG', context, msg, meta));
      }
    }
  };
}

/** Root logger when no specific context is needed */
export const log = createLogger('app');

/** Correlate logs across a single HTTP request */
export function requestLogMeta(req: { requestId?: string; method?: string; path?: string }): LogMeta {
  return {
    requestId: req.requestId,
    method: req.method,
    path: req.path
  };
}
