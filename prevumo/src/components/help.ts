import { LEARNING_DAYS } from "../sim/catalog";

/** Plain answers to the questions an owner asks on first look. */
export const HELP = {
  band: "The green band is the range this machine normally draws, learned from its own sessions. If the live line stays outside it, not just a blip, the machine is marked Irregular and you get an alert.",
  who: "Each session gets a name in this order: a PIN typed on the box, then an assignment covering that machine and time. If neither applies, it shows as Unassigned.",
  health:
    "Health starts at 100 and drops with each irregularity in the last 30 days, with time since the last service, and a little with heavy use. Service due uses a typical interval for this type of machine, brought forward by recent irregularities.",
  learning: `New machines spend ${LEARNING_DAYS} days learning their normal pattern. Until then there is no green band, no health score and no irregularity alerts.`,
};
