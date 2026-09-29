import { useEffect, useRef } from "react";
import { createSchoolGame } from "../game/SchoolGame";
import { VIRTUAL_INPUT } from "../game/scenes/AuditoriumScene";
import MobileControls from "./MobileControls";
export default function SchoolGameView() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const g = createSchoolGame(ref.current!); return () => g.destroy(true); }, []);
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={ref} style={{ position: "absolute", inset: 0 }} />
      <MobileControls />
      <button onClick={() => (VIRTUAL_INPUT.sit = true)} style={{ position: "absolute", right: 14, bottom: 24, width: 64, height: 64, borderRadius: 32, background: "rgba(79,145,199,.55)", color: "#FFF9F0", border: "1.5px solid rgba(255,249,240,.7)", zIndex: 10 }}>Sit</button>
    </div>
  );
}
