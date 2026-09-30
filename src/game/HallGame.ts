import Phaser from "phaser";
import { HallwayScene } from "./scenes/HallwayScene";
export function createHallGame(parent: HTMLElement) {
  return new Phaser.Game({ type: Phaser.AUTO, parent, backgroundColor: "#EADFCB",
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth || window.innerWidth, height: parent.clientHeight || window.innerHeight },
    render: { antialias: true, roundPixels: false }, scene: [HallwayScene] });
}
