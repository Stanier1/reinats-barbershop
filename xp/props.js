// Procedural props for the film set. Everything is built from primitives, lathes and extruded
// shapes so the page ships no model files. Sizes are in metres; hero tools are deliberately
// oversized so they read like product shots floating in the dark.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V2 = THREE.Vector2, V3 = THREE.Vector3;

export function makeMaterials() {
  return {
    chrome: new THREE.MeshStandardMaterial({ color: 0xf4f6fa, metalness: 1, roughness: 0.12, envMapIntensity: 1.4 }),
    chromeSoft: new THREE.MeshStandardMaterial({ color: 0xd5d9e0, metalness: 1, roughness: 0.3, envMapIntensity: 1.2 }),
    gunmetal: new THREE.MeshStandardMaterial({ color: 0x3b3f47, metalness: 1, roughness: 0.34, envMapIntensity: 1.1 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xeef1f6, metalness: 1, roughness: 0.2, envMapIntensity: 2.4 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd9a94f, metalness: 1, roughness: 0.22, envMapIntensity: 1.3 }),
    gloss: new THREE.MeshStandardMaterial({ color: 0x0b0c0f, metalness: 0.1, roughness: 0.3, envMapIntensity: 1.2 }),
    matte: new THREE.MeshStandardMaterial({ color: 0x131418, roughness: 0.8, envMapIntensity: 0.4 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.55, envMapIntensity: 0.6 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x5e0e15, roughness: 0.42, envMapIntensity: 0.9 }),
    ivory: new THREE.MeshStandardMaterial({ color: 0xe9e1cc, roughness: 0.28, envMapIntensity: 1 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x8a5429, roughness: 0.42, envMapIntensity: 0.9 }),
    towel: new THREE.MeshStandardMaterial({ color: 0xecebe7, roughness: 1, envMapIntensity: 0.5 }),
    plinth: new THREE.MeshStandardMaterial({ color: 0x0e0f12, roughness: 0.5, metalness: 0.3, envMapIntensity: 0.7 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 1.6, depthWrite: false }),
  };
}

/** Unlit material that lands above the bloom threshold, so it glows. */
export const glow = (hex, k = 3) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), toneMapped: false });

function adder(g) {
  return (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m;
  };
}
const extrude = (shape, depth, bevel = 0.004) => {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 28 });
  geo.translate(0, 0, -depth / 2); return geo;
};

/* ------------------------------------------------------------------ Barber pole */
function stripeTexture() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), img = g.createImageData(S, S);
  const cols = [[229, 50, 45], [242, 243, 246], [47, 93, 255], [242, 243, 246]];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const s = ((x + y) / S) % 1, band = s * 4, i = Math.floor(band), f = band - i;
    const a = cols[i % 4], b = cols[(i + 1) % 4], t = Math.max(0, (f - 0.94) / 0.06); // soft edge between bands
    const o = (y * S + x) * 4;
    img.data[o] = a[0] + (b[0] - a[0]) * t; img.data[o + 1] = a[1] + (b[1] - a[1]) * t; img.data[o + 2] = a[2] + (b[2] - a[2]) * t; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 2.2); tex.anisotropy = 8;
  return tex;
}

export function makePole(M) {
  const g = new THREE.Group(), add = adder(g);
  const tex = stripeTexture();
  const stripes = add(new THREE.CylinderGeometry(0.16, 0.16, 1.3, 64, 1, true), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.32, roughness: 0.35 }), 0, 1.95, 0);
  add(new THREE.CylinderGeometry(0.19, 0.19, 1.32, 64, 1, true), M.glass, 0, 1.95, 0);
  add(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 64), M.chrome, 0, 2.66, 0);
  add(new THREE.SphereGeometry(0.2, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), M.chrome, 0, 2.71, 0);
  add(new THREE.SphereGeometry(0.045, 24, 16), M.chrome, 0, 2.95, 0);
  add(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 64), M.chrome, 0, 1.25, 0);
  add(new THREE.CylinderGeometry(0.05, 0.16, 0.18, 48), M.chrome, 0, 1.11, 0);
  add(new THREE.CylinderGeometry(0.028, 0.028, 1.02, 16), M.chromeSoft, 0, 0.51, 0);
  add(new THREE.CylinderGeometry(0.26, 0.3, 0.05, 48), M.chrome, 0, 0.025, 0);
  g.userData.update = (t) => { stripes.rotation.y = -t * 1.1; };
  return g;
}

