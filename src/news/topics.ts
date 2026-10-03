/** What is this story about? Keyword rules over headline + snippet; drives which illustrated scene the generated video uses. */
export type Topic = "weather" | "sports" | "politics" | "economy" | "health" | "science" | "space" | "tech" | "environment" | "education" | "arts" | "food" | "transport" | "emergency" | "community" | "world" | "general";
export const TOPIC_LABEL: Record<Topic, string> = { weather: "Weather", sports: "Sports", politics: "Government", economy: "Business", health: "Health", science: "Science", space: "Space", tech: "Technology", environment: "Environment", education: "Education", arts: "Arts", food: "Food", transport: "Transport", emergency: "Emergency", community: "Community", world: "World", general: "News" };
const RULES: [Topic, RegExp][] = [
  ["space", /\b(nasa|astronaut|rocket|spacecraft|space station|moon|lunar|mars|satellite|orbit|telescope|comet|asteroid|launch(?:es|ed)? (?:a )?(?:rocket|mission))\b/i],
  ["weather", /\b(weather|forecast|rain|storm|snow|heat ?wave|hurricane|tornado|flood(?:ing)?|wind|temperatures?|drought|cold front|thunder|frost|fog|blizzard|monsoon|typhoon)\b/i],
  ["emergency", /\b(emergency|evacuat\w+|wildfire|earthquake|rescue|firefighters?|disaster|outage|crash|collapse|alert|shelter)\b/i],
  ["sports", /\b(game|season|team|coach|league|championship|finals?|tournament|score[sd]?|wins?|beat|match|olympic\w*|world cup|nba|nfl|mlb|nhl|fifa|soccer|football|basketball|baseball|tennis|golf|marathon|runner|athlete|medal|race)\b/i],
  ["health", /\b(health|hospital|doctor|medical|disease|virus|vaccine|flu|cancer|patients?|clinic|medicine|mental|nutrition|study finds? .*(?:sleep|diet)|sleep|wellness|surgery)\b/i],
  ["tech", /\b(tech\w*|ai|artificial intelligence|software|app|robot\w*|computer|cyber|internet|chip|smartphone|laptop|startup|data center|algorithm|battery|digital)\b/i],
  ["science", /\b(scientists?|researchers?|study|discover\w*|experiment|fossil|species|dinosaur|physics|chemistry|biology|lab|genetic|ocean|archaeolog\w+|climate science)\b/i],
  ["environment", /\b(climate|environment\w*|conservation|wildlife|forest|rainforest|solar|wind farm|renewable|recycling|pollution|emissions|protected|reserve|coral|park|planting|garden|trees?|energy)\b/i],
  ["economy", /\b(economy|economic|jobs?|unemployment|inflation|prices?|stocks?|stock market|markets|business|company|trade|tariffs?|bank|interest rates?|sales|retail|workers|wages?|billion|million|earnings|budget|tax\w*)\b/i],
  ["politics", /\b(congress|senate|house|president|governor|mayor|election|vote[sd]?|voters?|law|bill|court|supreme|policy|lawmakers?|government|minister|parliament|campaign|council|treaty|summit|diplomat\w*|leaders?)\b/i],
  ["food", /\b(food|farm\w*|farmers market|restaurant|chef|harvest|crops?|recipe|bakery|menu|grocery|lunch|meals?)\b/i],
  ["arts", /\b(music|concert|film|movie|theater|theatre|museum|artist|festival|album|band|choir|dance|exhibit\w*|author|award|opera|orchestra|performance|musical)\b/i],
  ["education", /\b(school|students?|teachers?|college|universit\w+|classroom|education|learning|graduat\w+|scholarship|library|curriculum|campus|kids)\b/i],
  ["transport", /\b(train|rail\w*|airport|airline|flight|bus|bridge|road|highway|traffic|transit|ship|port|subway|commute|bike|electric vehicles?|cars?)\b/i],
  ["community", /\b(community|neighbou?rhood|volunteer\w*|city|county|town|local|residents|library|park|center|centre|opens?|celebrat\w+|parade)\b/i],
];
export function classify(text: string, tier?: string): Topic {
  for (const [t, rx] of RULES) if (rx.test(text)) return t;
  return tier === "world" ? "world" : tier === "local" ? "community" : "general";
}
/** numbers actually present in the text ("62%", "$3 billion", "5-2", "1,200 students") for the data shot; never invented */
export function figures(text: string): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [], seen = new Set<string>();
  const push = (v: string, l: string) => { if (!seen.has(v) && out.length < 3) { seen.add(v); out.push({ value: v, label: l.trim().split(/\s+/).slice(0, 3).join(" ") }); } };
  for (const m of text.matchAll(/(\$?\d[\d,.]*\s?(?:%|percent|billion|million|thousand|degrees|miles|years?|students?|people|points?|goals?)?)(?:\s+(?:of\s+)?([A-Za-z][A-Za-z-]*(?:\s+[A-Za-z][A-Za-z-]*)?))?/g)) { const v = m[1].trim(); if (/\d/.test(v) && v.length >= 2 && !/^(19|20)\d\d$/.test(v)) push(v.replace(/\s?percent/, "%"), m[2] || ""); }
  for (const m of text.matchAll(/\b(\d{1,3})\s?[-–]\s?(\d{1,3})\b/g)) push(`${m[1]}-${m[2]}`, "score");
  return out;
}
