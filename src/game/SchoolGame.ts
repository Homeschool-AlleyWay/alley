import Phaser from "phaser";
import { AuditoriumScene } from "./scenes/AuditoriumScene";
export function createSchoolGame(parent: HTMLElement) {
  return new Phaser.Game({ type: Phaser.AUTO, parent, backgroundColor: "#F5F7F4",
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth || window.innerWidth, height: parent.clientHeight || window.innerHeight },
    render: { antialias: true, roundPixels: false }, scene: [AuditoriumScene] });
}
