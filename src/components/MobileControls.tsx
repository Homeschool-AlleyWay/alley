import { useRef } from "react";
import { VIRTUAL_INPUT } from "../game/scenes/AuditoriumScene";
/** 56-64px translucent directional pad, bottom-left. Writes screen-space input the scene converts to grid space. */
const B = 60;
export default function MobileControls() {
  const held = useRef<Record<string, boolean>>({});
  const set = (k: string, dx: number, dy: number, on: boolean) => {
    held.current[k] = on;
    let x = 0, y = 0;
    if (held.current.l) x -= 1; if (held.current.r) x += 1; if (held.current.u) y -= 1; if (held.current.d) y += 1;
    VIRTUAL_INPUT.x = x; VIRTUAL_INPUT.y = y;
  };
  const btn = (k: string, label: string, dx: number, dy: number, style: React.CSSProperties) => (
    <button aria-label={label} style={{ position: "absolute", width: B, height: B, borderRadius: 16, border: "1.5px solid rgba(255,249,240,.7)", background: "rgba(49,58,63,.28)", color: "#FFF9F0", fontSize: 22, touchAction: "none", ...style }}
      onPointerDown={() => set(k, dx, dy, true)} onPointerUp={() => set(k, dx, dy, false)} onPointerLeave={() => set(k, dx, dy, false)} onPointerCancel={() => set(k, dx, dy, false)}>{label}</button>
  );
  return (
    <div style={{ position: "absolute", left: 14, bottom: 14, width: B * 3 + 8, height: B * 3 + 8, zIndex: 10 }}>
      {btn("u", "▲", 0, -1, { left: B + 4, top: 0 })}{btn("l", "◀", -1, 0, { left: 0, top: B + 4 })}
      {btn("r", "▶", 1, 0, { left: (B + 4) * 2, top: B + 4 })}{btn("d", "▼", 0, 1, { left: B + 4, top: (B + 4) * 2 })}
    </div>
  );
}
