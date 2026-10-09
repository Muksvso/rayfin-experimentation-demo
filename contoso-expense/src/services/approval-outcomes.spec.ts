import { beforeEach, describe, expect, it, vi } from "vitest";

import { upsertApprovalOutcome, type ApprovalOutcomeInput } from "./approval-outcomes";

const { create, findFirst, update } = vi.hoisted(() => ({
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
}));

vi.mock("@/lib/rayfin-client", () => ({
    getRayfinClient: () => ({
        data: {
            ApprovalOutcome: {
                create,
                findFirst,
                update,
            },
        },
    }),
}));

const outcome: ApprovalOutcomeInput = {
    expenseId: "EXP-2026-1048",
    actingApproverEmail: "megan.bowen@contoso.com",
    variant: "standard",
    action: "approve",
    openedAt: new Date("2026-10-08T00:00:00Z"),
    completedAt: new Date("2026-10-08T00:00:05Z"),
    decisionTimeSeconds: 5,
};

describe("upsertApprovalOutcome", () => {
    beforeEach(() => {
        create.mockReset();
        findFirst.mockReset();
        update.mockReset();
    });

    it("updates an existing expense and approver outcome", async () => {
        const existing = {
            id: "existing-outcome",
            outcomeKey: "EXP-2026-1048::megan.bowen@contoso.com",
            ...outcome,
        };
        findFirst.mockResolvedValue(existing);
        update.mockResolvedValue({ ...existing, action: "reject" });

        await upsertApprovalOutcome({ ...outcome, action: "reject" });

        expect(findFirst).toHaveBeenCalledWith({
            expenseId: { eq: outcome.expenseId },
            actingApproverEmail: { eq: outcome.actingApproverEmail },
        });
        expect(update).toHaveBeenCalledWith(
            { id: existing.id },
            { ...outcome, action: "reject" },
        );
        expect(create).not.toHaveBeenCalled();
    });

    it("creates a keyed outcome when the combination is new", async () => {
        findFirst.mockResolvedValue(null);
        create.mockResolvedValue({
            id: "new-outcome",
            outcomeKey: "EXP-2026-1048::megan.bowen@contoso.com",
            ...outcome,
        });

        await upsertApprovalOutcome(outcome);

        expect(create).toHaveBeenCalledWith({
            ...outcome,
            outcomeKey: "EXP-2026-1048::megan.bowen@contoso.com",
        });
        expect(update).not.toHaveBeenCalled();
    });
});
