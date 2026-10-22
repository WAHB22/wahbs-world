import { LEARNING_DAYS } from "../sim/catalog";

/** Plain answers to the questions an owner asks on first look. */
export const HELP = {
  band: "The shaded green band is this machine's normal range: what it usually draws, learned from its own sessions. If the live line stays outside it, not just a blip, the machine is marked Irregular and you get an alert.",
  pin: "A personal code each member types on the box before the machine powers on. The session then carries their name.",
  assigned: "No PIN was typed, but one of your assignments covers this machine at this time, so the session counts for that person or company.",
  who: "Each session gets a name in this order: a PIN typed on the box, then an assignment covering that machine and time. If neither applies, it shows as Unassigned.",
  health:
    "Health starts at 100 and drops with each irregularity in the last 30 days, with time since the last service, and a little with heavy use. Service due uses a typical interval for this type of machine, brought forward by recent irregularities.",
  learning: `New machines spend ${LEARNING_DAYS} days learning their normal pattern. Until then there is no normal range, no health score and no irregularity alerts.`,
};
