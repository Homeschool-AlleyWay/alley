/** Teacher personalities: how each one moves, gestures, sounds and reacts (smiles, frowns, upset, frustration, joy). */
export type Emotion = "neutral" | "smile" | "joy" | "frown" | "upset" | "frustrated" | "surprised" | "thinking" | "stern";
export type Reaction = "welcome" | "correct" | "wrong" | "wrongAgain" | "noHands" | "thanks" | "think" | "wrap" | "ask";
export interface React { e: Emotion; g?: string; ms: number; lines: string[] }
export interface Persona { base: Emotion; walk: number; gestures: string[]; fidget: [number, number]; voice: { pitch: number; rate: number }; r: Record<Reaction, React> }
const R = (e: Emotion, g: string | undefined, lines: string[], ms = 2800): React => ({ e, g, ms, lines });
const mk = (p: Omit<Persona, "r"> & { r: Partial<Record<Reaction, React>> }): Persona => ({ ...p, r: { welcome: R("smile", "wave", ["Welcome!"], 2400), correct: R("joy", "clap", ["Yes!"]), wrong: R("thinking", "chin", ["Hmm, not quite."]), wrongAgain: R("frustrated", "headhands", ["Okay, let's slow down."], 3400), noHands: R("stern", "crossed", ["I see a lot of quiet faces."]), thanks: R("smile", "shrug", [""]), think: R("thinking", "chin", [""], 2400), wrap: R("joy", "clap", ["Nice work today."], 3000), ask: R("smile", "explain", [""], 2200), ...p.r } });
export const PERSONAS: Record<string, Persona> = {
  nerdy: mk({ base: "smile", walk: 1.12, gestures: ["explain", "finger", "chin"], fidget: [2.4, 4.2], voice: { pitch: 1.08, rate: 1.04 }, r: {
    welcome: R("smile", "wave", ["Welcome back, mathematicians!"], 2600), correct: R("joy", "clap", ["Excellent!", "Precisely!"]), wrong: R("thinking", "chin", ["Hmm, let's recheck that."]),
    wrongAgain: R("frustrated", "headhands", ["Okay, okay. Let's slow down and do it together."], 3600), noHands: R("stern", "crossed", ["I see a lot of quiet faces."]) } }),
  dreamy: mk({ base: "smile", walk: 0.82, gestures: ["wave", "explain", "chin"], fidget: [3.2, 5.2], voice: { pitch: 0.96, rate: 0.88 }, r: {
    welcome: R("smile", "wave", ["Hello, my friends."], 2600), correct: R("joy", "wave", ["What a beautiful answer."]), wrong: R("frown", "shrug", ["Ah, that is a lovely try."]),
    wrongAgain: R("upset", "facepalm", ["Oh... let's breathe and look at it again."], 3600), noHands: R("surprised", "shrug", ["No hands? The words are waiting for you."]) } }),
  curious: mk({ base: "smile", walk: 1.22, gestures: ["finger", "explain", "shrug", "wave"], fidget: [1.8, 3.4], voice: { pitch: 1.1, rate: 1.12 }, r: {
    welcome: R("surprised", "wave", ["Oh good, you're here! Today is going to be fun."], 2600), correct: R("joy", "cheer", ["Whoa, yes!", "That's it exactly!"]), wrong: R("thinking", "chin", ["Interesting! Let's test that."]),
    wrongAgain: R("frustrated", "headhands", ["Argh, science is tricky, but we will get it!"], 3600), noHands: R("surprised", "shrug", ["Nobody? Come on, take a guess!"]) } }),
  funny: mk({ base: "smile", walk: 1.06, gestures: ["shrug", "explain", "wave", "finger"], fidget: [1.8, 3.4], voice: { pitch: 0.92, rate: 1.0 }, r: {
    welcome: R("joy", "wave", ["Ladies and gentlemen, history class!"], 2600), correct: R("joy", "cheer", ["Boom! Nailed it!", "Look at you!"]), wrong: R("smile", "shrug", ["Ooh, so close!"]),
    wrongAgain: R("frustrated", "headhands", ["Come on, history is on your side!"], 3600), noHands: R("stern", "crossed", ["Hello? Is this thing on?"]) } }),
  kind: mk({ base: "smile", walk: 0.96, gestures: ["explain", "wave"], fidget: [3, 5], voice: { pitch: 0.86, rate: 0.95 }, r: {
    correct: R("joy", "clap", ["That's wonderful."]), wrong: R("frown", "shrug", ["That's okay, try again."]), wrongAgain: R("upset", "facepalm", ["It's alright. We'll get there together."], 3600) } }),
  cheerful: mk({ base: "joy", walk: 1.1, gestures: ["wave", "explain", "shrug"], fidget: [2, 3.6], voice: { pitch: 1.16, rate: 1.08 }, r: {
    welcome: R("joy", "wave", ["Good morning, sunshines!"], 2600), correct: R("joy", "cheer", ["Fantastic!"]), wrong: R("smile", "shrug", ["Almost!"]), wrongAgain: R("frustrated", "headhands", ["Oh my goodness, let's try again."], 3600) } }),
};
export const personaOf = (personality?: string): Persona => PERSONAS[personality ?? ""] ?? PERSONAS.kind;
