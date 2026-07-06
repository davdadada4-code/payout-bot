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

  // Support wizard
  supportStep?: "waiting_message";

  // Admin confirm flow
  confirmStep?: ConfirmStep;
  confirmRequestId?: string;
  confirmWorkerUsername?: string;
  confirmAmount?: number;
}

export function clearWizard(session: SessionData): void {
  session.payoutStep = undefined;
  session.payoutDraft = undefined;
  session.teamStep = undefined;
  session.teamDraft = undefined;
  session.supportStep = undefined;
  session.confirmStep = undefined;
  session.confirmRequestId = undefined;
  session.confirmWorkerUsername = undefined;
  session.confirmAmount = undefined;
}
