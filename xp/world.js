// The film set: a dark studio with a checkered floor that runs down -z. Each station sits in its
// own pool of light and the camera travels between them (see SCENES in main.js).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeMaterials, glow, makePole, makeChair, makeClippers, makeScissors, makeBeardKit, makeRazor, makeTowels, makeMirror, makeCounter, blobTexture, softDot } from './props.js';

export const FOG = 0x040507;
export const STATIONS = {
  sign: new THREE.Vector3(0, 2.55, -2.2),
  poleL: new THREE.Vector3(-3.95, 0, -1.9),
  poleR: new THREE.Vector3(3.95, 0, -1.9),
  chair: new THREE.Vector3(0, 0, -12),
  fade: new THREE.Vector3(-2.4, 1.75, -22.2),
  cut: new THREE.Vector3(2.4, 1.75, -32.2),
  beard: new THREE.Vector3(-2.4, 1.7, -42.2),
  shave: new THREE.Vector3(2.4, 1.75, -52.2),
  crew: new THREE.Vector3(0, 1.95, -64.2),
  mirror: new THREE.Vector3(0, 2.02, -76),
  chair2: new THREE.Vector3(0, 0, -71.1),
};
export const CREW = [
  { id: 'tinashe', name: 'Tinashe', img: 'assets/img/barber-tinashe.jpg', x: -3.6 },
  { id: 'kuda', name: 'Kuda', img: 'assets/img/barber-kuda.jpg', x: -1.6 },
  { id: 'rudo', name: 'Rudo', img: 'assets/img/barber-rudo.jpg', x: 1.6 },
  { id: 'farai', name: 'Farai', img: 'assets/img/barber-farai.jpg', x: 3.6 },
];

/* A dark studio for reflections: overhead softbox plus blue and red strips, so chrome picks up the pole colours. */
function studioEnvironment(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: 0x06070a, side: THREE.BackSide })));
  const panel = (w, h, hex, k, p, r) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...p); m.rotation.set(...r); s.add(m); };
  panel(12, 1.4, 0xffffff, 7, [0, 5.8, 0], [Math.PI / 2, 0, 0]);
  panel(3, 1.2, 0xffffff, 4, [0, 5.8, 5], [Math.PI / 2, 0, 0]);
  panel(0.7, 9, 0x3d6bff, 6, [-9.8, 1, -2], [0, Math.PI / 2, 0]);
  panel(0.7, 9, 0xff2d2a, 5, [9.8, 1, 2], [0, -Math.PI / 2, 0]);
  panel(8, 2.4, 0xffffff, 1.2, [0, 2, -9.8], [0, 0, 0]);
  panel(4, 2, 0xffe2c4, 1.4, [0, 1.5, 9.8], [0, Math.PI, 0]);
  const pm = new THREE.PMREMGenerator(renderer), tex = pm.fromScene(s, 0.02).texture; pm.dispose();
  return tex;
}

function checkerTexture(renderer) {
  const S = 1024, n = 8, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const t = S / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const light = (i + j) % 2 === 0;
    x.fillStyle = light ? '#6c6963' : '#0b0c0e'; x.fillRect(i * t, j * t, t, t);
    // a little variation per tile so the floor doesn't look printed
    x.fillStyle = light ? `rgba(0,0,0,${0.02 + Math.random() * 0.05})` : `rgba(255,255,255,${Math.random() * 0.025})`; x.fillRect(i * t, j * t, t, t);
  }
  x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 3;
  for (let i = 0; i <= n; i++) { x.beginPath(); x.moveTo(i * t, 0); x.lineTo(i * t, S); x.stroke(); x.beginPath(); x.moveTo(0, i * t); x.lineTo(S, i * t); x.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); return tex;
}

function slatTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64; const x = c.getContext('2d');
  for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#15161b' : '#101116'; x.fillRect(i * 32, 0, 32, 64); x.fillStyle = '#050507'; x.fillRect(i * 32, 0, 3, 64); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1); return t;
}

