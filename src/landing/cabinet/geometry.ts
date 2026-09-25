import * as THREE from "three";

/** A lathe profile point: [radius, height]. */
export type P = [number, number];

/**
 * Turn an outer profile into a glass wall with real thickness: up the outside, back down the
 * inside, so the lathe is a closed solid and light refracts through two surfaces like real glass.
 */
export function shell(outer: P[], wall: number, segments = 64): THREE.LatheGeometry {
  const inner = outer.slice().reverse().map(([r, y]) => [Math.max(0.001, r - wall), y] as P);
  const pts = [...outer, ...inner].map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y));
  const g = new THREE.LatheGeometry(pts, segments);
  g.computeVertexNormals();
  return g;
}

export function solid(profile: P[], segments = 64): THREE.LatheGeometry {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y)), segments);
  g.computeVertexNormals();
  return g;
}

/** A seeded random, so every break of the same object differs only by where it was hit. */
export function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export type Shard = { mesh: THREE.Mesh; v: THREE.Vector3; w: THREE.Vector3; r: number; life: number };

/**
 * Break a glass mesh the way glass breaks: the surface is split into curved pieces around
 * random fracture seeds (a Voronoi partition of its triangles), each piece keeps its original
 * curvature, thickness and material. Returned shards are in world space, centred on themselves.
 */
export function fractureMesh(mesh: THREE.Mesh, pieces: number, rand: () => number): THREE.Mesh[] {
  mesh.updateWorldMatrix(true, false);
  const src = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  src.applyMatrix4(mesh.matrixWorld);
  const pos = src.getAttribute("position") as THREE.BufferAttribute;
  const nor = src.getAttribute("normal") as THREE.BufferAttribute;
  const tris = pos.count / 3;
  const cx = new Float32Array(tris), cy = new Float32Array(tris), cz = new Float32Array(tris);
  for (let t = 0; t < tris; t++) {
    const i = t * 3;
    cx[t] = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    cy[t] = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    cz[t] = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
  }
  const seeds = Array.from({ length: Math.min(pieces, tris) }, () => Math.floor(rand() * tris));
  const owner = new Int32Array(tris);
  for (let t = 0; t < tris; t++) {
    let best = 0, bd = Infinity;
    for (let s = 0; s < seeds.length; s++) {
      const k = seeds[s];
      const d = (cx[t] - cx[k]) ** 2 + (cy[t] - cy[k]) ** 2 + (cz[t] - cz[k]) ** 2;
      if (d < bd) { bd = d; best = s; }
    }
    owner[t] = best;
  }
  const out: THREE.Mesh[] = [];
  const mat = mesh.material as THREE.Material;
  for (let s = 0; s < seeds.length; s++) {
    const idx: number[] = [];
    for (let t = 0; t < tris; t++) if (owner[t] === s) idx.push(t);
    if (!idx.length) continue;
    const p = new Float32Array(idx.length * 9), n = new Float32Array(idx.length * 9);
    let mx = 0, my = 0, mz = 0;
    idx.forEach((t) => { mx += cx[t]; my += cy[t]; mz += cz[t]; });
    mx /= idx.length; my /= idx.length; mz /= idx.length;
    idx.forEach((t, j) => {
      for (let v = 0; v < 3; v++) {
        const i = t * 3 + v, o = j * 9 + v * 3;
        p[o] = pos.getX(i) - mx; p[o + 1] = pos.getY(i) - my; p[o + 2] = pos.getZ(i) - mz;
        n[o] = nor.getX(i); n[o + 1] = nor.getY(i); n[o + 2] = nor.getZ(i);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(n, 3));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.position.set(mx, my, mz);
    out.push(m);
  }
  src.dispose();
  return out;
}

/** A canvas texture, drawn once (the compass rose, the plaque of a label). */
export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
