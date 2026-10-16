import type * as THREE from "three";
/** Character heights per age (design units, ~metres): kids clearly smaller than adults. */
export const AGE_H = { k2: 1.08, g35: 1.25, g68: 1.45, hs: 1.68, adult: 1.84 } as const;
/** ONE scale for every interior (hallway, classroom, auditorium, field trip, dorm). The scene root is scaled by this, so footprint, ceilings, doors, furniture, stage, seat rows and every
 *  positioned constant grow together; scene code keeps working in its own design units. Cameras live outside the scene and multiply their positions by it.
 *  Characters live INSIDE that scale (CHAR_K = 1): they grow with the room, so people keep true proportions to doors, desks, lecterns and stages (the props below are authored in
 *  the same design units as AGE_H, i.e. about metres, and the scene scale then enlarges both together). */
export const INTERIOR_SCALE = 1.3;
export const CHAR_K = 1;
/** prop heights in design units (same units as AGE_H); scenes build from these so tests can check proportions */
export const PROP_H = { lectern: 1.1, audStage: 0.68, deskTop: 0.74, seat: 0.44, classDoor: 2.3, hallDoor: 2.3, locker: 1.9, classTeacherDesk: 0.82 } as const;
/** make a scene render at interior scale; returns the scale so callers can fix up shadow frustums etc. */
export const scaleScene = (scene: THREE.Object3D) => { scene.scale.setScalar(INTERIOR_SCALE); return INTERIOR_SCALE; };
/** fit a 3D character root to the scene (CHAR_K = 1: people scale with the room) */
export const fitChar = <T extends { root: THREE.Object3D }>(c: T): T => { c.root.scale.setScalar(CHAR_K); return c; };
/** point/spot reach and directional shadow frustums are measured in world units, so grow them with the scene */
export const fitLights = (scene: THREE.Object3D) => scene.traverse((o: any) => {
  if (o.isPointLight || o.isSpotLight) { o.distance *= INTERIOR_SCALE; if (o.decay) o.intensity *= Math.pow(INTERIOR_SCALE, o.decay); }
  if (o.isLight && o.shadow?.camera?.isOrthographicCamera) { const c = o.shadow.camera; c.left *= INTERIOR_SCALE; c.right *= INTERIOR_SCALE; c.top *= INTERIOR_SCALE; c.bottom *= INTERIOR_SCALE; c.far *= INTERIOR_SCALE; c.updateProjectionMatrix(); }
});