/* ------------------------------------------------------------------ Barber chair */
export function makeChair(M) {
  const g = new THREE.Group(), add = adder(g);
  add(new THREE.CylinderGeometry(0.42, 0.48, 0.07, 64), M.chrome, 0, 0.035, 0);
  add(new THREE.CylinderGeometry(0.2, 0.27, 0.12, 48), M.chromeSoft, 0, 0.13, 0);
  add(new THREE.CylinderGeometry(0.075, 0.09, 0.36, 32), M.chrome, 0, 0.36, 0);
  add(new RoundedBoxGeometry(0.66, 0.06, 0.62, 3, 0.02), M.chromeSoft, 0, 0.55, 0.02);
  add(new RoundedBoxGeometry(0.62, 0.17, 0.6, 5, 0.075), M.leather, 0, 0.66, 0.03);
  add(new RoundedBoxGeometry(0.6, 0.8, 0.15, 5, 0.065), M.leather, 0, 1.1, -0.3, -0.14);
  add(new RoundedBoxGeometry(0.645, 0.84, 0.05, 3, 0.02), M.chromeSoft, 0, 1.1, -0.385, -0.14);
  add(new RoundedBoxGeometry(0.34, 0.15, 0.13, 4, 0.06), M.leather, 0, 1.66, -0.42, -0.2);
  add(new THREE.CylinderGeometry(0.016, 0.016, 0.22, 12), M.chrome, 0, 1.53, -0.45, -0.2);
  for (const sx of [-1, 1]) {
    add(new RoundedBoxGeometry(0.11, 0.075, 0.58, 4, 0.034), M.leather, sx * 0.38, 0.9, 0.02);
    add(new RoundedBoxGeometry(0.03, 0.03, 0.6, 2, 0.012), M.chrome, sx * 0.38, 0.855, 0.02);
    add(new THREE.CylinderGeometry(0.018, 0.018, 0.24, 12), M.chrome, sx * 0.38, 0.73, 0.22);
    add(new THREE.CylinderGeometry(0.018, 0.018, 0.24, 12), M.chrome, sx * 0.38, 0.73, -0.18);
  }
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.37, 12), M.chrome, 0, 0.43, 0.42, -0.65);
  add(new RoundedBoxGeometry(0.52, 0.03, 0.22, 2, 0.012), M.chrome, 0, 0.27, 0.56, 0.12);
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 10), M.chrome, 0.3, 0.32, 0.1, 0, 0, 0.9);
  add(new THREE.SphereGeometry(0.03, 16, 12), M.rubber, 0.44, 0.43, 0.1);
  return g;
}

/* ------------------------------------------------------------------ Clippers (skin fade) */
export function makeClippers(M, accent) {
  const g = new THREE.Group(), add = adder(g);
  add(new RoundedBoxGeometry(0.42, 1.02, 0.27, 6, 0.12), M.gloss, 0, 0, 0);
  add(new RoundedBoxGeometry(0.5, 0.2, 0.31, 5, 0.07), M.chrome, 0, 0.55, 0);
  add(new RoundedBoxGeometry(0.52, 0.05, 0.07, 2, 0.015), M.chrome, 0, 0.67, 0.1);
  const teeth = new THREE.InstancedMesh(new THREE.BoxGeometry(0.011, 0.085, 0.03), M.chrome, 26);
  const d = new THREE.Object3D();
  for (let i = 0; i < 26; i++) { d.position.set(-0.24 + i * 0.0192, 0.73, 0.11); d.updateMatrix(); teeth.setMatrixAt(i, d.matrix); }
  g.add(teeth);
  for (let i = 0; i < 7; i++) add(new RoundedBoxGeometry(0.436, 0.014, 0.284, 2, 0.006), M.gunmetal, 0, -0.44 + i * 0.05, 0);
  add(new RoundedBoxGeometry(0.05, 0.16, 0.06, 2, 0.02), M.chrome, 0.24, 0.33, 0.02, 0, 0, -0.3);
  add(new RoundedBoxGeometry(0.1, 0.05, 0.03, 2, 0.012), M.chromeSoft, 0, 0.02, 0.14);
  const badge = add(new THREE.CircleGeometry(0.045, 40), glow(accent, 4), 0, 0.2, 0.137);
  add(new THREE.TorusGeometry(0.058, 0.008, 12, 48), M.chrome, 0, 0.2, 0.137);
  const cord = new THREE.CatmullRomCurve3([new V3(0, -0.5, 0), new V3(0, -0.72, 0.02), new V3(0.18, -0.95, 0.12), new V3(0.05, -1.2, 0.25), new V3(-0.25, -1.3, 0.05), new V3(-0.3, -1.55, -0.2)]);
  add(new THREE.TubeGeometry(cord, 140, 0.024, 10), M.rubber);
  add(new THREE.CylinderGeometry(0.05, 0.035, 0.12, 20), M.rubber, 0, -0.55, 0);
  g.userData.badge = badge;
  return g;
}

