/**
 * Starting content for Fall 2026, taken from the v18 journal. Everything here is
 * editable in the app afterwards. Ids are derived from names, so if both devices seed
 * while offline they create the same rows and merge instead of duplicating.
 *
 * Weekdays follow JavaScript: 0 is Sunday, 6 is Saturday.
 * Term dates: uOttawa, Important academic dates and deadlines (checked 24 September 2026),
 * https://www.uottawa.ca/study/important-academic-dates-deadlines
 */
import type { TableName } from "../schema";

export type SeedRow = { table: TableName; key: string; row: Record<string, unknown> };

const TERM = "term:fall-2026";
const course = (code: string) => `course:${code}`;

const COURSES: { code: string; name: string; prof: string; retake: boolean; language: "en" | "fr"; topics: string[] }[] = [
  { code: "CHG 3127", name: "Chemical Reaction Engineering", prof: "Dr. David G. Taylor", retake: true, language: "en",
    topics: ["Rate laws and mole balances", "Reactor conversion and stoichiometry", "Isothermal design isobaric", "Isothermal design with pressure drop", "Molar flow rates", "Multiple reactions", "Membrane reactors", "Adiabatic non isothermal", "Heat transfer single reaction", "Heat transfer multiple reactions", "Chapter 7 self study"] },
  { code: "CHM 2120", name: "Organic Chemistry II", prof: "Dr. Taoufik Ben Halima", retake: true, language: "en",
    topics: ["Module 1 basics and resonance", "SN1 and SN2", "E1 E2 and E1cb", "Differentiating the four", "Infrared spectroscopy", "Proton NMR", "Aldehydes and ketones", "Carboxylic acids and derivatives", "Alpha carbon reactions"] },
  { code: "CHG 3735", name: "Contrôle des procédés", prof: "Grondin and Bibeau", retake: true, language: "fr",
    topics: ["Dynamic process modelling", "Common dynamic responses", "Laplace transforms", "Transfer functions", "Empirical identification", "Intro to process control", "Closed loop control", "PID tuning", "Frequency analysis", "Advanced control"] },
  { code: "CHG 3337", name: "Data Collection and Interpretation", prof: "Nicholas Burn", retake: false, language: "en",
    topics: ["Probability and distributions", "Inference from one sample", "Inference from two samples", "Power and sample size", "Empirical model building", "Two level factorial designs", "Fractional factorial designs", "Response surface methodology", "Additional techniques", "Planning an experiment"] },
  { code: "CHG 4360", name: "Machine Learning for Biochemical Engineering", prof: "Shawn Chahal", retake: false, language: "en",
    topics: ["Exploratory data analysis", "Linear regression and evaluation", "Nonlinear and hybrid models", "Time series data", "Autoregressive models", "Neural network fundamentals", "Deep learning architectures", "Classification", "Deployment and lifecycle"] },
  { code: "GNG 4120", name: "Introduction to Technology Entrepreneurship", prof: "Oday Aswad", retake: false, language: "en",
    topics: ["Problem", "Solution", "Business model canvas", "Revenue model", "Competitors", "Validation", "Marketing", "Finances", "Legal", "Team", "Roadmap", "Elevator pitch"] },
];

