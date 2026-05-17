import dotenv from 'dotenv';
import app from './app';
import { connectRedis, disconnectRedis } from './config/redis';
import { isBullMqAvailable } from './queues/bull-connection';
import { startProposalExportWorker, stopProposalExportWorker } from './workers/proposal-export.worker';

dotenv.config();

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectRedis();

  if (isBullMqAvailable()) {
    startProposalExportWorker();
  } else {
    console.log('BullMQ: export worker disabled (REDIS_URL not set)');
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  const shutdown = async () => {
    await stopProposalExportWorker();
    await disconnectRedis();
    server.close();
  };

  process.on('SIGINT', () => {
    void shutdown().then(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    void shutdown().then(() => process.exit(0));
  });
};

void start();