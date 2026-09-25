/**
 * A picture of a live element (the landing), taken while the page is idle, so the glass
 * shatter can break the real screen instantly on tap. Cutting one picture into shards is
 * cheap; copying the page into every shard is not.
 */
export type Snapshot = { canvas: HTMLCanvasElement; box: { x: number; y: number; w: number; h: number }; scale: number };

const shots = new WeakMap<Element, Snapshot>();
const timers = new WeakMap<Element, number>();
const busy = new WeakSet<Element>();

/** The room behind the landing, drawn into the picture (the element itself is transparent). */
function roomBackground(): string {
  const probe = document.createElement("div");
  probe.className = "tx-clone";
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  const bg = getComputedStyle(probe).backgroundImage;
  probe.remove();
  return bg;
}

async function take(el: HTMLElement): Promise<void> {
  if (busy.has(el) || !el.isConnected) return;
  busy.add(el);
  try {
    const { domToCanvas } = await import("modern-screenshot");
    const r = el.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    const canvas = await domToCanvas(el, {
      scale,
      width: r.width,
      height: r.height,
      style: { backgroundImage: roomBackground(), margin: "0" },
      filter: (n) => !(n instanceof Element && n.classList.contains("no-snapshot")),
    });
    if (el.isConnected) shots.set(el, { canvas, box: { x: r.left, y: r.top, w: r.width, h: r.height }, scale });
  } catch {
    // No picture: the shatter falls back to plain glass shards.
  } finally {
    busy.delete(el);
  }
}

/** Ask for a fresh picture once things have been still for a moment. */
export function scheduleSnapshot(el: HTMLElement | null, wait = 500): void {
  if (!el) return;
  clearTimeout(timers.get(el));
  timers.set(el, window.setTimeout(() => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(() => void take(el), { timeout: 1500 });
    else void take(el);
  }, wait));
}

export function snapshotOf(el: Element | null | undefined): Snapshot | undefined {
  return el ? shots.get(el) : undefined;
}
