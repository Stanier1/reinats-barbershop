/* WebGL ink-in-water fluid for the hero: stable-fluids (advection, vorticity, pressure projection).
   Pointer movement injects blue, red and white dye; gentle ambient splats keep it alive on touch devices. */
(function (root) {
  function createFluid(canvas, opts = {}) {
    const cfg = Object.assign({ simRes: 128, dyeRes: 512, dissipation: 0.975, velDissipation: 0.985, pressureIters: 18, curl: 22, splatRadius: 0.22, force: 5200 }, opts);
    const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false, premultipliedAlpha: false };
    let gl = canvas.getContext('webgl2', params);
    const isGL2 = !!gl;
    if (!gl) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
    if (!gl) return null;

    let halfFloat, linear;
    if (isGL2) { gl.getExtension('EXT_color_buffer_float'); linear = gl.getExtension('OES_texture_float_linear'); }
    else { halfFloat = gl.getExtension('OES_texture_half_float'); linear = gl.getExtension('OES_texture_half_float_linear'); if (!halfFloat) return null; }
    const texType = isGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
    const filter = linear ? gl.LINEAR : gl.NEAREST;
    const fmt = (internal, format) => ({ internal, format });
    const RGBA = isGL2 ? fmt(gl.RGBA16F, gl.RGBA) : fmt(gl.RGBA, gl.RGBA);
    const RG = isGL2 ? fmt(gl.RG16F, gl.RG) : RGBA;
    const R = isGL2 ? fmt(gl.R16F, gl.RED) : RGBA;

    // Make sure half-float render targets actually work here; bail out otherwise.
    (function probe() {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, RGBA.internal, 4, 4, 0, RGBA.format, texType, null);
      const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('fluid: no float render targets');
    })();

    const baseVS = `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv, vL, vR, vT, vB;
      uniform vec2 texelSize;
      void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0); vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y); vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }`;
    const FS = {
      clear: `precision mediump float; varying vec2 vUv; uniform sampler2D uTexture; uniform float value;
        void main () { gl_FragColor = value * texture2D(uTexture, vUv); }`,
      splat: `precision highp float; varying vec2 vUv; uniform sampler2D uTarget; uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius;
        void main () { vec2 p = vUv - point.xy; p.x *= aspectRatio; vec3 splat = exp(-dot(p, p) / radius) * color; gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0); }`,
      advection: `precision highp float; varying vec2 vUv; uniform sampler2D uVelocity, uSource; uniform vec2 texelSize; uniform float dt, dissipation;
        void main () { vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize; gl_FragColor = dissipation * texture2D(uSource, coord); gl_FragColor.a = 1.0; }`,
      divergence: `precision mediump float; varying vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity;
        void main () {
          float L = texture2D(uVelocity, vL).x, R = texture2D(uVelocity, vR).x, T = texture2D(uVelocity, vT).y, B = texture2D(uVelocity, vB).y;
          vec2 C = texture2D(uVelocity, vUv).xy;
          if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x; if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
          gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0); }`,
      curl: `precision mediump float; varying vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity;
        void main () { float L = texture2D(uVelocity, vL).y, R = texture2D(uVelocity, vR).y, T = texture2D(uVelocity, vT).x, B = texture2D(uVelocity, vB).x;
          gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0); }`,
      vorticity: `precision highp float; varying vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity, uCurl; uniform float curl, dt;
        void main () {
          float L = texture2D(uCurl, vL).x, R = texture2D(uCurl, vR).x, T = texture2D(uCurl, vT).x, B = texture2D(uCurl, vB).x, C = texture2D(uCurl, vUv).x;
          vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L)); force /= length(force) + 0.0001; force *= curl * C; force.y *= -1.0;
          vec2 vel = texture2D(uVelocity, vUv).xy + force * dt; vel = min(max(vel, -1000.0), 1000.0);
          gl_FragColor = vec4(vel, 0.0, 1.0); }`,
      pressure: `precision mediump float; varying vec2 vUv, vL, vR, vT, vB; uniform sampler2D uPressure, uDivergence;
        void main () { float L = texture2D(uPressure, vL).x, R = texture2D(uPressure, vR).x, T = texture2D(uPressure, vT).x, B = texture2D(uPressure, vB).x;
          float d = texture2D(uDivergence, vUv).x; gl_FragColor = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0); }`,
      gradient: `precision mediump float; varying vec2 vUv, vL, vR, vT, vB; uniform sampler2D uPressure, uVelocity;
        void main () { float L = texture2D(uPressure, vL).x, R = texture2D(uPressure, vR).x, T = texture2D(uPressure, vT).x, B = texture2D(uPressure, vB).x;
          vec2 v = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B); gl_FragColor = vec4(v, 0.0, 1.0); }`,
      display: `precision highp float; varying vec2 vUv; uniform sampler2D uTexture;
        void main () { vec3 c = texture2D(uTexture, vUv).rgb; float a = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0); gl_FragColor = vec4(c, a * 0.9); }`
    };

    function compile(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    const vs = compile(gl.VERTEX_SHADER, baseVS);
    function program(fs) {
      const p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
      gl.bindAttribLocation(p, 0, 'aPosition'); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
      return { p, u };
    }
    const P = {}; for (const k in FS) P[k] = program(FS[k]);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0);
    const blit = (target) => {
      if (target) { gl.viewport(0, 0, target.w, target.h); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); }
      else { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };

    function fbo(w, h, f) {
      gl.activeTexture(gl.TEXTURE0);
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, f.internal, w, h, 0, f.format, texType, null);
      const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      return { tex, fbo: fb, w, h, tx: 1 / w, ty: 1 / h, attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; } };
    }
    const dbl = (w, h, f) => { let a = fbo(w, h, f), b = fbo(w, h, f); return { w, h, tx: a.tx, ty: a.ty, get read() { return a; }, get write() { return b; }, swap() { const t = a; a = b; b = t; } }; };
    const res = (r) => { const ar = gl.drawingBufferWidth / gl.drawingBufferHeight; const min = Math.round(r), max = Math.round(r * (ar < 1 ? 1 / ar : ar)); return ar > 1 ? { w: max, h: min } : { w: min, h: max }; };

    let velocity, dye, divergence, curlT, pressure;
    function initTargets() {
      const s = res(cfg.simRes), d = res(cfg.dyeRes);
      velocity = dbl(s.w, s.h, RG); dye = dbl(d.w, d.h, RGBA);
      divergence = fbo(s.w, s.h, R); curlT = fbo(s.w, s.h, R); pressure = dbl(s.w, s.h, R);
    }
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr)), h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; initTargets(); }
    }
    resize(); initTargets();

    function splat(x, y, dx, dy, color) {
      gl.useProgram(P.splat.p);
      gl.uniform1i(P.splat.u.uTarget, velocity.read.attach(0));
      gl.uniform1f(P.splat.u.aspectRatio, canvas.width / canvas.height);
      gl.uniform2f(P.splat.u.point, x, y);
      gl.uniform3f(P.splat.u.color, dx, dy, 0);
      gl.uniform1f(P.splat.u.radius, (cfg.splatRadius / 100) * (canvas.width > canvas.height ? canvas.width / canvas.height : 1));
      blit(velocity.write); velocity.swap();
      gl.uniform1i(P.splat.u.uTarget, dye.read.attach(0));
      gl.uniform3f(P.splat.u.color, color[0], color[1], color[2]);
      blit(dye.write); dye.swap();
    }

    function step(dt) {
      gl.disable(gl.BLEND);
      gl.useProgram(P.curl.p); gl.uniform2f(P.curl.u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(P.curl.u.uVelocity, velocity.read.attach(0)); blit(curlT);
      gl.useProgram(P.vorticity.p); gl.uniform2f(P.vorticity.u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(P.vorticity.u.uVelocity, velocity.read.attach(0)); gl.uniform1i(P.vorticity.u.uCurl, curlT.attach(1)); gl.uniform1f(P.vorticity.u.curl, cfg.curl); gl.uniform1f(P.vorticity.u.dt, dt); blit(velocity.write); velocity.swap();
      gl.useProgram(P.divergence.p); gl.uniform2f(P.divergence.u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(P.divergence.u.uVelocity, velocity.read.attach(0)); blit(divergence);
      gl.useProgram(P.clear.p); gl.uniform1i(P.clear.u.uTexture, pressure.read.attach(0)); gl.uniform1f(P.clear.u.value, 0.8); blit(pressure.write); pressure.swap();
      gl.useProgram(P.pressure.p); gl.uniform2f(P.pressure.u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(P.pressure.u.uDivergence, divergence.attach(0));
      for (let i = 0; i < cfg.pressureIters; i++) { gl.uniform1i(P.pressure.u.uPressure, pressure.read.attach(1)); blit(pressure.write); pressure.swap(); }
      gl.useProgram(P.gradient.p); gl.uniform2f(P.gradient.u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(P.gradient.u.uPressure, pressure.read.attach(0)); gl.uniform1i(P.gradient.u.uVelocity, velocity.read.attach(1)); blit(velocity.write); velocity.swap();
      gl.useProgram(P.advection.p); gl.uniform2f(P.advection.u.texelSize, velocity.tx, velocity.ty);
      gl.uniform1i(P.advection.u.uVelocity, velocity.read.attach(0)); gl.uniform1i(P.advection.u.uSource, velocity.read.attach(0)); gl.uniform1f(P.advection.u.dt, dt); gl.uniform1f(P.advection.u.dissipation, cfg.velDissipation); blit(velocity.write); velocity.swap();
      gl.uniform1i(P.advection.u.uVelocity, velocity.read.attach(0)); gl.uniform1i(P.advection.u.uSource, dye.read.attach(1)); gl.uniform1f(P.advection.u.dissipation, cfg.dissipation); blit(dye.write); dye.swap();
    }
    function render() {
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(P.display.p); gl.uniform1i(P.display.u.uTexture, dye.read.attach(0)); blit(null);
    }

    // Barber-pole palette: electric blue, barber red and a little white, kept dim so text above stays readable.
    const PALETTE = [[0.3, 0.49, 1.0], [0.9, 0.2, 0.18], [0.3, 0.49, 1.0], [0.85, 0.88, 0.95]];
    let ci = 0;
    const nextColor = (k = 0.16) => { ci = (ci + 1) % PALETTE.length; const c = PALETTE[ci]; return [c[0] * k, c[1] * k, c[2] * k]; };

    const pointer = { x: 0, y: 0, px: 0, py: 0, moved: false, color: nextColor() };
    function onMove(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      if (clientY < r.top || clientY > r.bottom) return;
      const x = (clientX - r.left) / r.width, y = 1 - (clientY - r.top) / r.height;
      pointer.px = pointer.moved ? pointer.x : x; pointer.py = pointer.moved ? pointer.y : y;
      pointer.x = x; pointer.y = y; pointer.moved = true; pointer.dirty = true;
    }
    const mm = (e) => onMove(e.clientX, e.clientY);
    const tm = (e) => { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); };
    window.addEventListener('mousemove', mm, { passive: true });
    window.addEventListener('touchmove', tm, { passive: true });

    let running = true, visible = true, last = performance.now(), raf = 0, ambient = 0, colorTimer = 0;
    let slowFrames = 0;
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!running || !visible) { last = now; return; }
      const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
      if (dt > 1 / 24) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 90) { destroy(); canvas.classList.add('is-off'); return; } // device can't keep up: fade out
      resize();
      colorTimer += dt; if (colorTimer > 1.4) { colorTimer = 0; pointer.color = nextColor(); }
      if (pointer.dirty) {
        pointer.dirty = false;
        const dx = (pointer.x - pointer.px) * cfg.force, dy = (pointer.y - pointer.py) * cfg.force;
        if (Math.abs(dx) + Math.abs(dy) > 0.5) splat(pointer.x, pointer.y, dx, dy, pointer.color);
      }
      ambient -= dt;
      if (ambient <= 0) { // slow, drifting ink so the hero feels alive even without a mouse
        ambient = 2.2 + Math.random() * 1.8;
        const x = 0.15 + Math.random() * 0.7, y = 0.1 + Math.random() * 0.5;
        splat(x, y, (Math.random() - 0.5) * 900, 300 + Math.random() * 500, nextColor(0.12));
      }
      step(dt); render();
    }
    raf = requestAnimationFrame(frame);
    const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 });
    io.observe(canvas);
    const onVis = () => { running = !document.hidden; };
    document.addEventListener('visibilitychange', onVis);
    function destroy() {
      cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('mousemove', mm); window.removeEventListener('touchmove', tm);
    }
    // Opening splash so the effect is visible on first paint.
    for (let i = 0; i < 3; i++) splat(0.3 + i * 0.2, 0.2 + Math.random() * 0.3, (Math.random() - 0.5) * 1200, 600 + Math.random() * 600, nextColor(0.14));
    return { destroy };
  }
  root.RBFluid = { create: createFluid };
})(window);
