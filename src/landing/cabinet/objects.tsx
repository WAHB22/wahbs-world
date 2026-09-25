"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { canvasTexture, rng, shell, solid, type P } from "./geometry";

/**
 * Nine real glass objects, one per world, modelled from real proportions (about 25 cm tall at
 * 1 unit = 28 cm). Glass is physically based: refraction through two surfaces, real wall
 * thickness, a clear coat for the sharp reflections, and a faint colour in thick sections.
 *
 * Meshes are tagged for the break: userData.glass shatters, userData.contents spills,
 * userData.loose falls as a whole (coins, caps, the cork).
 */

export type Materials = ReturnType<typeof makeMaterials>;

export function makeMaterials() {
  const glass = (o: Partial<THREE.MeshPhysicalMaterialParameters> = {}) => new THREE.MeshPhysicalMaterial({
    color: "#ffffff", metalness: 0, roughness: 0.02, transmission: 1, ior: 1.52, thickness: 0.05,
    clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 1, envMapIntensity: 1.5,
    attenuationColor: new THREE.Color("#eaf6ff"), attenuationDistance: 1.4, ...o,
  });
  const metal = (color: string, roughness: number) => new THREE.MeshStandardMaterial({ color, metalness: 1, roughness, envMapIntensity: 1.3 });
  return {
    glass: glass(),
    thick: glass({ thickness: 0.5, attenuationDistance: 0.9 }),
    aqua: glass({ attenuationColor: new THREE.Color("#a9e2ff"), attenuationDistance: 0.45, thickness: 0.06 }),
    shelf: glass({ attenuationColor: new THREE.Color("#9fe6cf"), attenuationDistance: 0.3, thickness: 0.05, roughness: 0.03 }),
    chrome: metal("#eef3fb", 0.06),
    brass: metal("#d9ad55", 0.22),
    gold: metal("#f3c34f", 0.28),
    steel: metal("#b9c3cf", 0.3),
    wood: new THREE.MeshStandardMaterial({ color: "#5b3520", roughness: 0.5, metalness: 0 }),
    ebony: new THREE.MeshStandardMaterial({ color: "#1c1411", roughness: 0.35, metalness: 0 }),
    sand: new THREE.MeshStandardMaterial({ color: "#e6bb6c", roughness: 0.95 }),
    // Liquids are glossy but not transmissive: WebGL draws what is inside glass only if it is solid,
    // and a dense liquid seen through glass reads right this way.
    wine: new THREE.MeshPhysicalMaterial({ color: "#5c0619", roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03, sheen: 0.4, sheenColor: new THREE.Color("#ff4d6d"), envMapIntensity: 1.2 }),
    water: new THREE.MeshPhysicalMaterial({ color: "#9ed6f2", roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.4, emissive: new THREE.Color("#12406a"), emissiveIntensity: 0.25 }),
    reagent: new THREE.MeshPhysicalMaterial({ color: "#19c2d6", roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02, emissive: new THREE.Color("#0a6f80"), emissiveIntensity: 0.35, envMapIntensity: 1.2 }),
    bubble: new THREE.MeshStandardMaterial({ color: "#e8fbff", roughness: 0.1, metalness: 0.2 }),
    star: new THREE.MeshBasicMaterial({ color: "#ffe9b0" }),
    starBlue: new THREE.MeshBasicMaterial({ color: "#bfe0ff" }),
  };
}

type ObjProps = { m: Materials; still: boolean };

const tag = (o: THREE.Object3D | null, kind: "glass" | "contents" | "loose") => { if (o) o.userData[kind] = true; };

/* ---------- Today: an hourglass. The sand runs out, then it turns itself over. ---------- */
const BULB: P[] = [[0.025, 0.06], [0.13, 0.09], [0.19, 0.17], [0.2, 0.26], [0.16, 0.36], [0.06, 0.44], [0.022, 0.47], [0.06, 0.5], [0.16, 0.58], [0.2, 0.68], [0.19, 0.77], [0.13, 0.85], [0.025, 0.88]];
const RUN = 48; // seconds of sand
const FLIP = 1.3;

