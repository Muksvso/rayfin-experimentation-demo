//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import {
    BarChart3,
    Bell,
    BriefcaseBusiness,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronRight,
    Clock3,
    FileText,
    Home,
    Menu,
    Plane,
    Receipt,
    Search,
    ShieldCheck,
    Utensils,
    WalletCards,
    X,
    XCircle,
    type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/hooks/auth.context";
import { getRayfinClient } from "@/lib/rayfin-client";
import { upsertApprovalOutcome } from "@/services/approval-outcomes";
import type { AppFunctionsSchema } from "../rayfin/functions/src/types";

type ApprovalExperience = AppFunctionsSchema["getApprovalExperience"]["output"];
type ApprovalExperienceInput = AppFunctionsSchema["getApprovalExperience"]["input"];
type Expense = ApprovalExperienceInput["expense"];
type ExpenseStatus = Expense["status"];
type NavItemId = "dashboard" | "expenses" | "approvals";

const actingApprovers = [
    { name: "Megan Bowen", email: "megan.bowen@contoso.com" },
    { name: "Alex Wilber", email: "alex.wilber@contoso.com" },
] as const;

type ActingApproverEmail = typeof actingApprovers[number]["email"];

interface NavItem {
    id: NavItemId;
    label: string;
    icon: LucideIcon;
}

const initialExpenses: Expense[] = [
    {
        id: "EXP-2026-1048",
        employee: "Adele Vance",
        initials: "AV",
        role: "Senior Sales Manager",
        department: "Field Sales",
        email: "adele.vance@contoso.com",
        category: "Travel",
        description: "Customer strategy workshop in Chicago",
        amount: 1248.65,
        submitted: "Oct 7, 2026",
        expenseDate: "Oct 3, 2026",
        merchant: "Contoso Travel Services",
        status: "Pending",
        hasReceipt: true,
    },
    {
        id: "EXP-2026-1042",
        employee: "Diego Siciliani",
        initials: "DS",
        role: "Product Marketing Lead",
        department: "Marketing",
        email: "diego.siciliani@contoso.com",
        category: "Meals",
        description: "Partner planning dinner",
        amount: 286.4,
        submitted: "Oct 6, 2026",
        expenseDate: "Oct 5, 2026",
        merchant: "Fourth Coffee",
        status: "Pending",
        hasReceipt: false,
    },
    {
        id: "EXP-2026-1037",
        employee: "Megan Bowen",
        initials: "MB",
        role: "Principal Consultant",
        department: "Advisory Services",
        email: "megan.bowen@contoso.com",
        category: "Lodging",
        description: "Client implementation onsite",
        amount: 892,
        submitted: "Oct 5, 2026",
        expenseDate: "Oct 2, 2026",
        merchant: "Northwind Suites",
        status: "Pending",
        hasReceipt: true,
    },
    {
        id: "EXP-2026-1029",
        employee: "Alex Wilber",
        initials: "AW",
        role: "Account Executive",
        department: "Enterprise Sales",
        email: "alex.wilber@contoso.com",
        category: "Client entertainment",
        description: "Quarterly business review",
        amount: 465.8,
        submitted: "Oct 3, 2026",
        expenseDate: "Oct 1, 2026",
        merchant: "Fabrikam Events",
        status: "Pending",
        hasReceipt: true,
    },
    {
        id: "EXP-2026-1018",
        employee: "Nestor Wilke",
        initials: "NW",
        role: "Solutions Architect",
        department: "Cloud Solutions",
        email: "nestor.wilke@contoso.com",
        category: "Supplies",
        description: "Workshop materials",
        amount: 174.25,
        submitted: "Oct 1, 2026",
        expenseDate: "Sep 30, 2026",
        merchant: "Litware Office",
        status: "Approved",
        hasReceipt: true,
    },
];

const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "expenses", label: "My Expenses", icon: WalletCards },
    { id: "approvals", label: "Approvals", icon: ShieldCheck },
];

const categoryIcons: Record<string, LucideIcon> = {
    Travel: Plane,
    Meals: Utensils,
    Lodging: BriefcaseBusiness,
    "Client entertainment": CalendarDays,
    Supplies: Receipt,
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
});

