import { notFound } from "next/navigation";
import { WORLDS, worldBySlug } from "@/worlds/registry";
import { ComingWorld } from "@/worlds/ComingWorld";

// Worlds that are not built yet get an honest page with the plan and a way back.
export function generateStaticParams() {
  return WORLDS.filter((w) => w.opensIn).map((w) => ({ world: w.slug }));
}
export const dynamicParams = false;

export default async function WorldPage({ params }: { params: Promise<{ world: string }> }) {
  const { world } = await params;
  const w = worldBySlug(world);
  if (!w || !w.opensIn) notFound();
  return <ComingWorld slug={w.slug} />;
}