export function Hourglass({ m, still }: ObjProps) {
  const g = useMemo(() => ({
    bulb: shell(BULB, 0.012),
    // Sand shapes are built around their anchor (the neck, the floor) so they can shrink and grow from it.
    top: solid([[0.001, 0.478], [0.02, 0.485], [0.15, 0.6], [0.17, 0.66], [0.001, 0.66]]).translate(0, -0.478, 0),
    pile: solid([[0.001, 0.072], [0.18, 0.072], [0.12, 0.13], [0.001, 0.2]]).translate(0, -0.072, 0),
  }), []);
  const root = useRef<THREE.Group>(null), top = useRef<THREE.Mesh>(null), pile = useRef<THREE.Mesh>(null), stream = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!root.current || !top.current || !pile.current || !stream.current) return;
    const cycle = RUN + FLIP;
    const t = still ? 12 : clock.elapsedTime % cycle;
    const f = Math.min(1, t / RUN);
    top.current.scale.set(0.35 + 0.65 * (1 - f), Math.max(0.02, 1 - f), 0.35 + 0.65 * (1 - f));
    pile.current.scale.set(0.5 + 0.5 * f, 0.1 + 0.9 * f, 0.5 + 0.5 * f);
    stream.current.visible = f < 1;
    // Turned over by hand: a slow rotation with ease in and out, then the sand is on top again.
    const k = t > RUN ? (t - RUN) / FLIP : 0;
    root.current.rotation.z = k > 0 ? Math.PI * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2) : 0;
    root.current.position.y = 0.47 + (k > 0 ? Math.sin(k * Math.PI) * 0.12 : 0);
  });
  return (
    <group>
      <group ref={root} position={[0, 0.47, 0]}>
        <group position={[0, -0.47, 0]}>
          <mesh geometry={g.bulb} material={m.glass} ref={(o) => tag(o, "glass")} castShadow />
          <mesh ref={(o) => { top.current = o; tag(o, "contents"); }} geometry={g.top} material={m.sand} position={[0, 0.478, 0]} />
          <mesh ref={(o) => { pile.current = o; tag(o, "contents"); }} geometry={g.pile} material={m.sand} position={[0, 0.072, 0]} />
          <mesh ref={(o) => { stream.current = o; tag(o, "contents"); }} material={m.sand} position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 0.36, 8]} />
          </mesh>
          {[0.03, 0.91].map((y) => (
            <mesh key={y} material={m.wood} position={[0, y, 0]} ref={(o) => tag(o, "loose")}>
              <cylinderGeometry args={[0.25, 0.25, 0.06, 48]} />
            </mesh>
          ))}
          {[0, 1, 2].map((i) => (
            <mesh key={i} material={m.brass} position={[Math.cos((i * 2 * Math.PI) / 3) * 0.225, 0.47, Math.sin((i * 2 * Math.PI) / 3) * 0.225]} ref={(o) => tag(o, "loose")}>
              <cylinderGeometry args={[0.013, 0.013, 0.86, 12]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

/* ---------- School: an Erlenmeyer flask with a reagent that fizzes. ---------- */
const FLASK: P[] = [[0.03, 0], [0.22, 0.004], [0.235, 0.03], [0.2, 0.14], [0.09, 0.44], [0.07, 0.5], [0.07, 0.68], [0.086, 0.7], [0.086, 0.72]];
export function Flask({ m, still }: ObjProps) {
  const g = useMemo(() => ({
    flask: shell(FLASK, 0.01),
    liquid: solid([[0.001, 0.012], [0.214, 0.012], [0.222, 0.03], [0.189, 0.14], [0.158, 0.22], [0.001, 0.22]]),
  }), []);
  const bubbles = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => { const r = rng(4); return Array.from({ length: 14 }, () => [r() * 2 * Math.PI, r() * 0.12, r(), 0.004 + r() * 0.006]); }, []);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const b = bubbles.current;
    if (!b) return;
    seeds.forEach(([a, rad, ph, s], i) => {
      const k = still ? ph : (clock.elapsedTime * (0.35 + ph * 0.3) + ph) % 1;
      tmp.position.set(Math.cos(a) * rad, 0.03 + k * 0.18, Math.sin(a) * rad);
      tmp.scale.setScalar(s * (0.6 + k));
      tmp.updateMatrix();
      b.setMatrixAt(i, tmp.matrix);
    });
    b.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <mesh geometry={g.flask} material={m.glass} ref={(o) => tag(o, "glass")} />
      <mesh geometry={g.liquid} material={m.reagent} ref={(o) => tag(o, "contents")} />
      <instancedMesh ref={(o) => { bubbles.current = o; tag(o, "contents"); }} args={[undefined, undefined, 14]} material={m.bubble}>
        <sphereGeometry args={[1, 10, 8]} />
      </instancedMesh>
    </group>
  );
}

/* ---------- Work: a glass cloche over a chrome service bell. ---------- */
const CLOCHE: P[] = [[0.275, 0.05], [0.275, 0.38], [0.262, 0.47], [0.21, 0.56], [0.12, 0.62], [0.04, 0.64], [0.001, 0.642]];
export function Cloche({ m }: ObjProps) {
  const g = useMemo(() => shell(CLOCHE, 0.009), []);
  return (
    <group>
      <mesh material={m.ebony} position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.31, 0.32, 0.05, 64]} />
      </mesh>
      <mesh material={m.ebony} position={[0, 0.075, 0]}>
        <cylinderGeometry args={[0.17, 0.18, 0.05, 48]} />
      </mesh>
      <mesh material={m.chrome} position={[0, 0.1, 0]} scale={[1, 0.82, 1]}>
        <sphereGeometry args={[0.155, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={m.chrome} position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.011, 0.011, 0.04, 12]} />
      </mesh>
      <mesh material={m.chrome} position={[0, 0.268, 0]}>
        <sphereGeometry args={[0.024, 24, 16]} />
      </mesh>
      <mesh geometry={g} material={m.glass} ref={(o) => tag(o, "glass")} />
      <mesh material={m.glass} position={[0, 0.672, 0]} ref={(o) => tag(o, "glass")}>
        <sphereGeometry args={[0.038, 32, 20]} />
      </mesh>
    </group>
  );
}

