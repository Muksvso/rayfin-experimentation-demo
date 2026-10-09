//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "@/App";

const { upsertOutcome, invokeApproval } = vi.hoisted(() => ({
    upsertOutcome: vi.fn(),
    invokeApproval: vi.fn(),
}));

vi.mock("@/hooks/auth.context", () => ({
    useAuth: () => ({
        session: {
            user: { id: "test-user", email: "jordan.lee@contoso.com" },
            isAuthenticated: true,
            isAnonymous: false,
        },
    }),
}));

vi.mock("@/lib/rayfin-client", () => ({
    getRayfinClient: () => ({
        functions: {
            getApprovalExperience: {
                invoke: invokeApproval,
            },
        },
    }),
}));

vi.mock("@/services/approval-outcomes", () => ({
    upsertApprovalOutcome: upsertOutcome,
}));

describe("App", () => {
    beforeEach(() => {
        invokeApproval.mockClear();
        upsertOutcome.mockClear();
        upsertOutcome.mockImplementation(async (outcome: Record<string, unknown>) => ({
            id: "outcome-1",
            ...outcome,
        }));
        invokeApproval.mockImplementation(async ({ expense }) => ({
            ...expense,
            variant: "standard",
        }));
    });

    it("renders without throwing", () => {
        expect(() => render(<App />)).not.toThrow();
    });

    it("renders the dashboard and signed-in user", () => {
        render(<App />);
        expect(screen.getByRole("heading", { name: "Contoso Expense" })).toBeInTheDocument();
        expect(screen.getByText("Pending Expense Approvals")).toBeInTheDocument();
        expect(screen.getAllByText("Jordan Lee").length).toBeGreaterThan(0);
        expect(screen.getByRole("combobox", { name: "Acting approver" })).toHaveValue(
            "megan.bowen@contoso.com",
        );
    });

    it("opens a standard expense through the RayFin Function", async () => {
        render(<App />);

        fireEvent.click(screen.getByRole("button", { name: /Adele Vance/i }));
        expect(await screen.findByRole("dialog", { name: "EXP-2026-1048" })).toBeInTheDocument();
        expect(invokeApproval).toHaveBeenCalledWith({
            expense: expect.objectContaining({ id: "EXP-2026-1048" }),
            experimentSubjectId: "megan.bowen@contoso.com",
        });
        expect(screen.queryByText("Approval assistance")).not.toBeInTheDocument();
        expect(screen.getByText(/Assigned by App Configuration: standard/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Approve" }));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(upsertOutcome).toHaveBeenCalledWith(expect.objectContaining({
            expenseId: "EXP-2026-1048",
            actingApproverEmail: "megan.bowen@contoso.com",
            variant: "standard",
            action: "approve",
            openedAt: expect.any(Date),
            completedAt: expect.any(Date),
            decisionTimeSeconds: expect.any(Number),
        }));
        expect(screen.getByRole("status")).toHaveTextContent("EXP-2026-1048 was approved.");
        expect(screen.queryByText("Adele Vance")).not.toBeInTheDocument();
    });

    it("renders server-returned assistance for the assigned variant", async () => {
        invokeApproval.mockImplementationOnce(async ({ expense }) => ({
            ...expense,
            variant: "assisted",
            policyStatus: "Review required",
            riskLevel: "Low",
            recommendation: "Review",
            reasons: ["A receipt is required before this expense can be approved."],
        }));
        render(<App />);

        fireEvent.click(screen.getByRole("button", { name: /Diego Siciliani/i }));

        expect(await screen.findByText("Approval assistance")).toBeInTheDocument();
        expect(screen.getByText("Review required")).toBeInTheDocument();
        expect(screen.getByText("A receipt is required before this expense can be approved.")).toBeInTheDocument();
        expect(invokeApproval).toHaveBeenCalledWith(expect.objectContaining({
            experimentSubjectId: "megan.bowen@contoso.com",
        }));
    });

    it("re-evaluates an open approval when the acting approver changes", async () => {
        invokeApproval.mockImplementation(async ({ expense, experimentSubjectId }) => (
            experimentSubjectId === "alex.wilber@contoso.com"
                ? {
                    ...expense,
                    variant: "assisted",
                    policyStatus: "Within policy",
                    riskLevel: "Low",
                    recommendation: "Approve",
                    reasons: ["The expense is within policy."],
                }
                : { ...expense, variant: "standard" }
        ));
        render(<App />);

        fireEvent.click(screen.getByRole("button", { name: /Adele Vance/i }));
        expect(await screen.findByText(/Assigned by App Configuration: standard/)).toBeInTheDocument();

        const changedAt = Date.now();
        fireEvent.change(screen.getByRole("combobox", { name: "Acting approver" }), {
            target: { value: "alex.wilber@contoso.com" },
        });

        await waitFor(() => {
            expect(invokeApproval).toHaveBeenLastCalledWith({
                expense: expect.objectContaining({ id: "EXP-2026-1048" }),
                experimentSubjectId: "alex.wilber@contoso.com",
            });
        });
        expect(await screen.findByText(/Assigned by App Configuration: assisted/)).toBeInTheDocument();
        expect(screen.getByText("Approval assistance")).toBeInTheDocument();
        expect(screen.getAllByText("Jordan Lee").length).toBeGreaterThan(0);

        fireEvent.click(screen.getByRole("button", { name: "Approve" }));
        await waitFor(() => expect(upsertOutcome).toHaveBeenCalled());
        const outcome = upsertOutcome.mock.calls[0][0] as { openedAt: Date };
        expect(outcome.openedAt.getTime()).toBeGreaterThanOrEqual(changedAt);
    });
});
