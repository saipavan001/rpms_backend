import { Queue } from 'bullmq';
import { getBullConnection } from './bull-connection';

export const PROPOSAL_EXPORT_QUEUE_NAME = 'proposal-export';

export type ProposalExportJobPayload = {
  dbJobId: string;
};

let proposalExportQueue: Queue<ProposalExportJobPayload> | null = null;

export const getProposalExportQueue = () => {
  if (!proposalExportQueue) {
    proposalExportQueue = new Queue<ProposalExportJobPayload>(
      PROPOSAL_EXPORT_QUEUE_NAME,
      {
        connection: getBullConnection(),
        defaultJobOptions: {
          removeOnComplete: { age: 86400, count: 200 },
          removeOnFail: { age: 604800, count: 100 },
          attempts: 2,
          backoff: { type: 'exponential', delay: 3000 },
        },
      }
    );
  }
  return proposalExportQueue;
};

export const closeProposalExportQueue = async () => {
  if (proposalExportQueue) {
    await proposalExportQueue.close();
    proposalExportQueue = null;
  }
};