/* Neon sign drawn on a canvas with the site's own fonts, then shown additively so it blooms. */
function drawNeon(canvas) {
  const x = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  x.clearRect(0, 0, W, H); x.lineJoin = 'round'; x.lineCap = 'round'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const tube = (draw, col, core, lw) => {
    x.save(); x.shadowColor = col; x.shadowBlur = lw * 7; x.strokeStyle = col; x.globalAlpha = 0.35; x.lineWidth = lw * 2.6; draw(); x.restore();
    x.save(); x.shadowColor = col; x.shadowBlur = lw * 2.2; x.strokeStyle = col; x.lineWidth = lw; draw(); x.restore();
    x.save(); x.strokeStyle = core; x.lineWidth = lw * 0.34; draw(); x.restore();
  };
  x.font = 'italic 400 330px "Instrument Serif", Georgia, serif';
  tube(() => x.strokeText('Reinat’s', W / 2, H * 0.43), '#3a68ff', '#eef3ff', 11);
  x.font = '800 92px "Bricolage Grotesque", Inter, sans-serif'; if ('letterSpacing' in x) x.letterSpacing = '30px';
  tube(() => x.strokeText('BARBER STUDIO', W / 2 + 15, H * 0.76), '#ff2b27', '#ffe6e4', 5.5);
  x.font = '700 40px Inter, sans-serif'; if ('letterSpacing' in x) x.letterSpacing = '16px';
  tube(() => x.strokeText('EST. 2018 · HARARE', W / 2 + 8, H * 0.12), '#f3f0ea', '#ffffff', 2.4);
  if ('letterSpacing' in x) x.letterSpacing = '0px';
  tube(() => { x.beginPath(); x.roundRect(40, 40, W - 80, H - 80, 90); x.stroke(); }, '#3a68ff', '#eef3ff', 5);
}

function beam(from, to, radius, color, strength) {
  const dir = new THREE.Vector3().subVectors(from, to), h = dir.length();
  const geo = new THREE.CylinderGeometry(0.05, radius, h, 48, 1, true);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uK: { value: strength } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY; varying float vD;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vY = uv.y; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uK; varying vec3 vN; varying vec3 vV; varying float vY; varying float vD;
      void main(){ float f = pow(abs(dot(vN, vV)), 2.0); float a = f * mix(0.1, 1.0, vY * vY) * smoothstep(0.0, 0.18, vY);
        a *= exp(-pow(vD * 0.035, 2.0)) * smoothstep(0.4, 2.5, vD); gl_FragColor = vec4(uColor * a * uK, a * uK); }`
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(from).add(to).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

function spot(scene, from, to, intensity, angle, color = 0xfff4e6) {
  const l = new THREE.SpotLight(color, intensity, 0, angle, 0.55, 1.6);
  l.position.copy(from); l.target.position.copy(to); scene.add(l, l.target); return l;
}

function crewMaterial(tex) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uHover: { value: 0 }, uTime: { value: 0 }, uHas: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D map; uniform float uHover; uniform float uTime; uniform float uHas; varying vec2 vUv;
      void main(){ vec2 uv = vUv; float w = uHover * 0.012 * sin(uv.y * 22.0 + uTime * 4.0); uv.x += w; uv = mix(vec2(0.5), uv, 1.0 - 0.04 * uHover);
        vec3 c = uHas > 0.5 ? texture2D(map, uv).rgb : vec3(0.03); float l = dot(c, vec3(0.299, 0.587, 0.114));
        vec3 g = vec3(l) * vec3(0.92, 0.96, 1.06); c = mix(g, c, uHover);
        float v = smoothstep(1.0, 0.35, length(vUv - 0.5)); gl_FragColor = vec4(c * (0.7 + 0.3 * v) * (0.9 + 0.35 * uHover), 1.0); }`
  });
}