// [weekday, start, end, title, room, course code, kind]
const CLASSES: [number, string, string, string, string, string, "lecture" | "tutorial" | "discussion"][] = [
  [1, "17:30", "18:50", "CHG 3337 lecture", "Morisset Hall 205", "CHG 3337", "lecture"],
  [2, "08:30", "09:50", "CHG 3127 lecture", "Vanier Hall 1095", "CHG 3127", "lecture"],
  [2, "17:30", "18:50", "CHG 3127 tutorial", "Online", "CHG 3127", "tutorial"],
  [2, "19:00", "21:50", "CHG 4360 lecture", "Morisset Hall 251", "CHG 4360", "lecture"],
  [3, "14:30", "15:50", "CHG 3337 tutorial", "Henderson Residence 013", "CHG 3337", "tutorial"],
  [3, "17:30", "18:50", "CHG 3337 lecture", "Morisset Hall 205", "CHG 3337", "lecture"],
  [3, "19:00", "21:50", "CHM 2120 lecture", "Learning Crossroads C240", "CHM 2120", "lecture"],
  [4, "19:00", "20:20", "CHM 2120 discussion", "Marion Hall 150", "CHM 2120", "discussion"],
  [5, "10:00", "11:20", "CHG 3127 lecture", "Vanier Hall 1095", "CHG 3127", "lecture"],
  [5, "11:30", "14:20", "CHG 3735 lecture", "SITE C0136", "CHG 3735", "lecture"],
  [5, "14:30", "15:50", "CHG 3735 tutorial", "Lamoureux Hall 241", "CHG 3735", "tutorial"],
  [5, "19:00", "21:50", "GNG 4120 lecture", "Colonel By Hall B205", "GNG 4120", "lecture"],
];

// The weekly routine from v18: shifts, gym and study blocks, all editable.
const ROUTINE: [number, string, string, string, "shift" | "gym" | "study"][] = [
  [0, "08:00", "16:00", "Bobino Bagel", "shift"], [0, "16:45", "18:45", "Review and catch up", "study"],
  [1, "06:15", "14:00", "Bobino Bagel", "shift"], [1, "14:30", "15:30", "Gym", "gym"], [1, "15:45", "17:15", "Study CHG 3127", "study"],
  [2, "10:30", "12:30", "Study CHM 2120", "study"], [2, "13:15", "14:15", "Gym", "gym"], [2, "15:00", "17:00", "Study CHG 3735", "study"],
  [3, "06:15", "14:00", "Bobino Bagel", "shift"],
  [4, "06:15", "14:00", "Bobino Bagel", "shift"], [4, "14:30", "15:30", "Gym", "gym"], [4, "16:00", "18:30", "Study CHG 3127 and CHM 2120", "study"],
  [5, "16:30", "17:30", "Gym", "gym"],
  [6, "08:00", "16:00", "Bobino Bagel", "shift"], [6, "16:30", "17:30", "Gym", "gym"], [6, "18:15", "20:15", "Group projects", "study"],
];

