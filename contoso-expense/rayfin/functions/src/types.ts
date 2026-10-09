/**
 * Function schema types for RayfinClient.
 *
 * AUTO-GENERATED — do not edit manually.
 * Re-generated automatically when function source files change.
 *
 * If this file is not updating automatically, run:
 *   rayfin dev functions apply
 *
 * The schema is a closed object type: only the function names listed
 * below are accepted by RayfinClient.functions.<name>.invoke(...).
 * Adding, renaming, or changing the signature of a udf.func() call
 * regenerates this file and surfaces type errors at every consumer.
 *
 * IMPORTANT: This file must NOT import any Node.js packages — it is
 * resolved by the frontend app's TypeScript compiler.
 */

export type AppFunctionsSchema = {
  getApprovalExperience: {
    input: { expense: { id: string; employee: string; initials: string; role: string; department: string; email: string; category: string; description: string; amount: number; submitted: string; expenseDate: string; merchant: string; status: 'Pending' | 'Approved' | 'Rejected'; hasReceipt: boolean }; experimentSubjectId: string };
    output: { variant: 'standard' | 'assisted'; id: string; employee: string; initials: string; role: string; department: string; email: string; category: string; description: string; amount: number; submitted: string; expenseDate: string; merchant: string; status: 'Pending' | 'Approved' | 'Rejected'; hasReceipt: boolean } | { policyStatus: 'Within policy' | 'Review required'; riskLevel: 'Low' | 'Medium' | 'High'; recommendation: 'Approve' | 'Review'; reasons: string[]; variant: 'standard' | 'assisted'; id: string; employee: string; initials: string; role: string; department: string; email: string; category: string; description: string; amount: number; submitted: string; expenseDate: string; merchant: string; status: 'Pending' | 'Approved' | 'Rejected'; hasReceipt: boolean };
  };
};
