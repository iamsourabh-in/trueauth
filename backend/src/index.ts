import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

import { mailboxRouter } from './routes/mailbox';
import { subscriptionsRouter } from './routes/subscriptions';
import { cleanupRouter } from './routes/cleanup';
import { draftRouter } from './routes/draft';
import { calendarRouter } from './routes/calendar';

// Routes will be imported and used here
app.use('/api/mailbox', mailboxRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/cleanup', cleanupRouter);
app.use('/api/draft', draftRouter);
app.use('/api/calendar', calendarRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