type Kind = "quiz" | "midterm" | "exam" | "assignment" | "report" | "deliverable" | "other";
// [course, title, due, weight, kind, chapters covered]
const ASSESSMENTS: [string, string, string | null, number, Kind, number[]?][] = [
  ["CHG 3337", "Quiz 1", "2026-09-23", 2.2, "quiz"], ["CHG 4360", "Environment setup", "2026-09-28", 5, "assignment"],
  ["CHM 2120", "Midterm 1", "2026-09-30", 20, "midterm", [0, 1, 2, 3]], ["CHG 3337", "Quiz 2", "2026-09-30", 2.2, "quiz"],
  ["CHG 4360", "Assignment 1", "2026-10-05", 10, "assignment"], ["CHG 3337", "Quiz 3", "2026-10-07", 2.2, "quiz"],
  ["CHG 3337", "Quiz 4", "2026-10-14", 2.2, "quiz"], ["CHG 3127", "Midterm", "2026-10-16", 25, "midterm", [0, 1, 2, 3, 4]],
  ["CHG 4360", "Assignment 2", "2026-10-19", 10, "assignment"], ["CHG 3337", "Midterm test", "2026-10-21", 25, "midterm", [0, 1, 2, 3]],
  ["CHG 3735", "Examen partiel", "2026-10-23", 25, "midterm", [0, 1, 2, 3, 4]], ["CHG 4360", "Assignment 3", "2026-11-02", 10, "assignment"],
  ["CHG 3337", "Quiz 5", "2026-11-04", 2.2, "quiz"], ["CHM 2120", "Midterm 2", "2026-11-04", 20, "midterm", [1, 2, 3, 4, 5]],
  ["CHG 3337", "Quiz 6", "2026-11-11", 2.2, "quiz"], ["CHG 3337", "Quiz 7", "2026-11-18", 2.2, "quiz"],
  ["CHG 3337", "Quiz 8", "2026-11-25", 2.2, "quiz"], ["CHG 4360", "Group project", "2026-11-30", 30, "deliverable"],
  ["CHG 3337", "Quiz 9", "2026-12-02", 2.2, "quiz"], ["CHG 3127", "Group project", "2026-12-08", 20, "deliverable"],
  ["CHG 3735", "Rapport de conception", "2026-12-09", 25, "report"], ["CHG 3735", "Évaluation des pairs", "2026-12-09", 1, "other"],
  ["CHG 3127", "Final exam", null, 55, "exam"], ["CHM 2120", "Final exam", null, 60, "exam"],
  ["CHG 3337", "Final exam", null, 55, "exam"], ["CHG 3735", "Examen final", null, 50, "exam"], ["CHG 4360", "Final exam", null, 35, "exam"],
  ["GNG 4120", "Assignment 1: Personality test", "2026-09-20", 1.5, "assignment"], ["GNG 4120", "Assignment 2: Elevator pitch", "2026-09-27", 3, "assignment"],
  ["GNG 4120", "GA 1: Business conceptualization", "2026-10-03", 4.5, "deliverable"], ["GNG 4120", "PD A: Business modelling", "2026-10-12", 6, "deliverable"],
  ["GNG 4120", "GA 2: Validate the BMC", "2026-10-17", 4.5, "deliverable"], ["GNG 4120", "GA 3: Practice pitch deck", "2026-10-24", 6, "deliverable"],
  ["GNG 4120", "Assignment 3: Case study", "2026-11-08", 6, "assignment"], ["GNG 4120", "PD C: Marketing plan", "2026-11-16", 8, "deliverable"],
  ["GNG 4120", "GA 5: Financial snapshot", "2026-11-21", 3, "deliverable"], ["GNG 4120", "GA 7: Final pitch deck", "2026-11-28", 12, "deliverable"],
  ["GNG 4120", "PD B: Rapid prototyping, B1 to B6", "2026-11-30", 10, "deliverable"], ["GNG 4120", "PD E: Business plan", "2026-12-22", 16, "deliverable"],
  ["GNG 4120", "Weekly quizzes", null, 10.5, "quiz"], ["GNG 4120", "Individual activities", null, 9, "other"],
];

const PROJECTS = [
  { key: "gng4120", title: "GNG 4120 Bobino events app", type: "school", stage: "building", deadline: "2026-12-22", weekly_hours: 4, course: "GNG 4120",
    objective: "Build and pitch the Bobino events app venture through the GNG 4120 deliverables.",
    success: "Every deliverable in on time, and a final pitch and business plan you are proud to show." },
  { key: "dots", title: "DOTS", type: "business", stage: "exploring", deadline: null, weekly_hours: 2,
    objective: "Explore DOTS as a specialty coffee concept and decide if and when it becomes real.",
    success: "Enough evidence for a clear go, pause or drop decision. No launch date assumed." },
  { key: "trailer", title: "Bobino trailer pitch", type: "business", stage: "exploring", deadline: null, weekly_hours: 1,
    objective: "Get Aurélie and Alex to a clear decision on a trailer you would operate.",
    success: "A pitch delivered and an answer: yes, no or not now." },
  { key: "chg4250", title: "CHG 4250 Plant Design preparation", type: "school", stage: "planning", deadline: null, weekly_hours: 1,
    objective: "Be ready for the capstone design course in whichever winter you take it, and decide whether to propose an industry collaborative project.",
    success: "A clear yes or no on proposing a project, and a head start before the course begins." },
] as const;

