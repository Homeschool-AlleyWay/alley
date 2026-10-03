/** Premade lesson videos (data for the reenactment engine). Each is a few short shots with costumed characters acting out the topic. */
import type { ActorT, PropT, Shot, VideoDef, Key } from "./reenact";

const INK = "#4A3B3F";
const K = (t: number, x: number, y: number, pose?: string): Key => ({ t, x, y, pose });
const at = (role: string, x: number, y: number, pose = "idle", say?: [number, number, string][], o: Partial<ActorT> = {}): ActorT => ({ role, keys: [K(0, x, y, pose)], say, ...o });
const go = (role: string, x0: number, y0: number, x1: number, y1: number, t0: number, t1: number, pose = "idle", end = "idle", say?: [number, number, string][]): ActorT => ({ role, keys: [K(0, x0, y0, pose), K(t0, x0, y0, pose), K(t1, x1, y1, end)], say });
const P = (kind: string, x: number, y: number, s = 1, o: Partial<PropT> = {}): PropT => ({ kind, x, y, s, ...o });
const S = (dur: number, bg: string, cap: string, actors: ActorT[], props: PropT[], o: Partial<Shot> = {}): Shot => ({ dur, bg, cap, actors, props, ...o });
const V = (id: string, subject: string, lesson: string, tag: string, title: string, blurb: string, shots: Shot[], discuss: string[]): VideoDef => ({ id, subject, lesson, tag, title, blurb, shots, discuss });

