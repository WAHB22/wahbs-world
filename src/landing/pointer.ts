/**
 * Shared, mutable pointer state for the landing. The DOM panes and the 3D glass read the
 * same numbers so they stay aligned. Plain object on purpose: no React renders per frame.
 */
export const pointer = {
  tx: 0, ty: 0, // target, -1 to 1
  x: 0, y: 0, // smoothed
  cx: -9999, cy: -9999, // pointer in page pixels
  version: 0,
  /** set by the 3D layer so it redraws only when something moved */
  notify: null as null | (() => void),
  panes: [] as { x: number; y: number; z: number; rx: number; ry: number }[],
};