type PKind = "research" | "build" | "present" | "admin";
// [key, title, deliverable, due, hours, kind, priority, depends on]
const GNG_TASKS: [string, string, string, string, number, PKind, "high" | "medium" | "low", string][] = [
  ["g_a2", "Assignment 2: Elevator pitch", "Individual work", "2026-09-27", 2, "present", "high", ""],
  ["g_ga1", "GA 1: Business conceptualization", "Group activities", "2026-10-03", 2, "research", "high", ""],
  ["g_pda", "PD A: Business modelling", "Project deliverables", "2026-10-12", 4, "build", "high", ""],
  ["g_ga2", "GA 2: Validate the BMC", "Group activities", "2026-10-17", 3, "research", "high", "g_pda"],
  ["g_b1", "PD B1: Rapid prototyping, round 1", "PD B customer discovery", "2026-10-19", 4, "build", "high", ""],
  ["g_ga3", "GA 3: Practice pitch deck", "Group activities", "2026-10-24", 3, "present", "high", ""],
  ["g_b2", "PD B2: Customer discovery", "PD B customer discovery", "2026-11-05", 4, "research", "high", "g_b1"],
  ["g_a3", "Assignment 3: Case study", "Individual work", "2026-11-08", 4, "research", "medium", ""],
  ["g_b3", "PD B3: Customer discovery", "PD B customer discovery", "2026-11-09", 4, "research", "high", "g_b2"],
  ["g_b4", "PD B4: Validation", "PD B customer discovery", "2026-11-16", 3, "research", "high", "g_b3"],
  ["g_pdc", "PD C: Marketing plan", "Project deliverables", "2026-11-16", 5, "build", "high", "g_pda"],
  ["g_ga5", "GA 5: Financial snapshot", "Group activities", "2026-11-21", 3, "build", "high", ""],
  ["g_b5", "PD B5: Validation", "PD B customer discovery", "2026-11-23", 3, "research", "high", "g_b4"],
  ["g_ga7", "GA 7: Final pitch deck", "Group activities", "2026-11-28", 5, "present", "high", "g_ga3"],
  ["g_b6", "PD B6: Validation", "PD B customer discovery", "2026-11-30", 3, "research", "high", "g_b5"],
  ["g_pde", "PD E: Business plan and final presentation", "Project deliverables", "2026-12-22", 8, "present", "high", "g_pdc,g_b6,g_ga5"],
];
const PLANT_TASKS: [string, string, string, number, PKind, "high" | "medium" | "low", string][] = [
  ["p_mat", "Ask Prof. Fauteux-Lefebvre or Prof. Haelssig for the industry collaborator material", "Industry project", 1, "admin", "high", ""],
  ["p_net", "List three contacts who could sponsor an industry project", "Industry project", 1, "research", "medium", ""],
  ["p_dec", "Decide: propose a project or join an assigned one", "Industry project", 1, "admin", "medium", "p_mat,p_net"],
  ["p_rev", "Review the core course notes plant design draws on", "Preparation", 4, "research", "low", ""],
];

