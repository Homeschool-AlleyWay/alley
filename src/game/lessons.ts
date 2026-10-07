/** What each teacher can explain at the board: points, examples, reasons and a small glossary. Used for hand-raise Q&A. */
import type { Subject } from "./types";
export interface Lesson { title: string; points: string[]; examples: string[]; whys: string[]; glossary: Record<string, string>; homework: string }
export const LESSONS: Record<Subject, Lesson> = {
  math: {
    title: "Graphing a parabola",
    points: ["The vertex is the turning point of the curve: the very lowest or highest spot.", "The axis of symmetry is the vertical line through the vertex. Both halves of the parabola match across it.", "To graph one: plot the vertex, find a couple of points on one side, then mirror them across the axis."],
    examples: ["Take y = x squared. The vertex is (0, 0). When x is 2, y is 4, and when x is -2, y is also 4. Those two points mirror each other.", "Think of tossing a ball. It rises, turns at the vertex, then falls the same way it went up.", "For y = (x - 3) squared, the whole curve slides 3 steps right, so the vertex moves to (3, 0)."],
    whys: ["It's symmetric because squaring makes a positive number and its negative give the same answer.", "The vertex is the turning point because that's where the curve stops going down and starts going up.", "Mirroring saves work: once you know one side, the other side is free."],
    glossary: { vertex: "The vertex is the turning point of the parabola, its highest or lowest point.", parabola: "A parabola is the U-shaped curve you get from a squared term, like y = x squared.", axis: "The axis of symmetry is the vertical line through the vertex that splits the graph into two matching halves.", symmetry: "Symmetry means one side is a mirror image of the other.", intercept: "An intercept is where the graph crosses an axis. The x-intercepts are where y equals zero.", coordinate: "A coordinate is a pair like (3, 4): how far across, then how far up.", root: "A root, or zero, is an x value where the graph touches the x-axis." },
    homework: "Graph y = x squared + 2 and label the vertex and axis of symmetry.",
  },
  ela: {
    title: "Finding the theme",
    points: ["First ask what happens in the story: the main events.", "Next ask what changes: how a character or situation is different at the end.", "Then back it up with evidence: a quote or detail that proves your idea about the theme."],
    examples: ["In a story where a shy kid joins a team and finds friends, the theme might be that courage helps you connect with others.", "A theme isn't one word like 'friendship.' It's a sentence: 'True friends stand by you when things are hard.'", "Evidence sounds like: 'When Mia saved her a seat, it showed she cared.'"],
    whys: ["We use evidence so the theme is something we can show, not just a guess.", "Looking at what changes works because stories are about change, and the change points to the lesson.", "A theme is a message the author wants us to take away from the story."],
    glossary: { theme: "The theme is the big message or lesson of a story, written as a full sentence.", evidence: "Evidence is a detail or quote from the text that supports your idea.", plot: "The plot is the series of events in a story.", metaphor: "A metaphor says one thing is another to show a feeling, like 'Time is a thief.'", simile: "A simile compares two things using 'like' or 'as.'", character: "A character is a person or creature in a story.", conflict: "Conflict is the problem or struggle that drives the story.", inference: "An inference is an idea you figure out from clues in the text." },
    homework: "Write one sentence stating the theme of your favorite story and add one piece of evidence.",
  },
  science: {
    title: "Plant cells",
    points: ["The cell wall is the stiff outer layer that gives a plant cell its shape and support.", "Chloroplasts are the little green parts that make food from sunlight, water and carbon dioxide.", "The vacuole is the big storage sac that holds water and nutrients and keeps the cell firm."],
    examples: ["A celery stalk is crunchy because its cells are full of water in their vacuoles. Wilted celery has lost that water.", "Leaves are green because their cells hold lots of chloroplasts packed with chlorophyll.", "Think of the cell wall like a cardboard box around a water balloon: it keeps the shape."],
    whys: ["Plants need cell walls because they can't move or have a skeleton, so the walls hold them up.", "Chloroplasts matter because they turn sunlight into sugar, the food the plant lives on.", "Vacuoles are big in plants because water pressure inside them keeps stems and leaves standing."],
    glossary: { "cell wall": "The cell wall is the strong outer layer that supports and protects a plant cell.", chloroplast: "Chloroplasts are the green structures where photosynthesis happens.", vacuole: "The vacuole is a large storage sac that holds water and nutrients.", photosynthesis: "Photosynthesis is how plants turn sunlight, water and carbon dioxide into sugar and oxygen.", chlorophyll: "Chlorophyll is the green pigment in chloroplasts that captures sunlight.", nucleus: "The nucleus is the control center that holds the cell's DNA.", cell: "A cell is the smallest living building block of an organism.", mitochondria: "Mitochondria release energy from food for the cell to use." },
    homework: "Draw a plant cell and label the cell wall, chloroplasts and vacuole.",
  },
  history: {
    title: "Where and when?",
    points: ["First locate the event on the map: where did it happen and what was nearby?", "Then put it on a timeline: what happened before it and what came after?", "Finally ask who gained and who lost, because that shows why people made their choices."],
    examples: ["Trade routes like the Silk Road ran across Asia. Seeing them on a map explains why cities along them grew rich.", "On a timeline, the printing press (about 1440) comes before the Renaissance spread across Europe, so books helped spread ideas.", "When a new border is drawn, ask who gained land, who lost it, and who had a voice in the decision."],
    whys: ["Maps matter because geography shapes what people can grow, trade and defend.", "Timelines matter because events cause each other, and order helps us see how.", "Asking who gained helps us understand why people act the way they do."],
    glossary: { timeline: "A timeline puts events in order by date so you can see what came before and after.", map: "A map shows where things are, so we can understand how place shaped events.", primary: "A primary source is something made at the time of the event, like a diary or photo.", civilization: "A civilization is a large, organized society with cities, government and culture.", trade: "Trade is exchanging goods or services between people or places.", empire: "An empire is a large area ruled by one government or leader.", democracy: "A democracy is a government where people vote for their leaders or laws.", source: "A source is where information comes from, like a book, letter or object." },
    homework: "Pick one event from today and mark where it happened on a map and when on a timeline.",
  },
  careers: {
    title: "Finding your path",
    points: ["Interests are what you enjoy, skills are what you can do, and values are what matters to you.", "The best career fit sits where interests, skills and values overlap.", "There are sixteen career clusters, so every kind of work has a home, from farming to finance to film."],
    examples: ["Someone who likes fixing bikes, is patient with details and likes seeing things work could be a mechanic or engineer.", "A person who loves explaining things and helping others grow might become a teacher or trainer.", "Someone who likes animals and stays calm under pressure could become a veterinary technician."],
    whys: ["Careers fit better when they match what you enjoy, what you are good at, and what you care about.", "Skills can be learned, so you do not need to be great at everything today.", "Values matter because a job that fits them feels meaningful, not only paid."],
    glossary: { interest: "An interest is something you enjoy doing or learning about.", skill: "A skill is something you can do well. Skills can be learned and practiced.", value: "A value is something that matters to you, like helping others or creativity.", career: "A career is the work you do over many years, often growing from job to job.", cluster: "A career cluster is a group of jobs in the same field, like Health Science or Manufacturing." },
    homework: "Write one interest, one skill and one value you have.",
  },
};
export function explain(subject: Subject, text: string, rot = 0): string | null {
  const L = LESSONS[subject], t = text.toLowerCase();
  for (const [k, v] of Object.entries(L.glossary)) if (t.includes(k)) return v;
  if (/\b(again|repeat|confus|lost|don'?t (get|understand)|slow)\b/.test(t)) return `Let's go step by step. ${L.points[rot % L.points.length]}`;
  if (/\b(example|show me|for instance)\b/.test(t)) return L.examples[rot % L.examples.length];
  if (/\b(why|how come|reason)\b/.test(t)) return L.whys[rot % L.whys.length];
  if (/\b(homework|assignment|due)\b/.test(t)) return `For homework: ${L.homework}`;
  if (/\b(test|quiz|exam)\b/.test(t)) return "There may be a quick quiz soon. Review the three points on the board and you'll be ready.";
  if (/\b(thanks|thank you)\b/.test(t)) return "You're welcome! Great job asking.";
  return null;
}