/* ------------------------------------------------------------------ Scissors (signature cut) */
export function makeScissors(M) {
  const g = new THREE.Group();
  const bladeShape = () => {
    const s = new THREE.Shape();
    s.moveTo(-0.06, 0.08); s.quadraticCurveTo(0.5, 0.075, 1.05, 0.006); s.lineTo(1.06, -0.002);
    s.quadraticCurveTo(0.55, -0.02, 0.02, -0.05); s.lineTo(-0.06, -0.05); s.closePath(); return s;
  };
  const shankShape = () => {
    const s = new THREE.Shape();
    s.moveTo(0.02, 0.05); s.lineTo(-0.36, -0.03); s.quadraticCurveTo(-0.4, -0.05, -0.38, -0.08); s.lineTo(0.03, -0.028); s.closePath(); return s;
  };
  const half = (mirror) => {
    const h = new THREE.Group(), add = adder(h);
    add(extrude(bladeShape(), 0.018, 0.005), M.steel);
    add(extrude(shankShape(), 0.026, 0.007), M.steel);
    add(new THREE.TorusGeometry(0.125, 0.026, 20, 64), M.steel, -0.5, -0.12, 0);
    if (mirror) { add(new THREE.TorusGeometry(0.05, 0.016, 14, 32, Math.PI), M.chrome, -0.58, -0.25, 0, 0, 0, 2.4); }
    const wrap = new THREE.Group(); wrap.add(h); if (mirror) { h.scale.y = -1; wrap.position.z = 0.03; }
    return wrap;
  };
  const a = half(false), b = half(true);
  g.add(a, b);
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.08, 32), M.gold); screw.rotation.x = Math.PI / 2; screw.position.z = 0.015; g.add(screw);
  g.userData.setOpen = (theta) => { a.rotation.z = theta / 2; b.rotation.z = -theta / 2; };
  g.userData.setOpen(0.4);
  return g;
}

/* ------------------------------------------------------------------ Beard kit: comb + oil bottle */
function labelTexture(title, sub) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#101114'; x.fillRect(0, 0, 1024, 256);
  x.fillStyle = '#d9a94f'; x.fillRect(0, 18, 1024, 4); x.fillRect(0, 234, 1024, 4);
  x.fillStyle = '#f1efe9'; x.textAlign = 'center'; x.font = 'italic 400 104px "Instrument Serif", Georgia, serif'; x.fillText(title, 512, 138);
  x.fillStyle = '#d9a94f'; x.font = '700 30px Inter, sans-serif'; if ('letterSpacing' in x) x.letterSpacing = '10px'; x.fillText(sub, 512, 200);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function makeBeardKit(M) {
  const g = new THREE.Group();
  // Comb: one outline with the teeth cut into it, fine on one half, wide on the other.
  const s = new THREE.Shape(), W = 1.1, H = 0.15, T = 0.22;
  s.moveTo(0, H); s.lineTo(W, H); s.quadraticCurveTo(W + 0.03, H, W + 0.03, H - 0.03); s.lineTo(W + 0.03, -T + 0.02); s.lineTo(W, -T); s.lineTo(W - 0.02, 0);
  let x = W - 0.02;
  while (x > 0.06) { const wide = x > W / 2, tw = wide ? 0.022 : 0.012, gap = wide ? 0.026 : 0.014; x -= gap; s.lineTo(x, 0); s.lineTo(x, -T * (wide ? 1 : 0.86)); x -= tw; s.lineTo(x, -T * (wide ? 1 : 0.86)); s.lineTo(x, 0); }
  s.lineTo(0.02, 0); s.lineTo(0, -T * 0.9); s.lineTo(-0.03, -T * 0.9); s.lineTo(-0.03, H - 0.03); s.quadraticCurveTo(-0.03, H, 0, H);
  const comb = new THREE.Mesh(extrude(s, 0.028, 0.006), M.wood);
  comb.geometry.center(); comb.position.set(0.05, -0.25, 0.35); comb.rotation.set(0.1, -0.25, 0.32); g.add(comb);
  // Oil bottle: amber glass, glowing oil, black dropper cap and a printed label.
  const prof = [[0, 0], [0.19, 0], [0.205, 0.02], [0.205, 0.5], [0.19, 0.56], [0.12, 0.64], [0.07, 0.68], [0.07, 0.76], [0, 0.76]].map(([a, b]) => new V2(a, b));
  const bottle = new THREE.Group(); g.add(bottle);
  bottle.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 64), new THREE.MeshStandardMaterial({ color: 0x9c4f12, roughness: 0.06, transparent: true, opacity: 0.72, envMapIntensity: 1.6 })));
  const oil = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.44, 48), new THREE.MeshStandardMaterial({ color: 0x3a1a04, emissive: 0xff8a1a, emissiveIntensity: 0.22, roughness: 0.2 }));
  oil.position.y = 0.25; bottle.add(oil);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.208, 0.208, 0.22, 64, 1, true, -1.2, 2.4), new THREE.MeshStandardMaterial({ map: labelTexture('Beard Oil', 'REINAT’S · HARARE'), roughness: 0.6 }));
  label.position.y = 0.27; bottle.add(label);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.12, 40), M.gloss); cap.position.y = 0.8; bottle.add(cap);
  const bulb = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.12, 8, 24), M.rubber); bulb.position.y = 0.97; bottle.add(bulb);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.01, 10, 40), M.gold); ring.rotation.x = Math.PI / 2; ring.position.y = 0.745; bottle.add(ring);
  bottle.position.set(-0.2, -0.55, -0.15); bottle.scale.setScalar(1.25);
  g.userData.comb = comb;
  return g;
}

