"use client";

import { Environment, Lightformer, MeshReflectorMaterial, PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import type { WorldSlug } from "@/worlds/registry";
import { fractureMesh, rng } from "./geometry";
import { Bottle, Cloche, Compass, CrystalBall, Flask, Hourglass, Jar, makeMaterials, Prism, WineGlass, type Materials } from "./objects";

/** Where each world stands: column (0 to 2) and shelf (0 is the mirror floor). */
export const SLOTS: Record<WorldSlug, [number, number]> = {
  career: [0, 2], knowledge: [1, 2], life: [2, 2],
  school: [0, 1], today: [1, 1], work: [2, 1],
  money: [0, 0], projects: [1, 0], training: [2, 0],
};
const COL_X = [-1.22, 0, 1.22];
const SHELF_Y = [0, 1.2, 2.4];
const HALF_W = 1.9, HALF_D = 0.5, TOP = 3.52;
/** 1 unit is about 28 cm, so gravity is 9.8 m/s² in those units. */
const GRAVITY = -9.8 / 0.28;

export type Point = { x: number; y: number };
export type CabinetApi = { shatter: (slug: WorldSlug) => Point | null; touch: (slug: WorldSlug) => void };

type Body = { o: THREE.Object3D; v: THREE.Vector3; w: THREE.Vector3; r: number; born: number };

export default function Cabinet({ api, still, onLayout, onPick, onHover, onReady }: {
  api: MutableRefObject<CabinetApi | null>;
  still: boolean;
  onLayout: (plaques: Record<WorldSlug, Point>) => void;
  onPick: (slug: WorldSlug) => void;
  onHover: (slug: WorldSlug | null) => void;
  onReady: () => void;
}) {
  const [dpr, setDpr] = useState(1.5);
  return (
    <Canvas
      className="cabinet-canvas"
      dpr={[1, dpr]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 28, near: 0.1, far: 60, position: [0, 1.7, 14] }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; onReady(); }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <Scene api={api} still={still} onLayout={onLayout} onPick={onPick} onHover={onHover} />
    </Canvas>
  );
}

