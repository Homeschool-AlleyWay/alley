/** Extra (catch-up) lessons: short bridge lessons for K-2, grades 3-5 and grades 6-8 in the four core subjects. The new-student assessment picks where each
 *  student starts; they take these IN ADDITION to their regular classes. */
import type { LessonDef } from "./curriculum";
import { SETS, type Order, type Sort } from "./labs";
export const BAND_LABEL = ["K-2", "grades 3-5", "grades 6-8", "high school"];
const X = (subject: any, band: number, id: string, title: string, points: string[], examples: string[], glossary: Record<string, string>, homework: string, prompt: string): LessonDef => ({
  id, subject, title, blurb: `Extra lesson · ${BAND_LABEL[band]}`, band, extra: true, points, examples, pics: [], videos: [], lab: { id: "cardsort", cfg: "x-" + id, title: "Try it", intro: prompt },
  intro: `Today is an extra lesson: ${title}. It builds the skills ${BAND_LABEL[band]} learners use, so your regular classes feel easier.`, wrap: "Nice work. Every extra lesson brings you closer to your class, and your regular lessons are still waiting.", homework, glossary,
  whys: ["It is a building block for harder work later.", "Practice makes it feel easy, so a little each day is enough."],
});
Object.assign(SETS, {
 "x-m0a": {
  "kind": "sort",
  "prompt": "Adding or subtracting?",
  "groups": {
   "Adding (put together)": [
    "3 + 4",
    "5 + 2"
   ],
   "Subtracting (take away)": [
    "9 - 4",
    "7 - 3"
   ]
  }
 },
 "x-m0b": {
  "kind": "sort",
  "prompt": "Which shape is it?",
  "groups": {
   "Circle": [
    "a wheel",
    "a coin"
   ],
   "Square": [
    "a sticky note",
    "a chessboard square"
   ]
  }
 },
 "x-m1a": {
  "kind": "sort",
  "prompt": "Multiply or divide?",
  "groups": {
   "Multiplication": [
    "4 x 3",
    "6 x 2"
   ],
   "Division": [
    "12 / 3",
    "10 / 2"
   ]
  }
 },
 "x-m1b": {
  "kind": "sort",
  "prompt": "Which place is the digit in?",
  "groups": {
   "Tens place": [
    "the 4 in 347",
    "the 9 in 592"
   ],
   "Hundreds place": [
    "the 3 in 347",
    "the 5 in 592"
   ]
  }
 },
 "x-m2a": {
  "kind": "sort",
  "prompt": "Ratio or percent?",
  "groups": {
   "Ratio": [
    "3 red : 2 blue",
    "1 to 4"
   ],
   "Percent": [
    "25%",
    "60 out of 100"
   ]
  }
 },
 "x-m2b": {
  "kind": "sort",
  "prompt": "Expression or equation?",
  "groups": {
   "Expression": [
    "3x + 2",
    "y - 7"
   ],
   "Equation": [
    "3x + 2 = 11",
    "y - 7 = 5"
   ]
  }
 },
 "x-e0a": {
  "kind": "sort",
  "prompt": "Which word rhymes?",
  "groups": {
   "Rhymes with cat": [
    "hat",
    "mat"
   ],
   "Rhymes with dog": [
    "log",
    "frog"
   ]
  }
 },
 "x-e0b": {
  "kind": "sort",
  "prompt": "Telling sentence or question?",
  "groups": {
   "Telling sentence (.)": [
    "The cat sleeps.",
    "I like pizza."
   ],
   "Question (?)": [
    "Where is my hat?",
    "Can I play?"
   ]
  }
 },
 "x-e1a": {
  "kind": "sort",
  "prompt": "Noun, verb or adjective?",
  "groups": {
   "Noun": [
    "dog",
    "school"
   ],
   "Verb": [
    "run",
    "jump"
   ],
   "Adjective": [
    "tall",
    "shiny"
   ]
  }
 },
 "x-e1b": {
  "kind": "sort",
  "prompt": "Main idea or detail?",
  "groups": {
   "Main idea": [
    "Dogs make good pets",
    "Recycling helps the planet"
   ],
   "Detail": [
    "Dogs can learn tricks",
    "Recycling saves energy"
   ]
  }
 },
 "x-e2a": {
  "kind": "sort",
  "prompt": "Prefix or suffix?",
  "groups": {
   "Prefix": [
    "unhappy",
    "rewrite"
   ],
   "Suffix": [
    "quickly",
    "helpful"
   ]
  }
 },
 "x-e2b": {
  "kind": "sort",
  "prompt": "Fact or opinion?",
  "groups": {
   "Fact": [
    "Water boils at 100 C at sea level",
    "Mars is a planet"
   ],
   "Opinion": [
    "Winter is the best season",
    "Math is boring"
   ]
  }
 },
 "x-s0a": {
  "kind": "sort",
  "prompt": "Living or non-living?",
  "groups": {
   "Living": [
    "tree",
    "bird"
   ],
   "Non-living": [
    "rock",
    "chair"
   ]
  }
 },
 "x-s0b": {
  "kind": "sort",
  "prompt": "Which season?",
  "groups": {
   "Winter": [
    "snow",
    "wearing a coat"
   ],
   "Summer": [
    "swimming",
    "hot sun"
   ]
  }
 },
 "x-s1a": {
  "kind": "sort",
  "prompt": "Plant part or animal group?",
  "groups": {
   "Plant parts": [
    "roots",
    "stem"
   ],
   "Animal groups": [
    "mammal",
    "reptile"
   ]
  }
 },
 "x-s1b": {
  "kind": "sort",
  "prompt": "Solid, liquid or gas?",
  "groups": {
   "Solid": [
    "ice",
    "rock"
   ],
   "Liquid": [
    "milk",
    "juice"
   ],
   "Gas": [
    "steam",
    "helium"
   ]
  }
 },
 "x-s2a": {
  "kind": "sort",
  "prompt": "Balanced or unbalanced?",
  "groups": {
   "Balanced forces": [
    "a book resting on a table",
    "a tug of war with no winner"
   ],
   "Unbalanced forces": [
    "a ball kicked across a field",
    "a car speeding up"
   ]
  }
 },
 "x-s2b": {
  "kind": "order",
  "prompt": "Put the scientific method in order.",
  "items": [
   "Ask a question",
   "Make a hypothesis",
   "Test with an experiment",
   "Collect and study the data",
   "Share your conclusion"
  ]
 },
 "x-h0a": {
  "kind": "sort",
  "prompt": "How do they help?",
  "groups": {
   "Keep us safe": [
    "firefighter",
    "police officer"
   ],
   "Help us learn": [
    "teacher",
    "librarian"
   ]
  }
 },
 "x-h0b": {
  "kind": "sort",
  "prompt": "Land or water?",
  "groups": {
   "Land": [
    "mountain",
    "desert"
   ],
   "Water": [
    "ocean",
    "river"
   ]
  }
 },
 "x-h1a": {
  "kind": "sort",
  "prompt": "Continent or ocean?",
  "groups": {
   "Continents": [
    "Africa",
    "Asia"
   ],
   "Oceans": [
    "Pacific",
    "Atlantic"
   ]
  }
 },
 "x-h1b": {
  "kind": "sort",
  "prompt": "Before or after 1600?",
  "groups": {
   "Long before 1600": [
    "Native nations lived across the land",
    "Explorers crossed the ocean"
   ],
   "After 1600": [
    "Colonies were settled",
    "Trade towns grew"
   ]
  }
 },
 "x-h2a": {
  "kind": "sort",
  "prompt": "Egypt or Rome?",
  "groups": {
   "Egypt": [
    "pyramids",
    "the Nile river"
   ],
   "Rome": [
    "the Senate",
    "aqueducts"
   ]
  }
 },
 "x-h2b": {
  "kind": "order",
  "prompt": "Order the road to the Constitution.",
  "items": [
   "Colonies protest taxes",
   "The Declaration of Independence is signed",
   "The colonies win the war",
   "The Constitution is written",
   "The Bill of Rights is added"
  ]
 }
} as Record<string, Order | Sort>);
export const CATCHUP: LessonDef[] = [
  X("math", 0, "m0a", "Counting and adding to 20", ["Counting tells how many things there are", "Adding puts groups together: 3 + 4 = 7", "Subtracting takes some away: 9 - 4 = 5"], ["Put 3 blocks with 4 blocks and count: 7 blocks.", "Start with 9 apples, eat 4, and 5 are left."], { "add": "To add is to put numbers together.", "subtract": "To subtract is to take some away.", "equals": "Equals means the same amount." }, "Count 10 things at home and write two adding sentences.", "Adding or subtracting?"),
  X("math", 0, "m0b", "Shapes and measuring", ["Shapes have sides and corners: a square has 4 sides", "We measure how long, how heavy and how full", "Compare with words: longer, shorter, heavier, lighter"], ["A coin is a circle. A sticky note is a square.", "A pencil is longer than an eraser."], { "shape": "A shape is the outline of an object.", "side": "A side is a straight edge of a shape.", "measure": "To measure is to find how much of something there is." }, "Find a circle, a square and a triangle around your home.", "Which shape is it?"),
  X("math", 1, "m1a", "Multiplication and division facts", ["Multiplying is adding equal groups: 4 x 3 = 12", "Dividing shares equally: 12 / 3 = 4", "Multiplication and division are opposites"], ["3 bags with 4 apples each is 12 apples.", "Share 10 cookies between 2 friends: 5 each."], { "product": "The product is the answer to a multiplication.", "divide": "To divide is to share into equal groups.", "factor": "A factor is a number you multiply." }, "Write the 3 times table up to 3 x 10.", "Multiply or divide?"),
  X("math", 1, "m1b", "Place value and rounding", ["Each digit has a place: ones, tens, hundreds", "In 347 the 4 is in the tens place", "Round to the nearest ten by looking at the ones digit"], ["347 is 3 hundreds, 4 tens and 7 ones.", "Round 47 to 50 because 7 is 5 or more."], { "digit": "A digit is one of the numbers 0 to 9.", "place value": "Place value is what a digit is worth by its place.", "round": "To round is to change a number to a nearby simpler one." }, "Write your age and a three-digit number in expanded form.", "Which place is the digit in?"),
  X("math", 2, "m2a", "Ratios and percents", ["A ratio compares two amounts: 3 red to 2 blue", "A percent means out of 100", "To find 25% of a number, divide by 4"], ["25% of 80 is 20.", "A recipe uses 2 cups of rice for 4 cups of water: ratio 1 to 2."], { "ratio": "A ratio compares two quantities.", "percent": "A percent is a part out of 100.", "proportion": "A proportion says two ratios are equal." }, "Find 10% and 50% of the price of something you like.", "Ratio or percent?"),
  X("math", 2, "m2b", "Expressions and equations", ["An expression has numbers and letters but no equals sign", "An equation says two sides are equal", "Solve by doing the same thing to both sides"], ["3x + 2 is an expression.", "3x + 2 = 11 gives x = 3."], { "variable": "A variable is a letter that stands for a number.", "expression": "An expression is a math phrase without an equals sign.", "equation": "An equation states that two things are equal." }, "Solve x + 7 = 15 and 2x = 18.", "Expression or equation?"),
  X("ela", 0, "e0a", "Letters, sounds and rhymes", ["Letters make sounds, and sounds make words", "Rhyming words end with the same sound", "Say each sound slowly, then blend it together"], ["Cat, hat and mat rhyme.", "Dog, log and frog rhyme."], { "rhyme": "Words rhyme when they end with the same sound.", "vowel": "Vowels are a, e, i, o and u.", "syllable": "A syllable is a beat in a word." }, "Think of three words that rhyme with sun.", "Which word rhymes?"),
  X("ela", 0, "e0b", "Telling and asking sentences", ["A sentence starts with a capital letter", "A telling sentence ends with a period", "A question ends with a question mark"], ["The cat sleeps.", "Where is my hat?"], { "sentence": "A sentence is a complete thought.", "capital": "A capital letter begins a sentence.", "period": "A period ends a telling sentence." }, "Write one telling sentence and one question about your day.", "Telling sentence or question?"),
  X("ela", 1, "e1a", "Nouns, verbs and adjectives", ["A noun names a person, place or thing", "A verb is an action word", "An adjective describes a noun"], ["The tall girl runs: girl is the noun, runs is the verb, tall is the adjective.", "Add an adjective: the shiny coin."], { "noun": "A noun names a person, place or thing.", "verb": "A verb tells what someone does.", "adjective": "An adjective describes a noun." }, "Write a sentence with a noun, a verb and two adjectives.", "Noun, verb or adjective?"),
  X("ela", 1, "e1b", "Main idea and details", ["The main idea is what a text is mostly about", "Details give facts that support the main idea", "Ask: what is the one big thing the writer wants me to know?"], ["Main idea: dogs make good pets. Detail: dogs can learn tricks.", "Main idea: recycling helps the planet. Detail: it saves energy."], { "main idea": "The main idea is the most important point.", "detail": "A detail is a small fact that supports the main idea.", "summary": "A summary is a short retelling." }, "Read a short article and write its main idea in one sentence.", "Main idea or detail?"),
  X("ela", 2, "e2a", "Word parts and vocabulary", ["Prefixes come before a root and change the meaning", "Suffixes come after a root", "Use clues in the sentence to figure out new words"], ["Un- means not: unhappy means not happy.", "The suffix -ful means full of: helpful."], { "prefix": "A prefix is added to the start of a word.", "suffix": "A suffix is added to the end of a word.", "root": "A root is the main part of a word." }, "List five words with the prefix re- and what they mean.", "Prefix or suffix?"),
  X("ela", 2, "e2b", "Fact and opinion", ["A fact can be checked and proved", "An opinion tells what someone thinks or feels", "Words like best, worst and boring often signal opinions"], ["Fact: Mars is a planet.", "Opinion: math is boring."], { "fact": "A fact is something that can be proven.", "opinion": "An opinion is a belief or feeling.", "evidence": "Evidence is proof that supports an idea." }, "Write two facts and two opinions about your school.", "Fact or opinion?"),
  X("science", 0, "s0a", "Living and non-living things", ["Living things grow, need food and water and have babies", "Non-living things do not grow on their own", "Plants and animals are living things"], ["A tree is living. A rock is not.", "A bird eats, grows and has chicks."], { "living": "Living things grow and change.", "habitat": "A habitat is where an animal lives.", "need": "A need is something living things must have." }, "Find three living and three non-living things in your home.", "Living or non-living?"),
  X("science", 0, "s0b", "Weather and seasons", ["Weather is what the sky and air are doing today", "There are four seasons: winter, spring, summer and fall", "We dress for the weather"], ["In winter it can snow, so we wear coats.", "In summer it is hot, so we swim."], { "weather": "Weather is the condition of the air outside.", "season": "A season is a part of the year with its own weather.", "temperature": "Temperature tells how hot or cold it is." }, "Draw today's weather and what you wore.", "Which season?"),
  X("science", 1, "s1a", "Plants and animals", ["Plants have roots, stems and leaves", "Animals are grouped by traits: mammals, reptiles, birds, fish and insects", "Mammals have fur and feed milk to their babies"], ["Roots take in water, leaves catch sunlight.", "A dog is a mammal and a snake is a reptile."], { "roots": "Roots take in water and hold a plant in the soil.", "mammal": "A mammal has hair and feeds babies milk.", "reptile": "A reptile has dry scales." }, "Sort five animals you know into groups.", "Plant part or animal group?"),
  X("science", 1, "s1b", "States of matter", ["Matter is anything that takes up space", "Solids keep their shape, liquids take the shape of their container, gases spread out", "Heating or cooling can change the state"], ["Ice melts into water when it warms up.", "Steam is water as a gas."], { "matter": "Matter is anything with mass that takes up space.", "melt": "To melt is to change from solid to liquid.", "evaporate": "To evaporate is to change from liquid to gas." }, "List one solid, one liquid and one gas in your kitchen.", "Solid, liquid or gas?"),
  X("science", 2, "s2a", "Forces and motion", ["A force is a push or a pull", "Balanced forces do not change motion; unbalanced forces do", "Friction slows things down"], ["A book on a table has balanced forces.", "A kicked ball speeds up because of an unbalanced force."], { "force": "A force is a push or pull.", "friction": "Friction is a force that slows moving things.", "gravity": "Gravity pulls objects toward each other." }, "Push three objects and describe the force you used.", "Balanced or unbalanced?"),
  X("science", 2, "s2b", "The scientific method", ["Science starts with a question", "A hypothesis is a testable prediction", "Experiments change one thing at a time and collect data"], ["Question: does light help plants grow?", "Test two plants, one in light and one in dark, and measure each week."], { "hypothesis": "A hypothesis is a testable prediction.", "variable": "A variable is what you change or measure.", "data": "Data is the information you collect." }, "Design a simple test about plants and light.", "Put the scientific method in order."),
  X("history", 0, "h0a", "Community helpers and rules", ["Community helpers keep us safe and help us learn", "Rules keep everyone fair and safe", "We work together in a community"], ["Firefighters and police officers help keep us safe.", "Teachers and librarians help us learn."], { "community": "A community is a group of people living or working together.", "rule": "A rule says what we should or should not do.", "helper": "A helper does a job that helps others." }, "Thank one community helper this week.", "How do they help?"),
  X("history", 0, "h0b", "Maps and places", ["A map shows where places are", "A map key explains the symbols", "Land and water are shown in different colors"], ["Blue on a map is usually water.", "A compass rose shows north, south, east and west."], { "map": "A map is a picture of a place from above.", "key": "A map key explains the symbols.", "compass": "A compass shows directions." }, "Draw a map of your room with a key.", "Land or water?"),
  X("history", 1, "h1a", "Continents and oceans", ["There are seven continents", "There are five oceans: Pacific, Atlantic, Indian, Southern and Arctic", "The Pacific Ocean is the largest"], ["Africa and Asia are continents.", "The Atlantic lies between the Americas and Europe and Africa."], { "continent": "A continent is a very large area of land.", "ocean": "An ocean is a very large body of salt water.", "equator": "The equator is the imaginary line around the middle of Earth." }, "Name the seven continents from memory.", "Continent or ocean?"),
  X("history", 1, "h1b", "Explorers and early America", ["Native nations lived across North America long before Europeans arrived", "Explorers crossed the ocean looking for new lands and trade", "Colonies grew into towns, farms and trade networks"], ["Jamestown was settled in 1607.", "Native peoples taught many settlers how to farm local crops."], { "explorer": "An explorer travels to learn about new places.", "colony": "A colony is a settlement ruled by a faraway country.", "trade": "Trade is the exchange of goods." }, "Ask someone where your family came from.", "Before or after 1600?"),
  X("history", 2, "h2a", "Ancient civilizations", ["Early civilizations grew along rivers", "Egypt had pharaohs, pyramids and the Nile", "Rome began as a republic with a Senate"], ["The Nile flooded each year and made farming possible.", "Roman aqueducts carried water to cities."], { "civilization": "A civilization is an organized society with cities and government.", "pharaoh": "A pharaoh was a ruler of ancient Egypt.", "republic": "A republic is led by elected leaders." }, "Make a two-column chart comparing Egypt and Rome.", "Egypt or Rome?"),
  X("history", 2, "h2b", "The American Revolution and the Constitution", ["Colonists protested taxes without representation", "The Declaration of Independence announced a new nation in 1776", "The Constitution set up how the government works"], ["The Boston Tea Party was a protest about taxes.", "The Bill of Rights added protections like free speech."], { "revolution": "A revolution is a big change, often of government.", "constitution": "A constitution is the rules for a government.", "amendment": "An amendment is a change added to the Constitution." }, "Write why colonists said no taxation without representation.", "Order the road to the Constitution."),
];
export const catchupFor = (subject: string, band: number) => CATCHUP.filter((l) => l.subject === subject && (l.band ?? 0) === band);
