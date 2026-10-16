/** The curated starting set: exactly FIELD_REPORT_MAX field reports. 16 are for everyone, 4 are for high school (careers, college prep, civics, money).
 *  Topics are a mix of science, nature, community, history, sports, arts, safety and tech. Every beat names a setting / subject / action for the scene generator. */
import type { ReportBeat } from "./scenegen";

export interface SeedReport { id: string; title: string; topic: string; audience: "all" | "hs"; beats: ReportBeat[] }
const b = (text: string, setting: string, subject: string, action: string): ReportBeat => ({ text, setting, subject, action });

export const SEED_REPORTS: SeedReport[] = [
  { id: "fr-seed-garden", title: "From seed to sunflower: the courtyard garden grows", topic: "science", audience: "all", beats: [
    b("Students plant sunflower seeds in the courtyard beds on Monday morning.", "garden", "kids", "work"),
    b("Each day the class waters the beds and measures how tall the sprouts have grown.", "garden", "flower", "grow"),
    b("Bees stop by to visit the first blooms, and the class counts every one.", "garden", "bee", "float")] },
  { id: "fr-seed-robots", title: "Robotics team teaches a robot to sort blocks", topic: "tech", audience: "all", beats: [
    b("In the workshop, eleven students tune a robot that must sort blocks in ninety seconds.", "lab", "robot", "work"),
    b("The biggest fix was the gripper, rebuilt three times since Monday.", "lab", "kids", "work"),
    b("The regional contest starts Saturday at nine, and families are welcome to cheer.", "stadium", "trophy", "jump")] },
  { id: "fr-seed-monarch", title: "Monarch butterflies visit the meadow", topic: "nature", audience: "all", beats: [
    b("Orange and black monarch butterflies drift across the school meadow this week.", "meadow", "butterfly", "fly"),
    b("They stop to sip nectar from the milkweed and flowers the Eco Club planted.", "garden", "flower", "bob"),
    b("Soon they will fly thousands of miles south for the winter.", "meadow", "butterfly", "fly")] },
  { id: "fr-seed-creek", title: "Neighbors and students tidy up the creek", topic: "community", audience: "all", beats: [
    b("On Saturday, families and students meet at the creek with gloves and bags.", "river", "kids", "walk"),
    b("Together they collect bottles and wrappers so the water stays clean for the fish and ducks.", "river", "bird", "float"),
    b("By noon the creek sparkles, and everyone shares a picnic lunch.", "meadow", "adult", "wave")] },
  { id: "fr-seed-museum", title: "Old Mill Day: a trip back in time", topic: "history", audience: "all", beats: [
    b("Third graders visit the town museum to learn how the old mill ground grain long ago.", "museum", "kids", "walk"),
    b("A guide shows tools, maps and photographs from one hundred years ago.", "museum", "adult", "wave"),
    b("The class writes a story about a day in the life of a mill worker.", "school", "book", "work")] },
  { id: "fr-seed-relay", title: "Field day: the big relay race", topic: "sports", audience: "all", beats: [
    b("Teams in red, blue and yellow line up on the field for the big relay.", "stadium", "kids", "walk"),
    b("Baton passes are quick and the crowd cheers every runner across the line.", "stadium", "kids", "jump"),
    b("Everyone gets a ribbon, and the yellow team takes the golden trophy home.", "stadium", "trophy", "jump")] },
  { id: "fr-seed-mural", title: "A giant mural brightens the hallway", topic: "arts", audience: "all", beats: [
    b("The art club sketches a giant mural of the town on the long hallway wall.", "school", "easel", "work"),
    b("Every grade adds a section, from tiny handprints to tall paper hills.", "school", "kids", "work"),
    b("On Friday the school gathers to see the finished picture.", "school", "adult", "wave")] },
  { id: "fr-seed-helmets", title: "Bike helmet check day", topic: "safety", audience: "all", beats: [
    b("Volunteers set up a helmet check outside the front doors before school.", "city", "bike", "spin"),
    b("They show how a helmet should sit level and snug with the strap buckled.", "city", "adult", "wave"),
    b("Students ride safely to class, and every rider gets a shiny reflector.", "city", "bike", "spin")] },
  { id: "fr-seed-stars", title: "Stargazing night on the school field", topic: "science", audience: "all", beats: [
    b("After dark, families bring blankets to the field for a night of stargazing.", "space", "kids", "wave"),
    b("A big telescope shows the rings of Saturn and the craters of the moon.", "space", "telescope", "bob"),
    b("Students learn how a rocket carries a satellite high above the clouds.", "space", "rocket", "fly")] },
  { id: "fr-seed-whales", title: "Whale watching from the coast", topic: "nature", audience: "all", beats: [
    b("A class takes a boat trip along the coast to look for whales.", "ocean", "boat", "float"),
    b("A humpback whale rises from the waves and everyone gasps with delight.", "ocean", "whale", "float"),
    b("Back at school, students draw what they saw and learn how to protect the ocean.", "school", "easel", "work")] },
  { id: "fr-seed-fooddrive", title: "Food drive fills the community shelves", topic: "community", audience: "all", beats: [
    b("Students carry boxes of canned food down Main Street to the community pantry.", "city", "kids", "walk"),
    b("Neighbors add bags of fruit, rice and pasta all week long.", "city", "adult", "wave"),
    b("By Friday the shelves are full, and many families will share a warm meal.", "home", "kids", "jump")] },
  { id: "fr-seed-dino", title: "Dinosaur bones come to the museum", topic: "history", audience: "all", beats: [
    b("A giant dinosaur skeleton arrives at the museum in many careful pieces.", "museum", "dino", "bob"),
    b("Scientists piece the bones together like a very big puzzle.", "museum", "scientist", "work"),
    b("Visitors learn that this plant eater lived millions of years ago.", "museum", "kids", "wave")] },
  { id: "fr-seed-soccer", title: "Soccer team scores a big win", topic: "sports", audience: "all", beats: [
    b("The Tigers and the Hawks meet on a sunny Saturday for the final match.", "stadium", "ball", "spin"),
    b("A quick pass and a great kick put the Tigers ahead in the last minute.", "stadium", "kids", "jump"),
    b("Both teams shake hands, and the Tigers lift the cup.", "stadium", "trophy", "jump")] },
  { id: "fr-seed-band", title: "Spring concert: the band tunes up", topic: "arts", audience: "all", beats: [
    b("Backstage, the band tunes drums, guitars and trumpets before the curtain rises.", "stage", "music", "work"),
    b("The choir sings a song about rain, rivers and growing things.", "stage", "kids", "jump"),
    b("The audience claps along, and the show ends with a big bow.", "stage", "adult", "wave")] },
  { id: "fr-seed-crosswalk", title: "Crosswalk safety: stop, look and listen", topic: "safety", audience: "all", beats: [
    b("A crossing guard greets walkers at the busy corner each morning.", "city", "adult", "wave"),
    b("Kids learn the rule: stop at the curb, look both ways, and cross when it is safe.", "city", "trafficlight", "bob"),
    b("Everyone crosses together, one step at a time, and arrives at school safe and on time.", "city", "kids", "walk")] },
  { id: "fr-seed-solar", title: "Solar panels power the school", topic: "tech", audience: "all", beats: [
    b("New solar panels shine on the school roof and turn sunlight into electricity.", "school", "lightbulb", "bob"),
    b("A screen in the hallway shows how much clean energy the roof makes each day.", "school", "laptop", "work"),
    b("Students lead a challenge to switch off lights and save even more.", "school", "kids", "wave")] },
  { id: "fr-seed-careers", title: "Career day: from lab coats to code", topic: "careers", audience: "hs", beats: [
    b("High school students meet nurses, engineers and designers at Career Day.", "office", "adult", "wave"),
    b("Visitors explain the training each job needs, from certificates to degrees.", "office", "gradcap", "bob"),
    b("Students sign up for job shadowing and summer internships.", "office", "laptop", "work")] },
  { id: "fr-seed-college", title: "College application season: a how-to", topic: "college prep", audience: "hs", beats: [
    b("Seniors gather in the library for a workshop on college applications.", "office", "kids", "work"),
    b("A counselor shares tips for essays, deadlines and asking for recommendation letters.", "office", "adult", "wave"),
    b("Students learn how scholarships and financial aid forms work.", "office", "gradcap", "bob")] },
  { id: "fr-seed-debate", title: "Student council debate: a longer lunch period?", topic: "civics", audience: "hs", beats: [
    b("Two student council teams debate whether lunch should be longer.", "civic", "adult", "wave"),
    b("Each side shares facts, listens to the other, and answers questions politely.", "civic", "kids", "wave"),
    b("The whole school votes, and everyone agrees to respect the result.", "civic", "adult", "bob")] },
  { id: "fr-seed-money", title: "Money 101: budgeting your first paycheck", topic: "financial literacy", audience: "hs", beats: [
    b("A local banker visits class to explain how a first paycheck is split.", "office", "coins", "bob"),
    b("Students practice a simple budget for needs, wants and savings.", "office", "laptop", "work"),
    b("They learn why a small amount saved each month grows over time.", "office", "coins", "grow")] },
];
