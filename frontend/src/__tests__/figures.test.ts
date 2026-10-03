import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EXERCISES } from "../workouts/exercises";
import { FIGURES } from "../workouts/figure-poses";
import { drawFigure, VIEWBOX, type Primitive } from "../workouts/figures";

const [minX, minY, w, h] = VIEWBOX.split(" ").map(Number);

function points(p: Primitive): [number, number][] {
  return p.kind === "line" ? [p.a, p.b] : [p.c];
}

describe("illustrations des exercices", () => {
  it("chaque exercice du catalogue a son illustration", () => {
    for (const e of EXERCISES) expect(FIGURES[e.id], e.id).toBeDefined();
  });

  it("chaque pose tient dans le cadre", () => {
    for (const [id, figure] of Object.entries(FIGURES)) {
      for (const pose of [figure.start, figure.end].filter((p) => p !== undefined)) {
        for (const prim of drawFigure(figure, pose)) {
          for (const [x, y] of points(prim)) {
            expect(x, `${id} x`).toBeGreaterThanOrEqual(minX - 0.5);
            expect(x, `${id} x`).toBeLessThanOrEqual(minX + w + 0.5);
            expect(y, `${id} y`).toBeGreaterThanOrEqual(minY - 0.5);
            expect(y, `${id} y`).toBeLessThanOrEqual(minY + h + 0.5);
          }
        }
      }
    }
  });

  // FIGURE_GALLERY=<file.html> npx vitest run figures: writes every figure on one page, to check them by eye.
  it.runIf(!!process.env.FIGURE_GALLERY)("écrit la galerie", () => {
    const svg = (prims: Primitive[]) =>
      `<svg viewBox="${VIEWBOX}" width="180">${prims
        .map((p) =>
          p.kind === "line"
            ? `<line x1="${p.a[0]}" y1="${p.a[1]}" x2="${p.b[0]}" y2="${p.b[1]}" class="${p.cls}"${p.w !== undefined ? ` style="stroke-width:${p.w}"` : ""}/>`
            : `<circle cx="${p.c[0]}" cy="${p.c[1]}" r="${p.r}" class="${p.cls}"/>`,
        )
        .join("")}</svg>`;
    const cards = EXERCISES.map((e) => {
      const f = FIGURES[e.id];
      const poses = [f.start, f.end].filter((p) => p !== undefined);
      return `<figure><figcaption>${e.name}</figcaption>${poses.map((p) => svg(drawFigure(f, p))).join("")}</figure>`;
    }).join("");
    writeFileSync(
      process.env.FIGURE_GALLERY!,
      `<!doctype html><meta charset="utf-8"><style>
body{font:10px system-ui;background:#f3f6f8;color:#13213c;display:flex;flex-wrap:wrap;gap:4px;padding:4px;margin:0}
figure{margin:0;background:#fff;border-radius:6px;padding:2px}svg{background:#e3eaf1;margin:1px;border-radius:4px}
figcaption{white-space:nowrap;overflow:hidden;max-width:212px}
line{stroke-linecap:round}.gear{stroke:#48586f;stroke-width:2.5}.limb{stroke:#13213c;stroke-width:3.2}
.far{opacity:.4}.torso{stroke:#13213c;stroke-width:4.2}.head{fill:#13213c}.plate{fill:#48586f}
</style>${cards}<script>
// gallery.html#6-12 shows only figures 6 to 11 (screenshots without scrolling).
const show = () => { const [a, b] = location.hash.slice(1).split("-").map(Number);
  document.querySelectorAll("figure").forEach((f, i) => { f.hidden = !!location.hash && (i < a || i >= b); }); };
addEventListener("hashchange", show); show();
</script>`,
    );
  });
});