/* ---------- Money: a mason jar of coins. ---------- */
const JAR: P[] = [[0.02, 0], [0.19, 0], [0.2, 0.02], [0.2, 0.44], [0.185, 0.5], [0.152, 0.53], [0.152, 0.6]];
export function Jar({ m }: ObjProps) {
  const g = useMemo(() => shell(JAR, 0.012), []);
  const coins = useMemo(() => {
    const r = rng(11);
    return Array.from({ length: 18 }, (_, i) => {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.13;
      return { p: [Math.cos(a) * d, 0.022 + Math.floor(i / 6) * 0.03 + r() * 0.02, Math.sin(a) * d] as [number, number, number], rot: [(r() - 0.5) * 0.9, r() * 3, (r() - 0.5) * 0.9] as [number, number, number] };
    });
  }, []);
  return (
    <group>
      {coins.map((c, i) => (
        <mesh key={i} material={m.gold} position={c.p} rotation={c.rot} ref={(o) => tag(o, "loose")}>
          <cylinderGeometry args={[0.048, 0.048, 0.011, 32]} />
        </mesh>
      ))}
      <mesh geometry={g} material={m.aqua} ref={(o) => tag(o, "glass")} />
      <mesh material={m.steel} position={[0, 0.625, 0]} ref={(o) => tag(o, "loose")}>
        <cylinderGeometry args={[0.162, 0.162, 0.05, 48]} />
      </mesh>
    </group>
  );
}