// Verified sources carried over from v18, each with its publisher and link.
const RESOURCES: [string, string, string, string, string][] = [
  ["uo_linkedin", "LinkedIn tips from the Career Corner", "University of Ottawa, Career Development", "https://www.uottawa.ca/study/career-experiential-learning/career-development/linkedin", "Headline with field, year or goal. A concise About. Experience written as achievements and what you learned."],
  ["uo_immig", "Student Immigration Advising Team", "University of Ottawa", "https://www.uottawa.ca/study/international-students/immigration/student-immigration-advising-team", "Regulated advisers for work authorization, PGWP, and how a leave or part time term affects status."],
  ["ircc_off", "Work off campus as an international student", "IRCC, Government of Canada", "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/work-off-campus.html", "Up to 24 hours a week off campus during regular terms; unlimited hours during scheduled breaks."],
  ["ircc_cond", "Your conditions as a study permit holder", "IRCC, Government of Canada", "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/while-you-study/study-permit-conditions.html", "Enrolment, progress and authorized leave rules while you study."],
  ["ircc_pgwp", "Post graduation work permit: who can apply", "IRCC, Government of Canada", "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation/eligibility.html", "Eligibility rules for the post graduation work permit."],
  ["li_feat", "Featured section", "LinkedIn Help", "https://www.linkedin.com/help/linkedin/answer/111587", "Show posts, links, documents, presentations and videos as evidence of skills."],
  ["li_proj", "Add projects to your profile", "LinkedIn Help", "https://www.linkedin.com/help/linkedin/answer/a8064614", "Projects with a description, skills, media and contributors."],
  ["pres_recipe", "A Recipe for Good Engineering Presentations", "David Mazières, Stanford", "https://www.scs.stanford.edu/~dm/blog/talk-recipe.html", "Lead the audience through desire, bewilderment, enlightenment and satisfaction."],
  ["pres_ae", "The Assertion Evidence Approach", "Michael Alley, Penn State", "http://www.assertion-evidence.com", "Build slides on messages, not topics, with visual evidence instead of bullet lists."],
  ["pres_winston", "How to Speak", "Patrick Winston, MIT OpenCourseWare", "https://www.youtube.com/watch?v=Unzc731iCUY", "How to start, use slides, inform, persuade, and how to stop."],
  ["pitch_yc", "How to Pitch Your Startup", "Kevin Hale, Y Combinator", "https://startupschool.org/videos/77", "Clarity first, then concision: problem, solution, and the insight behind it."],
  ["pm_wbs", "Moving from the WBS to a critical path schedule", "Charles Jones, PMI Global Congress 2008", "https://www.pmi.org/learning/library/moving-work-breakdown-structure-critical-path-6978", "Deliverables, then activities, dependencies and estimates, then the critical path."],
];

const CAREER_TASKS: [string, string, "high" | "medium", string][] = [
  ["Pick three to five target role families", "Name them and the search keywords employers use for them.", "high", ""],
  ["Rewrite your LinkedIn headline", "Field, year and direction.", "high", "uo_linkedin"],
  ["Rewrite your About section", "Concise: background, strengths, aspirations.", "high", "uo_linkedin"],
  ["Rewrite Experience as achievements", "Bobino Bagel, opening Ugly Monday Café, supervision: what you did and what changed.", "high", "uo_linkedin"],
  ["Add the GNG 4120 app as a LinkedIn project", "Description, skills, and the deck as media once it is final.", "high", "li_proj"],
  ["Choose two proof pieces for Featured", "A deck, a report or a video that shows a real skill.", "medium", "li_feat"],
  ["Build an engineering resume and get it reviewed at the Career Corner", "Free for current students.", "high", "uo_linkedin"],
  ["List ten target organizations for Summer 2027", "Role, location, when they hire, one contact.", "high", ""],
  ["Practice a two minute project story", "Problem, what you did, the hard part, the result, the lesson.", "high", "pres_recipe"],
  ["Record one practice presentation and review it", "Watch for your opening promise and your close.", "medium", "pres_winston"],
  ["Send three personalized networking messages", "Say who you are and why them.", "medium", "uo_linkedin"],
  ["Ask someone who saw your work for a recommendation", "A professor, a supervisor, or Aurélie and Alex.", "medium", ""],
];

const TERM_PLANS: [string, string][] = [
  ["Winter 2027", "School"], ["Winter 2027", "Internship"],
  ["Summer 2027", "Internship"], ["Summer 2027", "Bobino trailer"], ["Summer 2027", "Other"],
  ["Fall 2027", "School"],
  ["Winter 2028", "School"], ["Winter 2028", "Done school"], ["Winter 2028", "Other"],
];

