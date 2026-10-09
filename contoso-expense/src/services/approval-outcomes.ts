import type { ApprovalOutcome } from "../../rayfin/data/ApprovalOutcome";

import { getRayfinClient } from "@/lib/rayfin-client";

export type ApprovalOutcomeInput = Omit<ApprovalOutcome, "id" | "outcomeKey">;

export async function upsertApprovalOutcome(
    outcome: ApprovalOutcomeInput,
): Promise<ApprovalOutcome> {
    const outcomes = getRayfinClient().data.ApprovalOutcome;
    const existing = await outcomes.findFirst({
        expenseId: { eq: outcome.expenseId },
        actingApproverEmail: { eq: outcome.actingApproverEmail },
    });

    if (existing) {
        return outcomes.update({ id: existing.id }, outcome);
    }

    return outcomes.create({
        ...outcome,
        outcomeKey: `${outcome.expenseId}::${outcome.actingApproverEmail}`,
    });
}