/* ------------------------------------------------------------------ Straight razor + rolled towels (hot towel shave) */
export function makeRazor(M) {
  const g = new THREE.Group();
  const blade = new THREE.Shape();
  blade.moveTo(-0.16, 0.03); blade.lineTo(0.95, 0.03); blade.quadraticCurveTo(1.03, 0.03, 1.03, -0.05); blade.lineTo(1.01, -0.2);
  blade.quadraticCurveTo(0.6, -0.235, 0.2, -0.19); blade.quadraticCurveTo(0.08, -0.17, 0.05, -0.05); blade.lineTo(-0.16, -0.02); blade.closePath();
  const bladeG = new THREE.Group(); g.add(bladeG);
  const bm = new THREE.Mesh(extrude(blade, 0.016, 0.004), M.steel); bladeG.add(bm);
  const spine = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.018, 0.03, 2, 0.008), M.gold); spine.position.set(0.44, 0.03, 0); bladeG.add(spine);
  const scale = new THREE.Shape(), L = 1.14, R = 0.1;
  scale.moveTo(0, R); scale.lineTo(-L + R, R); scale.absarc(-L + R, 0, R, Math.PI / 2, Math.PI * 1.5, false); scale.lineTo(0, -R); scale.absarc(0, 0, R, -Math.PI / 2, Math.PI / 2, false);
  for (const z of [-0.03, 0.03]) { const p = new THREE.Mesh(extrude(scale, 0.018, 0.008), M.gloss); p.position.set(0, -0.08, z); g.add(p); }
  const liner = new THREE.Mesh(extrude(scale, 0.036, 0.002), M.ivory); liner.scale.set(0.97, 0.82, 1); liner.position.set(-0.02, -0.08, 0); g.add(liner);
  for (const x of [0, -L + R]) { const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 24), M.gold); pin.rotation.x = Math.PI / 2; pin.position.set(x, x === 0 ? 0 : -0.08, 0); g.add(pin); }
  g.userData.setOpen = (k) => { bladeG.rotation.z = Math.PI * 0.98 * (1 - k); }; // k: 0 folded into the handle, 1 fully open
  g.userData.setOpen(0);
  return g;
}

export function makeTowels(M) {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#ecebe7'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 5; x.beginPath();
  for (let a = 0; a < 26; a += 0.05) { const r = a * 4.6; const px = 128 + Math.cos(a) * r, py = 128 + Math.sin(a) * r; a === 0 ? x.moveTo(px, py) : x.lineTo(px, py); } x.stroke();
  const endTex = new THREE.CanvasTexture(c); endTex.colorSpace = THREE.SRGBColorSpace;
  const end = new THREE.MeshStandardMaterial({ map: endTex, roughness: 1 });
  const geo = new THREE.CylinderGeometry(0.13, 0.13, 0.72, 40);
  [[-0.14, 0.13], [0.14, 0.13], [0, 0.36]].forEach(([px, py]) => { const m = new THREE.Mesh(geo, [M.towel, end, end]); m.rotation.z = Math.PI / 2; m.position.set(px, py, 0); g.add(m); });
  return g;
}