export const VIDEOS: VideoDef[] = [
  /* ---------------------------------------------------------------- history */
  V("egypt", "history", "egypt", "Ancient Egypt", "Building the Great Pyramid", "How thousands of workers raised a mountain of stone.", [
    S(6.5, "desert", "About 4,500 years ago, Egypt's pharaohs ordered giant stone tombs. Teams dragged huge blocks on wooden sledges.",
      [go("worker", 80, 296, 300, 296, 0.4, 5.5, "carry", "carry"), go("worker2", 40, 300, 262, 300, 0.4, 5.5, "carry", "carry"), at("architect", 400, 318, "point", [[1, 4, "Pull together!"]])],
      [P("sledge", 120, 296, 1.2, { to: [340, 296], t0: 0.4, t1: 5.5 }), P("pyramid", 500, 300, 1.2, { a: { p: 0.45 } })], { zoom: [1, 1.12] }),
    S(6.5, "nile", "Blocks were floated down the Nile when the river flooded, then hauled up ramps to the building site.",
      [at("architect", 130, 318, "point"), at("worker", 540, 322, "idle")], [P("boat", 100, 300, 1.2, { to: [470, 300], t0: 0.2, t1: 6 }), P("block", 100, 270, 1.1, { to: [470, 270], t0: 0.2, t1: 6 })]),
    S(6.5, "desert", "Architects planned every layer. Skilled workers were paid and fed, and they built the pyramid one level at a time.",
      [at("pharaoh", 180, 312, "talk", [[0.5, 5, "Make it reach the sky."]]), at("architect", 260, 318, "point"), go("worker", 560, 300, 400, 300, 0.2, 5, "carry", "carry")], [P("scroll", 220, 330, 1.2), P("pyramid", 470, 300, 1.4, { a: { p: 0.85 } }), P("block", 560, 300, 1, { to: [420, 300], t0: 0.2, t1: 5 })]),
    S(7, "desert", "The Great Pyramid took about 20 years to build and was the tallest structure on Earth for nearly 4,000 years.",
      [at("pharaoh", 150, 316, "cheer"), at("queen", 230, 320, "wave"), at("worker", 90, 326, "cheer"), at("architect", 320, 322, "point")], [P("pyramid", 470, 300, 1.5, { a: { p: 1 } }), P("sun", 560, 60, 0.9)], { zoom: [1, 1.15], pan: [320, 180, 400, 160] }),
  ], ["Look at the sledges and ramps. How would you move a block that heavy?", "The Nile was like a highway for stone. Why build near a river?", "Planning mattered. Notice the architect with the scroll.", "Which jobs did you see? It took many different skills."]),

  V("silkroad", "history", "silkroad", "Trade routes", "The Silk Road", "Camels, caravans and the goods and ideas they carried.", [
    S(6.5, "market", "Silk was first made in China, and it was so valuable that traders carried it thousands of miles.",
      [at("merchant", 200, 300, "present", [[0.6, 5, "Finest silk in the land!"]]), at("trader", 430, 312, "idle")], [P("silk", 120, 292, 1.4), P("silk", 300, 292, 1.4), P("sack", 540, 300, 1.2)]),
    S(7, "desert", "Caravans of camels crossed deserts and mountains, stopping at oases for water and rest.",
      [go("trader", 40, 316, 440, 316, 0.2, 6.6, "idle", "idle"), go("merchant", 10, 330, 400, 330, 0.5, 6.6)], [P("camel", 120, 308, 1.3, { to: [540, 308], t0: 0.2, t1: 6.6 }), P("camel", 30, 330, 1.1, { to: [440, 330], t0: 0.8, t1: 6.6 })]),
    S(7, "parchment", "The Silk Road was a network of routes linking China, India, Persia, Arabia and Europe.",
      [at("narrator", 90, 328, "point")], [P("label", 120, 90, 1.4, { a: { text: "CHANG'AN", col: "#9A653D", size: 18 } }), P("label", 330, 150, 1.4, { a: { text: "SAMARKAND", col: "#9A653D", size: 18 } }), P("label", 520, 100, 1.4, { a: { text: "BAGHDAD", col: "#9A653D", size: 18 } }), P("arrow", 150, 100, 1, { a: { dx: 140, dy: 50, col: "#E9515D" } }), P("arrow", 350, 160, 1, { a: { dx: 140, dy: -50, col: "#E9515D" } }), P("label", 330, 300, 1.2, { a: { text: "Goods, ideas and stories moved along the roads", col: INK, size: 16 } })]),
    S(7, "market", "Traders swapped silk, spices and paper, and ideas, inventions and religions traveled right along with them.",
      [at("trader", 230, 312, "talk", [[0.5, 3.5, "Spices for silk?"]]), at("merchant2", 410, 312, "talk", [[3.8, 6.5, "Deal!"]])], [P("sack", 160, 300, 1.2), P("silk", 480, 296, 1.3), P("paper", 320, 330, 1.2)]),
  ], ["Why was silk so valuable? Think about how far it traveled.", "Camels were perfect for deserts. What else made the trip hard?", "Find the cities on the map. Which one is farthest east?", "Trade moved more than goods. What else traveled?"]),

  V("printing", "history", "printing", "Inventions", "The Printing Press", "From hand-copied books to pages printed by the hundreds.", [
    S(6.5, "scriptorium", "Before 1440, every book was copied by hand. One book could take months.",
      [at("scribe", 330, 320, "write")], [P("book", 330, 300, 1.4), P("quill", 350, 296, 1.4), P("book", 160, 330, 1), P("book", 500, 330, 1)]),
    S(6.5, "workshop", "Around 1440, Johannes Gutenberg built a press with movable metal letters.",
      [at("printer", 250, 320, "present", [[0.5, 5, "Letters I can reuse!"]])], [P("press", 420, 320, 1.4)]),
    S(6.5, "workshop", "Letters could be rearranged and reused, so a press could print hundreds of pages in a day.",
      [at("printer", 270, 322, "write")], [P("press", 400, 320, 1.5), P("paper", 560, 320, 1.3, { to: [560, 320], t0: 0, t1: 2 }), P("paper", 520, 330, 1.3), P("paper", 480, 336, 1.3)]),
    S(7, "town", "Books became cheaper, more people learned to read, and new ideas spread across Europe.",
      [at("citizen", 160, 306, "cheer"), at("citizen2", 300, 312, "talk", [[1, 5, "I can read it myself!"]]), at("citizen3", 450, 308, "cheer")], [P("book", 160, 276, 1.1), P("book", 300, 280, 1.1), P("book", 450, 276, 1.1)]),
  ], ["Hand copying was slow. Why would books cost so much?", "Movable letters can be rearranged. Why does that matter?", "Count the pages piling up. What changed for readers?", "More books meant more ideas. Can you think of a modern example?"]),

  V("teaparty", "history", "teaparty", "American colonies", "The Boston Tea Party", "A protest about taxes that helped start a revolution.", [
    S(6.5, "street", "In 1773, colonists in Boston were angry about taxes decided by a government where they had no vote.",
      [at("colonist", 260, 312, "talk", [[0.5, 5.5, "No taxation without representation!"]]), at("colonist2", 400, 318, "cheer"), at("colonist3", 140, 314, "cheer")], []),
    S(6.5, "harbor", "Ships from Britain arrived carrying tea, and the tax on it stayed.",
      [at("colonist2", 120, 334, "point"), at("colonist", 200, 340, "idle")], [P("ship", 430, 296, 1.1), P("crate", 540, 310, 1.1), P("crate", 500, 310, 1.1)]),
    S(7, "night", "On December 16, colonists boarded the ships and tossed 342 chests of tea into the harbor.",
      [at("colonist", 230, 330, "carry"), at("colonist2", 310, 334, "carry"), at("colonist3", 150, 336, "cheer")], [P("ship", 480, 300, 1.1), P("crate", 300, 300, 1.1, { to: [420, 330], a: { arc: 50 }, t0: 0.5, t1: 2.5 }), P("crate", 240, 300, 1.1, { to: [380, 334], a: { arc: 60 }, t0: 2, t1: 4 }), P("crate", 330, 300, 1.1, { to: [450, 336], a: { arc: 50 }, t0: 3.5, t1: 5.5 })]),
    S(7, "street", "The protest helped push the colonies toward the American Revolution.",
      [at("colonist", 200, 314, "point"), at("colonist3", 330, 318, "talk", [[1, 5, "What will happen next?"]]), at("colonist2", 450, 314, "think")], [P("paper", 330, 282, 1.4)]),
  ], ["What did the colonists want? Listen to the words on the sign.", "The tax stayed even though the tea was cheap. Why was that upsetting?", "Protests can be peaceful or not. How would you describe this one?", "How did one event change history?"]),

  /* ---------------------------------------------------------------- government */
  V("bill", "history", "bill", "Government", "How a Bill Becomes a Law", "An idea travels through Congress to the President's desk.", [
    S(6.5, "town", "Every law starts with an idea. A citizen shares it with a representative.",
      [at("citizen", 200, 312, "talk", [[0.5, 5, "We need a crosswalk!"]]), at("senator", 380, 318, "idle")], [P("bulb", 200, 240, 1.2)]),
    S(6.5, "capitol", "A member of Congress writes a bill and introduces it.",
      [at("senator", 280, 330, "present"), at("senator2", 400, 330, "idle")], [P("bill", 330, 296, 1.6, { a: { label: "BILL" } }), P("podium", 460, 336, 1.1)]),
    S(7, "chamber", "Committees study it. Then the House and the Senate debate and vote. Both must pass it.",
      [at("senator", 160, 300, "talk", [[0.5, 5, "Yea!"]]), at("senator2", 330, 304, "talk", [[2, 6, "Yea!"]]), at("citizen3", 500, 300, "cheer")], [P("ballot", 220, 280, 1.2, { to: [330, 244], t0: 0.5, t1: 3 }), P("ballot", 380, 280, 1.2, { to: [330, 244], t0: 2, t1: 4.5 }), P("gavel", 330, 250, 1)]),
    S(7, "office", "The President signs it, and it becomes law. The President can also veto it.",
      [at("president", 320, 304, "write"), at("senator", 180, 322, "cheer")], [P("bill", 330, 280, 1.4), P("stamp", 440, 310, 1.3, { a: { label: "LAW" } })]),
  ], ["Where did the idea come from? Ordinary citizens count.", "What does a bill have to do before it becomes law?", "Both chambers must pass it. Why two chambers?", "The President can veto. What does veto mean?"]),

  V("branches", "history", "branches", "Government", "Three Branches of Government", "Who makes laws, who carries them out, and who decides what they mean.", [
    S(6.5, "capitol", "The Constitution divides power into three branches, so no one person has too much.",
      [at("narrator", 110, 330, "point")], [P("pillar", 220, 300, 1.3, { a: { col: "#4F91C7", label: "LEGISLATIVE" } }), P("pillar", 330, 300, 1.3, { a: { col: "#E07A66", label: "EXECUTIVE" } }), P("pillar", 440, 300, 1.3, { a: { col: "#88B89A", label: "JUDICIAL" } })]),
    S(6.5, "chamber", "Legislative: Congress writes the laws.",
      [at("senator", 220, 306, "talk"), at("senator2", 420, 306, "talk")], [P("bill", 320, 280, 1.5, { a: { label: "NEW LAW" } }), P("gavel", 320, 330, 1.1)]),
    S(6.5, "office", "Executive: the President and agencies carry out the laws.",
      [at("president", 300, 306, "talk")], [P("flag", 130, 312, 1.1), P("stamp", 460, 316, 1.3, { a: { label: "SIGNED" } })]),
    S(7.5, "court", "Judicial: the courts decide what laws mean. Each branch checks the others.",
      [at("judge", 320, 292, "talk", [[0.5, 4, "Is it constitutional?"]])], [P("scales", 170, 326, 1.1), P("gavel", 470, 326, 1.1), P("arrow", 240, 120, 1, { a: { dx: 100, dy: 0 } }), P("arrow", 420, 150, 1, { a: { dx: -100, dy: 0 } })]),
  ], ["Why not give all the power to one person?", "Congress writes the laws. How many chambers does it have?", "The President carries out laws. Which job is the executive branch's?", "Courts decide what laws mean. Can you explain checks and balances?"]),

  V("election", "history", "election", "Government", "Election Day", "How a community chooses its leaders.", [
    S(6.5, "town", "On Election Day, citizens walk to polling places in their communities.",
      [go("citizen", 20, 312, 360, 312, 0.3, 6, "idle", "idle"), go("citizen2", 0, 326, 300, 326, 0.8, 6.2), go("citizen3", 40, 336, 420, 336, 1.2, 6.4)], []),
    S(6.5, "polling", "In a private booth, each voter marks a ballot. Your vote is secret.",
      [at("citizen", 330, 312, "write", [[0.5, 5, "I'm choosing carefully."]])], [P("booth", 330, 320, 1.4), P("bill", 400, 300, 1.2, { a: { label: "BALLOT" } })]),
    S(6.5, "polling", "Ballots go into a secure box or machine so every vote is counted once.",
      [at("citizen2", 250, 320, "carry"), at("citizen3", 440, 322, "cheer")], [P("ballotbox", 340, 330, 1.6), P("ballot", 260, 280, 1.4, { to: [340, 282], a: { arc: 24 }, t0: 0.4, t1: 3 })]),
    S(7, "hall", "Officials count every vote. The winner is the candidate with the most votes.",
      [at("narrator", 120, 330, "point"), at("senator", 540, 330, "cheer")], [P("tally", 330, 232, 1.5, { a: { v: [0.5, 0.9, 0.7] } })]),
  ], ["Why do people walk to the polls together?", "Why is the booth private? Think about fairness.", "What happens to the ballots after they go in the box?", "How is the winner decided?"]),

  /* ---------------------------------------------------------------- science */
  V("photosynthesis", "science", "photosynthesis", "Plants", "How Plants Make Food", "Sunlight, water and air become sugar and oxygen.", [
    S(6.5, "garden", "Plants make their own food with a process called photosynthesis.",
      [at("scientist", 160, 322, "point")], [P("plant", 400, 330, 1.7), P("sun", 560, 70, 1)]),
    S(6.5, "garden", "They take in water through their roots and carbon dioxide through their leaves.",
      [at("scientist", 130, 326, "point")], [P("plant", 400, 330, 1.7), P("drop", 300, 336, 1.3, { to: [380, 330], t0: 0, t1: 3 }), P("drop", 320, 330, 1.3, { to: [400, 330], t0: 2, t1: 5 }), P("co2", 540, 190, 1.2, { to: [420, 250], t0: 0.2, t1: 3.5 }), P("co2", 560, 150, 1.2, { to: [430, 240], t0: 2, t1: 5.5 })]),
    S(7, "garden", "Chlorophyll inside the chloroplasts captures sunlight, and the energy turns water and carbon dioxide into sugar.",
      [at("scientist", 140, 326, "talk")], [P("plant", 400, 330, 1.7), P("sun", 540, 80, 1.1), P("arrow", 500, 120, 1, { a: { dx: -70, dy: 70, col: "#F8D977" } }), P("sugar", 400, 230, 1.4)]),
    S(7, "garden", "The plant uses the sugar for energy, and releases oxygen that we breathe.",
      [at("scientist", 150, 326, "cheer")], [P("plant", 400, 330, 1.9, { a: { g: 1.2 } }), P("o2", 440, 240, 1.2, { to: [540, 120], t0: 0, t1: 5 }), P("o2", 410, 250, 1.2, { to: [500, 100], t0: 1.5, t1: 6 }), P("sugar", 400, 250, 1.4)]),
  ], ["Plants make their own food. What do they need?", "Where does the water come in? And the carbon dioxide?", "Light is the energy source. Where is it captured?", "What do we get from this? Breathe in..."]),

  V("watercycle", "science", "watercycle", "Earth science", "The Water Cycle", "Water travels from the sea to the sky and back again.", [
    S(6.5, "landscape", "The sun warms oceans and lakes, and water evaporates into vapor.",
      [at("scientist", 110, 322, "point")], [P("vapor", 260, 280, 1.4), P("vapor", 360, 280, 1.4), P("vapor", 460, 280, 1.4), P("sun", 90, 70, 0.9)]),
    S(6.5, "landscape", "Rising vapor cools and condenses into tiny droplets that gather into clouds.",
      [at("scientist", 110, 322, "talk")], [P("cloud", 330, 90, 1.8), P("cloud", 450, 110, 1.5), P("vapor", 280, 250, 1.3)]),
    S(7, "landscape", "When the droplets get heavy they fall as precipitation: rain, snow or hail.",
      [at("kid", 200, 322, "cheer")], [P("cloud", 330, 90, 2), P("rain", 290, 120, 1.2), P("rain", 380, 130, 1.2)]),
    S(7, "landscape", "Water collects in rivers and oceans, and the cycle begins again.",
      [at("scientist", 120, 324, "present")], [P("arrow", 150, 270, 1, { a: { dx: 260, dy: 20, col: "#fff" } }), P("arrow", 520, 250, 1, { a: { dx: 0, dy: -100, col: "#fff" } }), P("cloud", 420, 90, 1.6)]),
  ], ["What makes the water rise? Look at the sun.", "Clouds are made of tiny droplets. How do they form?", "Precipitation comes in different forms. Which have you seen?", "Is water ever used up, or does it just move?"]),

  V("gravity", "science", "gravity", "Forces", "Gravity: Why Things Fall", "From a falling apple to the Moon's orbit.", [
    S(6.5, "orchard", "Scientists like Isaac Newton wondered why an apple always falls straight down.",
      [at("newton", 200, 316, "think", [[0.6, 4, "Why down, never up?"]])], [P("apple", 150, 150, 1.1, { to: [190, 296], t0: 2.5, t1: 4.2 })]),
    S(6.5, "orchard", "Gravity is a force that pulls objects toward each other. Earth pulls everything toward its center.",
      [at("newton", 240, 316, "point"), at("kid", 420, 322, "cheer")], [P("ball", 420, 190, 1.2, { to: [420, 300], t0: 0.5, t1: 2.5 }), P("arrow", 520, 140, 1, { a: { dx: 0, dy: 110, col: "#E9515D" } })]),
    S(7, "space", "Gravity also keeps the Moon orbiting Earth, and Earth orbiting the Sun.",
      [], [P("planet", 320, 190, 2, { a: { col: "#4F91C7" } }), P("orbit", 320, 190, 1.4, { a: { sp: 1.0, col: "#EDE2CF" } }), P("planet", 540, 70, 1, { a: { col: "#F8D977" } })]),
    S(7, "park", "The more mass an object has, the stronger its gravity. That's why the Moon's pull is weaker than Earth's.",
      [at("kid2", 150, 320, "cheer"), at("scientist", 520, 320, "point")], [P("trail", 160, 280, 1, { a: { w: 280, h: 120, dur: 4 } })]),
  ], ["Why do you think the apple fell downward?", "What force pulls the ball down? Where does it point?", "What keeps the Moon from drifting away?", "Would you weigh less on the Moon? Why?"]),

  V("cell", "science", "cell", "Cells", "Inside a Plant Cell", "A tour of the tiny parts that keep a plant alive.", [
    S(6.5, "lab", "Plants are built from tiny building blocks called cells. We need a microscope to see them.",
      [at("scientist", 200, 316, "point")], [P("microscope", 440, 250, 1.6), P("plant", 100, 250, 0.9)]),
    S(6.5, "space", "A cell wall gives the plant cell its shape and strength.",
      [], [P("cell", 320, 190, 2.2), P("label", 320, 330, 1.2, { a: { text: "CELL WALL", col: "#A9DCC0", size: 26 } })]),
    S(7, "space", "Chloroplasts are the green parts that capture light to make food.",
      [], [P("cell", 320, 190, 2.2), P("label", 320, 330, 1.2, { a: { text: "CHLOROPLASTS", col: "#8EE0A1", size: 26 } }), P("arrow", 170, 120, 1, { a: { dx: 60, dy: 20, col: "#F8D977" } })]),
    S(7, "space", "The vacuole stores water and nutrients, keeping the cell firm.",
      [], [P("cell", 320, 190, 2.2), P("label", 320, 330, 1.2, { a: { text: "VACUOLE", col: "#CFE8F8", size: 26 } }), P("arrow", 480, 130, 1, { a: { dx: -80, dy: 40, col: "#F8D977" } })]),
  ], ["Can we see cells without a microscope? Why not?", "The wall is stiff. How does that help a plant stand up?", "Where is the food factory in the cell?", "What happens when the vacuole is full of water?"]),

  /* ---------------------------------------------------------------- music */
  V("orchestra", "ela", "orchestra", "Music", "Meet the Orchestra", "Four families of instruments and the conductor who leads them.", [
    S(6.5, "concert", "An orchestra has four families of instruments. A conductor keeps everyone together.",
      [at("conductor", 320, 330, "conduct")], [P("baton", 350, 296, 1.2), P("notes", 320, 240, 1.2)]),
    S(6.5, "concert", "Strings, like the violin, make sound when a bow rubs across their strings.",
      [at("violinist", 260, 324, "play")], [P("violin", 290, 300, 1.3), P("label", 260, 190, 1.2, { a: { text: "STRINGS", col: "#fff", size: 26 } }), P("notes", 260, 260, 1.2)]),
    S(7, "concert", "Woodwinds, like the flute, and brass, like the trumpet, are played by blowing air.",
      [at("flautist", 200, 326, "play"), at("trumpeter", 440, 326, "play")], [P("flute", 230, 300, 1.2), P("trumpet", 470, 300, 1.2), P("label", 200, 190, 1, { a: { text: "WOODWINDS", col: "#fff", size: 22 } }), P("label", 440, 190, 1, { a: { text: "BRASS", col: "#fff", size: 22 } })]),
    S(7, "concert", "Percussion, like drums, is struck or shaken. Together they blend into one big sound.",
      [at("drummer", 330, 326, "cheer"), at("conductor", 160, 330, "conduct"), at("violinist", 500, 330, "play")], [P("drum", 380, 320, 1.3), P("label", 330, 190, 1.2, { a: { text: "PERCUSSION", col: "#fff", size: 24 } }), P("notes", 330, 260, 1.4)]),
  ], ["Which family do you think is the loudest?", "How do you make sound on a violin?", "What do woodwinds and brass have in common?", "Why does the orchestra need a conductor?"]),

  V("rhythm", "ela", "rhythm", "Music", "Feel the Beat", "Beat, rhythm and counting in four.", [
    S(6.5, "studio", "Rhythm is a pattern of long and short sounds. The beat is the steady pulse underneath.",
      [at("narrator", 200, 326, "point")], [P("metronome", 380, 326, 1.5)]),
    S(6.5, "studio", "Count one, two, three, four, and clap on every beat.",
      [at("kid", 180, 320, "cheer", [[0.5, 1.5, "1"], [2, 3, "2"], [3.5, 4.5, "3"], [5, 6, "4"]]), at("kid2", 320, 324, "cheer"), at("drummer", 480, 322, "play")], [P("drum", 500, 330, 1.2), P("notes", 330, 250, 1.2)]),
    S(7, "studio", "Notes tell us how long each sound lasts. A quarter note gets one beat.",
      [at("narrator", 150, 326, "talk")], [P("label", 330, 120, 1.4, { a: { text: "♩ ♩ ♩ ♩  = 4 beats", col: INK, size: 30 } }), P("label", 330, 180, 1.1, { a: { text: "♫  two eighth notes = 1 beat", col: INK, size: 22 } })]),
    S(7, "concert", "When everyone keeps the same beat, the music comes together.",
      [at("drummer", 220, 326, "play"), at("flautist", 340, 324, "play"), at("violinist", 460, 326, "play")], [P("drum", 250, 320, 1.1), P("notes", 340, 250, 1.4)]),
  ], ["What is the difference between beat and rhythm?", "Can you clap along with the counting?", "A quarter note gets one beat. How many are in this bar?", "What happens if one player loses the beat?"]),

  /* ---------------------------------------------------------------- art */
  V("colormix", "ela", "colormix", "Art", "Mixing Colors", "Primary colors make the rainbow.", [
    S(6.5, "studio", "Red, yellow and blue are the primary colors. You can't make them by mixing other colors.",
      [at("painter", 200, 326, "present")], [P("palette", 400, 290, 1.5, { a: { cols: ["#E9515D", "#F8D977", "#4F91C7"] } }), P("blob", 300, 330, 1.6, { a: { col: "#E9515D" } }), P("blob", 340, 330, 1.6, { a: { col: "#F8D977" } }), P("blob", 380, 330, 1.6, { a: { col: "#4F91C7" } })]),
    S(6.5, "studio", "Mix two primaries and you get a secondary color. Red and yellow make orange.",
      [at("painter", 160, 326, "point")], [P("blob", 260, 300, 2, { to: [340, 300], a: { col: "#E9515D" }, t0: 0.5, t1: 3 }), P("blob", 420, 300, 2, { to: [340, 300], a: { col: "#F8D977" }, t0: 0.5, t1: 3 }), P("blob", 340, 300, 2.4, { a: { col: "#F28F3E" }, t0: 3, t1: 7 })]),
    S(7, "studio", "Yellow and blue make green. Blue and red make purple.",
      [at("painter", 160, 326, "talk")], [P("blob", 250, 290, 1.6, { a: { col: "#F8D977" } }), P("blob", 300, 290, 1.6, { a: { col: "#4F91C7" } }), P("blob", 275, 330, 2, { a: { col: "#5FAE6A" }, t0: 2.5, t1: 7 }), P("blob", 410, 290, 1.6, { a: { col: "#4F91C7" } }), P("blob", 460, 290, 1.6, { a: { col: "#E9515D" } }), P("blob", 435, 330, 2, { a: { col: "#8173AE" }, t0: 4, t1: 7 })]),
    S(7, "studio", "Artists use color to show mood: warm colors feel cozy, cool colors feel calm.",
      [at("painter", 200, 326, "write")], [P("easel", 360, 330, 1.8, { a: { draw: (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => { const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, "#F28F3E"); g.addColorStop(1, "#E9515D"); c.fillStyle = g; c.fillRect(x + 2, y + 2, w - 4, h - 4); c.fillStyle = "#F8D977"; c.beginPath(); c.arc(x + w / 2, y + h * 0.55, 12, 0, 7); c.fill(); } } })]),
  ], ["Which colors are primary? Can you mix them from others?", "What did red plus yellow make?", "Try predicting: what will blue plus red make?", "Which colors feel warm here? Which feel cool?"]),

  V("perspective", "ela", "perspective", "Art", "Drawing in Perspective", "How artists make a flat page look deep.", [
    S(6.5, "road", "Perspective is a way to show depth, so a flat drawing looks three-dimensional.",
      [at("painter", 200, 320, "write")], [P("easel", 360, 332, 1.6)]),
    S(6.5, "road", "Lines that go away from you meet at a point on the horizon called the vanishing point.",
      [at("narrator", 120, 330, "point")], [P("arrow", 100, 330, 1, { a: { dx: 190, dy: -170, col: "#fff" } }), P("arrow", 560, 330, 1, { a: { dx: -190, dy: -170, col: "#fff" } }), P("label", 320, 130, 1.1, { a: { text: "vanishing point", col: INK, size: 22 } })]),
    S(7, "road", "Objects that are farther away look smaller. Nearby objects look bigger.",
      [at("kid", 120, 340, "cheer", undefined, { s: 1.2 }), at("kid2", 260, 290, "cheer", undefined, { s: 0.85 }), at("kid3", 360, 250, "cheer", undefined, { s: 0.6 })], []),
    S(7, "street", "Using perspective, the street seems to stretch far into the distance.",
      [at("painter", 160, 326, "present")], [P("easel", 400, 332, 1.6)]),
  ], ["What does perspective help an artist show?", "Where do the lines meet?", "Why does the child in the back look tiny?", "Where do you see perspective in real life?"]),

  /* ---------------------------------------------------------------- math + ELA */
  V("parabola", "math", "parabola", "Quadratics", "A Ball Toss", "The path of a tossed ball is a parabola.", [
    S(6.5, "park", "When you toss a ball, it flies along a curve called a parabola.",
      [at("kid", 120, 322, "cheer")], [P("trail", 150, 290, 1, { a: { w: 340, h: 130, dur: 4.5 } })]),
    S(6.5, "park", "The highest point is the vertex. The axis of symmetry splits the path into two matching halves.",
      [at("teacher", 90, 326, "point")], [P("trail", 150, 290, 1, { a: { w: 340, h: 130, dur: 3, vertex: true } })]),
    S(7, "park", "On a graph, an equation like y = -x² + 4 draws the very same curve.",
      [at("teacher", 100, 328, "talk")], [P("graph", 400, 260, 1.8, { a: { k: 0.6, dur: 4 } })]),
    S(7, "park", "Change the numbers and the curve changes: wider, narrower, higher or lower.",
      [at("kid", 110, 322, "cheer"), at("kid2", 540, 326, "cheer")], [P("trail", 130, 290, 1, { a: { w: 380, h: 70, dur: 3 } }), P("trail", 130, 290, 1, { a: { w: 280, h: 160, dur: 4 } })]),
  ], ["Where does the ball slow down and turn around?", "Find the vertex and the axis of symmetry.", "What do you notice about both sides of the curve?", "What would a higher throw do to the parabola?"]),

  V("fractions", "math", "fractions", "Fractions", "Sharing Pizza", "Equal parts make fractions work.", [
    S(6.5, "pizzeria", "A fraction names equal parts of a whole. This pizza has 8 equal slices.",
      [at("kid", 180, 330, "point"), at("kid2", 470, 330, "cheer")], [P("pizza", 330, 270, 1.4, { a: { n: 8, ate: 0 } })]),
    S(6.5, "pizzeria", "One slice is one eighth of the pizza.",
      [at("kid", 180, 330, "cheer"), at("kid2", 470, 330, "talk", [[0.5, 5, "One eighth for me!"]])], [P("pizza", 330, 270, 1.4, { a: { n: 8, ate: 1 } }), P("label", 330, 340, 1.2, { a: { text: "1/8", col: INK, size: 40 } })]),
    S(7, "pizzeria", "Four slices is four eighths, which equals one half.",
      [at("kid", 180, 330, "cheer"), at("kid2", 470, 330, "cheer")], [P("pizza", 330, 270, 1.4, { a: { n: 8, ate: 4 } }), P("label", 330, 340, 1.2, { a: { text: "4/8 = 1/2", col: INK, size: 34 } })]),
    S(7, "pizzeria", "Fractions only work when the parts are equal, so cut carefully.",
      [at("chef", 180, 330, "point"), at("kid3", 470, 332, "think")], [P("pizza", 330, 270, 1.4, { a: { n: 6, ate: 2 } }), P("label", 330, 340, 1.1, { a: { text: "2/6 = 1/3", col: INK, size: 34 } })]),
  ], ["How many equal slices does the pizza have?", "What fraction is one slice?", "Why does 4/8 equal 1/2?", "What goes wrong if the slices aren't equal?"]),

  V("theme", "ela", "theme", "Stories", "The Tortoise and the Hare", "Finding a story's theme with plot, change and evidence.", [
    S(6.5, "meadow", "First: what happens? A speedy hare challenges a slow tortoise to a race.",
      [at("narrator", 90, 336, "point")], [P("hare", 190, 312, 1.4), P("tortoise", 250, 314, 1.4)]),
    S(6.5, "meadow", "The hare races far ahead, then lies down for a nap.",
      [], [P("hare", 200, 312, 1.4, { to: [440, 306], t0: 0.3, t1: 3 }), P("tortoise", 250, 314, 1.4, { to: [330, 314], t0: 0.3, t1: 6 }), P("label", 440, 250, 1, { a: { text: "zzz...", col: "#fff", size: 26 } })]),
    S(7, "meadow", "Next: what changes? The tortoise keeps going, and wins while the hare is still asleep.",
      [at("kid", 520, 330, "cheer")], [P("hare", 440, 306, 1.4), P("tortoise", 340, 314, 1.4, { to: [500, 314], t0: 0.3, t1: 5 })]),
    S(7, "meadow", "Last: evidence. The hare quit trying but the tortoise never stopped, so the theme is: slow and steady wins.",
      [at("narrator", 100, 336, "talk")], [P("label", 330, 120, 1.2, { a: { text: "THEME: slow and steady wins", col: INK, size: 30 } }), P("tortoise", 480, 314, 1.4)]),
  ], ["What is the problem at the start of the story?", "What does the hare do wrong?", "How does the ending differ from the beginning?", "Which detail proves the theme?"]),

  V("figurative", "ela", "figurative", "Figurative language", "Simile and Metaphor", "Creative comparisons in two flavors.", [
    S(6.5, "classroom", "Figurative language compares things in creative ways to paint a picture with words.",
      [at("narrator", 200, 326, "present")], [P("label", 330, 90, 1.3, { a: { text: "words that paint pictures", col: INK, size: 26 } })]),
    S(6.5, "classroom", "A simile compares using like or as. For example: busy as a bee.",
      [at("kid", 200, 326, "talk", [[0.5, 5, "I'm as busy as a bee!"]])], [P("bee", 440, 200, 1.6), P("bee", 500, 230, 1.2)]),
    S(7, "classroom", "A metaphor says one thing is another. For example: time is a thief.",
      [at("kid2", 220, 326, "talk", [[0.5, 5, "Time is a thief!"]]), at("kid3", 420, 332, "think")], [P("bubble", 330, 130, 1.3, { a: { text: "Time IS a thief", col: "#8173AE" } })]),
    S(7, "classroom", "Remember: like or as means simile. is or are means metaphor.",
      [at("narrator", 150, 326, "point")], [P("label", 330, 110, 1.2, { a: { text: "like / as  =  simile", col: "#E07A66", size: 30 } }), P("label", 330, 170, 1.2, { a: { text: "is / are  =  metaphor", col: "#8173AE", size: 30 } })]),
  ], ["What is being compared in 'busy as a bee'?", "Which word tells you it is a simile?", "A thief steals. What does that say about time?", "Can you make up your own simile?"]),
];
export const VIDEO_BY_ID: Record<string, VideoDef> = Object.fromEntries(VIDEOS.map((v) => [v.id, v]));
