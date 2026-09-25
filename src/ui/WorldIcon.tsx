"use client";

import { Barbell, BellSimpleRinging, Blueprint, Books, Compass, Flask, Hourglass, Jar, Wine, type Icon } from "@phosphor-icons/react";
import type { WorldSlug } from "@/worlds/registry";

/** Each world is a real object: the hourglass, the flask, the service bell, the jar, the blueprint... */
export const WORLD_ICON: Record<WorldSlug, Icon> = {
  today: Hourglass,
  school: Flask,
  work: BellSimpleRinging,
  money: Jar,
  projects: Blueprint,
  career: Compass,
  knowledge: Books,
  training: Barbell,
  life: Wine,
};

/** A world's object set in a small chrome disc. */
export function WorldMark({ slug, size = 44 }: { slug: WorldSlug; size?: number }) {
  const I = WORLD_ICON[slug];
  return (
    <span className="chrome-disc" style={{ width: size, height: size }} aria-hidden="true">
      <I size={Math.round(size * 0.5)} weight="regular" />
    </span>
  );
}
