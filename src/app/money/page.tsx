"use client";

import { useState } from "react";
import { dayLabel, localDay } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";
import { playSound } from "@/living/sound";
import { fire, useCountUp } from "@/motion/feedback";
import { EditSheet } from "@/ui/kit/EditSheet";
import { removeWithUndo, toast } from "@/ui/kit/toast";
import { money } from "@/ui/format";
import { Shell } from "@/ui/Shell";
import { monthName, shiftMonth, useMoney, type BillView } from "@/worlds/money/data";
import { billSpec, categorySpec, goalSpec, txSpec } from "@/worlds/money/specs";

type Editing =
  | { kind: "tx"; row: Partial<Row<"transactions">> }
  | { kind: "bill"; row: Partial<Row<"recurring_bills">> }
  | { kind: "category"; row: Partial<Row<"categories">> }
  | { kind: "goal"; row: Partial<Row<"goals">> }
  | null;

const TABLE = { tx: "transactions", bill: "recurring_bills", category: "categories", goal: "goals" } as const;
const TITLE = { tx: ["Add to the bill", "Edit entry"], bill: ["Add a recurring bill", "Edit bill"], category: ["Add a category", "Edit category"], goal: ["Add a goal", "Edit goal"] } as const;

export default function Money() {
  const { store } = useWorld();
  const [month, setMonth] = useState(() => localDay().slice(0, 7));
  const data = useMoney(month);
  const [editing, setEditing] = useState<Editing>(null);
  const [showAll, setShowAll] = useState(false);
  const spent = useCountUp(data?.spent ?? 0);
  const income = useCountUp(data?.income ?? 0);
  const thisMonth = localDay().slice(0, 7);
  const catName = new Map((data?.categories ?? []).map((c) => [c.id, c.name]));

  const newTx = (direction: "out" | "in" | "transfer"): Partial<Row<"transactions">> => ({
    direction, occurred_on: month === thisMonth ? localDay() : `${month}-01`, account_id: data?.accounts.find((a) => a.kind === (direction === "in" ? "chequing" : "chequing"))?.id ?? null,
  });

  async function save(v: Record<string, unknown>) {
    if (!store || !editing) return;
    const table = TABLE[editing.kind];
    const values = editing.kind === "goal" ? { kind: "money", ...v } : editing.kind === "bill" ? { ...v, day_of_month: Math.min(31, Math.max(1, Math.round(Number(v.day_of_month) || 1))) } : v;
    if (editing.kind === "tx" && values.direction !== "transfer") values.to_account_id = null;
    const row = editing.row.id ? await store.patch(table, editing.row.id, values as never) : await store.put(table, values as never);
    if (editing.kind === "tx") playSound("check");
    toast(editing.row.id ? "Saved." : editing.kind === "tx" ? `${money((row as Row<"transactions">).amount_cents)} added.` : `${(row as { name: string }).name} added.`);
  }

  async function payBill(b: BillView, el: HTMLElement) {
    if (!store) return;
    const t = await store.put("transactions", {
      occurred_on: b.due <= localDay() || month !== thisMonth ? b.due : localDay(), amount_cents: b.amount_cents, direction: "out",
      category_id: b.category_id, account_id: b.account_id, merchant: b.name, source: "recurring",
    });
    fire(el); playSound("done");
    toast(`${b.name} paid.`, () => store.remove("transactions", t.id).then(() => undefined));
  }

  const tx = data?.tx ?? [];
  const sign = (t: Row<"transactions">) => (t.direction === "in" ? "plus " : t.direction === "out" ? "" : "moved ");

  return (
    <Shell title="Money" world="money">
      <section className="hero-figures" aria-labelledby="mo">
        <div className="figure-block figure-main">
          <div className="month-nav">
            <h2 id="mo" className="figure-label">{monthName(month)}</h2>
            <button className="btn btn-small btn-ghost" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>Earlier</button>
            <button className="btn btn-small btn-ghost" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= thisMonth}>Later</button>
          </div>
          <span className="figure-xl" data-testid="month-spent">{money(Math.round(spent))}</span>
          <span className="figure-note">spent{data?.billsLeft ? `, ${money(data.billsLeft)} in bills still to pay` : ""}</span>
          {data?.budgetTotal ? <span className="meter meter-lg" aria-label={`${Math.round(data.level * 100)} percent of the budget left`}><i style={{ width: `${Math.min(100, (data.spent / data.budgetTotal) * 100)}%` }} /></span> : null}
        </div>
        <div className="figure-block">
          <span className="figure-label">Came in</span>
          <span className="figure-lg">{money(Math.round(income))}</span>
          <span className="figure-note">{data?.budgetTotal ? `${money(Math.max(0, data.budgetTotal - data.spent))} left of a ${money(data.budgetTotal)} budget` : "Set a budget on a category to see what is left"}</span>
        </div>
        <div className="figure-actions">
          <button className="btn btn-primary" data-testid="add-spent" onClick={() => setEditing({ kind: "tx", row: newTx("out") })}>Add spending</button>
          <button className="btn" data-testid="add-income" onClick={() => setEditing({ kind: "tx", row: newTx("in") })}>Add income</button>
          <button className="btn" onClick={() => setEditing({ kind: "tx", row: newTx("transfer") })}>Move money</button>
        </div>
      </section>

      <div className="world-grid">
        <section className="panel" aria-labelledby="bills">
          <div className="section-head">
            <h2 id="bills" className="panel-title">Recurring bills</h2>
            <button className="btn btn-small" data-testid="add-bill" onClick={() => setEditing({ kind: "bill", row: { active: true, day_of_month: 1, account_id: data?.accounts[0]?.id } })}>Add a bill</button>
          </div>
          <ul className="list" data-testid="bill-list">
            {(data?.bills ?? []).map((b) => (
              <li key={b.id} className="bill" data-paid={b.paid ? true : undefined}>
                <button className="row-btn" onClick={() => setEditing({ kind: "bill", row: b })}>
                  <span className="row-main">{b.name}</span>
                  <span className="row-sub">{b.paid ? `Paid ${dayLabel(b.paid.occurred_on, data!.today)}` : `Due ${dayLabel(b.due, data!.today)}`}</span>
                  <span className="row-side">{money(b.amount_cents)}</span>
                </button>
                {b.paid ? <span className="chip done">Paid</span> : <button className="btn btn-small btn-primary" onClick={(e) => payBill(b, e.currentTarget)}>Mark paid</button>}
              </li>
            ))}
            {data && !data.bills.length && <li className="empty">Rent, phone, subscriptions: add each once and mark it paid every month.</li>}
          </ul>
        </section>

        <section className="panel" aria-labelledby="bud">
          <div className="section-head">
            <h2 id="bud" className="panel-title">Budgets</h2>
            <button className="btn btn-small" onClick={() => setEditing({ kind: "category", row: { kind: "expense" } })}>Add a category</button>
          </div>
          <ul className="list budget-list">
            {(data?.budgets ?? []).map((c) => (
              <li key={c.id}>
                <button className="row-btn" onClick={() => setEditing({ kind: "category", row: c })}>
                  <span className="row-main">{c.name}</span>
                  <span className="row-sub"><span className={`meter${c.spent > c.monthly_budget_cents! ? " over" : ""}`}><i style={{ width: `${Math.min(100, (c.spent / c.monthly_budget_cents!) * 100)}%` }} /></span></span>
                  <span className="row-side">{money(c.spent)}<br /><span className="soft">of {money(c.monthly_budget_cents!)}</span></span>
                </button>
              </li>
            ))}
            {(data?.unbudgeted ?? []).map((c) => (
              <li key={c.id || "none"}>
                <button className="row-btn" onClick={() => c.id && setEditing({ kind: "category", row: c })} disabled={!c.id}>
                  <span className="row-main">{c.name}</span>
                  <span className="row-sub">No budget</span>
                  <span className="row-side">{money(c.spent)}</span>
                </button>
              </li>
            ))}
            {data && !data.budgets.length && !data.unbudgeted.length && (
              <li className="empty">Tap a category to give it a monthly budget.
                <span className="cat-chips">{data.categories.filter((c) => c.kind === "expense").map((c) => <button key={c.id} className="btn btn-small" onClick={() => setEditing({ kind: "category", row: c })}>{c.name}</button>)}</span>
              </li>
            )}
          </ul>
        </section>

        <section className="panel tx-pane" aria-labelledby="txh">
          <h2 id="txh" className="panel-title">The bill</h2>
          <ul className="list" data-testid="tx-list">
            {(showAll ? tx : tx.slice(0, 12)).map((t) => (
              <li key={t.id} className="tx" data-dir={t.direction}>
                <button className="row-btn" onClick={() => setEditing({ kind: "tx", row: t })}>
                  <span className="row-main">{t.merchant || (t.category_id && catName.get(t.category_id)) || (t.direction === "in" ? "Income" : t.direction === "transfer" ? "Moved" : "Spent")}</span>
                  <span className="row-sub">{dayLabel(t.occurred_on, data!.today)}{t.category_id && t.merchant ? `, ${catName.get(t.category_id) ?? ""}` : ""}{t.source === "recurring" ? ", bill" : ""}</span>
                  <span className="row-side ticket-font">{sign(t)}{money(t.amount_cents)}</span>
                </button>
              </li>
            ))}
            {data && !tx.length && <li className="empty">Nothing this month yet. Spending from the Today dock lands here too.</li>}
          </ul>
          {tx.length > 12 && <button className="btn btn-small" style={{ marginTop: 12 }} onClick={() => setShowAll((v) => !v)}>{showAll ? "Show fewer" : `Show all ${tx.length}`}</button>}
        </section>

        <section className="panel" aria-labelledby="goals">
          <div className="section-head">
            <h2 id="goals" className="panel-title">Goals</h2>
            <button className="btn btn-small" onClick={() => setEditing({ kind: "goal", row: {} })}>Add a goal</button>
          </div>
          <ul className="list">
            {(data?.goals ?? []).map((g) => (
              <li key={g.id}>
                <button className="row-btn" onClick={() => setEditing({ kind: "goal", row: g })}>
                  <span className="row-main">{g.name}</span>
                  <span className="row-sub"><span className="meter"><i style={{ width: `${g.target_cents ? Math.min(100, Math.max(0, (g.saved / g.target_cents) * 100)) : 0}%` }} /></span>{g.due_on ? `By ${dayLabel(g.due_on, data!.today)}` : ""}</span>
                  <span className="row-side">{money(g.saved)}<br /><span className="soft">of {money(g.target_cents ?? 0)}</span></span>
                </button>
              </li>
            ))}
            {data && !data.goals.length && <li className="empty">Save toward something: add a goal, then point entries at it.</li>}
          </ul>
        </section>
      </div>

      {editing && store && data && (
        <EditSheet
          title={TITLE[editing.kind][editing.row.id ? 1 : 0]}
          spec={editing.kind === "tx" ? txSpec(data.accounts, data.categories, data.goals) : editing.kind === "bill" ? billSpec(data.accounts, data.categories) : editing.kind === "category" ? categorySpec() : goalSpec()}
          row={editing.row as Record<string, unknown>}
          onSave={save}
          onDelete={editing.row.id ? () => removeWithUndo(store as never, TABLE[editing.kind], editing.row.id!, "name" in editing.row && editing.row.name ? String(editing.row.name) : "Entry") : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </Shell>
  );
}