/* ---------- Projects: an optical prism splitting a beam of light into its spectrum. ---------- */
export function Prism({ m, still }: ObjProps) {
  const fan = useMemo(() => {
    // A fan of the spectrum leaving the far face: red bends least, violet most.
    const cols = ["#ff3b3b", "#ff9a2e", "#ffe53b", "#4be36a", "#3bb8ff", "#5a5bff", "#b04bff"];
    const pos: number[] = [], col: number[] = [];
    const c = new THREE.Color();
    cols.forEach((hex, i) => {
      const a0 = -0.05 - i * 0.045, a1 = a0 - 0.045;
      pos.push(0, 0, 0, Math.cos(a0) * 0.9, Math.sin(a0) * 0.9, 0, Math.cos(a1) * 0.9, Math.sin(a1) * 0.9, 0);
      c.set(hex);
      for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, []);
  const light = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => { if (light.current && !still) light.current.opacity = 0.5 + Math.sin(clock.elapsedTime * 1.3) * 0.08; });
  return (
    <group rotation={[0, -0.6, 0]}>
      <mesh material={m.thick} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} ref={(o) => tag(o, "glass")}>
        <cylinderGeometry args={[0.2, 0.2, 0.5, 3, 1]} />
      </mesh>
      {/* the incoming white beam */}
      <mesh position={[-0.42, 0.13, 0.01]} rotation={[0, 0, -0.08]} ref={(o) => tag(o, "contents")}>
        <planeGeometry args={[0.5, 0.012]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh geometry={fan} position={[0.12, 0.12, 0.01]} ref={(o) => tag(o, "contents")}>
        <meshBasicMaterial ref={light} vertexColors transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ---------- Career: a brass pocket compass under glass, its needle settling on north. ---------- */
export function Compass({ m, still }: ObjProps) {
  const face = useMemo(() => canvasTexture(512, 512, (x) => {
    x.fillStyle = "#f4efe2"; x.fillRect(0, 0, 512, 512);
    x.translate(256, 256);
    x.strokeStyle = "#1d2433";
    for (let i = 0; i < 72; i++) {
      x.save(); x.rotate((i * Math.PI) / 36);
      x.lineWidth = i % 9 === 0 ? 5 : 2;
      x.beginPath(); x.moveTo(0, -240); x.lineTo(0, i % 9 === 0 ? -200 : -222); x.stroke(); x.restore();
    }
    x.fillStyle = "#1d2433"; x.font = "700 64px Georgia, serif"; x.textAlign = "center"; x.textBaseline = "middle";
    ["N", "E", "S", "W"].forEach((l, i) => { x.save(); x.rotate((i * Math.PI) / 2); x.fillStyle = l === "N" ? "#b3122e" : "#1d2433"; x.fillText(l, 0, -160); x.restore(); });
    x.fillStyle = "rgba(29,36,51,0.15)";
    for (let i = 0; i < 8; i++) { x.save(); x.rotate((i * Math.PI) / 4); x.beginPath(); x.moveTo(0, -120); x.lineTo(14, 0); x.lineTo(-14, 0); x.fill(); x.restore(); }
  }), []);
  const needle = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!needle.current) return;
    const t = clock.elapsedTime;
    // A real needle: it swings, settles on north with a damped oscillation, and never quite stops trembling.
    needle.current.rotation.z = still ? 0.05 : 0.9 * Math.exp(-t * 0.9) * Math.cos(t * 5.2) + Math.sin(t * 7.1) * 0.012 + Math.sin(t * 2.3) * 0.01;
  });
  return (
    <group position={[0, 0.25, 0]} rotation={[-0.35, 0, 0]}>
      {/* a small brass easel holds it up so the face shows */}
      <mesh material={m.brass} position={[0, -0.2, -0.12]} rotation={[0.45, 0, 0]}>
        <boxGeometry args={[0.03, 0.34, 0.02]} />
      </mesh>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={m.brass}>
          <cylinderGeometry args={[0.21, 0.21, 0.07, 64]} />
        </mesh>
        <mesh position={[0, 0.036, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.185, 64]} />
          <meshStandardMaterial map={face} roughness={0.6} />
        </mesh>
        <group ref={needle} position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh position={[0, 0.07, 0]}>
            <coneGeometry args={[0.016, 0.14, 4]} />
            <meshStandardMaterial color="#c3142f" roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.07, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.016, 0.14, 4]} />
            <meshStandardMaterial color="#e8ecf2" roughness={0.4} />
          </mesh>
          <mesh material={m.brass}>
            <cylinderGeometry args={[0.012, 0.012, 0.01, 16]} />
          </mesh>
        </group>
        <mesh material={m.glass} position={[0, 0.058, 0]} ref={(o) => tag(o, "glass")}>
          <cylinderGeometry args={[0.192, 0.192, 0.014, 64]} />
        </mesh>
        <mesh material={m.brass} position={[0, 0, -0.24]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.035, 0.009, 12, 32]} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------- Knowledge: a crystal ball; the stars inside are seen through it, turned upside down. ---------- */