function Scene({ api, still, onLayout, onPick, onHover }: {
  api: MutableRefObject<CabinetApi | null>; still: boolean;
  onLayout: (p: Record<WorldSlug, Point>) => void; onPick: (s: WorldSlug) => void; onHover: (s: WorldSlug | null) => void;
}) {
  const m = useMemo(() => makeMaterials(), []);
  const { camera, size, scene, clock } = useThree();
  const objects = useRef<Partial<Record<WorldSlug, THREE.Group>>>({});
  const wobble = useRef<Partial<Record<WorldSlug, number>>>({});
  const slosh = { life: useRef(-10), training: useRef(-10) };
  const debris = useRef<THREE.Group>(null);
  const bodies = useRef<Body[]>([]);
  const glint = useRef<THREE.PointLight>(null);
  const push = useRef<{ t0: number; from: THREE.Vector3; to: THREE.Vector3; look0: THREE.Vector3; look1: THREE.Vector3 } | null>(null);
  const look = useRef(new THREE.Vector3(0, 1.6, 0));

  // Frame the whole cabinet for this screen, then tell the page where each plaque goes.
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const h = 4.35, w = 4.25;
    const dist = Math.max(h / 2 / t, w / 2 / (t * aspect)) + HALF_D;
    const target = new THREE.Vector3(0, 1.5, 0);
    cam.position.set(0, 1.9, dist);
    cam.lookAt(target);
    look.current.copy(target);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const out = {} as Record<WorldSlug, Point>;
    (Object.keys(SLOTS) as WorldSlug[]).forEach((slug) => {
      const [c, r] = SLOTS[slug];
      const v = new THREE.Vector3(COL_X[c], SHELF_Y[r] - 0.02, HALF_D).project(cam);
      out[slug] = { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
    });
    onLayout(out);
  }, [camera, size, onLayout]);

  useEffect(() => {
    api.current = {
      touch: (slug) => { wobble.current[slug] = clock.elapsedTime; if (slug === "life" || slug === "training") slosh[slug].current = clock.elapsedTime; },
      shatter: (slug) => {
        const g = objects.current[slug];
        const root = debris.current;
        if (!g || !root) return null;
        g.updateWorldMatrix(true, true);
        const base = new THREE.Vector3().setFromMatrixPosition(g.matrixWorld);
        const impact = base.clone().add(new THREE.Vector3(0, 0.36, 0.18));
        const rand = rng(Math.floor(clock.elapsedTime * 1000));
        const now = clock.elapsedTime;
        const glass: THREE.Mesh[] = [], contents: THREE.Object3D[] = [], loose: THREE.Object3D[] = [];
        g.traverse((o) => {
          if (o.userData.glass && (o as THREE.Mesh).isMesh) glass.push(o as THREE.Mesh);
          else if (o.userData.contents) contents.push(o);
          else if (o.userData.loose) loose.push(o);
        });
        const add = (o: THREE.Object3D, speed: number, up: number) => {
          const p = new THREE.Vector3(); o.getWorldPosition(p);
          const dir = p.clone().sub(impact); dir.y *= 0.5;
          if (dir.lengthSq() < 1e-6) dir.set(rand() - 0.5, 0.2, rand() - 0.5);
          dir.normalize();
          const v = dir.multiplyScalar(speed * (0.5 + rand() * 0.7)).add(new THREE.Vector3((rand() - 0.5) * 0.8, up * (0.5 + rand()), rand() * 0.9 - 0.2));
          const w = new THREE.Vector3((rand() - 0.5) * 22, (rand() - 0.5) * 22, (rand() - 0.5) * 22);
          const s = new THREE.Vector3(); o.getWorldScale(s);
          const geo = (o as THREE.Mesh).geometry;
          if (geo && !geo.boundingSphere) geo.computeBoundingSphere();
          const r = Math.max(0.006, (geo?.boundingSphere?.radius ?? 0.02) * Math.max(s.x, s.y, s.z) * 0.45);
          bodies.current.push({ o, v, w, r, born: now });
        };
        for (const mesh of glass) {
          mesh.geometry.computeBoundingSphere();
          const size = mesh.geometry.boundingSphere!.radius;
          const pieces = Math.round(THREE.MathUtils.clamp(size * 80, 9, 30));
          for (const shard of fractureMesh(mesh, pieces, rand)) { root.add(shard); add(shard, 2.4, 2.2); }
          mesh.visible = false;
        }
        for (const o of loose) { root.attach(o); add(o, 1.2, 1.4); }
        for (const o of contents) {
          // Liquids and sand spill as drops of themselves.
          const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
          o.visible = false;
          if (!mat || o instanceof THREE.InstancedMesh || !(o as THREE.Mesh).geometry || (o as THREE.Mesh).geometry.type === "PlaneGeometry" || (o as THREE.Mesh).geometry.type === "BufferGeometry") continue;
          const p = new THREE.Vector3(); o.getWorldPosition(p);
          for (let i = 0; i < 16; i++) {
            const drop = new THREE.Mesh(DROP, mat);
            drop.scale.setScalar(0.008 + rand() * 0.014);
            drop.position.copy(p).add(new THREE.Vector3((rand() - 0.5) * 0.2, 0.1 + rand() * 0.15, (rand() - 0.5) * 0.2));
            root.add(drop);
            add(drop, 1.6, 1.6);
          }
        }
        if (glint.current) { glint.current.position.copy(impact); glint.current.intensity = 14; }
        // The camera leans in toward what broke, as your eye would.
        const cam = camera as THREE.PerspectiveCamera;
        const from = cam.position.clone();
        const to = new THREE.Vector3(THREE.MathUtils.lerp(from.x, base.x, 0.45), THREE.MathUtils.lerp(from.y, base.y + 0.45, 0.45), from.z * 0.74);
        push.current = { t0: now, from, to, look0: look.current.clone(), look1: look.current.clone().lerp(base.clone().add(new THREE.Vector3(0, 0.4, 0)), 0.6) };
        const v = impact.clone().project(cam);
        return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
      },
    };
    return () => { api.current = null; };
  });

  useFrame(({ clock: c }, raw) => {
    const dt = Math.min(raw, 1 / 30);
    const t = c.elapsedTime;
    // Light drifting across the room: every reflection in the glass moves with it.
    if (!still) (scene as THREE.Scene & { environmentRotation: THREE.Euler }).environmentRotation.y = Math.sin(t * 0.12) * 0.5;
    for (const slug of Object.keys(objects.current) as WorldSlug[]) {
      const g = objects.current[slug];
      if (!g) continue;
      const k = t - (wobble.current[slug] ?? -10);
      // Touched glass rings: a small, fast, damped rocking on its base.
      g.rotation.z = k < 1.6 ? 0.035 * Math.exp(-k * 3.2) * Math.sin(k * 26) : 0;
    }
    if (glint.current && glint.current.intensity > 0) glint.current.intensity = Math.max(0, glint.current.intensity - dt * 70);
    const p = push.current;
    if (p) {
      const k = Math.min(1, (t - p.t0) / 0.75);
      const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
      camera.position.lerpVectors(p.from, p.to, e);
      look.current.lerpVectors(p.look0, p.look1, e);
      camera.lookAt(look.current);
    }
    // The physics of broken glass: gravity, bounce on the shelf it lands on, friction, rest.
    const q = new THREE.Quaternion(), eu = new THREE.Euler();
    bodies.current = bodies.current.filter((b) => {
      const prevY = b.o.position.y;
      b.v.y += GRAVITY * dt;
      b.o.position.addScaledVector(b.v, dt);
      eu.set(b.w.x * dt, b.w.y * dt, b.w.z * dt);
      q.setFromEuler(eu);
      b.o.quaternion.premultiply(q);
      const { x, y, z } = b.o.position;
      if (Math.abs(x) < HALF_W && Math.abs(z) < HALF_D) {
        let support = -Infinity;
        for (const s of SHELF_Y) if (s <= prevY - b.r * 0.5 + 0.001 && s > support) support = s;
        if (support > -Infinity && y - b.r < support) {
          b.o.position.y = support + b.r;
          b.v.y = Math.abs(b.v.y) > 0.6 ? -b.v.y * 0.28 : 0;
          // Glass on glass: little bounce, a lot of friction, and it lies flat once it stops spinning.
          b.v.x *= 0.55; b.v.z *= 0.55; b.w.multiplyScalar(0.5);
        }
      }
      if (b.o.position.y < -4) { b.o.removeFromParent(); return false; }
      if (t - b.born > 4) return false; // at rest where it landed
      return true;
    });
  });

  const place = (slug: WorldSlug) => {
    const [c, r] = SLOTS[slug];
    return [COL_X[c], SHELF_Y[r], 0] as [number, number, number];
  };
  const events = (slug: WorldSlug) => ({
    onPointerDown: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onPick(slug); },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); document.body.style.cursor = "pointer"; onHover(slug); api.current?.touch(slug); },
    onPointerOut: () => { document.body.style.cursor = ""; onHover(null); },
  });
  const obj = (slug: WorldSlug, children: React.ReactNode) => (
    <group key={slug} position={place(slug)} ref={(g) => { if (g) objects.current[slug] = g; }} {...events(slug)}>{children}</group>
  );

  return (
    <>
      <color attach="background" args={["#163fb6"]} />
      <Studio />
      <Backdrop />
      <directionalLight position={[2.5, 6, 4]} intensity={1.2} />
      <pointLight ref={glint} intensity={0} distance={3} color="#e8f4ff" />

      {/* the cabinet: steel posts, a top, glass shelves, and a mirror floor */}
      {[-HALF_W, HALF_W].flatMap((x) => [-HALF_D, HALF_D].map((z) => (
        <mesh key={`${x}${z}`} material={m.steel} position={[x, TOP / 2 - 0.15, z]}>
          <cylinderGeometry args={[0.022, 0.022, TOP + 0.3, 16]} />
        </mesh>
      )))}
      <mesh material={m.steel} position={[0, TOP, 0]}>
        <boxGeometry args={[HALF_W * 2 + 0.08, 0.05, HALF_D * 2 + 0.06]} />
      </mesh>
      <mesh position={[0, -0.16, 0]}>
        <boxGeometry args={[HALF_W * 2 + 0.1, 0.3, HALF_D * 2 + 0.08]} />
        <meshStandardMaterial color="#0e1a3d" roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <planeGeometry args={[HALF_W * 2, HALF_D * 2]} />
        <MeshReflectorMaterial resolution={512} blur={[120, 40]} mixBlur={0.6} mixStrength={3} mirror={0.9} roughness={0.12}
          depthScale={0.3} minDepthThreshold={0.6} maxDepthThreshold={1.3} color="#c4d4f4" metalness={0.55} />
      </mesh>
      {SHELF_Y.slice(1).map((y) => (
        <mesh key={y} material={m.shelf} position={[0, y - 0.022, 0]}>
          <boxGeometry args={[HALF_W * 2, 0.044, HALF_D * 2]} />
        </mesh>
      ))}

      {obj("career", <Compass m={m} still={still} />)}
      {obj("knowledge", <CrystalBall m={m} still={still} />)}
      {obj("life", <WineGlass m={m} still={still} slosh={slosh.life} />)}
      {obj("school", <Flask m={m} still={still} />)}
      {obj("today", <Hourglass m={m} still={still} />)}
      {obj("work", <Cloche m={m} still={still} />)}
      {obj("money", <Jar m={m} still={still} />)}
      {obj("projects", <Prism m={m} still={still} />)}
      {obj("training", <Bottle m={m} still={still} slosh={slosh.training} />)}

      <group ref={debris} />
    </>
  );
}

