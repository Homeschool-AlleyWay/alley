import type { Direction } from "./assets/assetManifest";
export type Subject = "math" | "ela" | "science" | "history";
export type ViewMode = "seat" | "iso";
export type FocusTarget = "teacher" | "board" | "screen" | "room";
export interface Placement { key: string; x: number; y: number; depth: number; ox: number; oy: number; screenContent?: string; visible?: boolean }
export interface SeatDef { id: string; tier: number; gx: number; gy: number; elev: number; facing: Direction; sitX: number; sitY: number; depth: number; approach: { gx: number; gy: number } }
export interface BlockRect { gx: number; gy: number; w: number; d: number; kind: string }
export interface AuditoriumLayout {
  grid: { w: number; h: number }; stage: { x: [number, number]; y: [number, number]; elev: number };
  tiers: { x0: number; n: number; riser: number }; aisle: [number, number]; seats: SeatDef[]; blocked: BlockRect[];
  door: { gx: number; gy: number }; subjects: Subject[]; screenKinds: string[];
  stations: Record<string, { gx: number; gy: number }>; teacher: { gx: number; gy: number; elev: number; facing: Direction };
  playerSpawn: { gx: number; gy: number; elev: number }; placements: Placement[]; decor: Record<Subject, Placement[]>;
}
export const TEACHER_FOR: Record<Subject, string> = { math: "teacher_keisha", ela: "teacher_james", science: "teacher_jamal", history: "teacher_marcus" };
export const SCREEN_FOR: Record<Subject, string> = { math: "math_coordinate", ela: "ela_annotation", science: "sci_cell", history: "hist_map" };
export const STUDENT_IDS = Array.from({ length: 10 }, (_, i) => `student_hs_${String(i + 1).padStart(2, "0")}`);
export interface CurriculumVisualState { subject: string; domain: string; grade: number | "K" }
export interface HallDoor { room: "A" | "B"; x0: number; x1: number; trigger: number; approach: { gx: number; gy: number }; tiles: { x: number; y: number }[] }
export interface HallLayout {
  grid: { w: number; h: number }; nav: string[]; blocked: BlockRect[]; doors: HallDoor[]; subjects: Subject[];
  entrance: { gx: number; gy: number }; playerSpawn: { gx: number; gy: number };
  periodSubjects: Record<"early" | "late", Record<"A" | "B", Subject>>;
  placements: (Placement & { room?: "A" | "B"; subject?: Subject; kind?: string })[];
}