export function CrystalBall({ m, still }: ObjProps) {
  const stand = useMemo(() => solid([[0.001, 0], [0.2, 0], [0.205, 0.02], [0.17, 0.05], [0.12, 0.1], [0.135, 0.13], [0.15, 0.15], [0.001, 0.15]]), []);
  const stars = useRef<THREE.Group>(null);
  const pts = useMemo(() => { const r = rng(21); return Array.from({ length: 26 }, () => { const u = r() * 2 - 1, a = r() * Math.PI * 2, d = 0.06 + r() * 0.12; const s = Math.sqrt(1 - u * u); return [Math.cos(a) * s * d, u * d, Math.sin(a) * s * d, 0.004 + r() * 0.006, r() > 0.5 ? 1 : 0]; }); }, []);
  useFrame((_, dt) => { if (stars.current && !still) stars.current.rotation.y += dt * 0.25; });
  return (
    <group>
      <mesh geometry={stand} material={m.wood} />
      <group ref={stars} position={[0, 0.39, 0]}>
        {pts.map(([x, y, z, s, blue], i) => (
          <mesh key={i} position={[x, y, z]} material={blue ? m.starBlue : m.star} ref={(o) => tag(o, "contents")}>
            <sphereGeometry args={[s, 8, 6]} />
          </mesh>
        ))}
      </group>
      <mesh material={m.thick} position={[0, 0.39, 0]} ref={(o) => tag(o, "glass")}>
        <sphereGeometry args={[0.245, 64, 48]} />
      </mesh>
    </group>
  );
}

/* ---------- Training: a glass water bottle. ---------- */
const BOTTLE: P[] = [[0.02, 0], [0.12, 0], [0.13, 0.02], [0.13, 0.46], [0.112, 0.53], [0.064, 0.58], [0.058, 0.64]];
export function Bottle({ m, slosh }: ObjProps & { slosh: React.MutableRefObject<number> }) {
  const g = useMemo(() => ({ bottle: shell(BOTTLE, 0.01), water: solid([[0.001, 0.012], [0.119, 0.012], [0.119, 0.34], [0.001, 0.34]]) }), []);
  const water = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!water.current) return;
    const t = clock.elapsedTime - slosh.current;
    water.current.rotation.z = t < 3 ? 0.05 * Math.exp(-t * 1.6) * Math.sin(t * 9) : 0;
  });
  return (
    <group>
      <mesh ref={(o) => { water.current = o; tag(o, "contents"); }} geometry={g.water} material={m.water} />
      <mesh geometry={g.bottle} material={m.glass} ref={(o) => tag(o, "glass")} />
      <mesh material={m.steel} position={[0, 0.675, 0]} ref={(o) => tag(o, "loose")}>
        <cylinderGeometry args={[0.064, 0.064, 0.075, 40]} />
      </mesh>
      <mesh material={m.steel} position={[0, 0.735, 0]} rotation={[0, 0, Math.PI / 2]} ref={(o) => tag(o, "loose")}>
        <torusGeometry args={[0.03, 0.008, 12, 28]} />
      </mesh>
    </group>
  );
}

/* ---------- Life: a wine glass of red wine that sways when touched. ---------- */
const STEMWARE: P[] = [[0.001, 0], [0.15, 0], [0.155, 0.008], [0.03, 0.02], [0.013, 0.045], [0.011, 0.3], [0.03, 0.33], [0.12, 0.38], [0.17, 0.47], [0.176, 0.56], [0.162, 0.66], [0.146, 0.72]];
export function WineGlass({ m, slosh }: ObjProps & { slosh: React.MutableRefObject<number> }) {
  const g = useMemo(() => ({ glass: shell(STEMWARE, 0.007), wine: solid([[0.001, 0.335], [0.03, 0.337], [0.118, 0.386], [0.158, 0.46], [0.164, 0.505], [0.001, 0.505]]) }), []);
  const wine = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!wine.current) return;
    const t = clock.elapsedTime - slosh.current;
    // A liquid in a bowl rocks back and forth and settles: a damped pendulum.
    wine.current.rotation.z = t < 4 ? 0.09 * Math.exp(-t * 1.2) * Math.sin(t * 6.5) : 0;
    wine.current.rotation.x = t < 4 ? 0.05 * Math.exp(-t * 1.4) * Math.sin(t * 5.1 + 1) : 0;
  });
  return (
    <group>
      <group ref={wine} position={[0, 0.5, 0]}>
        <mesh geometry={g.wine} material={m.wine} position={[0, -0.5, 0]} ref={(o) => tag(o, "contents")} />
      </group>
      <mesh geometry={g.glass} material={m.glass} ref={(o) => tag(o, "glass")} />
    </group>
  );
}
