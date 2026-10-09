import { describe, expect, it } from 'vitest';

import {
  assistedApproval,
  createApprovalExperience,
  standardApproval,
  type ApprovalExpense,
} from './function_app';

const baseExpense: ApprovalExpense = {
  id: 'EXP-TEST-001',
  employee: 'Adele Vance',
  initials: 'AV',
  role: 'Sales Manager',
  department: 'Sales',
  email: 'adele.vance@contoso.com',
  category: 'Travel',
  description: 'Customer meeting',
  amount: 1000,
  submitted: 'Oct 7, 2026',
  expenseDate: 'Oct 6, 2026',
  merchant: 'Contoso Travel',
  status: 'Pending',
  hasReceipt: true,
};

describe('approval experiences', () => {
  it('returns the original expense and assigned variant for standard approval', () => {
    expect(standardApproval(baseExpense, 'standard')).toEqual({
      ...baseExpense,
      variant: 'standard',
    });
  });

  it('recommends approval for a low-value expense with a receipt', () => {
    expect(assistedApproval(baseExpense, 'assisted')).toMatchObject({
      variant: 'assisted',
      policyStatus: 'Within policy',
      riskLevel: 'Low',
      recommendation: 'Approve',
    });
  });

  it('requires review when the receipt is missing', () => {
    expect(assistedApproval({ ...baseExpense, hasReceipt: false }, 'assisted')).toMatchObject({
      policyStatus: 'Review required',
      riskLevel: 'Low',
      recommendation: 'Review',
    });
  });

  it.each([
    [2000.01, 'Medium'],
    [5000.01, 'High'],
  ] as const)('assigns %s expenses a %s risk level', (amount, riskLevel) => {
    expect(assistedApproval({ ...baseExpense, amount }, 'assisted')).toMatchObject({
      policyStatus: 'Review required',
      riskLevel,
      recommendation: 'Review',
    });
  });

  it.each(['standard', 'assisted'] as const)(
    'dispatches to the %s experience selected by App Configuration',
    async (variant) => {
      const resolveVariant = async (subjectId: string) => {
        expect(subjectId).toBe('adele.vance@contoso.com');
        return variant;
      };

      await expect(
        createApprovalExperience(baseExpense, 'adele.vance@contoso.com', resolveVariant),
      ).resolves.toMatchObject({ variant });
    },
  );
});
