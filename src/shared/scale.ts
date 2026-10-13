import type * as THREE from "three";
/** ONE scale for every interior (hallway, classroom, auditorium, field trip, dorm). The scene root is scaled by this, so footprint, ceilings, doors, furniture, stage, seat rows and every
 *  positioned constant grow together; scene code keeps working in its own design units. Cameras live outside the scene and multiply their positions by it.
 *  Characters are NOT meant to grow: their size comes from the age heights in dorm/char3d.ts, so billboards and 3D rigs are counter-scaled by 1/INTERIOR_SCALE. */
export const INTERIOR_SCALE = 1.3;
export const CHAR_K = 1 / INTERIOR_SCALE;
/** make a scene render at interior scale; returns the scale so callers can fix up shadow frustums etc. */
export const scaleScene = (scene: THREE.Object3D) => { scene.scale.setScalar(INTERIOR_SCALE); return INTERIOR_SCALE; };
/** counter-scale a 3D character root so it keeps its true height inside a scaled scene */
export const fitChar = <T extends { root: THREE.Object3D }>(c: T): T => { c.root.scale.setScalar(CHAR_K); return c; };
/** point/spot reach and directional shadow frustums are measured in world units, so grow them with the scene */
export const fitLights = (scene: THREE.Object3D) => scene.traverse((o: any) => {
  if (o.isPointLight || o.isSpotLight) { o.distance *= INTERIOR_SCALE; if (o.decay) o.intensity *= Math.pow(INTERIOR_SCALE, o.decay); }
  if (o.isLight && o.shadow?.camera?.isOrthographicCamera) { const c = o.shadow.camera; c.left *= INTERIOR_SCALE; c.right *= INTERIOR_SCALE; c.top *= INTERIOR_SCALE; c.bottom *= INTERIOR_SCALE; c.far *= INTERIOR_SCALE; c.updateProjectionMatrix(); }
});
