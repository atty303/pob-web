/** Conservative rejection only: intersecting, rotated and mirrored quads remain drawable. */
export function quadOutsideViewport(
  width: number,
  height: number,
  padding: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
): boolean {
  // Most overview-tree quads and UI glyphs are visible. A corner inside the
  // viewport proves intersection without computing all eight Float32 bounds.
  if (x1 >= 0 && x1 <= width && y1 >= 0 && y1 <= height) return false;
  // InstanceBuffer stores Float32 coordinates. Cull their GPU values, not the
  // higher-precision JS inputs, and leave a guard band for shader rounding.
  const minX = Math.min(Math.fround(x1), Math.fround(x2), Math.fround(x3), Math.fround(x4));
  const maxX = Math.max(Math.fround(x1), Math.fround(x2), Math.fround(x3), Math.fround(x4));
  const minY = Math.min(Math.fround(y1), Math.fround(y2), Math.fround(y3), Math.fround(y4));
  const maxY = Math.max(Math.fround(y1), Math.fround(y2), Math.fround(y3), Math.fround(y4));
  if (
    !Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY) ||
    !Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(padding) ||
    width < 0 || height < 0 || padding < 0
  ) return false;
  return maxX < -padding || maxY < -padding || minX > Math.fround(width) + padding ||
    minY > Math.fround(height) + padding;
}
