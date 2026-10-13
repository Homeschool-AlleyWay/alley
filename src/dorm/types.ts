/** UNIFY Academy: My Dorm. Shared contracts between the render style, the 3D character, the room/furniture editor and the page.
 *  Everything here is type-only so each module can be built and tested on its own. */
import type * as THREE from "three";
import type { AvatarSpec } from "../hall3d/avatar";

/* ---------------------------------------------------------------- render styles */
export type StyleId = "papercut" | "pixar";
export type MatKind = "skin" | "hair" | "cloth" | "knit" | "denim" | "leather" | "wood" | "metal" | "glass" | "plastic" | "paper" | "fabric" | "eye" | "emissive" | "wall" | "floor" | "rug" | "screen";
export interface MatOpts {
  rough?: number; metal?: number; sheen?: number; clearcoat?: number; emissive?: string | number; emissiveIntensity?: number;
  map?: THREE.Texture | null; normalMap?: THREE.Texture | null; transparent?: boolean; opacity?: number; side?: THREE.Side;
  /** procedural surface hint: "knit" | "denim" | "stripes" | "dots" | "plaid" | "hearts" | "stars" | "wood" | "tile" | "carpet" | "plaster" */
  texture?: string; textureColor2?: string | number; repeat?: [number, number];
}
/** time of day and colour mood (same palette ids as the Newsroom app: sun, sky, mint, berry, sunset, ocean, forest, night, candy, paper) */
export interface Mood { hour: number; palette?: string; accent?: string }
export interface StyleRig {
  /** draw one frame with this style's pipeline (post-processing for "pixar") */
  render(dt: number): void;
  resize(width: number, height: number, pixelRatio?: number): void;
  setMood(m: Mood): void;
  /** quality knob 0 (phone, no post-processing) .. 2 (everything on) */
  setQuality(q: 0 | 1 | 2): void;
  dispose(): void;
}
export interface Style {
  id: StyleId; label: string;
  /** one place that decides how every surface looks in this style */
  mat(kind: MatKind, color: string | number, o?: MatOpts): THREE.Material;
  /** lights, shadows, sky/fog, tone mapping and (pixar) post-processing for the given renderer/scene/camera */
  setup(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): StyleRig;
}

/* ---------------------------------------------------------------- 3D character (built from the SAME AvatarSpec the 2D rig uses) */
export type Anim = "idle" | "wave" | "sit" | "talk" | "think" | "cheer" | "walk" | "type" | "raise";
export interface Char3D {
  root: THREE.Group;
  /** rebuild/recolour from a spec; cheap enough to call on every edit (debounce in the UI) */
  setSpec(spec: AvatarSpec): void;
  play(a: Anim): void;
  lookAt(target: THREE.Vector3 | null): void;
  /** mouth flaps while true (chat) */
  speak(on: boolean): void;
  update(dt: number): void;
  /** approx. height in world units (metres) so rooms can place it */
  readonly height: number;
  /** the part of the avatar to focus the camera on when editing: "head" | "torso" | "legs" | "feet" | "bag" | "hat" */
  anchor(part: "head" | "torso" | "legs" | "feet" | "bag" | "hat"): THREE.Vector3;
  dispose(): void;
}

/* ---------------------------------------------------------------- dorm room, furniture, editing */
export type FurnitureCat = "bed" | "desk" | "seat" | "storage" | "tech" | "decor" | "wall" | "floor" | "light" | "plant";
export interface FurnitureDef {
  id: string; name: string; cat: FurnitureCat;
  /** footprint in metres [width(x), depth(z), height(y)] before rotation */
  size: [number, number, number];
  /** hangs on a wall (y is free, z snaps to the wall) */
  wall?: boolean;
  /** lies flat on the floor and can be walked over (rugs) */
  flat?: boolean;
  /** can other things sit on top (desks, shelves)? top surface height in metres */
  surface?: number;
  /** palette offered in the editor (first = default) */
  colors: string[];
  /** extra named variants (e.g. 3 poster designs) */
  variants?: number;
  /** fixed furniture the room always has and the student can only move/recolour, never delete (the wardrobe, desk, bed...) */
  core?: boolean;
  build(style: Style, color: string, variant: number): THREE.Object3D;
}
export interface Placed { uid: string; def: string; x: number; z: number; y?: number; rot: number; color: string; variant?: number }
export interface DormTheme { wall: string; floor: string; trim: string; rug: string; window: "day" | "night" | "auto"; ceiling?: string; lights?: string }
export interface DormLayout { v: 1; theme: DormTheme; items: Placed[]; photos?: string[]; note?: string }

/** things the student can tap */
export type HotspotId = "wardrobe" | "computer" | "folder" | "binder" | "collage" | "mirror" | "backpack" | "bed" | "window" | "desk";
export interface Hotspot {
  id: HotspotId; label: string; icon: string;
  /** world-space camera pose that frames it */
  focus: { pos: THREE.Vector3; target: THREE.Vector3 };
  /** meshes that react to tap/hover */
  object: THREE.Object3D;
}
export interface DormApi {
  group: THREE.Group;
  layout: DormLayout;
  hotspots: Hotspot[];
  /** where the student's avatar stands/sits by default, and where a visitor stands */
  spots: { owner: THREE.Vector3; ownerRot: number; guest: THREE.Vector3; guestRot: number; desk: THREE.Vector3; deskRot: number };
  setLayout(l: DormLayout): void;
  setMood(m: Mood): void;
  /** edit mode: tap furniture to select, then move/rotate/recolour/delete, or add from the catalogue */
  setEditing(on: boolean): void;
  readonly editing: boolean;
  select(uid: string | null): void;
  onChange(cb: (l: DormLayout) => void): void;
  onSelect(cb: (p: Placed | null, def: FurnitureDef | null) => void): void;
  /** catalogue for the "add furniture" drawer */
  catalog(): FurnitureDef[];
  add(defId: string, color?: string): Placed | null;
  moveSelected(dx: number, dz: number): void;
  rotateSelected(quarterTurns: number): void;
  recolorSelected(color: string): void;
  deleteSelected(): void;
  /** the picture frames on the walls and the collage: show these data-URLs/blob URLs */
  setPhotos(urls: string[]): void;
  /** raycast helper for the page: returns a hotspot or a placed item under a pointer */
  pick(ndcX: number, ndcY: number, camera: THREE.Camera): { hotspot?: Hotspot; placed?: Placed } | null;
  update(dt: number): void;
  dispose(): void;
}

/* ---------------------------------------------------------------- persistence (also synced by the family account) */
export const DORM_KEY = "unify.dorm.v1";
export const DORM_PHOTOS_DB = "unify-dorm-photos";   // IndexedDB: photos never leave the device
