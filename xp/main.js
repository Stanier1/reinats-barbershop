// "The Cut": the home page as one continuous scroll-driven film. A fixed WebGL canvas renders the
// studio; scrolling moves the camera from scene to scene while HTML title cards (real, readable,
// linkable text) fade in over each shot. If WebGL or motion isn't available the same title cards
// render as a normal page, so nothing depends on this file.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { buildWorld } from './world.js';
import { createSound } from './sound.js';

const docEl = document.documentElement;
const SCENES = [
  { id: 'open', title: 'Opening titles', hold: 40, travel: 80, pos: [0, 1.7, 7.6], tgt: [0, 2.25, -2.2], frame: 'top' },
  { id: 'origin', title: 'The origin', hold: 60, travel: 80, pos: [5.75, 2.15, 1.0], tgt: [3.95, 1.95, -1.9], frame: 'left' },
  { id: 'chair', title: 'The chair', hold: 60, travel: 80, pos: [2.25, 1.7, -9.3], tgt: [0, 0.95, -12], frame: 'right' },
  { id: 'fade', title: 'Skin Fade', hold: 60, travel: 70, pos: [-1.2, 1.92, -18.6], tgt: [-2.4, 1.72, -22.2], frame: 'left' },
  { id: 'cut', title: 'Signature Cut', hold: 60, travel: 70, pos: [1.2, 1.92, -28.6], tgt: [2.4, 1.72, -32.2], frame: 'right' },
  { id: 'beard', title: 'Beard Trim & Line', hold: 60, travel: 70, pos: [-1.2, 1.88, -38.6], tgt: [-2.4, 1.62, -42.2], frame: 'left' },
  { id: 'shave', title: 'Hot Towel Shave', hold: 60, travel: 80, pos: [1.2, 1.92, -48.6], tgt: [2.4, 1.62, -52.2], frame: 'right' },
  { id: 'crew', title: 'The crew', hold: 90, travel: 80, pos: [0, 1.95, -57.2], tgt: [0, 1.95, -64.2], frame: 'top' },
  { id: 'mirror', title: 'The mirror', hold: 70, travel: 90, pos: [-1.1, 1.85, -71.4], tgt: [0.3, 1.9, -76], frame: 'right' },
  { id: 'finale', title: 'Your chair', hold: 70, travel: 0, pos: [0.9, 1.5, -75.0], tgt: [0, 0.9, -64], frame: 'right', subj: 4 },
];
const N = SCENES.length, IDX = Object.fromEntries(SCENES.map((s, i) => [s.id, i]));
const SCALE = 0.85, RUNTIME = 180;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t) => t * t * (3 - 2 * t);

const FilmShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uAb: { value: 0.012 }, uDim: { value: 0 }, uExposure: { value: 1.12 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  // One pass does it all: lens fringing, ACES tone mapping, sRGB, vignette, grain (saves a full-screen OutputPass).
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; uniform float uAb; uniform float uDim; uniform float uExposure; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    vec3 rrt(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
    vec3 aces(vec3 c){ const mat3 I = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
      const mat3 O = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
      c *= uExposure / 0.6; return clamp(O * rrt(I * c), 0.0, 1.0); }
    vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main(){ vec2 d = vUv - 0.5; float r2 = dot(d, d); vec2 o = d * r2 * uAb * 4.0;
      vec3 c = vec3(texture2D(tDiffuse, vUv + o).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - o).b);
      c = srgb(aces(c));
      float lum = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(lum), c, 1.18);            // vibrance
      c = c + vec3(0.045, 0.02, 0.07) * (1.0 - smoothstep(0.0, 0.35, lum));                  // shadows lift to violet, never flat black
      c *= mix(1.0, smoothstep(0.95, 0.2, sqrt(r2) * 1.15), 0.42);
      c += (h(vUv * uRes + fract(uTime * 7.0) * 91.0) - 0.5) * 0.05;
      gl_FragColor = vec4(c * (1.0 - uDim), 1.0); }`
};

function boot() {
  if (!docEl.classList.contains('xp-live')) return;
  const track = document.querySelector('[data-xp-track]'); if (!track) return;
  const canvas = document.createElement('canvas'); canvas.className = 'xp-canvas'; canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const fail = () => { docEl.classList.remove('xp-live'); canvas.remove(); track.style.height = ''; document.querySelector('.xp-leader')?.remove(); };
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); }
  catch (e) { fail(); return; }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail(); });

  const q = new URLSearchParams(location.search).get('xpq');
  const coarse = matchMedia('(pointer: coarse)').matches;
  let W = innerWidth, H = innerHeight, small = W < 760 || coarse;
  const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  const lowGPU = small || /Intel|Mali|Adreno|PowerVR|SwiftShader|llvmpipe|Basic Render|Radeon\(TM\) (R[2-7]|Vega [3-8]) /i.test(gpu);
  // Always render at the screen's native pixel density (capped at 2x) so edges and neon stay crisp.
  const DPR = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR); renderer.setSize(W, H, false);

  let world;
  try { world = buildWorld(renderer, { small }); } catch (e) { fail(); return; }
  const { scene } = world;
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.08, 200);

  const rt = new THREE.WebGLRenderTarget(W * DPR, H * DPR, { type: THREE.HalfFloatType, samples: q === 'high' || !lowGPU ? 4 : 0 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(DPR); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.6, 0.5, 0.95); composer.addPass(bloom);
  // Glow is a blur, so on weaker GPUs it runs at half its usual internal size; it stays on, the neon depends on it.
  if (lowGPU) { const set = bloom.setSize.bind(bloom); bloom.setSize = (w, h) => set(Math.round(w / 2), Math.round(h / 2)); }
  const film = new ShaderPass(FilmShader); composer.addPass(film);
  // FXAA smooths edges whenever multisampling is off (weaker GPUs), at almost no cost.
  const fxaa = new FXAAPass(); fxaa.enabled = rt.samples === 0; composer.addPass(fxaa);

  /* ---------- Camera stops: CatmullRom through the positions, slerp between orientations ---------- */
  const posCurve = new THREE.CatmullRomCurve3(SCENES.map((s) => new THREE.Vector3(...s.pos)), false, 'centripetal', 0.5);
  const m4 = new THREE.Matrix4(), UP = new THREE.Vector3(0, 1, 0);
  const quats = SCENES.map((s) => new THREE.Quaternion().setFromRotationMatrix(m4.lookAt(new THREE.Vector3(...s.pos), new THREE.Vector3(...s.tgt), UP)));
  // How far the subject is; phones pull back by a share of this (never past the set behind the camera).
  const dists = SCENES.map((s) => s.subj || new THREE.Vector3(...s.pos).distanceTo(new THREE.Vector3(...s.tgt)));

  /* ---------- Scroll track ---------- */
  let unit = 1, total = 1, trackTop = 0;
  const layout = () => {
    unit = (innerHeight / 100) * SCALE;
    total = SCENES.reduce((a, s) => a + (s.hold + s.travel) * unit, 0);
    track.style.height = Math.round(total + innerHeight) + 'px';
    trackTop = track.getBoundingClientRect().top + scrollY;
  };
  layout();
  const locate = (y) => {
    let acc = 0;
    for (let i = 0; i < N; i++) {
      const h = SCENES[i].hold * unit, tr = SCENES[i].travel * unit;
      if (y < acc + h || i === N - 1) return { i, hold: true, f: clamp((y - acc) / h), c: i };
      acc += h;
      if (y < acc + tr) { const f = (y - acc) / tr; return { i, hold: false, f, c: i + ease(f) }; }
      acc += tr;
    }
  };
  const yFor = (k) => { let acc = 0; for (let i = 0; i < k; i++) acc += (SCENES[i].hold + SCENES[i].travel) * unit; return trackTop + acc + SCENES[k].hold * unit * 0.35; };

  /* ---------- Title cards + HUD ---------- */
  const cards = [...document.querySelectorAll('[data-scene]')];
  const hud = { n: document.querySelector('[data-hud-n]'), title: document.querySelector('[data-hud-title]'), tc: document.querySelector('[data-hud-tc]'), bar: document.querySelector('[data-hud-bar]') };
  const rail = document.querySelector('[data-xp-rail]');
  const go = (k) => { const y = yFor(k); window.RBLenis ? window.RBLenis.scrollTo(y, { duration: 1.6 }) : scrollTo({ top: y, behavior: 'smooth' }); };
  if (rail) SCENES.forEach((s, k) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'xp-rail__tick'; b.setAttribute('aria-label', `Scene ${k}: ${s.title}`);
    b.innerHTML = `<span>${String(k).padStart(2, '0')}</span>`; b.addEventListener('click', () => go(k)); rail.appendChild(b);
  });
  const ticks = rail ? [...rail.children] : [];
  document.querySelectorAll('[data-xp-go]').forEach((b) => b.addEventListener('click', () => go(+b.dataset.xpGo)));
  const dim = document.querySelector('[data-xp-dim]'), hudEl = document.querySelector('.xp-hud');

  /* ---------- Sound ---------- */
  const sound = createSound();
  const sBtn = document.querySelector('[data-xp-sound]'), sLbl = sBtn && sBtn.querySelector('[data-sound-label]');
  if (sBtn) sBtn.addEventListener('click', () => { const on = sound.toggle(); sBtn.setAttribute('aria-pressed', String(!!on)); sBtn.classList.toggle('is-on', !!on); if (sLbl) sLbl.textContent = on ? 'Sound on' : 'Sound off'; });

  /* ---------- Pointer: parallax, hover, drag to spin, click ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(9, 9);
  const mouse = { x: 0, y: 0, sx: 0, sy: 0, moved: false };
  let hover = null, drag = null, lastX = 0, downAt = 0, downX = 0, downY = 0;
  const setCursor = (label) => { canvas.style.cursor = label ? (label === 'Drag' ? (drag ? 'grabbing' : 'grab') : 'pointer') : ''; window.dispatchEvent(new CustomEvent('xp:cursor', { detail: label || '' })); };
  canvas.addEventListener('pointermove', (e) => {
    ndc.set((e.clientX / W) * 2 - 1, -(e.clientY / H) * 2 + 1); mouse.x = ndc.x; mouse.y = ndc.y; mouse.moved = true;
    if (drag) { const dx = e.clientX - lastX; lastX = e.clientX; if (drag.kind === 'tool') world.tools[drag.key].spin += dx * 0.9; else drag.obj.userData.spin = (drag.obj.userData.spin || 0) + dx * 0.25; }
  });
  canvas.addEventListener('pointerleave', () => { ndc.set(9, 9); hover = null; setCursor(''); });
  canvas.addEventListener('pointerdown', (e) => {
    downAt = performance.now(); downX = e.clientX; downY = e.clientY; lastX = e.clientX;
    if (hover && (hover.kind === 'tool' || hover.kind === 'spin') && e.pointerType === 'mouse') { drag = hover; canvas.setPointerCapture(e.pointerId); setCursor('Drag'); e.preventDefault(); }
  });
  const release = (e) => {
    const tap = performance.now() - downAt < 300 && Math.hypot(e.clientX - downX, e.clientY - downY) < 8;
    if (drag) { try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ } drag = null; }
    if (!tap || !hover) return;
    if (hover.kind === 'crew') location.href = 'about.html#' + hover.item.id;
    else if (hover.kind === 'sign') signFlick = 0.5;
    else if (hover.kind === 'tool') { world.tools[hover.key].spin += 14; if (hover.key === 'cut') sound.snip(); if (hover.key === 'shave') sound.shing(); if (hover.key === 'fade') buzzKick = 0.6; }
    else if (hover.kind === 'spin') hover.obj.userData.spin = (hover.obj.userData.spin || 0) + 4;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => { drag = null; });
  const pickables = world.interactive.map((it) => it.obj);
  function pick() {
    if (ndc.x > 2) return;
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, true)[0];
    let found = null;
    if (hit && hit.distance < 14) { let o = hit.object; while (o && !found) { found = world.interactive.find((it) => it.obj === o) || null; o = o.parent; } }
    if (found !== hover) { hover = found; setCursor(found ? (found.kind === 'crew' ? found.item.name : found.label) : ''); }
  }

  /* ---------- Resize ---------- */
  const resize = () => {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false); composer.setSize(W, H); film.uniforms.uRes.value.set(W * DPR, H * DPR);
    camera.aspect = W / H; camera.fov = W / H < 1 ? 54 : 42; camera.updateProjectionMatrix();
    layout();
  };
  addEventListener('resize', resize); resize();

  /* ---------- Loop ---------- */
  const leader = document.querySelector('.xp-leader');
  const started = performance.now();
  let ema = 0;
  let sp = -1, last = performance.now(), introT = 0, signFlick = 0, buzzKick = 0, frames = 0, lastScene = -1, lastSnip = -1, shinged = false, prevC = 0;
  const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), offs = { x: 0, y: 0 };
  let st = null;
  const state = {
    introT: 0, c: 0, buzz: false, signFlick: 0, hoverCrew: null,
    near: (key) => clamp(1 - Math.abs(state.c - IDX[key]) * 1.5),
    local: (key) => { const k = IDX[key]; if (!st) return null; if (st.i === k) return st.hold ? st.f : 1; if (st.i === k - 1 && !st.hold && st.f > 0.5) return 0; return null; },
  };

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const rawDt = (now - last) / 1000, dt = Math.min(0.05, rawDt); last = now;
    const t = (now - started) / 1000;
    introT = clamp((now - started - 250) / 2600);

    const y = clamp(scrollY - trackTop, 0, total);
    sp = sp < 0 ? y : sp + (y - sp) * (1 - Math.exp(-Math.min(0.5, rawDt) * 9)); // time-based, so slow devices never lag behind the scroll
    st = locate(sp);
    const c = st.c; state.c = c; state.introT = introT;
    const vel = Math.abs(c - prevC) / Math.max(dt, 1e-3); prevC = c;

    // Camera: position along the curve, orientation slerped between the two nearest stops.
    const i0 = Math.min(N - 1, Math.floor(c)), i1 = Math.min(N - 1, i0 + 1), e = c - i0;
    posCurve.getPoint(c / (N - 1), pos);
    quat.slerpQuaternions(quats[i0], quats[i1], e);
    fwd.set(0, 0, -1).applyQuaternion(quat); right.set(1, 0, 0).applyQuaternion(quat); up.set(0, 1, 0).applyQuaternion(quat);
    const aspect = W / H, portrait = aspect < 1;
    if (st.hold) {
      const s = SCENES[st.i], f = smooth(st.f);
      if (s.id === 'crew') { const span = portrait ? 3.6 : 0.6; pos.x += (f * 2 - 1) * span; }
      else pos.addScaledVector(fwd, f * 0.35).addScaledVector(right, Math.sin(st.f * Math.PI) * 0.12);
    }
    if (portrait) pos.addScaledVector(fwd, -Math.min(1.6, (dists[i0] * (1 - e) + dists[i1] * e) * (1 - aspect) * 0.42));
    pos.z += (1 - smooth(introT)) * 3.2; pos.y += (1 - smooth(introT)) * 0.35;
    mouse.sx += (mouse.x - mouse.sx) * Math.min(1, dt * 3); mouse.sy += (mouse.y - mouse.sy) * Math.min(1, dt * 3);
    if (!coarse) pos.addScaledVector(right, mouse.sx * 0.16).addScaledVector(up, mouse.sy * 0.1);
    camera.position.copy(pos); camera.quaternion.copy(quat);
    if (!coarse) { camera.rotateY(-mouse.sx * 0.025); camera.rotateX(mouse.sy * 0.018); }

    // Frame the subject left or right of centre (or higher on phones) so the title card has room.
    const fo = (k) => { const fr = SCENES[k].frame; if (fr === 'center') return [0, portrait ? H * 0.06 : 0]; if (fr === 'top') return [0, H * (portrait ? 0.16 : 0.13)]; return portrait ? [0, H * 0.13] : [fr === 'left' ? W * 0.17 : -W * 0.17, 0]; };
    const a = fo(i0), b = fo(i1);
    offs.x = a[0] + (b[0] - a[0]) * e; offs.y = a[1] + (b[1] - a[1]) * e;
    camera.setViewOffset(W, H, offs.x, offs.y, W, H);

    // Title cards (the last one bows out as the credits roll in)
    const past = clamp((scrollY - (trackTop + total)) / (innerHeight * 0.8));
    cards.forEach((card, k) => {
      const o = clamp(1 - Math.abs(c - k) * 2.4) * clamp(1 - past * 2.5);
      if (card._o !== o) { card._o = o; card.style.opacity = o.toFixed(3); card.style.visibility = o < 0.01 ? 'hidden' : 'visible'; card.style.transform = `translate3d(0, ${((c - k) * -70).toFixed(1)}px, 0)`; card.classList.toggle('is-on', o > 0.6); }
    });
    const cur = Math.round(c);
    if (cur !== lastScene) {
      lastScene = cur; sound.scene(cur);
      if (hud.n) hud.n.textContent = String(cur).padStart(2, '0'); if (hud.title) hud.title.textContent = SCENES[cur].title;
      ticks.forEach((tk, k) => { tk.classList.toggle('is-current', k === cur); if (k === cur) tk.setAttribute('aria-current', 'step'); else tk.removeAttribute('aria-current'); });
    }
    const p = sp / total;
    if (hud.bar) hud.bar.style.transform = `scaleX(${p.toFixed(4)})`;
    if (hud.tc) { const s = p * RUNTIME, fr = Math.floor((s % 1) * 24); hud.tc.textContent = `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}:${String(fr).padStart(2, '0')}`; }

    // Credits: fade the film out as the footer rolls in.
    film.uniforms.uDim.value = past * 0.85; if (dim) dim.style.opacity = past.toFixed(3);
    if (hudEl) hudEl.style.opacity = clamp(1 - past * 1.6).toFixed(3);

    // Sound cues
    const cf = state.local('cut');
    if (cf != null) { const snipN = Math.floor(cf * 2.5 + 0.5); if (snipN !== lastSnip) { if (lastSnip >= 0) sound.snip(); lastSnip = snipN; } } else lastSnip = -1;
    const sf = state.local('shave');
    if (sf != null && sf > 0.5 && !shinged) { shinged = true; sound.shing(); } if (sf == null) shinged = false;
    buzzKick = Math.max(0, buzzKick - dt);
    sound.buzz(Math.max(state.near('fade') * 0.8, buzzKick));

    if (mouse.moved || drag || frames % 6 === 0) { pick(); mouse.moved = false; }
    state.buzz = sound.on || buzzKick > 0; state.signFlick = signFlick; signFlick = Math.max(0, signFlick - dt);
    state.hoverCrew = hover && hover.kind === 'crew' ? hover.item : null;
    world.update(t, dt, state);

    film.uniforms.uTime.value = t; film.uniforms.uAb.value = 0.0012 + Math.min(0.008, vel * 0.006);
    bloom.strength = 0.6 + Math.min(0.4, vel * 0.2);
    if (past < 0.995) composer.render(dt);

    // Adaptive quality: if frames run long, swap MSAA for FXAA, then drop bloom. Resolution is never lowered.
    frames++;
    if (q !== 'high' && rawDt < 0.5) {
      ema = ema ? ema * 0.92 + rawDt * 1000 * 0.08 : rawDt * 1000;
      if (frames % 30 === 0 && frames > 20) {
        if (ema > 22) {
          if (composer.renderTarget1.samples > 0) { [composer.renderTarget1, composer.renderTarget2].forEach((r) => { r.samples = 0; r.dispose(); }); fxaa.enabled = true; }
        }
      }
    }
    if (frames === 2 && leader) { const wait = Math.max(0, 1500 - (now - started)); setTimeout(() => { leader.classList.add('is-done'); setTimeout(() => leader.remove(), 900); }, wait); }
  }
  // Compile every shader up front (behind the film leader) so props don't stall the first time they come into view.
  let begun = false;
  const begin = () => { if (begun) return; begun = true; requestAnimationFrame(frame); };
  camera.position.set(...SCENES[0].pos); camera.lookAt(...SCENES[0].tgt);
  try { (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera))).then(begin, begin); } catch (e) { begin(); }
  setTimeout(begin, 5000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { sound.pause(); world.pauseVideo(); } else sound.resume(); });
  // Small public handle: scene jumps for the HUD and for automated checks.
  window.RBFilm = { go, scenes: SCENES.map((s) => s.id), state: () => ({ c: state.c, scene: SCENES[Math.round(state.c)].id }),
    quality: () => ({ gpu, lowGPU, pixelRatio: +DPR.toFixed(2), msaa: composer.renderTarget1.samples, fxaa: fxaa.enabled, bloom: bloom.enabled, frameMs: +ema.toFixed(1) }),
    jump: (k, f = 0.35) => { const y = yFor(k) + (f - 0.35) * SCENES[k].hold * unit; if (window.RBLenis) window.RBLenis.scrollTo(y, { immediate: true }); else scrollTo(0, y); sp = -1; } };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
