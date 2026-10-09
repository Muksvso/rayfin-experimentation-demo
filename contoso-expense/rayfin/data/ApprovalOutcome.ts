import {
  date,
  decimal,
  email,
  entity,
  role,
  set,
  text,
  uuid,
} from '@microsoft/rayfin-core';

@entity()
@role('authenticated', '*')
export class ApprovalOutcome {
  @uuid() id!: string;
  @text({ max: 400, unique: true }) outcomeKey!: string;
  @text({ max: 100 }) expenseId!: string;
  @email({ max: 254 }) actingApproverEmail!: string;
  @set('standard', 'assisted') variant!: 'standard' | 'assisted';
  @set('approve', 'reject') action!: 'approve' | 'reject';
  @date() openedAt!: Date;
  @date() completedAt!: Date;
  @decimal({ precision: 12, scale: 3 }) decisionTimeSeconds!: number;
}
