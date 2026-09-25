"use client";

import { Environment, Lightformer, MeshDistortMaterial, PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getIntensity, INTENSITY_ENERGY } from "@/living/intensity";

type Distort = THREE.MeshPhysicalMaterial & { distort: number; speed: number };

/**
 * Liquid chrome: two metal drops whose surfaces flow, lit by a studio made of light (rendered once).
 * Built to be cheap: one canvas, no transmission, no post processing, resolution that drops when
 * frames are slow, and no rendering at all when it is off screen, the tab is hidden, or motion is reduced.
 */
export default function ChromeScene({ still }: { still: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [dpr, setDpr] = useState(1.5);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={box} className="chrome-canvas">
      <Canvas
        dpr={[1, dpr]}
        frameloop={still ? "demand" : visible ? "always" : "never"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }}
        camera={{ position: [0, 0, 7], fov: 32 }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.1; }}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} />
        <Studio />
        <Drops still={still} />
      </Canvas>
    </div>
  );
}

function Drops({ still }: { still: boolean }) {
  const a = useRef<THREE.Mesh>(null), b = useRef<THREE.Mesh>(null);
  const ma = useRef<Distort>(null), mb = useRef<Distort>(null);
  const { viewport } = useThree();
  const energy = useRef(INTENSITY_ENERGY[getIntensity()]);
  useFrame((state, dt) => {
    // Flow follows the day's pace; the drops lean a little toward the pointer, like liquid in a tilted dish.
    energy.current += (INTENSITY_ENERGY[getIntensity()] - energy.current) * Math.min(1, dt * 2);
    const e = still ? 0 : energy.current;
    for (const m of [ma.current, mb.current]) if (m) { m.speed = 0.5 + e * 1.3; m.distort = 0.28 + e * 0.16; }
    const t = state.clock.elapsedTime;
    const px = still ? 0 : state.pointer.x, py = still ? 0 : state.pointer.y;
    if (a.current) {
      a.current.position.x += (viewport.width * 0.42 + px * 0.25 - a.current.position.x) * Math.min(1, dt * 2.5);
      a.current.position.y += (-0.15 + py * 0.18 + Math.sin(t * 0.4) * 0.08 - a.current.position.y) * Math.min(1, dt * 2.5);
      a.current.rotation.y = t * 0.12;
    }
    if (b.current) {
      b.current.position.x += (viewport.width * 0.14 - px * 0.15 - b.current.position.x) * Math.min(1, dt * 2);
      b.current.position.y += (-viewport.height * 0.36 - py * 0.1 + Math.cos(t * 0.35) * 0.06 - b.current.position.y) * Math.min(1, dt * 2);
    }
  });
  const scaleA = Math.min(1.9, viewport.height * 0.34);
  return (
    <>
      <mesh ref={a} position={[viewport.width * 0.42, -0.15, 0]} scale={[scaleA * 0.86, scaleA, scaleA * 0.86]}>
        <sphereGeometry args={[1, 96, 96]} />
        <MeshDistortMaterial ref={ma as never} color="#e4e6eb" metalness={1} roughness={0.16} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={1.15} distort={0.34} speed={1.2} />
      </mesh>
      <mesh ref={b} position={[viewport.width * 0.14, -viewport.height * 0.36, -0.6]} scale={scaleA * 0.36}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial ref={mb as never} color="#dcdfe5" metalness={1} roughness={0.18} clearcoat={1} clearcoatRoughness={0.05} envMapIntensity={1.1} distort={0.3} speed={1} />
      </mesh>
    </>
  );
}

/**
 * A photographer's studio for chrome: a dome that grades from white overhead to a dark floor (what
 * polished metal mostly reflects), plus three large soft panels for the long bright bands.
 */
function Studio() {
  const dome = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color("#ffffff") }, mid: { value: new THREE.Color("#8d929c") }, bottom: { value: new THREE.Color("#15161a") } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP;
      void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.85, h)) : mix(mid, bottom, smoothstep(0.0, 0.5, -h)); gl_FragColor = vec4(c, 1.0); }`,
  }), []);
  return (
    <Environment resolution={256} frames={1}>
      <mesh material={dome} scale={40}><sphereGeometry args={[1, 32, 16]} /></mesh>
      <Lightformer form="rect" intensity={2.2} position={[0, 6, -3]} rotation-x={Math.PI / 2.4} scale={[16, 5, 1]} />
      <Lightformer form="rect" intensity={1.6} position={[-7, 1, 2]} rotation-y={Math.PI / 2} scale={[5, 14, 1]} />
      <Lightformer form="rect" intensity={1.2} position={[7, 2, -1]} rotation-y={-Math.PI / 2} scale={[4, 14, 1]} />
    </Environment>
  );
}
