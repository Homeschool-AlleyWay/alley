import type { CurriculumVisualState } from "../types";
export interface AuditoriumVisuals { screen: "idle" | "math_coordinate" | "math_fraction" | "ela_annotation"; demoProps: string[]; board: string }
/** Lesson changes swap screen content / props - they never rebuild the room. */
export function resolveAuditoriumVisuals(s: CurriculumVisualState): AuditoriumVisuals {
  const d = s.domain.toLowerCase();
  if (s.subject === "math") {
    if (d.includes("fraction")) return { screen: "math_fraction", demoProps: ["math_fraction_circle", "math_fraction_bar"], board: "board_math" };
    if (d.includes("function") || d.includes("equation") || d.includes("coordinate") || d.includes("expression") || (typeof s.grade === "number" && s.grade >= 6))
      return { screen: "math_coordinate", demoProps: ["math_algebra_tiles", "math_graphing_calculator"], board: "board_math" };
    return { screen: "math_fraction", demoProps: ["math_numberline", "math_base10_tens"], board: "board_math" };
  }
  if (s.subject === "ela") return { screen: "ela_annotation", demoProps: ["ela_book_display", "ela_vocabulary_cards"], board: "board_ela" };
  return { screen: "idle", demoProps: [], board: "board_white_01" };
}
