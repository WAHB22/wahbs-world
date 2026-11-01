/** First run data, same as the live page's defaults() plus v2 fields and Activities. */
import type { Bill, BudgetItem, FinanceData } from './types';
import { uid } from './ids';

/** Planned paycheque when nothing else is known (live page default). */
export const PAY_PLAN = 1300;

export function defaults(): FinanceData {
  const B = (name: string, amt: number, day: number | null, note = ''): Bill => ({ id: uid(), name, amt, freq: 'monthly', day, note });
  const I = (name: string, limit: number): BudgetItem => ({ id: uid(), name, limit });
  return {
    version: 2,
    settings: { payPlan: PAY_PLAN, visaDueDay: null, chequing: null },
    bills: [
      B('Rent (my half)', 587.5, 1),
      B('Parking (my half)', 90, 1),
      B('Internet (Bell)', 89.43, 22),
      B('Phone + Crave/Disney (Bell)', 90.83, 18),
      B('Spotify', 14.44, 6),
      B('Netflix', 27.11, 16),
      B('iCloud', 4.59, 3),
      B('Claude Max', 100, 4, 'Placeholder, check the CAD charge'),
      { id: uid(), name: 'Gym (ABC)', amt: 31.58, freq: 'biweekly', anchor: '2026-09-03', note: '' },
      B('Manga', 5.64, null, 'Add the date'),
    ],
    budget: [
      { id: uid(), name: 'Food', items: [I('Groceries', 400), I('Eating out', 150), I('Coffee and snacks', 50), I('Takeout and delivery', 50), I('Meal prep supplies', 50), I('Alcohol', 0)] },
      { id: uid(), name: 'Pets', items: [I('Cat food', 30), I('Litter', 15), I('Toys', 10), I('Vet', 0)] },
      { id: uid(), name: 'Transport', items: [I('Gas', 60), I('Insurance', 0), I('Car wash and maintenance', 0), I('Uber', 0), I('Lyft', 0)] },
      { id: uid(), name: 'Personal', items: [I('Clothing and shoes', 150), I('Haircuts', 50), I('Dates with Kylie', 200), I('Activities', 0), I('Volleyball', 104), I('School', 25), I('Errors', 0)] },
    ],
    accounts: [
      { id: uid(), name: 'Chequing', bal: null, goal: 400, kind: 'asset' },
      { id: uid(), name: 'Savings', bal: null, goal: 1000, kind: 'asset' },
      { id: uid(), name: 'Visa owing', bal: null, limit: 2500, kind: 'debt' },
    ],
    goals: [
      { id: uid(), name: 'Automne 2026 gap', target: 10043, saved: 0 },
      { id: uid(), name: 'Hiver 2027 cushion', target: 12000, saved: 0 },
      { id: uid(), name: 'Automne 2027 cushion', target: 14000, saved: 0 },
    ],
    months: {},
    merchantMap: {},
  };
}