/* ------------------------------------------------------------------ Mirror station */
export function makeMirror(M, videoTex) {
  const g = new THREE.Group(), add = adder(g);
  add(new RoundedBoxGeometry(2.95, 2.0, 0.1, 4, 0.04), M.gloss, 0, 0, 0);
  const glassMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: videoTex }, uHas: { value: videoTex ? 1 : 0 }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D map; uniform float uHas; uniform float uTime; varying vec2 vUv;
      void main(){ vec3 c = uHas > 0.5 ? texture2D(map, vUv).rgb : vec3(0.05);
        vec3 tint = c * vec3(1.06, 1.0, 0.95);
        float sheen = smoothstep(0.35, 0.0, abs(vUv.x - vUv.y * 0.6 - 0.2 + sin(uTime*0.2)*0.05)) * 0.12;
        float v = smoothstep(0.9, 0.3, length(vUv - 0.5)); gl_FragColor = vec4(tint * (0.42 + 0.34 * v) + sheen * 0.6, 1.0); }`
  });
  const glass = add(new THREE.PlaneGeometry(2.62, 1.47), glassMat, 0, 0, 0.056);
  const bulb = glow(0xfff1d6, 3.2), sock = M.chromeSoft;
  const spots = [];
  for (let i = 0; i < 9; i++) spots.push([-1.2 + i * 0.3, 0.93]);
  for (let i = 0; i < 5; i++) { spots.push([-1.41, 0.62 - i * 0.3]); spots.push([1.41, 0.62 - i * 0.3]); }
  spots.forEach(([x, y]) => { add(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 16), sock, x, y, 0.07, Math.PI / 2); add(new THREE.SphereGeometry(0.048, 20, 14), bulb, x, y, 0.11); });
  g.userData.glass = glassMat;
  return g;
}

export function makeCounter(M) {
  const g = new THREE.Group(), add = adder(g);
  add(new RoundedBoxGeometry(3.4, 0.95, 0.66, 4, 0.03), M.gloss, 0, 0.475, 0);
  add(new RoundedBoxGeometry(3.46, 0.04, 0.7, 2, 0.015), M.chromeSoft, 0, 0.97, 0);
  // Barbicide-style jar with combs, and two tonic bottles.
  const jar = new THREE.Group(); jar.position.set(-1.0, 0.99, 0.05); g.add(jar);
  const j = adder(jar);
  j(new THREE.CylinderGeometry(0.12, 0.12, 0.36, 40, 1, true), M.glass, 0, 0.18, 0);
  j(new THREE.CylinderGeometry(0.108, 0.108, 0.27, 40), new THREE.MeshStandardMaterial({ color: 0x0b2a8a, emissive: 0x2f5dff, emissiveIntensity: 1.1, roughness: 0.1, transparent: true, opacity: 0.9 }), 0, 0.14, 0);
  j(new THREE.CylinderGeometry(0.125, 0.125, 0.03, 40), M.chrome, 0, 0.36, 0);
  for (let i = 0; i < 3; i++) j(new RoundedBoxGeometry(0.02, 0.4, 0.07, 2, 0.008), M.gloss, -0.04 + i * 0.04, 0.3, 0, 0, i * 0.5, -0.15 + i * 0.15);
  const prof = [[0, 0], [0.08, 0], [0.085, 0.02], [0.085, 0.24], [0.04, 0.3], [0.03, 0.36], [0, 0.36]].map(([a, b]) => new V2(a, b));
  [[0.9, 0x7a1418], [1.12, 0x155a3a]].forEach(([x, col]) => {
    add(new THREE.LatheGeometry(prof, 40), new THREE.MeshStandardMaterial({ color: col, roughness: 0.05, transparent: true, opacity: 0.85, envMapIntensity: 1.5 }), x, 0.99, 0);
    add(new THREE.CylinderGeometry(0.034, 0.034, 0.05, 20), M.chrome, x, 1.37, 0);
  });
  return g;
}

/* ------------------------------------------------------------------ Shared bits */
export function blobTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t;
}
export function softDot() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
