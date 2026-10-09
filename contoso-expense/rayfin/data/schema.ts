import { ApprovalOutcome } from './ApprovalOutcome.js';

export type ContosoExpenseSchema = {
  ApprovalOutcome: ApprovalOutcome;
};

export const schema = [ApprovalOutcome];
