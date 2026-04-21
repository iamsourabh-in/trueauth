import express, { Request } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { requestContext } from './middleware/request-context';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { log } from './lib/logger';
import { mailboxRouter } from './routes/mailbox';
import { subscriptionsRouter } from './routes/subscriptions';
import { cleanupRouter } from './routes/cleanup';
import { draftRouter } from './routes/draft';
import { calendarRouter } from './routes/calendar';
import { authRouter } from './routes/auth';
import { removalRouter } from './routes/removal';


declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

/** Write access logs straight to stdout (works with Docker, pipes, and non-TTY). */
const accessLogStream: { write: (message: string) => void } = {
  write(message: string) {
    process.stdout.write(message);
  }
};

morgan.token('rid', (req: Request) => req.requestId ?? '-');

app.use(requestContext);
app.use(
  morgan(
    ':remote-addr :method :url :status :res[content-length] - :response-time ms rid=:rid',
    { stream: accessLogStream }
  )
);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRouter);
app.use('/api/mailbox', mailboxRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/cleanup', cleanupRouter);
app.use('/api/draft', draftRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/removal', removalRouter);

app.get('/api', (req, res) => {
  res.json({
    message: 'TrueAuth API is running. Visit /api-docs for interactive Swagger documentation.'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  const banner =
    `\n` +
    `TrueAuth API  |  http://127.0.0.1:${PORT}\n` +
    `  Health: GET /health   |   Access logs: one line per HTTP request below\n` +
    `\n`;
  process.stdout.write(banner);
  log.info(`Server listening on port ${PORT}`, { port: PORT });
});

process.on('unhandledRejection', (reason: unknown) => {
  log.error('unhandledRejection', { reason: reason instanceof Error ? reason.message : String(reason) });
});

process.on('uncaughtException', (err: Error) => {
  log.error('uncaughtException', { message: err.message, stack: err.stack });
});
