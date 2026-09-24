"use client";

import { MeshTransmissionMaterial, RoundedBox, Environment, Lightformer } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { DEPTH_Z, WORLDS } from "@/worlds/registry";
import { pointer } from "./pointer";

/**
 * Real refraction for the landing (laptop only, loaded lazily). The camera matches the CSS
 * perspective of the stage exactly, so each glass slab sits under its DOM pane: the DOM keeps
 * the text, links and focus; this layer adds the glass bending WAHB and the room behind it.
 * Rendering is on demand: a frame is drawn only when the pointer moved or the size changed.
 */
const PERSPECTIVE = 1100;

function cssColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim() || "#081330";
}

function backdropTexture(w: number, h: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = Math.round((1024 * h) / w);
  const g = c.getContext("2d")!;
  const lin = g.createLinearGradient(0, 0, 0, c.height);
  lin.addColorStop(0, cssColor("midnight"));
  lin.addColorStop(0.75, cssColor("abyss"));
  g.fillStyle = lin;
  g.fillRect(0, 0, c.width, c.height);
  const glow = (x: number, y: number, r: number, color: string, a: number) => {
    const rg = g.createRadialGradient(x * c.width, y * c.height, 0, x * c.width, y * c.height, r * c.width);
    rg.addColorStop(0, color + Math.round(a * 255).toString(16).padStart(2, "0"));
    rg.addColorStop(1, color + "00");
    g.fillStyle = rg;
    g.fillRect(0, 0, c.width, c.height);
  };
  glow(0.8, -0.1, 0.8, cssColor("cobalt"), 0.35);
  glow(-0.05, 0.45, 0.6, cssColor("lagoon"), 0.22);
  glow(0.5, 0.18, 0.18, cssColor("ember"), 0.16);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function wahbTexture(box: DOMRect, size: number): THREE.CanvasTexture {
  const scale = 2;
  const c = document.createElement("canvas");
  c.width = Math.round(box.width * scale);
  c.height = Math.round(box.height * scale);
  const g = c.getContext("2d")!;
  g.font = `820 expanded ${size * scale}px Anybody`;
  g.textBaseline = "middle";
  g.textAlign = "center";
  (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${-0.035 * size * scale}px`;
  const grad = g.createLinearGradient(0, c.height * 0.1, 0, c.height * 0.9);
  grad.addColorStop(0.2, cssColor("frost"));
  grad.addColorStop(0.62, cssColor("sky"));
  grad.addColorStop(1, cssColor("signal"));
  g.fillStyle = grad;
  g.fillText("WAHB", c.width / 2, c.height / 2 + size * scale * 0.04);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

type Layout = { w: number; h: number; wahb: DOMRect; wahbSize: number; panes: { cx: number; cy: number; w: number; h: number }[] };

function measure(stage: HTMLElement): Layout {
  const r = stage.getBoundingClientRect();
  const wahbEl = stage.querySelector<HTMLElement>(".stage-wahb")!;
  const wr = wahbEl.getBoundingClientRect();
  const panes = WORLDS.map((w) => {
    const el = stage.querySelector<HTMLElement>(`[data-world="${w.slug}"]`)!;
    return { cx: (r.width * w.at.x) / 100, cy: (r.height * w.at.y) / 100, w: el.offsetWidth, h: el.offsetHeight };
  });
  const wahb = new DOMRect(wr.left - r.left, wr.top - r.top, wr.width, wr.height);
  return { w: r.width, h: r.height, wahb, wahbSize: parseFloat(getComputedStyle(wahbEl).fontSize), panes };
}

function Rig({ layout }: { layout: Layout }) {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = (2 * Math.atan(layout.h / 2 / PERSPECTIVE) * 180) / Math.PI;
    cam.aspect = layout.w / layout.h;
    cam.position.set(0, 0, PERSPECTIVE);
    cam.near = 10;
    cam.far = 4000;
    cam.updateProjectionMatrix();
    invalidate();
  }, [camera, layout, invalidate]);
  return null;
}

function Slabs({ layout }: { layout: Layout }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const { invalidate } = useThree();
  const tints = useMemo(() => WORLDS.map((w) => new THREE.Color(cssColor(w.accent)).lerp(new THREE.Color("#ffffff"), 0.82)), []);

  useEffect(() => {
    const place = () => {
      WORLDS.forEach((w, i) => {
        const m = refs.current[i];
        const p = layout.panes[i];
        const s = pointer.panes[i] ?? { x: 0, y: 0, z: DEPTH_Z[w.at.depth], rx: 0, ry: 0 };
        if (!m || !p) return;
        m.position.set(p.cx - layout.w / 2 + s.x, -(p.cy - layout.h / 2 + s.y), s.z);
        m.rotation.set(THREE.MathUtils.degToRad(s.rx), THREE.MathUtils.degToRad(s.ry), 0);
      });
      invalidate();
    };
    pointer.notify = place;
    place();
    return () => { pointer.notify = null; };
  }, [layout, invalidate]);

  return (
    <>
      {WORLDS.map((w, i) => (
        <RoundedBox key={w.slug} ref={(m) => { refs.current[i] = m; }} args={[layout.panes[i].w, layout.panes[i].h, 16]} radius={26} smoothness={4}>
          <MeshTransmissionMaterial
            transmissionSampler
            samples={4}
            resolution={512}
            thickness={70}
            roughness={0.16}
            ior={1.28}
            chromaticAberration={0.05}
            anisotropicBlur={0.15}
            distortion={0.25}
            distortionScale={0.35}
            temporalDistortion={0}
            color={tints[i]}
            backside={false}
          />
        </RoundedBox>
      ))}
    </>
  );
}

function Room({ layout }: { layout: Layout }) {
  const back = useMemo(() => backdropTexture(layout.w, layout.h), [layout.w, layout.h]);
  const word = useMemo(() => wahbTexture(layout.wahb, layout.wahbSize), [layout.wahb, layout.wahbSize]);
  useEffect(() => () => { back.dispose(); word.dispose(); }, [back, word]);
  const depth = 700; // the room sits behind everything; scale it so it still fills the view
  const k = (PERSPECTIVE + depth) / PERSPECTIVE;
  const wb = layout.wahb;
  return (
    <>
      <mesh position={[0, 0, -depth]}>
        <planeGeometry args={[layout.w * k, layout.h * k]} />
        <meshBasicMaterial map={back} toneMapped={false} />
      </mesh>
      <mesh position={[wb.x + wb.width / 2 - layout.w / 2, -(wb.y + wb.height / 2 - layout.h / 2), -40]}>
        <planeGeometry args={[wb.width * ((PERSPECTIVE + 40) / PERSPECTIVE), wb.height * ((PERSPECTIVE + 40) / PERSPECTIVE)]} />
        <meshBasicMaterial map={word} transparent toneMapped={false} />
      </mesh>
    </>
  );
}

export default function GlassScene({ stage, onReady }: { stage: RefObject<HTMLDivElement | null>; onReady: () => void }) {
  const [layout, setLayout] = useState<Layout | null>(null);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout>;
    const update = () => { clearTimeout(t); t = setTimeout(() => setLayout(measure(el)), 120); };
    void document.fonts.ready.then(() => setLayout(measure(el)));
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("resize", update); clearTimeout(t); };
  }, [stage]);

  if (!layout) return null;
  return (
    <div className="glass-canvas" aria-hidden="true">
      <Canvas
        frameloop="demand"
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NoToneMapping;
          requestAnimationFrame(() => requestAnimationFrame(onReady));
        }}
      >
        <Rig layout={layout} />
        <Room layout={layout} />
        <Slabs layout={layout} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2.2} position={[0, 5, -4]} scale={[10, 2, 1]} color="#DCE8FF" />
          <Lightformer form="rect" intensity={1.2} position={[-6, 0, 2]} scale={[2, 6, 1]} color="#8DB6FF" />
          <Lightformer form="circle" intensity={1.6} position={[4, 3, 3]} scale={2} color="#FF8A3D" />
        </Environment>
      </Canvas>
    </div>
  );
}
