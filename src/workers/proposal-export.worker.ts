import { Worker } from 'bullmq';
import { getBullConnection } from '../queues/bull-connection';
import {
  PROPOSAL_EXPORT_QUEUE_NAME,
  type ProposalExportJobPayload,
  closeProposalExportQueue,
} from '../queues/proposal-export.queue';
import { processProposalExportJob } from '../modules/rpms/export/proposal-export.service';

let worker: Worker<ProposalExportJobPayload> | null = null;

export const startProposalExportWorker = () => {
  if (worker) {
    return worker;
  }

  worker = new Worker<ProposalExportJobPayload>(
    PROPOSAL_EXPORT_QUEUE_NAME,
    async (job) => {
      await processProposalExportJob(job.data.dbJobId);
    },
    {
      connection: getBullConnection(),
      concurrency: Number(process.env.EXPORT_WORKER_CONCURRENCY ?? 2),
    }
  );

  worker.on('failed', (job, err) => {
    console.error(
      `[proposal-export] Job ${job?.id ?? 'unknown'} failed:`,
      err.message
    );
  });

  worker.on('completed', (job) => {
    console.log(`[proposal-export] Job ${job.id} completed`);
  });

  console.log('Proposal export worker started');
  return worker;
};

export const stopProposalExportWorker = async () => {
  if (worker) {
    await worker.close();
    worker = null;
  }
  await closeProposalExportQueue();
};
