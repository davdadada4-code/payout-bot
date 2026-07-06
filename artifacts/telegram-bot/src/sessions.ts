export type PayoutStep =
  | "worker_username"
  | "mammoth_username"
  | "screenshot"
  | "payment_method"
  | "payment_details";

export type TeamStep = "experience" | "source" | "time";

export type ConfirmStep = "amount" | "done";

export interface PayoutDraft {
  workerUsername?: string;
  mammothUsername?: string;
  screenshotFileId?: string;
  paymentMethod?: "ton" | "card";
  paymentDetails?: string;
}

export interface TeamDraft {
  experience?: string;
  source?: string;
  time?: string;
}

export interface SessionData {
  // Payout wizard
  payoutStep?: PayoutStep;
  payoutDraft?: PayoutDraft;

  // Team wizard
  teamStep?: TeamStep;
  teamDraft?: TeamDraft;

  // Admin confirm flow: keyed by requestId
  confirmStep?: ConfirmStep;
  confirmRequestId?: string;
  confirmWorkerUsername?: string;
  confirmAmount?: number;
}