/** The seed as keyed rows; `ref:` values are replaced by the ids of other keys. */
export function fall2026(): SeedRow[] {
  const out: SeedRow[] = [];
  const add = (table: TableName, key: string, row: Record<string, unknown>) => out.push({ table, key, row });

  add("terms", TERM, { name: "Fall 2026", kind: "study", starts_on: "2026-09-01", ends_on: "2026-12-31", status: "current" });
  add("term_breaks", "break:fall-2026-reading-week", { term_id: `ref:${TERM}`, name: "Reading week", starts_on: "2026-10-25", ends_on: "2026-10-31" });
  for (const c of COURSES)
    add("courses", course(c.code), { term_id: `ref:${TERM}`, code: c.code, name: c.name, professor: c.prof, retake: c.retake, language: c.language, topics: c.topics });
  CLASSES.forEach(([wd, s, e, title, room, code, kind], i) =>
    add("schedule_blocks", `block:class:${i}`, { term_id: `ref:${TERM}`, course_id: `ref:${course(code)}`, kind, title, weekday: wd, starts_at: s, ends_at: e, location: room }),
  );
  ROUTINE.forEach(([wd, s, e, title, kind], i) =>
    add("schedule_blocks", `block:routine:${i}`, { term_id: `ref:${TERM}`, kind, title, weekday: wd, starts_at: s, ends_at: e }),
  );
  ASSESSMENTS.forEach(([code, title, due, weight, kind, cov]) => {
    const topics = COURSES.find((c) => c.code === code)!.topics;
    add("assessments", `assess:${code}:${title}`, {
      course_id: `ref:${course(code)}`, title, kind, due_on: due, weight, covers: (cov ?? []).map((n) => topics[n]),
    });
  });
  add("employers", "employer:bobino", { name: "Bobino Bagel" });

  for (const p of PROJECTS)
    add("projects", `project:${p.key}`, {
      title: p.title, type: p.type, stage: p.stage, deadline: p.deadline, weekly_hours: p.weekly_hours,
      objective: p.objective, success: p.success, course_id: "course" in p ? `ref:${course(p.course)}` : null,
    });
  for (const [k, title, deliv, due, h, kind, prio, dep] of GNG_TASKS)
    add("project_tasks", `ptask:${k}`, {
      project_id: "ref:project:gng4120", title, deliverable: deliv, due_on: due, estimate_hours: h, kind, priority: prio,
      depends_on: dep ? dep.split(",").map((d) => `ref:ptask:${d}`) : [],
    });
  for (const [k, title, deliv, h, kind, prio, dep] of PLANT_TASKS)
    add("project_tasks", `ptask:${k}`, {
      project_id: "ref:project:chg4250", title, deliverable: deliv, estimate_hours: h, kind, priority: prio,
      depends_on: dep ? dep.split(",").map((d) => `ref:ptask:${d}`) : [],
    });

  for (const [k, title, publisher, url, summary] of RESOURCES)
    add("resources", `resource:${k}`, { title, publisher, url, summary, area: "career", link_status: "unchecked" });
  CAREER_TASKS.forEach(([title, notes, prio, res]) =>
    add("tasks", `task:career:${title}`, { title, notes, priority: prio, area: "career", resource_id: res ? `ref:resource:${res}` : null }),
  );
  TERM_PLANS.forEach(([term, option]) => add("term_plans", `plan:${term}:${option}`, { term_label: term, option }));
  // Money starts with plain accounts and categories; amounts and budgets are his to enter.
  for (const [k, name, kind] of [["chequing", "Chequing", "chequing"], ["savings", "Savings", "savings"], ["cash", "Cash", "cash"], ["credit", "Credit card", "credit"]] as const)
    add("accounts", `account:${k}`, { name, kind });
  for (const [group, name, kind] of [
    ["Home", "Rent", "expense"], ["Home", "Phone and internet", "expense"], ["Food", "Groceries", "expense"], ["Food", "Eating out", "expense"],
    ["Getting around", "Transit", "expense"], ["School", "Books and fees", "expense"], ["Health", "Gym and health", "expense"],
    ["Life", "Shopping", "expense"], ["Life", "Fun", "expense"], ["Life", "Other", "expense"],
    ["Income", "Pay", "income"], ["Income", "Tips", "income"], ["Income", "Other income", "income"],
  ] as const) add("categories", `category:${name}`, { group_name: group, name, kind });
  add("settings", "settings", {});
  return out;
}