export function buildWorld(renderer, { small }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(FOG);
  scene.fog = new THREE.FogExp2(FOG, 0.045);
  scene.environment = studioEnvironment(renderer);
  const M = makeMaterials();
  const interactive = [];
  const updaters = [];
  scene.add(new THREE.HemisphereLight(0x9fb3ff, 0x0a0806, 0.06));

  // Floor
  const floorTex = checkerTexture(renderer); floorTex.repeat.set(40 / 4, 110 / 4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 110), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.34, metalness: 0.05, envMapIntensity: 0.12 }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = -36; scene.add(floor);
  const blob = blobTexture();
  const shadow = (x, z, s, o = 1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false, opacity: o })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.004, z); scene.add(m); return m; };

  /* ---------- Opening: neon sign on a slatted wall between two poles ---------- */
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 6.2), new THREE.MeshStandardMaterial({ map: slatTexture(), roughness: 0.85, metalness: 0, envMapIntensity: 0.08 }));
  wall.position.set(0, 3.1, -2.55); scene.add(wall);
  const neonCanvas = document.createElement('canvas'); neonCanvas.width = 2048; neonCanvas.height = 1024; drawNeon(neonCanvas);
  const neonTex = new THREE.CanvasTexture(neonCanvas); neonTex.colorSpace = THREE.SRGBColorSpace;
  const neonMat = new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(2.4, 2.4, 2.4) });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.8), neonMat); sign.position.copy(STATIONS.sign); scene.add(sign);
  if (document.fonts) document.fonts.ready.then(() => { drawNeon(neonCanvas); neonTex.needsUpdate = true; });
  const signLight = new THREE.PointLight(0x4a74ff, 5, 12, 1.8); signLight.position.set(0, 2.7, -0.4); scene.add(signLight);
  const signRed = new THREE.PointLight(0xff3a30, 2.2, 8, 1.8); signRed.position.set(0, 1.2, -0.6); scene.add(signRed);
  const poles = [makePole(M, !small), makePole(M, !small)];
  poles[0].position.copy(STATIONS.poleL); poles[1].position.copy(STATIONS.poleR); scene.add(...poles);
  poles.forEach((p) => { shadow(p.position.x, p.position.z, 1.4); updaters.push((t) => p.userData.update(t)); });
  interactive.push({ obj: sign, kind: 'sign', label: 'Flick' });

  /* ---------- Chair under a spotlight ---------- */
  const chair = makeChair(M); chair.position.copy(STATIONS.chair); chair.rotation.y = 0.35; scene.add(chair);
  shadow(STATIONS.chair.x, STATIONS.chair.z, 2.2);
  const chairTop = new THREE.Vector3(0.3, 6.2, -11.2), chairAim = new THREE.Vector3(0, 0, -12);
  spot(scene, chairTop, new THREE.Vector3(0, 0.6, -12), 28, 0.42);
  scene.add(beam(chairTop, chairAim, 1.6, 0xfff1dc, 0.09));
  interactive.push({ obj: chair, kind: 'spin', label: 'Spin' });

  /* ---------- Hero tools on plinths, each with its own ring of light ---------- */
  const tools = {};
  const station = (key, obj, accent, scale = 1, opts = {}) => {
    const p = STATIONS[key];
    const plinth = new THREE.Group(); plinth.position.set(p.x, 0, p.z); scene.add(plinth);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.9, 64), M.plinth); col.position.y = 0.45; plinth.add(col);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.01, 10, 96), glow(accent, 3)); lip.rotation.x = Math.PI / 2; lip.position.y = 0.905; plinth.add(lip);
    shadow(p.x, p.z, 2.4);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.016, 12, 200), glow(accent, 3.2)); ring.position.set(p.x, p.y, p.z - 1.5); scene.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.006, 8, 200), glow(accent, 1.4)); ring2.position.copy(ring.position); scene.add(ring2);
    const top = new THREE.Vector3(p.x + (p.x > 0 ? -0.8 : 0.8), 6.2, p.z + 1.4);
    spot(scene, top, new THREE.Vector3(p.x, p.y - 0.2, p.z), 26, 0.34);
    scene.add(beam(top, new THREE.Vector3(p.x, 0, p.z), 1.25, 0xf2f4ff, 0.075));
    if (!small) { const rim = new THREE.PointLight(accent, 3, 5, 2); rim.position.set(p.x, p.y + 0.3, p.z - 1.1); scene.add(rim); } // phones skip rim lights
    const holder = new THREE.Group(); holder.position.copy(p); holder.add(obj); obj.scale.setScalar(scale); scene.add(holder);
    const t = { holder, obj, ring, ring2, spin: 0, turn: 0, base: p.clone(), sway: !!opts.sway, face: opts.face || 0 };
    tools[key] = t; interactive.push({ obj: holder, kind: 'tool', key, label: 'Drag' });
    return t;
  };
  const clippers = makeClippers(M, 0x3a68ff); clippers.rotation.set(0.12, 0, -0.42);
  station('fade', clippers, 0x3a68ff, 0.95);
  const scissors = makeScissors(M); scissors.rotation.set(0.1, 0, 0.8); scissors.position.set(-0.15, -0.12, 0);
  station('cut', scissors, 0xff2b27, 0.92, { sway: true, face: -0.32 });
  const kit = makeBeardKit(M); kit.rotation.set(0.05, 0.5, 0);
  station('beard', kit, 0xffb15a, 1, { sway: true, face: 0.32 });
  const razor = makeRazor(M); razor.rotation.set(0, 0, 0.35); razor.position.set(0.2, 0.05, 0);
  station('shave', razor, 0x8fb0ff, 0.95, { sway: true, face: -0.32 });
  const towels = makeTowels(M); towels.position.set(STATIONS.shave.x, 0.9, STATIONS.shave.z); towels.rotation.y = 0.4; scene.add(towels);
  // Steam off the hot towels
  const dot = softDot(), steam = [];
  for (let i = 0; i < (small ? 22 : 38); i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, transparent: true, depthWrite: false, color: 0xe4ebff, opacity: 0 }));
    s.userData = { phase: Math.random(), dx: (Math.random() - 0.5) * 0.7, dz: (Math.random() - 0.5) * 0.5, sp: 0.12 + Math.random() * 0.1 };
    scene.add(s); steam.push(s);
  }

  /* ---------- Crew wall ---------- */
  const loader = new THREE.TextureLoader();
  const crew = CREW.map((c) => {
    const tex = loader.load(c.img, () => { mat.uniforms.uHas.value = 1; }); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const mat = crewMaterial(tex);
    const g = new THREE.Group();
    const z = STATIONS.crew.z + Math.abs(c.x) * 0.16;
    g.position.set(c.x, STATIONS.crew.y, z); g.lookAt(0, STATIONS.crew.y, -57);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.875), mat); g.add(plane);
    const frame = new THREE.Mesh(new RoundedBoxGeometry(1.62, 1.995, 0.05, 2, 0.015), M.matte); frame.position.z = -0.03; g.add(frame);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.012), glow(0x3a68ff, 3)); tag.position.set(0, -1.06, 0.01); g.add(tag);
    scene.add(g); shadow(c.x, z + 0.4, 1.8, 0.6);
    const item = { ...c, group: g, mat, hover: 0 };
    interactive.push({ obj: plane, kind: 'crew', item, label: 'Meet' });
    return item;
  });
  spot(scene, new THREE.Vector3(0, 6.5, -58.5), new THREE.Vector3(0, 1.9, -64.2), 34, 0.72, 0xf1f3ff);

  /* ---------- Mirror station: the glass plays real studio footage ---------- */
  let video = null, videoTex = null;
  const mirror = makeMirror(M, null); mirror.position.copy(STATIONS.mirror); scene.add(mirror);
  const counter = makeCounter(M); counter.position.set(0, 0, STATIONS.mirror.z + 0.42); scene.add(counter);
  shadow(0, STATIONS.mirror.z + 0.5, 3.6);
  const warm = new THREE.PointLight(0xffe2b8, 4, 7, 1.8); warm.position.set(0, 2.4, STATIONS.mirror.z + 1.3); scene.add(warm);
  const loadVideo = () => {
    if (video) return; video = document.createElement('video');
    Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' });
    video.setAttribute('muted', ''); video.setAttribute('playsinline', ''); video.src = 'assets/film/studio.mp4';
    videoTex = new THREE.VideoTexture(video); videoTex.colorSpace = THREE.SRGBColorSpace;
    video.addEventListener('playing', () => { mirror.userData.glass.uniforms.map.value = videoTex; mirror.userData.glass.uniforms.uHas.value = 1; }, { once: true });
    const p = video.play(); if (p && p.catch) p.catch(() => {});
  };

  /* ---------- The empty chair for the last shot ---------- */
  const chair2 = makeChair(M); chair2.position.copy(STATIONS.chair2); chair2.rotation.y = Math.PI; scene.add(chair2);
  shadow(0, STATIONS.chair2.z, 2.2);
  const c2Top = new THREE.Vector3(0, 6.2, -72);
  spot(scene, c2Top, new THREE.Vector3(0, 0.6, STATIONS.chair2.z), 26, 0.42);
  scene.add(beam(c2Top, new THREE.Vector3(0, 0, STATIONS.chair2.z), 1.6, 0xfff1dc, 0.08));
  interactive.push({ obj: chair2, kind: 'spin', label: 'Spin' });

  /* ---------- Dust hanging in the light ---------- */
  const N = small ? 900 : 1800, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 14; pos[i * 3 + 1] = Math.random() * 5.2; pos[i * 3 + 2] = 10 - Math.random() * 92; seed[i] = Math.random(); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); dg.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float seed; uniform float uTime; uniform float uPx; varying float vA;
      void main(){ vec3 p = position; float t = uTime * (0.05 + seed * 0.08);
        p.x += sin(t * 3.0 + seed * 40.0) * 0.35; p.y = mod(p.y + t * 0.6, 5.2); p.z += cos(t * 2.0 + seed * 20.0) * 0.3;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); float d = -mv.z; vA = (0.25 + 0.75 * seed) * smoothstep(0.5, 3.0, d) * exp(-pow(d * 0.05, 2.0));
        gl_PointSize = uPx * (1.2 + seed * 2.6) * (6.0 / max(d, 0.5)); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(c)) * vA; gl_FragColor = vec4(vec3(1.0, 0.96, 0.9) * a * 0.9, a); }`
  });
  scene.add(new THREE.Points(dg, dustMat));

  /* ---------- Per-frame animation ---------- */
  let signFlicker = 1;
  function update(t, dt, st) {
    updaters.forEach((u) => u(t));
    dustMat.uniforms.uTime.value = t;
    // Neon: stutters on during the intro, then the odd buzz.
    const intro = st.introT;
    if (intro < 1) signFlicker = intro < 0.15 ? 0 : (Math.sin(t * 60) > 0.2 || intro > 0.7 ? Math.min(1, intro * 1.3) : 0.12);
    else signFlicker = Math.random() < 0.004 ? 0.35 : Math.min(1, signFlicker + dt * 6);
    if (st.signFlick > 0) signFlicker = Math.random() > 0.5 ? 0.15 : 1;
    const k = 2.4 * signFlicker; neonMat.color.setRGB(k, k, k); signLight.intensity = 5 * signFlicker; signRed.intensity = 2.2 * signFlicker;

    for (const [key, tl] of Object.entries(tools)) {
      const near = st.near(key);                       // 1 while its scene is on screen
      tl.spin *= Math.pow(0.08, dt);
      tl.turn += tl.spin * dt;
      tl.holder.rotation.y = tl.sway ? tl.face + Math.sin(t * 0.55 + tl.base.z) * 0.45 + tl.turn : tl.face + t * (0.25 + 0.4 * (1 - near)) + tl.turn;
      tl.holder.position.y = tl.base.y + Math.sin(t * 1.1 + tl.base.z) * 0.05;
      tl.ring.rotation.z = t * 0.2; tl.ring2.rotation.x = Math.sin(t * 0.4 + tl.base.z) * 0.3; tl.ring2.rotation.y = t * 0.25;
      tl.ring.scale.setScalar(1 + 0.04 * Math.sin(t * 2 + tl.base.z));
    }
    // Clippers buzz while their scene is up
    const fz = tools.fade, buzz = st.near('fade') * (st.buzz ? 1 : 0.35);
    fz.obj.position.set((Math.random() - 0.5) * 0.012 * buzz, (Math.random() - 0.5) * 0.012 * buzz, 0);
    clippers.userData.badge.material.color.setRGB(0.23 * 4, 0.41 * 4, 4).multiplyScalar(0.6 + 0.4 * Math.sin(t * 8));
    // Scissors snip as you scroll through their scene
    const cf = st.local('cut');
    scissors.userData.setOpen(cf != null ? 0.06 + 0.6 * (0.5 + 0.5 * Math.cos(cf * Math.PI * 5)) : 0.36 + 0.08 * Math.sin(t));
    // Razor unfolds on arrival
    const sf = st.local('shave');
    razor.userData.setOpen(sf != null ? Math.min(1, Math.max(0, sf * 1.6)) : 0.08 + 0.05 * Math.sin(t * 0.8));
    kit.userData.comb.rotation.y = -0.25 + Math.sin(t * 0.7) * 0.25;
    // Steam
    const sp = STATIONS.shave;
    steam.forEach((s) => {
      const u = s.userData, life = (t * u.sp + u.phase) % 1;
      s.position.set(sp.x + u.dx * (0.6 + life), 1.25 + life * 2.1, sp.z + u.dz);
      s.scale.setScalar(0.25 + life * 0.8); s.material.opacity = Math.sin(life * Math.PI) * 0.05 * (0.4 + 0.6 * st.near('shave'));
    });
    // Crew hover
    crew.forEach((c) => { c.hover += ((st.hoverCrew === c ? 1 : 0) - c.hover) * Math.min(1, dt * 6); c.mat.uniforms.uHover.value = c.hover; c.mat.uniforms.uTime.value = t; });
    if (mirror.userData.glass) mirror.userData.glass.uniforms.uTime.value = t;
    if (st.c > 5.2) loadVideo();
    if (video && video.paused && st.c > 5.2 && !document.hidden) { const p = video.play(); if (p && p.catch) p.catch(() => {}); }
    [chair, chair2].forEach((ch) => { const s = ch.userData.spin || 0; ch.rotation.y += s * dt; ch.userData.spin = s * Math.pow(0.15, dt); });
  }

  return { scene, interactive, tools, crew, update, pauseVideo: () => video && video.pause() };
}