const DROP = new THREE.SphereGeometry(1, 10, 8);

/** A photographer's studio made of light: softboxes and strips that the glass reflects. */
function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={["#0d2a86"]} />
      <Lightformer form="rect" intensity={4} position={[0, 6, -2]} rotation-x={Math.PI / 2} scale={[10, 3, 1]} />
      <Lightformer form="rect" intensity={3} position={[-6, 2, 1]} rotation-y={Math.PI / 2} scale={[2.5, 8, 1]} />
      <Lightformer form="rect" intensity={2.4} position={[6, 2.5, 0]} rotation-y={-Math.PI / 2} scale={[2, 8, 1]} />
      <Lightformer form="rect" intensity={1.6} color="#9ccfff" position={[0, 1.5, 8]} scale={[12, 1.2, 1]} />
      <Lightformer form="ring" intensity={2.2} color="#ffd9a8" position={[3, 5, 5]} scale={2} />
      <Lightformer form="rect" intensity={1.2} color="#6fa2ff" position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} />
    </Environment>
  );
}

/** The back of the cabinet: the page's own blue, a little brighter behind each column, like a lit museum case.
    Drawn in screen space so it meets the page around it without a seam. */
function Backdrop() {
  const { gl } = useThree();
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { res: { value: new THREE.Vector2(1, 1) }, top: { value: new THREE.Color("#1d4ccf") }, bottom: { value: new THREE.Color("#0b2170") }, glow: { value: new THREE.Color("#7fb0ff") } },
    vertexShader: "void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec2 res; uniform vec3 top; uniform vec3 bottom; uniform vec3 glow;
      void main(){
        vec2 s = gl_FragCoord.xy / res;
        vec3 c = mix(bottom, top, smoothstep(0.0, 1.0, s.y));
        float spot = 0.0;
        for (int i = 0; i < 3; i++) { float x = 0.25 + float(i) * 0.25; spot += exp(-pow((s.x - x) * 7.0, 2.0)) * 0.22; }
        c += glow * spot * smoothstep(0.1, 0.9, s.y);
        c += glow * 0.18 * exp(-pow(distance(s, vec2(0.5, 0.6)) * 2.2, 2.0));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  }), []);
  useFrame(() => { gl.getDrawingBufferSize(mat.uniforms.res.value); });
  return (
    <mesh position={[0, 1.6, -HALF_D - 0.02]} material={mat}>
      <planeGeometry args={[60, 30]} />
    </mesh>
  );
}