function formatUserName(email: string) {
    return email
        .split("@")[0]
        .split(/[._-]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function getInitials(name: string) {
    return name
        .split(" ")
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function isActingApproverEmail(value: string): value is ActingApproverEmail {
    return actingApprovers.some((approver) => approver.email === value);
}

function StatusBadge({ status }: { status: ExpenseStatus }) {
    const styles = {
        Pending: "bg-[#fff4ce] text-[#8a5700]",
        Approved: "bg-[#dff6dd] text-[#0e700e]",
        Rejected: "bg-[#fde7e9] text-[#a4262c]",
    };

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-200 font-semibold ${styles[status]}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {status}
        </span>
    );
}

function ExpenseTable({
    expenses,
    onSelect,
    loadingExpenseId,
}: {
    expenses: Expense[];
    onSelect: (expense: Expense) => Promise<void>;
    loadingExpenseId: string | null;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                    <tr className="border-y border-border bg-[#fafafa] text-200 font-semibold text-muted-foreground">
                        <th className="px-6 py-3.5">Employee</th>
                        <th className="px-4 py-3.5">Expense category</th>
                        <th className="px-4 py-3.5">Amount</th>
                        <th className="px-4 py-3.5">Submitted</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="w-12 px-4 py-3.5">
                            <span className="sr-only">Open expense</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {expenses.map((expense) => {
                        const CategoryIcon = categoryIcons[expense.category] ?? Receipt;
                        return (
                            <tr
                                key={expense.id}
                                className="cursor-pointer border-b border-border bg-card transition-colors hover:bg-hover focus-within:bg-hover"
                                onClick={() => void onSelect(expense)}
                            >
                                <td className="px-6 py-4">
                                    <button
                                        type="button"
                                        className="flex items-center gap-3 text-left focus:outline-none"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            void onSelect(expense);
                                        }}
                                        aria-busy={loadingExpenseId === expense.id}
                                    >
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#deecf9] text-200 font-semibold text-[#004578]">
                                            {expense.initials}
                                        </span>
                                        <span>
                                            <span className="block text-300 font-semibold text-foreground">{expense.employee}</span>
                                            <span className="block text-200 text-muted-foreground">
                                                {loadingExpenseId === expense.id ? "Loading approval…" : expense.id}
                                            </span>
                                        </span>
                                    </button>
                                </td>
                                <td className="px-4 py-4">
                                    <span className="flex items-center gap-2 text-300 text-foreground">
                                        <CategoryIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                        {expense.category}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-300 font-semibold tabular-nums text-foreground">
                                    {currencyFormatter.format(expense.amount)}
                                </td>
                                <td className="px-4 py-4 text-300 text-muted-foreground">{expense.submitted}</td>
                                <td className="px-4 py-4"><StatusBadge status={expense.status} /></td>
                                <td className="px-4 py-4">
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {expenses.length === 0 && (
                <div className="flex flex-col items-center px-6 py-16 text-center">
                    <CheckCircle2 className="mb-3 h-8 w-8 text-success" aria-hidden="true" />
                    <p className="text-300 font-semibold">You're all caught up</p>
                    <p className="mt-1 text-200 text-muted-foreground">There are no pending expenses to review.</p>
                </div>
            )}
        </div>
    );
}

function ApprovalPanel({
    expense,
    onClose,
    onDecision,
    isSaving,
    decisionError,
}: {
    expense: ApprovalExperience;
    onClose: () => void;
    onDecision: (status: "Approved" | "Rejected") => Promise<void>;
    isSaving: boolean;
    decisionError: string | null;
}) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="approval-title">
            <button
                type="button"
                className="absolute inset-0 cursor-default bg-black/35"
                onClick={onClose}
                aria-label="Close approval details"
            />
            <section className="relative flex h-full w-full max-w-[560px] flex-col bg-background shadow-64">
                <header className="flex items-start justify-between border-b border-border px-7 py-5">
                    <div>
                        <p className="text-200 font-semibold uppercase tracking-wide text-primary">Expense approval</p>
                        <h2 id="approval-title" className="mt-1 text-500 font-semibold text-foreground">{expense.id}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-2 text-muted-foreground hover:bg-hover hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto px-7 py-6">
                    <div className="mb-6 flex items-start justify-between gap-6">
                        <div>
                            <p className="text-200 text-muted-foreground">Amount requested</p>
                            <p className="mt-1 text-hero-800 font-semibold leading-hero-800 tabular-nums text-foreground">
                                {currencyFormatter.format(expense.amount)}
                            </p>
                        </div>
                        <StatusBadge status={expense.status} />
                    </div>

                    <div className="mb-6 rounded-md border border-[#c7e0f4] bg-[#f3f9fd] px-4 py-3 text-200 text-[#004578]">
                        <span className="font-semibold">Demo only</span>
                        <span className="mx-2 text-[#8a8886]" aria-hidden="true">·</span>
                        Assigned by App Configuration: {expense.variant}
                    </div>

                    <div className="mb-7 grid grid-cols-2 gap-x-6 gap-y-5 rounded-lg border border-border bg-[#fafafa] p-5">
                        <Detail label="Category" value={expense.category} />
                        <Detail label="Expense date" value={expense.expenseDate} />
                        <Detail label="Merchant" value={expense.merchant} />
                        <Detail label="Submitted" value={expense.submitted} />
                        <div className="col-span-2">
                            <Detail label="Business purpose" value={expense.description} />
                        </div>
                    </div>

                    {"policyStatus" in expense && (
                        <section className="mb-7 rounded-lg border border-[#c7e0f4] bg-[#f3f9fd] p-5" aria-labelledby="assistance-title">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                                <h3 id="assistance-title" className="text-300 font-semibold text-foreground">Approval assistance</h3>
                            </div>
                            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
                                <Detail label="Policy status" value={expense.policyStatus} />
                                <Detail label="Risk level" value={expense.riskLevel} />
                                <Detail label="Recommendation" value={expense.recommendation} />
                            </dl>
                            <div className="mt-4 border-t border-[#c7e0f4] pt-4">
                                <p className="text-200 font-semibold text-muted-foreground">Reasons</p>
                                <ul className="mt-2 space-y-2">
                                    {expense.reasons.map((reason) => (
                                        <li key={reason} className="flex gap-2 text-200 leading-300 text-foreground">
                                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                                            {reason}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    )}

                    <section className="mb-7">
                        <h3 className="mb-3 text-300 font-semibold text-foreground">Receipt</h3>
                        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-[#a19f9d] bg-[#fafafa]">
                            <div className="text-center">
                                <FileText className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                                <p className="mt-2 text-300 font-medium text-foreground">
                                    {expense.hasReceipt ? `Receipt-${expense.id}.pdf` : "No receipt attached"}
                                </p>
                                <p className="mt-1 text-200 text-muted-foreground">
                                    {expense.hasReceipt ? "Receipt preview placeholder" : "The employee did not include a receipt"}
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="mb-3 text-300 font-semibold text-foreground">Employee information</h3>
                        <div className="flex items-center gap-4 rounded-lg border border-border p-4">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#deecf9] text-300 font-semibold text-[#004578]">
                                {expense.initials}
                            </span>
                            <div className="min-w-0">
                                <p className="text-300 font-semibold text-foreground">{expense.employee}</p>
                                <p className="text-200 text-muted-foreground">{expense.role} · {expense.department}</p>
                                <p className="truncate text-200 text-muted-foreground">{expense.email}</p>
                            </div>
                        </div>
                    </section>
                </div>

                {expense.status === "Pending" && (
                    <footer className="border-t border-border bg-[#fafafa] px-7 py-5">
                        {decisionError && (
                            <p role="alert" className="mb-3 rounded-md bg-[#fde7e9] px-3 py-2 text-200 text-destructive">
                                {decisionError}
                            </p>
                        )}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => void onDecision("Approved")}
                                disabled={isSaving}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-300 font-semibold text-primary-foreground hover:bg-[#115ea3] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                            >
                                <Check className="h-4 w-4" aria-hidden="true" />
                                {isSaving ? "Saving…" : "Approve"}
                            </button>
                            <button
                                type="button"
                                onClick={() => void onDecision("Rejected")}
                                disabled={isSaving}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-300 font-semibold text-foreground hover:bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                            >
                                <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
                                Reject
                            </button>
                        </div>
                    </footer>
                )}
            </section>
        </div>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-200 text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-300 font-medium text-foreground">{value}</dd>
        </div>
    );
}

function MetricCard({
    label,
    value,
    detail,
    icon: Icon,
    accent,
}: {
    label: string;
    value: string;
    detail: string;
    icon: LucideIcon;
    accent: string;
}) {
    return (
        <article className="rounded-lg border border-border bg-card p-5 shadow-2">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-200 font-medium text-muted-foreground">{label}</p>
                    <p className="mt-2 font-numeric text-hero-700 font-semibold leading-hero-700 text-card-foreground">{value}</p>
                </div>
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
            </div>
            <p className="mt-4 text-200 text-muted-foreground">{detail}</p>
        </article>
    );
}

function App() {
    const { session } = useAuth();
    const [activeNav, setActiveNav] = useState<NavItemId>("dashboard");
    const [expenses, setExpenses] = useState(initialExpenses);
    const [selectedApproval, setSelectedApproval] = useState<ApprovalExperience | null>(null);
    const [loadingExpenseId, setLoadingExpenseId] = useState<string | null>(null);
    const [approvalError, setApprovalError] = useState<string | null>(null);
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [approvalOpenedAt, setApprovalOpenedAt] = useState<Date | null>(null);
    const [isSavingDecision, setIsSavingDecision] = useState(false);
    const [decisionError, setDecisionError] = useState<string | null>(null);
    const [actingApproverEmail, setActingApproverEmail] = useState<ActingApproverEmail>(
        actingApprovers[0].email,
    );

    const userEmail = session?.user?.email ?? "manager@contoso.com";
    const userName = formatUserName(userEmail) || "Expense Manager";
    const pendingExpenses = useMemo(
        () => expenses.filter((expense) => expense.status === "Pending"),
        [expenses],
    );
    const pendingTotal = useMemo(
        () => pendingExpenses.reduce((total, expense) => total + expense.amount, 0),
        [pendingExpenses],
    );

    const handleDecision = async (status: "Approved" | "Rejected") => {
        if (!selectedApproval || !approvalOpenedAt || isSavingDecision) return;

        const completedAt = new Date();
        const decisionTimeSeconds = Math.max(
            0,
            Number(((completedAt.getTime() - approvalOpenedAt.getTime()) / 1000).toFixed(3)),
        );
        setIsSavingDecision(true);
        setDecisionError(null);
        try {
            await upsertApprovalOutcome({
                expenseId: selectedApproval.id,
                actingApproverEmail,
                variant: selectedApproval.variant,
                action: status === "Approved" ? "approve" : "reject",
                openedAt: approvalOpenedAt,
                completedAt,
                decisionTimeSeconds,
            });
            setExpenses((current) =>
                current.map((expense) => expense.id === selectedApproval.id ? { ...expense, status } : expense),
            );
            setNotice(`${selectedApproval.id} was ${status.toLowerCase()}.`);
            setSelectedApproval(null);
            setApprovalOpenedAt(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setDecisionError(`Unable to save approval outcome: ${message}`);
        } finally {
            setIsSavingDecision(false);
        }
    };

    const loadApprovalExperience = async (
        expense: Expense,
        experimentSubjectId: ActingApproverEmail,
    ) => {
        if (loadingExpenseId) return;

        setLoadingExpenseId(expense.id);
        setApprovalError(null);
        try {
            const input: ApprovalExperienceInput = {
                expense,
                experimentSubjectId,
            };
            const approval = await getRayfinClient().functions.getApprovalExperience.invoke(input);
            setSelectedApproval(approval);
            return approval;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setApprovalError(`Unable to load approval details: ${message}`);
            return null;
        } finally {
            setLoadingExpenseId(null);
        }
    };

    const openExpense = async (expense: Expense) => {
        const approval = await loadApprovalExperience(expense, actingApproverEmail);
        if (approval) {
            setApprovalOpenedAt(new Date());
            setDecisionError(null);
        }
    };

    const handleActingApproverChange = (email: ActingApproverEmail) => {
        setActingApproverEmail(email);

        if (!selectedApproval) return;
        setApprovalOpenedAt(new Date());
        const expense = expenses.find((item) => item.id === selectedApproval.id);
        if (expense) {
            void loadApprovalExperience(expense, email);
        }
    };

    const selectNavigation = (id: NavItemId) => {
        setActiveNav(id);
        setIsNavOpen(false);
    };

    return (
        <div className="flex min-h-screen bg-[#f5f6f8] text-foreground">
            {isNavOpen && (
                <button
                    type="button"
                    className="fixed inset-0 z-30 bg-black/30 lg:hidden"
                    onClick={() => setIsNavOpen(false)}
                    aria-label="Close navigation"
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#e1dfdd] bg-[#101b2d] text-white transition-transform lg:static lg:translate-x-0 ${isNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#0f6cbd]">
                        <Receipt className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                        <p className="text-300 font-semibold">Contoso Expense</p>
                        <p className="text-100 text-white/60">Expense management</p>
                    </div>
                </div>
                <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Primary navigation">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeNav === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => selectNavigation(item.id)}
                                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-300 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${isActive ? "bg-[#0f6cbd] text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
                                aria-current={isActive ? "page" : undefined}
                            >
                                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                                {item.label}
                                {item.id === "approvals" && pendingExpenses.length > 0 && (
                                    <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-100">{pendingExpenses.length}</span>
                                )}
                            </button>
                        );
                    })}
                </nav>
                <div className="border-t border-white/10 p-4">
                    <div className="flex items-center gap-3 rounded-md bg-white/5 p-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7f85f5] text-200 font-semibold text-white">
                            {getInitials(userName)}
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-200 font-semibold">{userName}</p>
                            <p className="truncate text-100 text-white/55">Expense approver</p>
                        </div>
                    </div>
                </div>
            </aside>

            <div className="min-w-0 flex-1">
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#e1dfdd] bg-white px-4 lg:px-8">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsNavOpen(true)}
                            className="rounded-md p-2 text-muted-foreground hover:bg-hover lg:hidden"
                            aria-label="Open navigation"
                        >
                            <Menu className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <div>
                            <h1 className="text-400 font-semibold leading-400 text-foreground">Contoso Expense</h1>
                            <p className="hidden text-100 text-muted-foreground sm:block">Expense approval center</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <label className="flex items-center gap-2">
                            <span className="hidden text-200 font-medium text-muted-foreground xl:inline">Acting approver</span>
                            <select
                                value={actingApproverEmail}
                                onChange={(event) => {
                                    if (isActingApproverEmail(event.target.value)) {
                                        handleActingApproverChange(event.target.value);
                                    }
                                }}
                                disabled={loadingExpenseId !== null}
                                aria-label="Acting approver"
                                className="max-w-36 rounded-md border border-input bg-white px-2 py-1.5 text-200 font-medium text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring disabled:cursor-wait disabled:opacity-60 sm:max-w-none sm:px-3"
                            >
                                {actingApprovers.map((approver) => (
                                    <option key={approver.email} value={approver.email}>
                                        {approver.name}
                                    </option>
                                ))}
                            </select>
                            <span className="hidden rounded bg-[#fff4ce] px-1.5 py-0.5 text-100 font-semibold uppercase text-[#8a5700] lg:inline">
                                Demo
                            </span>
                        </label>
                        <button type="button" className="hidden rounded-md p-2 text-muted-foreground hover:bg-hover md:block" aria-label="Search">
                            <Search className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <button type="button" className="relative hidden rounded-md p-2 text-muted-foreground hover:bg-hover md:block" aria-label="Notifications">
                            <Bell className="h-5 w-5" aria-hidden="true" />
                            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-white bg-[#c50f1f]" />
                        </button>
                        <div className="hidden h-7 w-px bg-border sm:block" />
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0f6cbd] text-200 font-semibold text-white">
                                {getInitials(userName)}
                            </span>
                            <div className="hidden max-w-44 sm:block">
                                <p className="truncate text-200 font-semibold text-foreground">{userName}</p>
                                <p className="truncate text-100 text-muted-foreground">{userEmail}</p>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
                    {(activeNav === "dashboard" || activeNav === "approvals") && (
                        <>
                            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                                <div>
                                    <p className="text-200 font-medium text-primary">
                                        {activeNav === "dashboard" ? "Overview" : "Approvals"}
                                    </p>
                                    <h2 className="mt-1 text-600 font-semibold leading-600 text-foreground">
                                        {activeNav === "dashboard" ? `Good afternoon, ${userName.split(" ")[0]}` : "Expense approvals"}
                                    </h2>
                                    <p className="mt-1 text-300 text-muted-foreground">
                                        {activeNav === "dashboard"
                                            ? "Review your team's expense activity and outstanding approvals."
                                            : "Review and process expenses submitted by your team."}
                                    </p>
                                </div>
                                <p className="rounded-md border border-border bg-white px-3 py-2 text-200 text-muted-foreground">
                                    <CalendarDays className="mr-2 inline h-4 w-4" aria-hidden="true" />
                                    October 2026
                                </p>
                            </div>

                            {activeNav === "dashboard" && (
                                <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Expense metrics">
                                    <MetricCard
                                        label="Pending approvals"
                                        value={String(pendingExpenses.length)}
                                        detail={`${currencyFormatter.format(pendingTotal)} awaiting review`}
                                        icon={Clock3}
                                        accent="bg-[#fff4ce] text-[#8a5700]"
                                    />
                                    <MetricCard
                                        label="Approved this month"
                                        value="$18,420"
                                        detail="12.4% above September"
                                        icon={CheckCircle2}
                                        accent="bg-[#dff6dd] text-[#0e700e]"
                                    />
                                    <MetricCard
                                        label="Average approval time"
                                        value="1.8 days"
                                        detail="0.4 days faster than target"
                                        icon={BarChart3}
                                        accent="bg-[#deecf9] text-[#005a9e]"
                                    />
                                    <MetricCard
                                        label="Total spend"
                                        value="$47,860"
                                        detail="October month to date"
                                        icon={WalletCards}
                                        accent="bg-[#e8e6ff] text-[#5c2e91]"
                                    />
                                </section>
                            )}

                            <section className="overflow-hidden rounded-lg border border-border bg-card shadow-2">
                                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
                                    <div>
                                        <h3 className="text-400 font-semibold text-card-foreground">Pending Expense Approvals</h3>
                                        <p className="mt-1 text-200 text-muted-foreground">
                                            {pendingExpenses.length} submissions require your review
                                        </p>
                                    </div>
                                    <button type="button" className="rounded-md border border-border bg-card px-3 py-2 text-200 font-semibold text-foreground hover:bg-hover">
                                        View policy
                                    </button>
                                </div>
                                {approvalError && (
                                    <p role="alert" className="mx-6 mb-4 rounded-md bg-[#fde7e9] px-4 py-3 text-200 text-destructive">
                                        {approvalError}
                                    </p>
                                )}
                                <ExpenseTable expenses={pendingExpenses} onSelect={openExpense} loadingExpenseId={loadingExpenseId} />
                            </section>
                        </>
                    )}

                    {activeNav === "expenses" && (
                        <section>
                            <p className="text-200 font-medium text-primary">Expenses</p>
                            <h2 className="mt-1 text-600 font-semibold leading-600">My Expenses</h2>
                            <p className="mt-1 text-300 text-muted-foreground">Track your submitted expense reports and their status.</p>
                            <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-2">
                                <ExpenseTable expenses={expenses.slice(-1)} onSelect={openExpense} loadingExpenseId={loadingExpenseId} />
                            </div>
                        </section>
                    )}

                </main>
            </div>

            {notice && (
                <div role="status" className="fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-lg bg-[#242424] px-4 py-3 text-300 text-white shadow-16">
                    <CheckCircle2 className="h-5 w-5 text-[#6ccb5f]" aria-hidden="true" />
                    {notice}
                    <button type="button" onClick={() => setNotice(null)} className="ml-2 rounded p-1 hover:bg-white/10" aria-label="Dismiss notification">
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            )}

            {selectedApproval && (
                <ApprovalPanel
                    expense={selectedApproval}
                    onClose={() => {
                        setSelectedApproval(null);
                        setApprovalOpenedAt(null);
                        setDecisionError(null);
                    }}
                    onDecision={handleDecision}
                    isSaving={isSavingDecision || loadingExpenseId !== null}
                    decisionError={decisionError}
                />
            )}
        </div>
    );
}

export default App;
