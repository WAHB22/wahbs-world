"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDay } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";

export type BillView = Row<"recurring_bills"> & { due: string; paid: Row<"transactions"> | null };
export type GoalView = Row<"goals"> & { saved: number };

const pad = (n: number) => String(n).padStart(2, "0");
export const monthDays = (month: string) => new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
export function shiftMonth(month: string, n: number): string {
  const d = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export const monthName = (month: string) => new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString("en-CA", { month: "long", year: "numeric" });
/** A bill's day in a given month; the 31st falls on the last day of shorter months. */
export const billDue = (b: Row<"recurring_bills">, month: string) => `${month}-${pad(Math.min(b.day_of_month, monthDays(month)))}`;
/** A recurring bill counts as paid for a month when a recurring transaction with its name falls in that month. */
export const paysBill = (t: Row<"transactions">, b: Row<"recurring_bills">, month: string) => t.source === "recurring" && t.merchant === b.name && t.occurred_on.startsWith(month);

export function useMoney(month: string) {
  const { store } = useWorld();
  return useLiveQuery(async () => {
    if (!store) return undefined;
    const today = localDay();
    const [accounts, categories, bills, txAll, goals] = await Promise.all([store.all("accounts"), store.all("categories"), store.all("recurring_bills"), store.all("transactions"), store.all("goals")]);
    const tx = txAll.filter((t) => t.occurred_on.startsWith(month)).sort((a, b) => b.occurred_on.localeCompare(a.occurred_on) || b.created_at.localeCompare(a.created_at));
    const sum = (xs: Row<"transactions">[]) => xs.reduce((n, t) => n + t.amount_cents, 0);
    const income = sum(tx.filter((t) => t.direction === "in"));
    const spent = sum(tx.filter((t) => t.direction === "out"));
    const cats = categories.filter((c) => !c.archived).sort((a, b) => a.group_name.localeCompare(b.group_name) || a.name.localeCompare(b.name));
    const spentBy = new Map<string, number>();
    for (const t of tx) if (t.direction === "out") spentBy.set(t.category_id ?? "", (spentBy.get(t.category_id ?? "") ?? 0) + t.amount_cents);
    const budgets = cats.filter((c) => c.kind === "expense" && c.monthly_budget_cents).map((c) => ({ ...c, spent: spentBy.get(c.id) ?? 0 }));
    const budgetTotal = budgets.reduce((n, c) => n + (c.monthly_budget_cents ?? 0), 0);
    const unbudgeted = cats.filter((c) => c.kind === "expense" && !c.monthly_budget_cents && spentBy.get(c.id)).map((c) => ({ ...c, spent: spentBy.get(c.id)! }))
      .concat(spentBy.get("") ? [{ id: "", name: "No category", spent: spentBy.get("")! } as never] : []).sort((a, b) => b.spent - a.spent);
    const billViews: BillView[] = bills.filter((b) => b.active).map((b) => ({ ...b, due: billDue(b, month), paid: txAll.find((t) => paysBill(t, b, month)) ?? null })).sort((a, b) => a.due.localeCompare(b.due));
    const goalViews: GoalView[] = goals.filter((g) => g.kind === "money").map((g) => ({
      ...g, saved: txAll.filter((t) => t.goal_id === g.id).reduce((n, t) => n + (t.direction === "out" ? -t.amount_cents : t.amount_cents), 0),
    }));
    // The jar: what is left of this month's budget, or of this month's income when there is no budget yet.
    const room = budgetTotal || income;
    const level = room ? Math.max(0, Math.min(1, (room - spent) / room)) : 0;
    return { today, month, accounts, categories: cats, tx, income, spent, budgets, budgetTotal, unbudgeted, bills: billViews, billsLeft: billViews.filter((b) => !b.paid).reduce((n, b) => n + b.amount_cents, 0), goals: goalViews, level, room };
  }, [store, month]);
}
