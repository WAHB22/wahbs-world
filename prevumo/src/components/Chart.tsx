import { lazy, Suspense, type ComponentProps } from "react";
import type { LiveChart as Full } from "./LiveChart";

const load = () => import("./LiveChart");
const Lazy = lazy(() => load().then((m) => ({ default: m.LiveChart })));
// Fetch the chart chunk shortly after boot, so the first alert opens with its chart drawn.
window.setTimeout(load, 1500);

/** The live chart, with Recharts split out of the first download (it is most of the bundle). */
export function LiveChart(props: ComponentProps<typeof Full>) {
  return (
    <Suspense fallback={<div style={{ height: props.height ?? 280 }} />}>
      <Lazy {...props} />
    </Suspense>
  );
}
